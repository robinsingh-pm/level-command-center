import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TrendModal({ open, metric, data, onClose }) {
  if (!open || !metric) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <strong>{metric.label} — Trend</strong>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="t" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--good-color)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
          Last {data.length} updates (10s refresh)
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
};

const modal = {
  width: 640,
  maxWidth: "92vw",
  background: "var(--card-bg)",
  borderRadius: 14,
  border: "1px solid var(--card-border)",
  padding: 16,
  boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};
