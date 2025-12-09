export default function handler(req, res) {
  const now = new Date().toISOString();

  function rnd(base, pct=3, decimal=false) {
    const delta = base * (Math.random()*pct/100 - pct/200);
    const val = Math.max(0, base + delta);
    return decimal ? Number(val.toFixed(1)) : Math.round(val);
  }

  res.status(200).json({
    tenant: "acme",
    timestamp: now,
    metrics: [
      { id: "conversations_today", value: rnd(2847,5,false), unit: "", direction: "higherIsBetter" },
      { id: "eval_completion_pct", value: rnd(84,5,true), unit: "%", direction: "higherIsBetter" },
      { id: "instascore_pct", value: rnd(92,4,true), unit: "%", direction: "higherIsBetter" },
      { id: "aht_seconds", value: rnd(360,5,false), unit: "s", direction: "lowerIsBetter" },
      { id: "frt_seconds", value: rnd(40,6,false), unit: "s", direction: "lowerIsBetter" },
      { id: "crt_minutes", value: rnd(72,6,false), unit: "m", direction: "lowerIsBetter" },
      { id: "icsat_pct", value: rnd(78,5,true), unit: "%", direction: "higherIsBetter" },
      { id: "manual_qa_pct", value: rnd(83,5,true), unit: "%", direction: "higherIsBetter" },
      { id: "coaching_today", value: rnd(12,50,false), unit: "", direction: "higherIsBetter" }
    ]
  });
}
