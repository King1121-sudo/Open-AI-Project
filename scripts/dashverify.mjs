import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const html = await (await fetch("http://localhost:8787/dashboard")).text();
const i = html.indexOf("<script>");
const j = html.indexOf("</script>", i);
const code = html.slice(i + "<script>".length, j);
const file = join(tmpdir(), "dashcheck.js");
writeFileSync(file, code);

console.log("setup nav present:", html.includes('data-view="setup"'));
console.log("viewSetup present:", code.includes("function viewSetup"));
console.log("bindTest present:", code.includes("function bindTest"));

try {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  console.log("syntax check: OK");
} catch (e) {
  console.log("syntax check FAILED:\n" + String(e.stdout || e.message).slice(0, 2000));
}