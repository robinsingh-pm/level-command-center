import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TrendModal({ metric, onClose }) {
  if (!metric) return null;

  const data =
    JSON.parse(localStorage.getItem(`trend_${metric.id}`)) || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "92%",
          background: "var(--card-bg)",
          borderRadius: 14,
          border: "1px solid var(--card-border)",
          padding: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>{metric.label} — Trend</h3>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Chart */}
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis hide />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--good-color)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          Last {data.length} updates (10s refresh)
        </div>
      </div>
    </div>
  );
}
