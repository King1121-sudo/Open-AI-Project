const base = "http://localhost:8787";
const conf = await (await fetch(`${base}/api/config`)).json();
console.log("providers:", Object.keys(conf.providers).length, Object.keys(conf.providers).join(","));

const ft = await (await fetch(`${base}/api/freetiers`)).json();
console.log("freetiers:", ft.length, "| e.g. gemini remaining:", ft.find((x) => x.provider === "gemini")?.remainingTokens);

async function chat(model, msg) {
  const r = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: msg }], max_tokens: 12 }),
  });
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content ?? j.error?.message ?? "";
  const served = j.model ?? (j.choices?.[0]?.finish_reason ? "?" : "");
  return { status: r.status, served, content };
}
console.log("auto:", JSON.stringify(await chat("auto", "Reply OK")));
console.log("default:", JSON.stringify(await chat("default", "Reply OK")));

const stats = await (await fetch(`${base}/stats`)).json();
console.log("route stats:", JSON.stringify(stats.routes));
console.log("provider latencies:", Object.fromEntries(Object.entries(stats.providers).map(([k, v]) => [k, v.avgLatencyMs ?? "-"])));