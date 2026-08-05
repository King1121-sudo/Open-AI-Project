const base = "http://localhost:8787";
async function chat(model) {
  const r = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with one word: OK" }], max_tokens: 16 }),
  });
  const j = await r.json();
  const c = j.choices?.[0]?.message?.content;
  return { status: r.status, served: j.model, content: typeof c === "string" ? c : null, err: j.error?.message ?? null };
}
const conf = await (await fetch(`${base}/api/config`)).json();
console.log("providers:", Object.keys(conf.providers).length, "| has pollinations:", !!conf.providers.pollinations);
console.log("auto   ->", JSON.stringify(await chat("auto")));
console.log("default->", JSON.stringify(await chat("default")));
console.log("coder  ->", JSON.stringify(await chat("coder")));