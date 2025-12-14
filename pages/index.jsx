import { useEffect, useRef, useState } from "react";
import MetricTile from "../components/MetricTile";
import MetricTrendChart from "../components/MetricTrendChart";


/*
  Page with:
  - centralized delta logic (same)
  - sound player using WebAudio
  - mute/unmute in header (persisted)
  - thresholds editor panel (right side) with live editing & preview
  - thresholds persisted to localStorage key "thresholds_cfg"
*/

const ORDER = [
  "conversations_today",
  "eval_completion_pct",
  "instascore_pct",
  "aht_seconds",
  "frt_seconds",
  "crt_minutes",
  "icsat_pct",
  "manual_qa_pct",
  "coaching_today",
];

const STORAGE_KEY = "prev_metrics";
const THEME_KEY = "theme_pref";
const MUTED_KEY = "sound_muted";
const THRESHOLDS_KEY = "thresholds_cfg";

/* Default thresholds (same defaults as before) */
const DEFAULT_THRESHOLDS = {
  aht_seconds: { mode: "either", thresholdPercent: 5, thresholdAbsolute: 15, onCross: "warning", requireDirection: "up" },
  coaching_today: { mode: "absolute", thresholdAbsolute: 1, onCross: "celebration", requireDirection: "up" },
  icsat_pct: { mode: "percent", thresholdPercent: -2, onCross: "subtle", requireDirection: "down" },
};

/* WebAudio simple player */
function useSoundPlayer(mutedRef) {
  const ctxRef = useRef(null);
  useEffect(() => {
    try { ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctxRef.current = null; }
    return () => { try { ctxRef.current && ctxRef.current.close(); } catch (e) {} };
  }, []);

  const playOsc = (freq, duration = 0.15, type = "sine", when = 0, gain = 0.06) => {
    const ctx = ctxRef.current;
    if (!ctx || (mutedRef && mutedRef.current)) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + when);
    g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + when);
    o.stop(ctx.currentTime + when + duration + 0.02);
  };

  const playWarning = () => {
    playOsc(800, 0.12, "sine", 0, 0.06);
    playOsc(640, 0.12, "sine", 0.14, 0.06);
    playOsc(520, 0.18, "sine", 0.3, 0.05);
  };

  const playCelebrate = () => {
    playOsc(660, 0.12, "sine", 0, 0.06);
    playOsc(780, 0.14, "sine", 0.14, 0.06);
    playOsc(920, 0.18, "sine", 0.3, 0.07);
  };

  const playSubtle = () => {
    playOsc(520, 0.18, "sine", 0, 0.05);
  };

  return { playWarning, playCelebrate, playSubtle, mutedRef, ctxRef };
}

export default function Home() {
  const [payload, setPayload] = useState(null);
  const [rows, setRows] = useState([]);
  const mountedRef = useRef(true);
  const [theme, setTheme] = useState("light");
  const lastFetchRef = useRef(Date.now());
  const [trendOpen, setTrendOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // sound & mute
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const soundPlayer = useSoundPlayer(mutedRef);

  // thresholds state (editable)
  const [thresholds, setThresholds] = useState(() => {
    try {
      const raw = localStorage.getItem(THRESHOLDS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DEFAULT_THRESHOLDS;
  });

  // panel visibility
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    // load theme
    try {
      const saved = localStorage.getItem(THEME_KEY);
      const t = saved === "dark" ? "dark" : "light";
      setTheme(t);
      document.body.classList.toggle("dark", t === "dark");
    } catch (e) {}

    // load muted
    try {
      const m = localStorage.getItem(MUTED_KEY);
      const isMuted = m === "true";
      mutedRef.current = isMuted;
      setMuted(isMuted);
    } catch (e) {}

    mountedRef.current = true;
    fetchAndCompute();
    const t = setInterval(fetchAndCompute, 10000);
    return () => { mountedRef.current = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist thresholds to localStorage when changed
  useEffect(() => {
    try { localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds)); } catch (e) {}
  }, [thresholds]);

  // mute toggle handler
  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    try { localStorage.setItem(MUTED_KEY, String(next)); } catch (e) {}
  };

  // theme toggle
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    document.body.classList.toggle("dark", next === "dark");
  };

  // helpers for prev map storage
  const readPrevMap = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
      return {};
    } catch (e) { return {}; }
  };
  const savePrevMap = (map) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
  };

  // threshold checker using current thresholds state (live editable)
  function checkThreshold(id, prev, curr) {
    const cfg = thresholds[id];
    if (!cfg) return false;
    if (prev === null || prev === undefined) return false;
    const d = curr - prev;
    const pct = prev === 0 ? null : (d / Math.abs(prev)) * 100;

    if (cfg.requireDirection === "up" && d <= 0) return false;
    if (cfg.requireDirection === "down" && d >= 0) return false;

    if (cfg.mode === "percent") {
      if (pct === null) return false;
      // thresholdPercent could be negative for drops; compare accordingly
      return cfg.thresholdPercent !== undefined ? (pct <= cfg.thresholdPercent ? true : pct >= cfg.thresholdPercent) : false;
    } else if (cfg.mode === "absolute") {
      return cfg.thresholdAbsolute !== undefined ? (Math.abs(d) >= Math.abs(cfg.thresholdAbsolute)) : false;
    } else if (cfg.mode === "either") {
      const byPct = cfg.thresholdPercent !== undefined && pct !== null ? (Math.abs(pct) >= Math.abs(cfg.thresholdPercent)) : false;
      const byAbs = cfg.thresholdAbsolute !== undefined ? (Math.abs(d) >= Math.abs(cfg.thresholdAbsolute)) : false;
      return byPct || byAbs;
    } else {
      // fallback logic: mode could be 'increase' or 'decrease'
      if (cfg.mode === "increase") return cfg.thresholdAbsolute !== undefined ? (d >= cfg.thresholdAbsolute) : (d > 0);
      if (cfg.mode === "decrease") return cfg.thresholdAbsolute !== undefined ? (d <= -Math.abs(cfg.thresholdAbsolute)) : (d < 0);
      return false;
    }
  }

  // play sound wrapper that respects mutedRef
  function playSoundByName(name) {
    if (mutedRef.current) return;
    if (name === "warning") soundPlayer.playWarning();
    if (name === "celebration") soundPlayer.playCelebrate();
    if (name === "subtle") soundPlayer.playSubtle();
  }

  // fetch + compute + check thresholds & play sounds
  async function fetchAndCompute() {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!mountedRef.current) return;
      setPayload(json);

      const fetchTime = Date.now();
      lastFetchRef.current = fetchTime;

      const currentMap = {};
      (json.metrics || []).forEach((m) => {
        currentMap[m.id] = typeof m.value === "number" ? m.value : (m.value ? Number(m.value) : 0);
      });

      const prevMap = readPrevMap();

      const computed = ORDER.map((id) => {
        const curr = id in currentMap ? currentMap[id] : 0;
        const prevRaw = prevMap && (id in prevMap) ? prevMap[id] : null;
        const prev = prevRaw === null || prevRaw === undefined ? null : Number(prevRaw);

        const delta = (prev === null) ? null : Number((curr - prev).toFixed(2));
        const pct = (prev === null || prev === 0) ? null : Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(2));

        const apiMetric = (json.metrics || []).find(m => m.id === id) || {};
        const direction = apiMetric.direction || (String(id).includes("aht") || String(id).includes("frt") || String(id).includes("crt") ? "lowerIsBetter" : "higherIsBetter");

        let deltaSign = null;
        if (delta !== null && delta !== 0) {
          const increased = delta > 0;
          const isGood = direction === "higherIsBetter" ? increased : !increased;
          deltaSign = isGood ? "good" : "bad";
        }

        // decide if sound should play (value changed AND threshold crossed)
        let shouldPlay = false;
        if (prev !== null && delta !== null && delta !== 0) {
          shouldPlay = checkThreshold(id, prev, curr);
        }

        return {
          id,
          label: labelForId(id),
          value: curr,
          unit: apiMetric.unit || "",
          direction,
          delta,
          pct,
          deltaSign,
          lastUpdatedAt: fetchTime,
          shouldPlay,
        };
      });

      // persist current map
      savePrevMap(currentMap);

      // update UI
      setRows(computed);

      // trigger sounds for those that shouldPlay; play once per fetch
      computed.forEach((m) => {
        if (m.shouldPlay) {
          const cfg = thresholds[m.id];
          const sound = cfg && cfg.onCross ? cfg.onCross : null;
          if (sound) playSoundByName(sound);
        }
      });

    } catch (e) {
      console.error("fetchAndCompute error", e);
    }
  }

  // threshold editor helpers
  const setThresholdFor = (id, obj) => {
    setThresholds((prev) => {
      const next = { ...(prev || {}), [id]: { ...(prev ? prev[id] || {} : {}), ...(obj || {}) } };
      return next;
    });
  };

  const resetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);
  };

  // preview sound helper
  const previewSound = (name) => {
    playSoundByName(name);
  };

  return (
    <div className="gradient-bg">
      <header className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="title">Level AI — Command Center</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Live wallboard</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{payload ? `Tenant: ${payload.tenant}` : ""}</div>

          {/* Mute / Unmute */}
          <button
            onClick={toggleMute}
            aria-label="Toggle mute"
            className="btn"
            style={{ padding: "8px 10px" }}
          >
            {muted ? "🔇 Muted" : "🔊 Unmuted"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="btn"
            style={{ padding: "8px 10px" }}
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>

          {/* Open thresholds panel */}
          <button onClick={() => setPanelOpen((s) => !s)} className="btn" style={{ padding: "8px 10px" }}>
            {panelOpen ? "Close Alerts" : "Alert Settings"}
          </button>
        </div>
      </header>

      <main className="metrics-grid-wrap">
        <div className="metrics-grid">
          {rows.map((r) => (
            <MetricTile
              key={r.id}
              id={r.id}
              label={r.label}
              value={r.value}
              unit={r.unit}
              direction={r.direction}
              delta={r.delta}
              deltaPct={r.pct}
              deltaSign={r.deltaSign}
              lastUpdatedAt={r.lastUpdatedAt}
              onClick={() => {
                setSelectedMetric(r);
                setTrendOpen(true);
              }}
            />
          ))}
        </div>
      </main>

      {/* Right-side thresholds editor panel */}
      <aside className={`thresholds-panel ${panelOpen ? "open" : ""}`}>
        <div className="panel-header">
          <h3>Alert Settings</h3>
          <div className="panel-actions">
            <button className="btn" onClick={resetThresholds}>Reset Defaults</button>
          </div>
        </div>

        <div className="panel-body">
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Edit thresholds for each metric. Click “Preview” to hear the sound.
          </p>

          {ORDER.map((id) => {
            const cfg = thresholds[id] || {};
            return (
              <div key={id} className="threshold-row">
                <div className="threshold-title">{labelForId(id)}</div>

                <div className="threshold-controls">
                  <label>
                    Mode
                    <select
                      value={cfg.mode || ""}
                      onChange={(e) => setThresholdFor(id, { mode: e.target.value })}
                    >
                      <option value="either">either</option>
                      <option value="percent">percent</option>
                      <option value="absolute">absolute</option>
                      <option value="increase">increase</option>
                      <option value="decrease">decrease</option>
                    </select>
                  </label>

                  <label>
                    % threshold
                    <input
                      type="number"
                      step="0.1"
                      value={cfg.thresholdPercent ?? ""}
                      onChange={(e) => setThresholdFor(id, { thresholdPercent: e.target.value === "" ? undefined : Number(e.target.value) })}
                      placeholder="e.g. 5 or -2"
                    />
                  </label>

                  <label>
                    abs threshold
                    <input
                      type="number"
                      step="1"
                      value={cfg.thresholdAbsolute ?? ""}
                      onChange={(e) => setThresholdFor(id, { thresholdAbsolute: e.target.value === "" ? undefined : Number(e.target.value) })}
                      placeholder="units"
                    />
                  </label>

                  <label>
                    Direction
                    <select value={cfg.requireDirection ?? ""} onChange={(e) => setThresholdFor(id, { requireDirection: e.target.value === "" ? undefined : e.target.value })}>
                      <option value="">both</option>
                      <option value="up">up only</option>
                      <option value="down">down only</option>
                    </select>
                  </label>

                  <label>
                    Sound
                    <select value={cfg.onCross ?? ""} onChange={(e) => setThresholdFor(id, { onCross: e.target.value })}>
                      <option value="">none</option>
                      <option value="warning">warning</option>
                      <option value="celebration">celebration</option>
                      <option value="subtle">subtle</option>
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn" onClick={() => previewSound(cfg.onCross || "warning")}>Preview</button>
                    <button className="btn secondary" onClick={() => setThresholdFor(id, {})}>Clear</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel-footer">
          <div style={{ color: "var(--muted)" }}>
            Thresholds are saved to your browser (localStorage).
          </div>
        </div>
      </aside>
      {/* ✅ ADD THIS BLOCK EXACTLY HERE */}
      {trendOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setTrendOpen(false)}
        >
<div
  style={{
    background: "var(--card-bg)",
    padding: 24,
    borderRadius: 12,
    minWidth: 1000,
    maxWidth: 1200, // ⬅️ increases chart length from outside
  }}
  onClick={(e) => e.stopPropagation()}
>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {selectedMetric?.label}
              </div>
              <button className="btn" onClick={() => setTrendOpen(false)}>
                Close
              </button>
            </div>


<MetricTrendChart
  metricId={selectedMetric.id}
  label={selectedMetric.label}
  unit={selectedMetric.unit}
  threshold={thresholds[selectedMetric.id]}
  range="today"
/>
           
          </div>
        </div>
      )}
    </div>
  );
}

function labelForId(id) {
  switch (id) {
    case "conversations_today": return "Conversations Today";
    case "eval_completion_pct": return "Evaluation Completion %";
    case "instascore_pct": return "Instascore %";
    case "aht_seconds": return "Handling Time (s)";
    case "frt_seconds": return "First Response Time (s)";
    case "crt_minutes": return "Case Resolution Time (m)";
    case "icsat_pct": return "iCSAT (%)";
    case "manual_qa_pct": return "Manual QA Score (%)";
    case "coaching_today": return "Coaching Sessions Today";
    default: return id;
  }
}
