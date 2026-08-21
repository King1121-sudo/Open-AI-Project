import type { ServerResponse } from "node:http";

export function serveConsole(res: ServerResponse): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AirRoute — Live Console</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  color-scheme:dark;
  --bg:#07090f;
  --bg-grad-1:#0a0f1c;
  --bg-grad-2:#0d1424;
  --panel:#0f1626;
  --panel2:#141d33;
  --panel3:#1a2540;
  --border:#1f2a44;
  --border-soft:#172238;
  --text:#e8edf7;
  --text-2:#b8c1d6;
  --muted:#7b86a3;
  --accent:#5b9eff;
  --accent-2:#7c5cff;
  --accent-grad:linear-gradient(135deg,#5b9eff 0%,#7c5cff 100%);
  --green:#3ce488;
  --green-glow:rgba(60,228,136,.35);
  --red:#ff5d6c;
  --red-glow:rgba(255,93,108,.35);
  --amber:#ffb547;
  --amber-glow:rgba(255,181,71,.35);
  --purple:#b48dff;
  --shadow:0 8px 32px rgba(0,0,0,.35);
  --shadow-sm:0 2px 8px rgba(0,0,0,.25);
}
*{box-sizing:border-box;-webkit-font-smoothing:antialiased}
html,body{margin:0;height:100%}
body{
  font-family:'Inter',ui-sans-serif,system-ui,sans-serif;
  background:
    radial-gradient(ellipse 80% 50% at 20% -10%,rgba(91,158,255,.10),transparent 60%),
    radial-gradient(ellipse 60% 50% at 90% 10%,rgba(124,92,255,.08),transparent 60%),
    linear-gradient(180deg,var(--bg-grad-1),var(--bg) 40%,var(--bg-grad-2));
  background-attachment:fixed;
  color:var(--text);
  font-size:14px;
  line-height:1.5;
  overflow:hidden;
}
.app{display:grid;grid-template-columns:260px 1fr;height:100vh}
.sidebar{
  background:linear-gradient(180deg,rgba(20,29,51,.85),rgba(15,22,38,.95));
  backdrop-filter:blur(20px);
  border-right:1px solid var(--border);
  padding:20px 14px;
  display:flex;flex-direction:column;
  overflow-y:auto;
}
.brand{display:flex;align-items:center;gap:12px;padding:6px 10px 20px;margin-bottom:8px}
.brand-mark{
  width:38px;height:38px;border-radius:10px;
  background:var(--accent-grad);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:800;color:white;
  box-shadow:0 4px 16px rgba(91,158,255,.35);
  position:relative;
}
.brand-mark::after{
  content:'';position:absolute;inset:-2px;border-radius:12px;
  background:var(--accent-grad);filter:blur(12px);opacity:.4;z-index:-1;
}
.brand-name{font-size:16px;font-weight:700;letter-spacing:-.3px}
.brand-tag{font-size:10px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-top:1px}
.nav-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;padding:14px 12px 6px;font-weight:600}
.nav{display:flex;flex-direction:column;gap:2px}
.nav button{
  background:transparent;border:none;color:var(--text-2);
  text-align:left;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:500;
  cursor:pointer;display:flex;align-items:center;gap:11px;
  font-family:inherit;
  transition:all .15s ease;
  position:relative;
}
.nav button .ic{
  width:18px;text-align:center;font-size:15px;opacity:.7;
  transition:all .15s ease;
}
.nav button:hover{background:var(--panel2);color:var(--text)}
.nav button:hover .ic{opacity:1;transform:scale(1.1)}
.nav button.active{
  background:linear-gradient(90deg,rgba(91,158,255,.12),rgba(124,92,255,.06));
  color:var(--text);font-weight:600;
}
.nav button.active::before{
  content:'';position:absolute;left:-14px;top:8px;bottom:8px;width:3px;
  background:var(--accent-grad);border-radius:0 3px 3px 0;
}
.nav button.active .ic{color:var(--accent);opacity:1}
.nav button .pill{
  margin-left:auto;font-size:10px;padding:2px 7px;border-radius:99px;
  background:var(--panel3);color:var(--muted);font-weight:600;
}
.side-foot{margin-top:auto;font-size:11px;color:var(--muted);padding:14px 12px 4px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.status-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2)}
.status-dot{
  width:8px;height:8px;border-radius:50%;background:var(--green);
  box-shadow:0 0 8px var(--green-glow);
  animation:pulse-dot 2s ease-in-out infinite;
}
.status-dot.offline{background:var(--muted);box-shadow:none;animation:none}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(.85)}}
.config-path{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);word-break:break-all;line-height:1.4;opacity:.7}

.main{display:flex;flex-direction:column;overflow:hidden}
.topbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 32px;border-bottom:1px solid var(--border);
  background:rgba(15,22,38,.4);backdrop-filter:blur(20px);
}
.topbar h1{font-size:20px;font-weight:700;margin:0;letter-spacing:-.3px;display:flex;align-items:center;gap:10px}
.topbar .sub{font-size:12px;color:var(--muted);margin-top:2px}
.topbar .live-tag{
  display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:99px;
  background:rgba(60,228,136,.1);color:var(--green);font-size:11px;font-weight:600;
  border:1px solid rgba(60,228,136,.2);
}
.topbar .live-tag .dot{
  width:6px;height:6px;border-radius:50%;background:var(--green);
  animation:pulse-dot 1.5s ease-in-out infinite;
}
.topbar-actions{display:flex;gap:10px;align-items:center}
.btn{
  background:var(--accent);color:white;border:none;
  padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;
  cursor:pointer;font-family:inherit;
  display:inline-flex;align-items:center;gap:6px;
  transition:all .15s ease;box-shadow:0 2px 8px rgba(91,158,255,.3);
}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(91,158,255,.45);filter:brightness(1.05)}
.btn:active{transform:translateY(0)}
.btn.ghost{background:var(--panel2);color:var(--text);border:1px solid var(--border);box-shadow:none}
.btn.ghost:hover{background:var(--panel3);border-color:var(--accent);box-shadow:none}
.btn.danger{background:rgba(255,93,108,.1);color:var(--red);border:1px solid rgba(255,93,108,.25);box-shadow:none}
.btn.danger:hover{background:rgba(255,93,108,.18);box-shadow:none}
.btn.sm{padding:6px 11px;font-size:12px;border-radius:8px}
.btn.icon{padding:7px 9px;font-size:14px}

.content{flex:1;overflow-y:auto;padding:24px 32px 40px}
.content::-webkit-scrollbar{width:10px;height:10px}
.content::-webkit-scrollbar-track{background:transparent}
.content::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
.content::-webkit-scrollbar-thumb:hover{background:var(--panel3)}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
.card{
  background:linear-gradient(135deg,var(--panel),var(--panel2));
  border:1px solid var(--border);border-radius:16px;padding:18px 20px;
  position:relative;overflow:hidden;
  transition:all .2s ease;
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:var(--accent-grad);opacity:0;
  transition:opacity .3s ease;
}
.card:hover{transform:translateY(-2px);border-color:var(--panel3);box-shadow:var(--shadow)}
.card:hover::before{opacity:1}
.card .icon{
  width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,rgba(91,158,255,.15),rgba(124,92,255,.1));
  color:var(--accent);font-size:18px;margin-bottom:14px;
}
.card.green .icon{background:rgba(60,228,136,.12);color:var(--green)}
.card.red .icon{background:rgba(255,93,108,.12);color:var(--red)}
.card.amber .icon{background:rgba(255,181,71,.12);color:var(--amber)}
.card.purple .icon{background:rgba(180,141,255,.12);color:var(--purple)}
.card .v{
  font-size:28px;font-weight:700;letter-spacing:-.5px;font-feature-settings:"tnum";
  font-variant-numeric:tabular-nums;line-height:1.1;
  background:linear-gradient(180deg,var(--text),var(--text-2));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  transition:all .4s ease;
}
.card .v.flash{animation:flash-up .8s ease}
@keyframes flash-up{
  0%{transform:scale(1);filter:brightness(1)}
  30%{transform:scale(1.08);filter:brightness(1.4)}
  100%{transform:scale(1);filter:brightness(1)}
}
.card .l{font-size:12px;color:var(--muted);margin-top:6px;letter-spacing:.2px}
.card .delta{font-size:11px;margin-top:6px;display:inline-flex;align-items:center;gap:3px;font-weight:600}
.delta.up{color:var(--green)}.delta.down{color:var(--red)}

.section-title{
  display:flex;align-items:center;justify-content:space-between;margin:28px 0 14px;
}
.section-title h2{
  font-size:13px;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;
  margin:0;font-weight:600;
}
.section-title .meta{font-size:11px;color:var(--muted)}

.grid-2{display:grid;grid-template-columns:1.4fr 1fr;gap:18px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:1100px){.grid-2,.grid-3{grid-template-columns:1fr}}

.panel{
  background:linear-gradient(180deg,var(--panel),var(--panel2));
  border:1px solid var(--border);border-radius:16px;overflow:hidden;
  transition:border-color .2s ease;
}
.panel:hover{border-color:var(--panel3)}
.panel-head{
  padding:16px 20px;border-bottom:1px solid var(--border-soft);
  display:flex;align-items:center;justify-content:space-between;background:rgba(15,22,38,.4);
}
.panel-head h3{margin:0;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.panel-head .meta{font-size:11px;color:var(--muted)}
.panel-body{padding:6px 4px}

.chart-wrap{position:relative;padding:14px 18px 18px}
.chart-legend{display:flex;gap:14px;font-size:11px;color:var(--muted);margin-bottom:10px;flex-wrap:wrap}
.chart-legend span{display:inline-flex;align-items:center;gap:5px}
.chart-legend i{width:8px;height:8px;border-radius:99px;display:inline-block}
svg.spark{display:block;width:100%;height:180px}
svg.spark .axis{stroke:var(--border);stroke-width:1}
svg.spark .grid{stroke:var(--border-soft);stroke-width:1;stroke-dasharray:2 3}
svg.spark .label{fill:var(--muted);font-size:10px;font-family:'Inter',sans-serif}
svg.spark .area{fill:url(#g1);opacity:.5}
svg.spark .line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
svg.spark .line2{stroke:var(--purple)}
svg.spark .line3{stroke:var(--green)}
svg.spark .dot{fill:var(--accent);stroke:var(--bg);stroke-width:2}

table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:12px 20px;font-size:13px;border-bottom:1px solid var(--border-soft)}
th{
  color:var(--muted);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.08em;
  background:rgba(15,22,38,.3);
}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:none}
tr.provider-row{transition:background .15s ease}
tr.provider-row:hover{background:rgba(91,158,255,.04)}

.badge{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;
  font-family:'Inter',sans-serif;letter-spacing:.2px;
}
.badge::before{
  content:'';width:5px;height:5px;border-radius:50%;
}
.badge.ok{background:rgba(60,228,136,.12);color:var(--green);border:1px solid rgba(60,228,136,.25)}
.badge.ok::before{background:var(--green);box-shadow:0 0 6px var(--green-glow)}
.badge.amber{background:rgba(255,181,71,.12);color:var(--amber);border:1px solid rgba(255,181,71,.25)}
.badge.amber::before{background:var(--amber)}
.badge.red{background:rgba(255,93,108,.12);color:var(--red);border:1px solid rgba(255,93,108,.25)}
.badge.red::before{background:var(--red);animation:pulse-dot 1.2s infinite}
.badge.muted-bg{background:var(--panel3);color:var(--muted);border:1px solid var(--border)}
.badge.muted-bg::before{background:var(--muted)}

.mini-bar{
  display:inline-block;width:60px;height:6px;background:var(--panel3);
  border-radius:99px;overflow:hidden;vertical-align:middle;margin-right:8px;
}
.mini-bar > span{
  display:block;height:100%;
  background:var(--accent-grad);border-radius:99px;
  transition:width .6s cubic-bezier(.2,.8,.2,1);
}
.mini-bar.green > span{background:linear-gradient(90deg,var(--green),#5fdca4)}
.mini-bar.red > span{background:linear-gradient(90deg,var(--red),#ff8a94)}
.mini-bar.amber > span{background:linear-gradient(90deg,var(--amber),#ffc774)}

.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;justify-content:space-between}
.group{
  border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden;
  background:var(--panel);transition:border-color .2s ease;
}
.group:hover{border-color:var(--panel3)}
.group .head{
  display:flex;align-items:center;justify-content:space-between;padding:14px 18px;
  background:linear-gradient(180deg,var(--panel2),var(--panel));
  cursor:pointer;transition:background .15s ease;
}
.group .head:hover{background:var(--panel3)}
.group .head h3{margin:0;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px}
.group .head .meta{font-size:11px;color:var(--muted);margin-top:2px}
.group .head-right{display:flex;gap:8px;align-items:center}
.group .body{padding:16px 18px;border-top:1px solid var(--border-soft);display:none}
.group.open .body{display:block}
.group .chev{transition:transform .2s ease;color:var(--muted)}
.group.open .chev{transform:rotate(180deg)}

.empty{color:var(--muted);font-size:13px;padding:30px;text-align:center}

.modal{
  position:fixed;inset:0;background:rgba(7,9,15,.7);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;
  animation:fade-in .2s ease;
}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
.modal.open{display:flex}
.dialog{
  background:linear-gradient(180deg,var(--panel),var(--panel2));
  border:1px solid var(--border);border-radius:18px;
  width:560px;max-width:94vw;padding:26px;max-height:92vh;overflow-y:auto;
  box-shadow:0 24px 60px rgba(0,0,0,.6);
  animation:pop-in .25s cubic-bezier(.2,.9,.3,1.2);
}
@keyframes pop-in{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.dialog h3{margin:0 0 6px;font-size:18px;font-weight:700;letter-spacing:-.2px}
.dialog .sub2{color:var(--muted);font-size:12px;margin-bottom:18px}

label{display:block;font-size:11px;color:var(--text-2);margin:14px 0 6px;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
input,select,textarea{
  width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
  border-radius:10px;padding:10px 13px;font-size:13px;font-family:inherit;
  transition:all .15s ease;
}
input:focus,select:focus,textarea:focus{
  outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(91,158,255,.15);
}
textarea{font-family:'JetBrains Mono',monospace;resize:vertical;min-height:100px;line-height:1.5}
pre.block{
  white-space:pre-wrap;word-break:break-word;background:var(--bg);
  border:1px solid var(--border);border-radius:10px;padding:14px;
  font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.65;
  color:var(--text-2);overflow:auto;
}
.row{display:flex;gap:10px}
.row>*{flex:1}
.actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px}
.hint{font-size:11px;color:var(--muted);margin-top:6px}

.activity{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;padding:14px 18px}
.activity::-webkit-scrollbar{width:6px}
.activity::-webkit-scrollbar-thumb{background:var(--border);border-radius:6px}
.activity-item{
  display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;
  font-size:12px;background:rgba(15,22,38,.4);border:1px solid transparent;
  transition:all .2s ease;animation:slide-in .3s ease;
}
@keyframes slide-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.activity-item:hover{background:rgba(91,158,255,.06);border-color:var(--border-soft)}
.activity-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.activity-dot.ok{background:var(--green);box-shadow:0 0 6px var(--green-glow)}
.activity-dot.fail{background:var(--red)}
.activity-dot.warn{background:var(--amber)}
.activity-text{flex:1;color:var(--text-2)}
.activity-text b{color:var(--text);font-weight:600}
.activity-time{color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}

.toast-container{position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:10px;z-index:200;pointer-events:none}
.toast{
  background:linear-gradient(135deg,var(--panel),var(--panel2));border:1px solid var(--border);
  border-radius:12px;padding:12px 16px;font-size:13px;color:var(--text);min-width:240px;
  box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;
  animation:toast-in .25s cubic-bezier(.2,.9,.3,1.2);pointer-events:auto;
}
.toast.success{border-color:rgba(60,228,136,.3)}
.toast.error{border-color:rgba(255,93,108,.3)}
.toast .ic{font-size:16px}
.toast.success .ic{color:var(--green)}
.toast.error .ic{color:var(--red)}
@keyframes toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes toast-out{to{opacity:0;transform:translateX(20px)}}

.testchat-result{
  margin-top:14px;padding:14px;border-radius:10px;
  background:var(--bg);border:1px solid var(--border);
  font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;
  color:var(--text-2);max-height:200px;overflow-y:auto;white-space:pre-wrap;
}
.testchat-result.ok{color:var(--green);border-color:rgba(60,228,136,.25)}
.testchat-result.err{color:var(--red);border-color:rgba(255,93,108,.25)}

.usage-ring{position:relative;width:140px;height:140px;margin:0 auto 8px}
.usage-ring svg{transform:rotate(-90deg)}
.usage-ring circle{fill:none;stroke-width:10;stroke-linecap:round}
.usage-ring .track{stroke:var(--panel3)}
.usage-ring .prog{stroke:url(#ringGrad);transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)}
.usage-ring .center{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.usage-ring .pct{font-size:26px;font-weight:700;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.usage-ring .lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

.freetiers-table td .name{font-weight:600;color:var(--text)}
.freetiers-table td .sub{font-size:11px;color:var(--muted);margin-top:2px}
.freetiers-bar{width:140px;height:8px;background:var(--panel3);border-radius:99px;overflow:hidden}
.freetiers-bar > div{
  height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));
  border-radius:99px;transition:width .6s cubic-bezier(.2,.8,.2,1);
}
.freetiers-bar.warn > div{background:linear-gradient(90deg,var(--amber),#ffd184)}
.freetiers-bar.danger > div{background:linear-gradient(90deg,var(--red),#ff8a94)}

@media(max-width:900px){
  .app{grid-template-columns:64px 1fr}
  .sidebar .nav-label,.sidebar .nav button span.t,.sidebar .brand-name,.sidebar .brand-tag,.sidebar .config-path,.sidebar .status-row span.txt{display:none}
  .brand{padding:6px 4px 20px;justify-content:center}
  .nav button{justify-content:center;padding:10px}
  .topbar{padding:14px 18px}
  .content{padding:18px}
}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar">
  <div class="brand">
    <div class="brand-mark">✈</div>
    <div><div class="brand-name">AirRoute</div><div class="brand-tag">Free AI Gateway</div></div>
  </div>
  <div class="nav-label">Console</div>
  <nav class="nav" id="nav">
    <button data-view="dashboard" class="active"><span class="ic">📊</span><span class="t">Dashboard</span></button>
    <button data-view="providers"><span class="ic">🔌</span><span class="t">Providers</span><span class="pill" id="pill-prov">0</span></button>
    <button data-view="routes"><span class="ic">🔁</span><span class="t">Routes</span><span class="pill" id="pill-routes">0</span></button>
    <button data-view="models"><span class="ic">🤖</span><span class="t">Models</span><span class="pill" id="pill-models">0</span></button>
    <button data-view="freetiers"><span class="ic">🎁</span><span class="t">Free Tiers</span></button>
    <button data-view="setup"><span class="ic">⚙️</span><span class="t">Setup</span></button>
  </nav>
  <div class="side-foot">
    <div class="status-row"><div class="status-dot" id="liveDot"></div><span class="txt" id="uptime">connecting…</span></div>
    <div class="config-path" id="configPath"></div>
  </div>
</aside>
<div class="main">
  <div class="topbar">
    <div>
      <h1 id="pageTitle">Dashboard <span class="live-tag"><span class="dot"></span>LIVE</span></h1>
      <div class="sub" id="pageSub">Live usage across your free providers</div>
    </div>
    <div class="topbar-actions">
      <button class="btn ghost" onclick="manualRefresh()" title="Refresh now">↻ Refresh</button>
      <button class="btn" onclick="openQuickTest()" title="Send a test chat">⚡ Test</button>
    </div>
  </div>
  <div class="content" id="main"></div>
</div>
</div>
<div class="modal" id="modal"><div class="dialog" id="dialog"></div></div>
<div class="toast-container" id="toasts"></div>

<script>
// ── State ────────────────────────────────────────────────────────────────
let CONFIG=null, STATS=null, HEALTH=null, VIEW='dashboard';
let PREV_STATS=null;
let HISTORY=[];          // [{calls,ok,failed,tokensIn,tokensOut,ts}]
const MAX_HISTORY=40;
const HISTORY_INTERVAL=2000;

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'''}[c]));
const num=v=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0});
const fmtDur=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return(h?h+'h ':'')+(m?m+'m ':'')+sec+'s'};

// ── Toast ────────────────────────────────────────────────────────────────
function toast(msg, kind='success', icon='✓'){
  const t=document.createElement('div');
  t.className='toast '+kind;
  t.innerHTML='<span class="ic">'+icon+'</span><span>'+esc(msg)+'</span>';
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.style.animation='toast-out .25s ease forwards';setTimeout(()=>t.remove(),250)},3000);
}

// ── Nav ──────────────────────────────────────────────────────────────────
$('#nav').addEventListener('click',e=>{
  const b=e.target.closest('[data-view]');
  if(b){VIEW=b.dataset.view;render();}
});

// ── Data loading ─────────────────────────────────────────────────────────
async function loadAll(){
  try{
    const [c,s]=await Promise.all([fetch('/api/config').then(r=>r.json()),fetch('/stats').then(r=>r.json())]);
    CONFIG=c; PREV_STATS=STATS; STATS=s;
    pushHistory(s);
    $('#configPath').textContent='config: '+CONFIG.configPath;
    $('#pill-prov').textContent=Object.keys(CONFIG.providers||{}).length;
    $('#pill-routes').textContent=Object.keys(CONFIG.routes||{}).length;
    let modelCount=1; // auto
    for(const r in CONFIG.routes||{})modelCount++;
    for(const p in CONFIG.providers||{})modelCount+=(CONFIG.providers[p].models||[]).length;
    $('#pill-models').textContent=modelCount;
    refreshHealth();
  }catch(e){console.error(e);$('#liveDot').classList.add('offline');}
}
async function refreshHealth(){
  try{HEALTH=await fetch('/api/health').then(r=>r.json());$('#liveDot').classList.remove('offline');}
  catch(e){HEALTH=null;$('#liveDot').classList.add('offline');}
  render();
}
function pushHistory(s){
  const t=(s.totals||{});
  HISTORY.push({ts:Date.now(),calls:t.calls||0,ok:t.ok||0,failed:t.failed||0,tokensIn:t.tokensIn||0,tokensOut:t.tokensOut||0});
  if(HISTORY.length>MAX_HISTORY)HISTORY.shift();
}
function manualRefresh(){loadAll();toast('Refreshed','success','↻');}

// ── Health badge ─────────────────────────────────────────────────────────
function healthOf(n){
  const h=HEALTH&&HEALTH[n];
  if(!h)return '<span class="badge muted-bg">…</span>';
  if(h.reason==='missing-key')return '<span class="badge amber">No key</span>';
  if(h.reason==='configured-only')return '<span class="badge amber">Configured</span>';
  if(h.ok)return '<span class="badge ok">'+h.latencyMs+'ms</span>';
  return '<span class="badge red">Down '+(h.status||'?')+'</span>';
}

// ── Flash value on change ────────────────────────────────────────────────
function flashVal(el){
  if(!el)return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
function deltaStr(curr, prev){
  if(prev==null)return '';
  const d=curr-prev;
  if(d===0)return '<span class="delta" style="color:var(--muted)">—</span>';
  const sign=d>0?'▲':'▼';
  const cls=d>0?'up':'down';
  return '<span class="delta '+cls+'">'+sign+' '+num(Math.abs(d))+'</span>';
}

// ── Render dispatcher ────────────────────────────────────────────────────
function render(){
  if(!STATS)return;
  $('#uptime').textContent='Live · up '+fmtDur(STATS.uptimeSec);
  $('#main').innerHTML = VIEW==='dashboard'?viewDashboard() : VIEW==='providers'?viewProviders() : VIEW==='routes'?viewRoutes() : VIEW==='models'?viewModels() : VIEW==='freetiers'?viewFreetiers() : viewSetup();
  $('#pageTitle').innerHTML = pageTitleFor(VIEW);
  $('#pageSub').textContent = pageSubFor(VIEW);
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===VIEW));
  $$('[data-edit]').forEach(b=>b.addEventListener('click',onEdit));
  $$('[data-del]').forEach(b=>b.addEventListener('click',onDelete));
  $$('[data-add]').forEach(b=>b.addEventListener('click',onAdd));
  $$('[data-toggle]').forEach(b=>b.addEventListener('click',e=>{
    const g=e.currentTarget.closest('.group');if(g)g.classList.toggle('open');
  }));
  $$('[data-copy]').forEach(b=>b.addEventListener('click',async ()=>{
    const pre=document.getElementById(b.dataset.copy); if(!pre)return;
    try{await navigator.clipboard.writeText(pre.textContent);const t=b.textContent;b.textContent='✓ Copied';setTimeout(()=>b.textContent=t,1200);}
    catch(e){toast('Copy failed','error','✕');}
  }));
  if(VIEW==='freetiers') loadFreetiers();
  if(VIEW==='setup') bindTest();
}

function pageTitleFor(v){
  const map={dashboard:'Dashboard <span class="live-tag"><span class="dot"></span>LIVE</span>',providers:'Providers',routes:'Routes',models:'Models',freetiers:'Free Tiers',setup:'Setup'};
  return map[v]||v;
}
function pageSubFor(v){
  const map={
    dashboard:'Live usage across your free providers',
    providers:'Add or edit free providers — changes apply instantly',
    routes:'Ordered failover chains — first healthy model wins',
    models:'Every requestable model id across routes and providers',
    freetiers:'Approximate monthly free allowances and budget tracking',
    setup:'Connect your CLI or IDE to this gateway'
  };
  return map[v]||'';
}

// ── Dashboard ────────────────────────────────────────────────────────────
function viewDashboard(){
  const t=STATS.totals||{};
  const pt=PREV_STATS?.totals||{};
  const successRate = t.calls?Math.round((t.ok/t.calls)*100):100;
  const failRate = t.calls?Math.round((t.failed/t.calls)*100):0;

  const cards=[
    ['Total Requests',t.calls,'📊','default',pt.calls],
    ['Successful',t.ok,'✓','green',pt.ok],
    ['Failed',t.failed,'✕','red',pt.failed],
    ['In Flight',STATS.requestsInFlight,'⚡','amber',null],
    ['Tokens In',t.tokensIn,'⬇','purple',pt.tokensIn],
    ['Tokens Out',t.tokensOut,'⬆','default',pt.tokensOut],
    ['Success Rate',successRate+'%','📈','green',null],
    ['Failure Rate',failRate+'%','📉','red',null],
  ];
  const cardsHtml = cards.map(([l,v,icon,kind,prev])=>{
    return '<div class="card '+kind+'"><div class="icon">'+icon+'</div>'+
      '<div class="v" data-val>'+num(v)+(typeof v==='string'&&v.includes('%')?'':'')+'</div>'+
      '<div class="l">'+l+'</div>'+(prev!=null?'<div style="margin-top:4px">'+deltaStr(typeof v==='number'?v:0,prev)+'</div>':'')+'</div>';
  }).join('');

  // Provider table
  let pr='';
  const provArr=Object.entries(STATS.providers||{});
  const totalCalls=Math.max(1,provArr.reduce((a,[,s])=>a+s.calls,0));
  for(const[n,s]of provArr){
    const pct=Math.round((s.calls/totalCalls)*100);
    const barCls=s.failed>s.ok?'red':s.ok?'green':'amber';
    const errShort=s.lastError?(s.lastError.length>50?s.lastError.slice(0,50)+'…':s.lastError):'—';
    pr+='<tr class="provider-row"><td><b>'+esc(n)+'</b> '+healthOf(n)+'</td>'+
      '<td class="num">'+s.calls+'</td>'+
      '<td class="num"><span style="color:var(--green)">'+s.ok+'</span></td>'+
      '<td class="num"><span style="color:var(--red)">'+(s.failed||0)+'</span></td>'+
      '<td class="num">'+(s.rateLimited||0)+'</td>'+
      '<td class="num">'+num(s.tokensIn||0)+' / '+num(s.tokensOut||0)+'</td>'+
      '<td><span class="mini-bar '+barCls+'"><span style="width:'+pct+'%"></span></span><span style="font-size:11px;color:var(--muted)">'+pct+'%</span></td>'+
      '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:JetBrains Mono,monospace;font-size:11px;color:var(--muted)" title="'+esc(s.lastError||'')+'">'+esc(errShort)+'</td></tr>';
  }

  // Routes table
  let ro='';
  for(const[n,s]of Object.entries(STATS.routes||{})){
    const rate=s.calls?Math.round((s.ok/s.calls)*100):100;
    const cls=rate>=95?'green':rate>=70?'amber':'red';
    ro+='<tr><td><b>'+esc(n)+'</b></td>'+
      '<td class="num">'+s.calls+'</td>'+
      '<td class="num"><span style="color:var(--green)">'+s.ok+'</span></td>'+
      '<td class="num"><span style="color:var(--red)">'+(s.failed||0)+'</span></td>'+
      '<td><span class="mini-bar '+cls+'"><span style="width:'+rate+'%"></span></span><span style="font-size:11px;color:var(--text-2);font-weight:600;margin-left:8px">'+rate+'%</span></td></tr>';
  }

  // Activity feed (synthesized from history)
  let activity='';
  if(HISTORY.length>=2){
    const last=HISTORY[HISTORY.length-1],prev=HISTORY[HISTORY.length-2];
    const dc=last.calls-prev.calls,df=last.failed-prev.failed;
    if(dc>0){
      const failCount=df;
      const okCount=dc-df;
      if(okCount>0)activity+='<div class="activity-item"><div class="activity-dot ok"></div><div class="activity-text"><b>'+okCount+'</b> request'+(okCount>1?'s':'')+' succeeded</div><div class="activity-time">just now</div></div>';
      if(failCount>0)activity+='<div class="activity-item"><div class="activity-dot fail"></div><div class="activity-text"><b>'+failCount+'</b> request'+(failCount>1?'s':'')+' failed over to next provider</div><div class="activity-time">just now</div></div>';
    }
  }
  activity+='<div class="activity-item"><div class="activity-dot ok"></div><div class="activity-text">Gateway serving on <b>'+esc(CONFIG?.configPath||'localhost')+'</b></div><div class="activity-time">'+fmtDur(STATS.uptimeSec)+'</div></div>';
  activity+='<div class="activity-item"><div class="activity-dot ok"></div><div class="activity-text"><b>'+Object.keys(STATS.providers||{}).length+'</b> provider'+(Object.keys(STATS.providers||{}).length!==1?'s':'')+' tracked · <b>'+(STATS.tokensIn+STATS.tokensOut)+'</b> tokens processed</div><div class="activity-time">total</div></div>';

  return '<div class="cards">'+cardsHtml+'</div>'+
    '<div class="grid-2">'+
      '<div class="panel"><div class="panel-head"><h3>📈 Throughput</h3><span class="meta">last '+HISTORY.length+' samples</span></div>'+
        '<div class="chart-wrap"><div class="chart-legend"><span><i style="background:var(--accent)"></i>Requests</span><span><i style="background:var(--green)"></i>Success</span><span><i style="background:var(--red)"></i>Failed</span></div>'+
          sparkChart()+
        '</div></div>'+
      '<div class="panel"><div class="panel-head"><h3>⚡ Activity</h3><span class="meta">real-time</span></div>'+
        '<div class="activity">'+activity+'</div></div>'+
    '</div>'+
    '<div class="section-title"><h2>Providers</h2><span class="meta">'+Object.keys(STATS.providers||{}).length+' total · '+Object.values(STATS.providers||{}).filter(s=>s.ok>0&&!s.inCooldown).length+' healthy</span></div>'+
    '<div class="panel"><table><thead><tr><th>Provider</th><th class="num">Calls</th><th class="num">OK</th><th class="num">Fail</th><th class="num">429</th><th class="num">Tokens In/Out</th><th>Share</th><th>Last Error</th></tr></thead><tbody>'+(pr||'<tr><td colspan="8" class="empty">No data yet — send a request!</td></tr>')+'</tbody></table></div>'+
    '<div class="section-title"><h2>Routes</h2><span class="meta">'+Object.keys(STATS.routes||{}).length+' configured</span></div>'+
    '<div class="panel"><table><thead><tr><th>Route</th><th class="num">Calls</th><th class="num">OK</th><th class="num">Failed</th><th>Success Rate</th></tr></thead><tbody>'+(ro||'<tr><td colspan="5" class="empty">No routes called yet</td></tr>')+'</tbody></table></div>';
}

// ── SVG sparkline ────────────────────────────────────────────────────────
function sparkChart(){
  if(HISTORY.length<2)return '<svg class="spark" viewBox="0 0 600 180"><text x="300" y="90" fill="var(--muted)" font-size="12" text-anchor="middle">Waiting for data…</text></svg>';
  const W=600,H=180,PAD={t:18,r:14,b:24,l:36};
  const innerW=W-PAD.l-PAD.r, innerH=H-PAD.t-PAD.b;
  const series=[
    {key:'calls',color:'var(--accent)',cls:'line'},
    {key:'ok',color:'var(--green)',cls:'line line3'},
    {key:'failed',color:'var(--red)',cls:'line line2'},
  ];
  const max=Math.max(1,...HISTORY.flatMap(h=>series.map(s=>h[s.key]||0)));
  const step=innerW/(HISTORY.length-1);

  let gridLines='';
  for(let i=0;i<=4;i++){
    const y=PAD.t+innerH*(i/4);
    const v=Math.round(max*(1-i/4));
    gridLines+='<line class="grid" x1="'+PAD.l+'" y1="'+y+'" x2="'+PAD.l+innerW+'" y2="'+y+'"/>';
    gridLines+='<text class="label" x="'+ (PAD.l-6)+'" y="'+(y+3)+'" text-anchor="end">'+v+'</text>';
  }

  let pathStr='';
  series.forEach((s,si)=>{
    let d='';
    HISTORY.forEach((h,i)=>{
      const x=PAD.l+i*step;
      const y=PAD.t+innerH*(1-(h[s.key]||0)/max);
      d+=(i===0?'M':' L')+x.toFixed(1)+' '+y.toFixed(1);
    });
    pathStr+='<path class="'+s.cls+'" stroke="'+s.color+'" d="'+d+'"/>';
  });

  let dots='';
  const last=HISTORY[HISTORY.length-1];
  series.forEach(s=>{
    const x=PAD.l+(HISTORY.length-1)*step;
    const y=PAD.t+innerH*(1-(last[s.key]||0)/max);
    dots+='<circle class="dot" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="'+s.color+'"/>';
  });

  const t0=new Date(HISTORY[0].ts), t1=new Date(HISTORY[HISTORY.length-1].ts);
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".4"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'+
    gridLines+pathStr+dots+
    '<text class="label" x="'+PAD.l+'" y="'+(H-6)+'">'+t0.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</text>'+
    '<text class="label" x="'+(PAD.l+innerW)+'" y="'+(H-6)+'" text-anchor="end">'+t1.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</text>'+
  '</svg>';
}

// ── Providers ────────────────────────────────────────────────────────────
function viewProviders(){
  let rows='';
  for(const[name,p]of Object.entries(CONFIG.providers||{})){
    rows+='<div class="group open"><div class="head" data-toggle><div><h3>'+esc(name)+' '+healthOf(name)+
      (p.keySet?' <span class="badge ok" style="margin-left:6px">Key set</span>':p.keyless?' <span class="badge muted-bg" style="margin-left:6px">Keyless</span>':' <span class="badge amber" style="margin-left:6px">No key</span>')+
      '</h3><div class="meta">'+esc(p.type)+' · '+p.models.length+' model'+(p.models.length!==1?'s':'')+' · '+esc((p.baseUrl||'').replace(/^https?:\/\//,'').slice(0,40))+'</div></div>'+
      '<div class="head-right"><button class="btn ghost sm" data-edit="'+esc(name)+'">Edit</button>'+
      '<button class="btn danger sm" data-del="'+esc(name)+'">Delete</button>'+
      '<span class="chev">▼</span></div></div>'+
      '<div class="body"><div style="display:flex;flex-wrap:wrap;gap:6px">'+
        p.models.map(m=>'<span style="font-family:JetBrains Mono,monospace;font-size:11px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text-2)">'+esc(m)+'</span>').join('')+
      '</div></div></div>';
  }
  return '<div class="toolbar"><div></div><button class="btn" data-add="provider">+ Add Provider</button></div>'+
    (rows||'<div class="empty">No providers configured.</div>');
}

// ── Routes ───────────────────────────────────────────────────────────────
function viewRoutes(){
  let rows='';
  for(const[name,list]of Object.entries(CONFIG.routes||{})){
    const s=STATS.routes?.[name]||{calls:0,ok:0,failed:0};
    const rate=s.calls?Math.round((s.ok/s.calls)*100):100;
    rows+='<div class="group open"><div class="head" data-toggle><div><h3>'+esc(name)+'</h3>'+
      '<div class="meta">'+list.length+' step'+(list.length!==1?'s':'')+' · '+s.calls+' calls · '+
      '<span style="color:'+(rate>=95?'var(--green)':rate>=70?'var(--amber)':'var(--red)')+'">'+rate+'% success</span></div></div>'+
      '<div class="head-right"><button class="btn ghost sm" data-edit="'+esc(name)+'">Edit</button>'+
      '<button class="btn danger sm" data-del="'+esc(name)+'">Delete</button>'+
      '<span class="chev">▼</span></div></div>'+
      '<div class="body"><div style="display:flex;flex-direction:column;gap:8px">'+
        list.map((e,i)=>{
          const prov=e.split('/')[0];
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px">'+
            '<span style="font-size:11px;color:var(--muted);font-weight:600;min-width:20px">'+(i+1)+'</span>'+
            '<span style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text);flex:1">'+esc(e)+'</span>'+
            healthOf(prov)+
          '</div>';
        }).join('')+
      '</div></div></div>';
  }
  return '<div class="toolbar"><div></div><button class="btn" data-add="route">+ Add Route</button></div>'+
    (rows||'<div class="empty">No routes configured.</div>');
}

// ── Models ───────────────────────────────────────────────────────────────
function viewModels(){
  let rows='';
  for(const[name,p]of Object.entries(CONFIG.providers||{}))for(const m of (p.models||[])){
    rows+='<tr><td style="font-family:JetBrains Mono,monospace;font-size:12px"><b>'+esc(name)+'</b>/'+esc(m)+'</td>'+
      '<td><span class="badge muted-bg">'+esc(p.type)+'</span></td>'+
      '<td>'+healthOf(name)+'</td></tr>';
  }
  let routes='';
  routes+='<tr><td><b style="color:var(--accent)">auto</b></td><td>Adaptive — picks the best healthy provider by latency, rotates to spread load.</td></tr>';
  for(const[name,list]of Object.entries(CONFIG.routes||{})){
    routes+='<tr><td><b>'+esc(name)+'</b></td><td>'+esc(list.map(e=>e.split('/')[0]).join(', '))+'</td></tr>';
  }
  return '<div class="section-title"><h2>Routes</h2></div><div class="panel"><table><thead><tr><th style="width:140px">Route</th><th>Underlying Providers</th></tr></thead><tbody>'+routes+'</tbody></table></div>'+
    '<div class="section-title"><h2>Provider Models</h2><span class="meta">'+rows.split('<tr>').length-1+' total</span></div>'+
    '<div class="panel"><table><thead><tr><th>Model ID</th><th style="width:120px">Type</th><th style="width:140px">Health</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

// ── Free tiers ───────────────────────────────────────────────────────────
function viewFreetiers(){
  return '<div class="cards"><div class="card purple"><div class="icon">🎁</div><div class="v" id="ftTotal">—</div><div class="l">Pooled monthly cap</div></div>'+
    '<div class="card green"><div class="icon">✓</div><div class="v" id="ftFree">—</div><div class="l">Free forever</div></div>'+
    '<div class="card default"><div class="icon">📊</div><div class="v" id="ftUsed">—</div><div class="l">Tokens used (session)</div></div></div>'+
    '<div id="ftContainer"><div class="empty">Loading free tier data…</div></div>';
}
async function loadFreetiers(){
  const el=document.getElementById('ftContainer'); if(!el)return;
  let items;
  try{items=await fetch('/api/freetiers').then(r=>r.json());}catch(e){el.innerHTML='<div class="empty">Failed to load free tier data.</div>';return;}
  const totalCap=items.reduce((a,x)=>a+(x.capTokens||0),0);
  const usedAll=items.reduce((a,x)=>a+x.usedTokens,0);
  const freeForever=items.filter(x=>x.freeForever).length;
  document.getElementById('ftTotal').textContent=num(totalCap);
  document.getElementById('ftFree').textContent=freeForever;
  document.getElementById('ftUsed').textContent=num(usedAll);
  let rows='';
  for(const x of items){
    const pct=x.capTokens?Math.min(100,Math.round(x.usedTokens/x.capTokens*100)):0;
    const cls=pct>=90?'danger':pct>=70?'warn':'';
    rows+='<tr><td><div class="name">'+esc(x.provider)+'</div><div class="sub">'+esc(x.model)+'</div></td>'+
      '<td>'+(x.freeForever?'<span class="badge ok">Free forever</span>':x.capTokens?num(x.capTokens)+' / mo':'—')+'</td>'+
      '<td class="num">'+num(x.usedTokens)+'</td>'+
      '<td class="num">'+(x.remainingTokens!=null?num(x.remainingTokens):'∞')+'</td>'+
      '<td><div class="freetiers-bar '+cls+'"><div style="width:'+pct+'%"></div></div></td>'+
      '<td style="font-size:11px;color:var(--muted);max-width:240px">'+esc(x.note)+'</td></tr>';
  }
  el.outerHTML='<div class="panel freetiers-table"><table><thead><tr><th>Provider · Model</th><th>Cap</th><th class="num">Used</th><th class="num">Remaining</th><th>Budget</th><th>Note</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

// ── Setup ────────────────────────────────────────────────────────────────
function viewSetup(){
  const o=window.location.origin;
  const oai=o+'/v1';
  return '<div style="background:rgba(255,181,71,.08);border:1px solid rgba(255,181,71,.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:13px;display:flex;gap:10px;align-items:flex-start">'+
    '<span style="font-size:18px">⚠️</span><div><b>Pollinations.ai now requires a free API key.</b> Get one at <a href="https://enter.pollinations.ai/keys" target="_blank" style="color:var(--accent)">enter.pollinations.ai/keys</a> and set <code style="background:var(--panel3);padding:2px 6px;border-radius:4px">POLLINATIONS_API_KEY</code> in your environment.</div></div>'+
    '<div class="grid-2">'+
      blk('claude','Claude Code (Anthropic)','# add to your shell profile\nexport ANTHROPIC_BASE_URL='+o+'\nexport ANTHROPIC_AUTH_TOKEN=airroute\nexport ANTHROPIC_MODEL=coder')+
      blk('opencode','OpenCode (OpenAI)','export OPENAI_BASE_URL='+oai+'\nexport OPENAI_API_KEY=airroute\n\nopencode run --model default "write tests"')+
    '</div>'+
    '<div class="grid-3" style="margin-top:18px">'+
      blk('cline','Cline (VS Code)','Settings → API Provider → OpenAI Compatible\nBase URL: '+oai+'\nAPI Key: airroute\nModel ID: coder')+
      blk('continue','Continue (VS Code)','Add to config.json:\n{\n  "title": "AirRoute",\n  "provider": "openai",\n  "model": "coder",\n  "apiBase": "'+oai+'",\n  "apiKey": "airroute"\n}')+
      blk('cursor','Cursor','Settings → Models → custom OpenAI API\nBase URL: '+oai+'\nAPI Key: airroute')+
    '</div>'+
    '<div class="grid-2" style="margin-top:18px">'+
      blk('generic','Generic OpenAI tools','export OPENAI_BASE_URL='+oai+'\nexport OPENAI_API_KEY=airroute')+
      blk('agent','Bundled local agent','# from the AirRoute project folder\nnode dist/index.js --via gateway "add unit tests"\nnode dist/index.js --via gateway --model coder "refactor the API"')+
    '</div>'+
    blk('health','Quick health check','curl '+o+'/health\ncurl '+o+'/stats | jq .','','mt18')+
    '<div class="panel" style="margin-top:18px"><div class="panel-head"><h3>⚡ Live Connection Test</h3><span class="meta">Sends a real chat request</span></div>'+
    '<div style="padding:18px"><button class="btn" id="testchat">Send Test Message</button>'+
    '<pre class="block" id="testout" style="margin-top:14px">Click the button to test…</pre></div></div>';
}
function blk(kind,title,pre,extra=''){
  const id='cp-'+kind;
  return '<div class="panel '+extra+'"><div class="panel-head"><h3>'+esc(title)+'</h3><button class="btn ghost sm" data-copy="'+id+'">Copy</button></div>'+
    '<div style="padding:14px 18px"><pre class="block" id="'+id+'">'+esc(pre)+'</pre></div></div>';
}
function bindTest(){
  const b=document.getElementById('testchat'); if(!b)return;
  b.addEventListener('click',async()=>{
    const out=document.getElementById('testout');
    out.className='block';out.textContent='sending…';
    const t0=Date.now();
    try{
      const r=await fetch(window.location.origin+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'auto',messages:[{role:'user',content:'Reply with one word: OK'}]})});
      const j=await r.json();
      const dt=Date.now()-t0;
      if(r.status===200){
        const msg=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'(empty)';
        out.className='testchat-result ok';
        out.textContent='✓ HTTP 200 · '+dt+'ms\nModel: '+(j.model||'?')+'\nResponse: '+msg;
        toast('Test passed in '+dt+'ms','success','✓');
      }else{
        out.className='testchat-result err';
        out.textContent='✕ HTTP '+r.status+' · '+dt+'ms\n'+(j.error&&j.error.message||JSON.stringify(j));
        toast('Test failed: HTTP '+r.status,'error','✕');
      }
    }catch(e){out.className='testchat-result err';out.textContent='✕ Request failed: '+e.message;toast('Test failed: '+e.message,'error','✕');}
  });
}
function openQuickTest(){
  VIEW='setup';render();setTimeout(()=>{const b=document.getElementById('testchat');if(b)b.click();},200);
}

// ── Modal handlers ───────────────────────────────────────────────────────
function onAdd(e){
  const kind=e.target.dataset.add;
  $('#modal').classList.add('open');
  if(kind==='provider')openProviderForm(null);
  else openRouteForm(null);
}
function onEdit(e){
  const name=e.target.dataset.edit;
  $('#modal').classList.add('open');
  if(CONFIG.providers[name]!=null)openProviderForm(name);
  else openRouteForm(name);
}
function onDelete(e){
  const name=e.target.dataset.del;
  const kind=CONFIG.providers[name]!=null?'provider':'route';
  if(!confirm('Delete '+kind+' "'+name+'"? This cannot be undone.'))return;
  fetch('/api/'+kind+'s',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({name})})
    .then(r=>r.json()).then(j=>{
      if(j.error){toast(j.error,'error','✕');}
      else{toast(kind+' "'+name+'" deleted','success','✓');loadAll();}
    });
}
function closeModal(){$('#modal').classList.remove('open');}

function openProviderForm(name){
  const p=name&&CONFIG.providers[name];
  $('#dialog').innerHTML='<h3>'+(p?'Edit provider':'Add provider')+'</h3><div class="sub2">Provider type determines how the gateway talks to it. Keys are stored locally in the config file.</div>'+
    '<label>Provider name</label><input id="f-name" value="'+esc(p?name:'')+'" placeholder="e.g. mistral"'+(p?' disabled':'')+'>'+
    '<label>Type</label><select id="f-type">'+
      '<option value="openai"'+(p&&p.type==='openai'?' selected':'')+'>openai (OpenRouter / Groq / GitHub / any OpenAI-compatible)</option>'+
      '<option value="gemini"'+(p&&p.type==='gemini'?' selected':'')+'>gemini (Google)</option>'+
      '<option value="cloudflare"'+(p&&p.type==='cloudflare'?' selected':'')+'>cloudflare (Workers AI)</option></select>'+
    '<label>Base URL <span class="hint">(openai type only)</span></label><input id="f-base" value="'+esc(p?p.baseUrl||'':'')+'" placeholder="https://api.example.com/v1">'+
    '<label>API key</label><input id="f-key" type="password" value="'+esc(p?p.keySet?'__SET__':'':'')+'" placeholder="'+(p&&p.keySet?'(leave blank to keep existing)':'paste key or ENV:VAR')+'">'+
    '<label>Account ID <span class="hint">(cloudflare only)</span></label><input id="f-acct" value="'+esc(p?(p.accountSet?'__SET__':''):'')+'" placeholder="'+(p&&p.accountSet?'(leave blank to keep existing)':'32-char account id')+'">'+
    '<label>Models <span class="hint">(comma separated)</span></label><input id="f-models" value="'+esc(p?p.models.join(', '):'')+'" placeholder="model-a, model-b">'+
    '<div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="f-save">Save</button></div>';
  $('#f-save').onclick=()=>{
    const base=document.getElementById('f-base').value.trim();
    const body={name:document.getElementById('f-name').value.trim(),provider:{type:$('#f-type').value}};
    if(base)body.provider.baseUrl=base;
    const key=document.getElementById('f-key').value.trim();
    if(key&&key!=='__SET__')body.provider.apiKey=key;
    const acct=document.getElementById('f-acct').value.trim();
    if(acct&&acct!=='__SET__')body.provider.accountId=acct;
    body.provider.models=document.getElementById('f-models').value.split(',').map(x=>x.trim()).filter(Boolean);
    if(!body.name){toast('Name is required','error','✕');return;}
    fetch('/api/providers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(r=>r.json()).then(j=>{
        if(j.error){toast(j.error,'error','✕');}
        else{toast('Provider "'+body.name+'" saved','success','✓');closeModal();loadAll();}
      });
  };
}

function openRouteForm(name){
  const r=name&&CONFIG.routes[name];
  $('#dialog').innerHTML='<h3>'+(r?'Edit route':'Add route')+'</h3><div class="sub2">One failover step per line, as <code style="color:var(--accent)">provider/model</code>. Order matters — first healthy model wins.</div>'+
    '<label>Route name</label><input id="r-name" value="'+esc(r?name:'')+'" placeholder="e.g. default"'+(r?' disabled':'')+'>'+
    '<label>Failover chain (provider/model per line)</label><textarea id="r-list">'+esc(r?r.list.join('\n'):'')+'</textarea>'+
    '<div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="r-save">Save</button></div>';
  $('#r-save').onclick=()=>{
    const list=document.getElementById('r-list').value.split('\n').map(x=>x.trim()).filter(Boolean);
    const nm=document.getElementById('r-name').value.trim();
    if(!nm){toast('Name is required','error','✕');return;}
    if(!list.length){toast('At least one entry required','error','✕');return;}
    fetch('/api/routes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:nm,list})})
      .then(r=>r.json()).then(j=>{
        if(j.error){toast(j.error,'error','✕');}
        else{toast('Route "'+nm+'" saved','success','✓');closeModal();loadAll();}
      });
  };
}

// ── Boot ─────────────────────────────────────────────────────────────────
loadAll();
refreshHealth();
setInterval(()=>{fetch('/stats').then(r=>r.json()).then(s=>{PREV_STATS=STATS;STATS=s;pushHistory(s);if(VIEW==='dashboard'){render();flashVal(document.querySelector('.card .v'));}}).catch(()=>{});},HISTORY_INTERVAL);
setInterval(refreshHealth, 15000);
// Initial render after data loads (loadAll triggers refreshHealth which calls render)
</script>
</body>
</html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}
