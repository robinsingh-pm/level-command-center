import React, { useEffect, useRef, useState } from "react";

/**
 * MetricTile — main number ALWAYS stays perfectly centered.
 * Delta top-right, updated bottom-left.
 */
export default function MetricTile({
  id,
  label,
  value = 0,
  unit = "",
  direction = "higherIsBetter",
  delta = null,
  deltaPct = null,
  deltaSign = null,
  lastUpdatedAt = null,
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flashClass, setFlashClass] = useState("");
  const [deltaAnimClass, setDeltaAnimClass] = useState("");
  const prevDeltaRef = useRef(null);
  const prevValueRef = useRef(value);

  // "Updated: Xs ago"
  const [secondsAgo, setSecondsAgo] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!lastUpdatedAt) return setSecondsAgo(null);

    const update = () => {
      const diff = Math.floor((Date.now() - lastUpdatedAt) / 1000);
      setSecondsAgo(diff >= 0 ? diff : 0);
    };

    update();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(update, 1000);

    return () => clearInterval(timerRef.current);
  }, [lastUpdatedAt]);

  // smooth animation for main value
  useEffect(() => {
    const start = prevValueRef.current ?? value;
    const end = value ?? 0;

    if (start === end) {
      setDisplayValue(end);
    } else {
      const steps = 6;
      let step = 0;
      const diff = end - start;

      const iv = setInterval(() => {
        step++;
        const next = Math.round(start + (diff * step) / steps);
        setDisplayValue(next);
        if (step >= steps) clearInterval(iv);
      }, 30);

      return () => clearInterval(iv);
    }
  }, [value]);

  // flash animation
  useEffect(() => {
    if (deltaSign === "good") {
      setFlashClass("metric-flash-up");
      setTimeout(() => setFlashClass(""), 800);
    } else if (deltaSign === "bad") {
      setFlashClass("metric-flash-down");
      setTimeout(() => setFlashClass(""), 800);
    }
  }, [deltaSign]);

  // animate delta change
  useEffect(() => {
    const prev = prevDeltaRef.current;
    const curr = delta;

    if (prev !== curr && curr !== null) {
      setDeltaAnimClass("");
      requestAnimationFrame(() => {
        setDeltaAnimClass(
          deltaSign === "good"
            ? "delta-anim-good"
            : deltaSign === "bad"
            ? "delta-anim-bad"
            : ""
        );
      });
    }

    prevDeltaRef.current = curr;
  }, [delta, deltaSign]);

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const fmtMain = (v) => {
    if (v === null || v === undefined) return `0${unit}`;
    if (unit === "%") return `${Math.round(v)}%`;
    return (Math.abs(v) % 1 === 0)
      ? `${Math.round(v)}${unit}`
      : `${Number(v.toFixed(2))}${unit}`;
  };

  const fmtDelta = (d) => {
    if (d == null) return "—";
    const s = d > 0 ? "+" : d < 0 ? "" : "+";
    const clean = Math.abs(d) % 1 === 0 ? Math.round(d) : Number(d.toFixed(2));
    return `${s}${clean}${unit}`;
  };

  const fmtPct = (p) => {
    if (p == null) return "—";
    const s = p > 0 ? "+" : p < 0 ? "" : "+";
    return `${s}${Number(p).toFixed(2)}%`;
  };

  const mainClass =
    deltaSign === "good"
      ? "metric-number metric-number-good"
      : deltaSign === "bad"
      ? "metric-number metric-number-bad"
      : "metric-number";

  const deltaColor =
    deltaSign === "good"
      ? "delta-good"
      : deltaSign === "bad"
      ? "delta-bad"
      : "delta-neutral";

  return (
    <div className={`metric-card relative ${flashClass}`}>

      {/* Top-right delta */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 16,
        textAlign: "right",
        fontWeight: 700
      }}>
        <div className={`${deltaColor} ${deltaAnimClass}`} style={{ fontWeight: 700 }}>
          {fmtDelta(delta)}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
          {fmtPct(deltaPct)}
        </div>
      </div>

      {/* Title (top-left) */}
      <div className="metric-title">{label}</div>

      {/* MAIN NUMBER — PERFECTLY CENTERED ALWAYS */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        textAlign: "center"
      }}>
        <div className={mainClass}>{fmtMain(displayValue)}</div>
      </div>

      {/* Bottom-left last updated */}
      <div style={{
        position: "absolute",
        left: 12,
        bottom: 10,
        fontSize: 12,
        color: "var(--muted)",
        fontWeight: 600
      }}>
        {secondsAgo == null ? "Updated: -" : `Updated: ${secondsAgo}s ago`}
      </div>
    </div>
  );
}
