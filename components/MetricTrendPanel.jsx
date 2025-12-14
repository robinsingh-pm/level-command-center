import { useEffect, useState } from "react";

export default function MetricTrendPanel({ metricId, open, onClose }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !metricId) return;

    const fetchTrend = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dashboard/trend?metricId=${metricId}&range=today`
        );
        const json = await res.json();
        setPoints(json.points || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [metricId, open]);

  if (!open) return null;

  return (
    <aside className="trend-panel open">
      <div className="panel-header">
        <h3>{metricId} — Today</h3>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div className="panel-body">
        {loading ? "Loading..." : JSON.stringify(points)}
      </div>
    </aside>
  );
}
