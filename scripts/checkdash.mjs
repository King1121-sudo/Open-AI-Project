const t = await (await fetch("http://localhost:8787/dashboard")).text();
const needle = "getElementById('modal').classList";
console.log("broken inline handlers:", t.split(needle).length - 1);
console.log("closeModal defined:", t.includes("function closeModal"));