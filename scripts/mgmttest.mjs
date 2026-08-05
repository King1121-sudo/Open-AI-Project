const base = "http://localhost:8787";
async function post(path, body) { return (await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json(); }
async function del(path, body) { return (await fetch(base + path, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json(); }

const add = await post("/api/providers", { name: "testmock", provider: { type: "openai", baseUrl: "https://example.com/v1", apiKey: "ENV:FAKE", models: ["fake-model"] } });
console.log("add:", JSON.stringify(add));
let conf = await (await fetch(base + "/api/config")).json();
console.log("testmock present:", !!conf.providers.testmock, "| models:", conf.providers.testmock?.models?.join(","));

const addRoute = await post("/api/routes", { name: "testroute", list: ["testmock/fake-model", "groq/llama-3.3-70b-versatile"] });
console.log("addRoute:", JSON.stringify(addRoute));
conf = await (await fetch(base + "/api/config")).json();
console.log("testroute present:", !!conf.routes.testroute, "| entries:", conf.routes.testroute?.length);

const delR = await del("/api/routes", { name: "testroute" });
const delP = await del("/api/providers", { name: "testmock" });
console.log("deleted:", JSON.stringify(delR), JSON.stringify(delP));
conf = await (await fetch(base + "/api/config")).json();
console.log("cleaned-up:", !conf.providers.testmock, !conf.routes.testroute, "| providers now:", Object.keys(conf.providers).length);