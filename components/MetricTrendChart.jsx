import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import { useMemo } from "react";

/* ---------------- DEMO DATA GENERATOR ---------------- */
/* Used only when data is empty (demo dashboard) */
function generateDemoTrend({ metricId, unit, limit }) {
  const points = [];
  const now = Date.now();

  let min = 0;
  let max = 100;

  if (unit === "%") {
    min = 60;
    max = 95;
  }

  if (
    metricId?.toLowerCase().includes("aht") ||
    metricId?.toLowerCase().includes("frt") ||
    metricId?.toLowerCase().includes("crt")
  ) {
    min = 1;
    max = 10;
  }

  if (metricId?.toLowerCase().includes("coaching")) {
    min = 0;
    max = 20;
  }

  if (metricId?.toLowerCase().includes("conversation")) {
    min = 80;
    max = 400;
  }

  let current = Math.round((min + max) / 2);

  for (let i = 12; i >= 0; i--) {
    const variation = Math.round((Math.random() - 0.5) * (max - min) * 0.1);
    current = Math.max(min, Math.min(max, current + variation));

// ✅ HARD CLAMP FOR PERCENTAGE METRICS
if (unit === "%") {
  current = Math.min(100, Math.max(0, current));
}

    points.push({
      time: new Date(now - i * 5 * 60 * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: current,
      prevValue: points.length ? points[points.length - 1].value : null,
    });
  }

  return points;
}

/* ---------------- Y AXIS HELPERS ---------------- */

function getNiceMax(value) {
  if (value <= 100) return 100;
  if (value <= 150) return 150;
  if (value <= 300) return 300;
  if (value <= 400) return 400;
  if (value <= 600) return 600;
  return Math.ceil(value / 100) * 100;
}

function getYAxisTitle(label, unit) {
  const l = label?.toLowerCase() || "";

  // Percent-based metrics
  if (unit === "%") {
    return "Percentage (%)";
  }

  // Time-based metrics (force mins, ignore unit)
  if (
    l.includes("aht") ||
    l.includes("frt") ||
    l.includes("crt")
  ) {
    return "Time (mins)";
  }

  // Count-based metrics
  if (l.includes("coaching")) {
    return "Sessions";
  }

  if (l.includes("conversation")) {
    return "Conversations";
  }

  // Fallback
  return "Value";
}

/* ---------------- TOOLTIP ---------------- */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const { value, prevValue } = payload[0].payload;
  const delta = prevValue != null ? value - prevValue : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ddd",
        padding: 10,
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <div><strong>{label}</strong></div>
      <div>Value: {value}</div>
      {delta != null && (
        <div style={{ color: delta > 0 ? "#dc2626" : "#16a34a" }}>
          Δ {delta > 0 ? "+" : ""}{delta}
        </div>
      )}
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function MetricTrendChart({
  data = [],
  limit,
  label,
  unit = "",
}) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateDemoTrend({ metricId: label, unit, limit });
  }, [data, label, unit, limit]);

  const avg = useMemo(() => {
    if (!chartData.length) return null;
    return Math.round(
      chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
    );
  }, [chartData]);

  const yMax = useMemo(() => {
    const maxValue = Math.max(
      ...chartData.map((d) => d.value),
      limit || 0,
      avg || 0
    );
    return getNiceMax(maxValue);
  }, [chartData, limit, avg]);

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>
        {label} — Trend
      </h3>

      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Trend over time {limit != null ? "vs limit" : ""}
        {data.length === 0 && " • Demo data"}
      </p>

      <div
        style={{
          height: 440,
          background: "#fff",
          borderRadius: 12,
          padding: "16px 24px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 24, left: 40, bottom: 30 }}
            style={{
              fontFamily:
                "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: "#374151" }}
              label={{
                value: "Time",
                position: "insideBottom",
                offset: -5,
                fontSize: 12,
                fill: "#374151",
                fontWeight: 600,
              }}
            />

            <YAxis
              domain={[0, yMax]}
              tickCount={6}
              tick={{ fontSize: 12, fill: "#374151" }}
              label={{
                value: getYAxisTitle(label, unit),
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fontSize: 12,
                fill: "#374151",
                fontWeight: 600,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {limit != null && (
              <>
                <Area
                  type="monotone"
                  dataKey={() => limit}
                  baseValue={limit}
                  fill="#fee2e2"
                  stroke="none"
                />
                <ReferenceLine
                  y={limit}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{
                    value: `Limit — ${limit}${unit}`,
                    position: "right",
                    fill: "#dc2626",
                    fontSize: 12,
                  }}
                />
              </>
            )}

            {avg != null && (
              <ReferenceLine
                y={avg}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{
                  value: `Avg — ${avg}${unit}`,
                  position: "left",
                  fill: "#6b7280",
                  fontSize: 12,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="value"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 6 }}
              label={({ x, y, index, value }) =>
                index === chartData.length - 1 ? (
                  <text
                    x={x}
                    y={y - 12}
                    fill="#111827"
                    fontSize={13}
                    fontWeight={600}
                    textAnchor="middle"
                  >
                    {value}{unit}
                  </text>
                ) : null
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
