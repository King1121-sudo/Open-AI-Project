const base = "http://localhost:8787";
async function probe(path, opts = {}) {
  const r = await fetch(base + path, opts);
  let body = "";
  try { body = (await r.text()).slice(0, 160); } catch { body = "<no body>"; }
  console.log(`${r.status} ${opts.method ?? "GET"} ${path} :: ${body.replace(/\n+/g, " ")}`);
}
await probe("/health");
await probe("/stats");
await probe("/api/config");
await probe("/api/health");
await probe("/api/freetiers");
await probe("/dashboard", { headers: { accept: "text/html" } });
await probe("/v1/models");
await probe("/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "default", messages: [{ role: "user", content: "hi" }], max_tokens: 5 }) });
await probe("/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "auto", messages: [{ role: "user", content: "hi" }], max_tokens: 5 }) });
await probe("/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "badmodel", messages: [{ role: "user", content: "hi" }] }) });
await probe("/v1/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "default", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }) });
await probe("/v1/messages/count_tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "default", messages: [{ role: "user", content: "hi" }] }) });