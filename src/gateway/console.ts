import type { ServerResponse } from "node:http";

export function serveConsole(res: ServerResponse): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gateway Console</title>
<style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#131722;--panel2:#1a1f2e;--border:#232a3b;--text:#e7ebf4;--muted:#8a93a8;--accent:#4f8cff;--green:#37d67a;--red:#f26d6d;--amber:#f5b642}
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--text);display:flex;min-height:100vh}
.sidebar{width:232px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);padding:18px 12px;position:sticky;top:0;height:100vh;display:flex;flex-direction:column}
.logo{display:flex;align-items:center;gap:10px;padding:4px 10px 16px}
.logo .dot{width:11px;height:11px;border-radius:4px;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.logo b{font-size:15px;letter-spacing:.3px}
.logo span{font-size:10px;color:var(--muted);display:block;margin-top:1px}
.nav{display:flex;flex-direction:column;gap:3px;margin-top:8px}
.nav button{background:none;border:none;color:var(--muted);text-align:left;padding:9px 12px;border-radius:8px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:10px}
.nav button .ic{width:16px;text-align:center;opacity:.8}
.nav button:hover{background:var(--panel2);color:var(--text)}
.nav button.active{background:var(--panel2);color:var(--text);font-weight:600;box-shadow:inset 2px 0 0 var(--accent)}
.side-foot{margin-top:auto;font-size:11px;color:var(--muted);padding:12px 10px 0;border-top:1px solid var(--border)}
.side-foot .p{font-family:monospace;font-size:10px;word-break:break-all;margin:4px 0 0}
.main{flex:1;padding:26px 32px;overflow-y:auto;max-height:100vh}
h1{font-size:19px;margin:0 0 4px}
.sub{color:var(--muted);font-size:13px;margin-bottom:22px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
.card .v{font-size:26px;font-weight:700}
.card .l{font-size:12px;color:var(--muted);margin-top:3px}
h2{font-size:13px;margin:26px 0 12px;color:#cdd3e0;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;background:var(--panel);border-radius:12px;overflow:hidden;border:1px solid var(--border)}
th,td{text-align:left;padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.06em;background:var(--panel2)}
tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600}
.ok{background:rgba(55,214,122,.14);color:var(--green)}
.amber{background:rgba(245,182,66,.14);color:var(--amber)}
.red{background:rgba(242,109,109,.14);color:var(--red)}
.muted-bg{background:rgba(138,146,168,.12);color:var(--muted)}
.btn{background:var(--accent);color:#0b0d12;border:none;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.btn.ghost{background:var(--panel2);color:var(--text);border:1px solid var(--border)}
.btn.danger{background:rgba(242,109,109,.15);color:var(--red);border:1px solid rgba(242,109,109,.3)}
.btn.sm{padding:5px 10px;font-size:12px}
.btn:hover{filter:brightness(1.1)}
.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;justify-content:space-between}
.group{border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden;background:var(--panel)}
.group .head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--panel2)}
.group .head h3{margin:0;font-size:14px}
.group .head .meta{font-size:11px;color:var(--muted);margin-top:3px}
.group .body{padding:14px 16px}
.group .body.hidden{display:none}
.empty{color:var(--muted);font-size:13px;padding:20px;text-align:center}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:50}
.modal.open{display:flex}
.dialog{background:var(--panel);border:1px solid var(--border);border-radius:14px;width:520px;max-width:94vw;padding:22px;max-height:92vh;overflow-y:auto}
.dialog h3{margin:0 0 6px;font-size:16px}
.dialog .sub2{color:var(--muted);font-size:12px;margin-bottom:6px}
label{display:block;font-size:12px;color:var(--muted);margin:12px 0 5px}
input,select,textarea{width:100%;background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 11px;font-size:13px;font-family:inherit}
textarea{font-family:ui-monospace,monospace;resize:vertical;min-height:90px}
pre.block{white-space:pre-wrap;word-break:break-word;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;line-height:1.55;margin:8px 0 0;overflow:auto}
.copydone{color:var(--green)}
.row{display:flex;gap:10px}
.row>*{flex:1}
.actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.hint{font-size:11px;color:var(--muted);margin-top:5px}
@media(max-width:720px){.sidebar{width:64px}.sidebar .nav button span.t,.side-foot,.logo b,.logo span{display:none}.main{padding:18px}}
</style>
</head>
<body>
<aside class="sidebar">
  <div class="logo"><div class="dot"></div><div><b>Gateway</b><span>free-provider router</span></div></div>
  <nav class="nav" id="nav">
    <button data-view="dashboard" class="active"><span class="ic">▦</span><span class="t">Dashboard</span></button>
    <button data-view="providers"><span class="ic">◈</span><span class="t">Providers</span></button>
    <button data-view="routes"><span class="ic">↻</span><span class="t">Routes</span></button>
    <button data-view="models"><span class="ic">◎</span><span class="t">Models</span></button>
    <button data-view="freetiers"><span class="ic">◔</span><span class="t">Free tiers</span></button>
    <button data-view="setup"><span class="ic">⚙</span><span class="t">Setup</span></button>
  </nav>
  <div class="side-foot"><span id="uptime">connecting…</span><div class="p" id="configPath"></div></div>
</aside>
<main class="main" id="main"></main>
<div class="modal" id="modal"><div class="dialog" id="dialog"></div></div>
<script>
let CONFIG=null, STATS=null, HEALTH=null, VIEW='dashboard';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return(h?h+'h ':'')+(m?m+'m ':'')+sec+'s'};
const num=v=>Number(v||0).toLocaleString();

document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){VIEW=b.dataset.view;render();}});

async function loadAll(){
  try{
    const [c,s]=await Promise.all([fetch('/api/config').then(r=>r.json()),fetch('/stats').then(r=>r.json())]);
    CONFIG=c; STATS=s;
    $('#configPath').textContent='config: '+CONFIG.configPath;
    refreshHealth();
  }catch(e){console.error(e);}
}
async function refreshHealth(){try{HEALTH=await fetch('/api/health').then(r=>r.json());}catch(e){HEALTH=null;}render();}
function healthOf(n){
  const h=HEALTH&&HEALTH[n];
  if(!h)return '<span class="badge muted-bg">…</span>';
  if(h.reason==='missing-key')return '<span class="badge amber">no key</span>';
  if(h.reason==='configured-only')return '<span class="badge amber">configured</span>';
  if(h.ok)return '<span class="badge ok">ok '+h.latencyMs+'ms</span>';
  return '<span class="badge red">down '+(h.status||'?')+'</span>';
}

function render(){
  $('#uptime').textContent=STATS?('up '+fmt(STATS.uptimeSec)):'…';
  $('#main').innerHTML = VIEW==='dashboard'?viewDashboard() : VIEW==='providers'?viewProviders() : VIEW==='routes'?viewRoutes() : VIEW==='models'?viewModels() : VIEW==='freetiers'?viewFreetiers() : viewSetup();
  $('#main').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',onEdit));
  $('#main').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',onDelete));
  $('#main').querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',onAdd));
  $('#main').querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async ()=>{
    const pre=document.getElementById(b.dataset.copy); if(!pre)return;
    try{await navigator.clipboard.writeText(pre.textContent);const t=b.textContent;b.textContent='Copied!';setTimeout(()=>b.textContent=t,1200);}catch(e){b.textContent='copy failed';}
  }));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===VIEW));
  if(VIEW==='freetiers') loadFreetiers();
  if(VIEW==='setup') bindTest();
}

function viewDashboard(){
  const t=STATS.totals;
  const cards=[
    ['Total requests',t.calls],['Succeeded',t.ok],['Failed',t.failed],
    ['Input tokens',t.tokensIn],['Output tokens',t.tokensOut],['In flight',STATS.requestsInFlight]
  ].map(([l,v])=>'<div class="card"><div class="v">'+num(v)+'</div><div class="l">'+l+'</div></div>').join('');
  let pr='';
  for(const[n,s]of Object.entries(STATS.providers))pr+='<tr><td>'+esc(n)+'&nbsp;'+healthOf(n)+'</td><td>'+s.calls+'</td><td>'+s.ok+'</td><td>'+s.failed+'</td><td>'+s.rateLimited+'</td><td>'+num(s.tokensIn)+' / '+num(s.tokensOut)+'</td><td>'+esc(s.lastError?s.lastError.slice(0,40):'—')+'</td></tr>';
  let ro='';
  for(const[n,s]of Object.entries(STATS.routes))ro+='<tr><td>'+esc(n)+'</td><td>'+s.calls+'</td><td>'+s.ok+'</td><td>'+s.failed+'</td></tr>';
  return '<h1>Dashboard</h1><div class="sub">Live usage across your free providers</div>'
    +'<div class="cards">'+cards+'</div>'
    +'<h2>Providers</h2><table><thead><tr><th>Provider</th><th>Calls</th><th>OK</th><th>Failed</th><th>429</th><th>Tokens in/out</th><th>Last error</th></tr></thead><tbody>'+pr+'</tbody></table>'
    +'<h2>Routes</h2><table><thead><tr><th>Route</th><th>Calls</th><th>Failed</th></tr></thead><tbody>'+ro+'</tbody></table>';
}

function viewProviders(){
  let rows='';
  for(const[name,p]of Object.entries(CONFIG.providers)){
    rows+='<div class="group"><div class="head"><div><h3>'+esc(name)+' '+healthOf(name)+'</h3><div class="meta">'+esc(p.type)+' · '+p.models.length+' model(s) · key '+(p.keySet?'<span class="badge ok">set</span>':'<span class="badge amber">missing</span>')+'</div></div><div><button class="btn ghost sm" data-edit="'+esc(name)+'">Edit</button> <button class="btn danger sm" data-del="'+esc(name)+'">Delete</button></div></div>'
      +'<div class="body hidden"><div class="meta">Models: '+esc(p.models.join(', '))+'</div></div></div>';
  }
  return '<div class="toolbar"><div><h1>Providers</h1><div class="sub">Add or edit the free providers the gateway routes to. Changes save to '+esc(CONFIG.configPath)+' and apply immediately.</div></div><button class="btn" data-add="provider">+ Add Provider</button></div>'
    +(rows||'<div class="empty">No providers configured.</div>');
}

function viewRoutes(){
  let rows='';
  for(const[name,list]of Object.entries(CONFIG.routes)){
    rows+='<div class="group"><div class="head"><div><h3>'+esc(name)+'</h3><div class="meta">'+list.length+' step(s) · failover chain</div></div><div><button class="btn ghost sm" data-edit="'+esc(name)+'">Edit</button> <button class="btn danger sm" data-del="'+esc(name)+'">Delete</button></div></div>'
      +'<div class="body hidden"><ol style="margin:0;padding-left:18px">'+list.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ol></div></div>';
  }
  return '<div class="toolbar"><div><h1>Routes</h1><div class="sub">Ordered failover chains. Requests try each step until one succeeds.</div></div><button class="btn" data-add="route">+ Add Route</button></div>'
    +(rows||'<div class="empty">No routes configured.</div>');
}

function viewModels(){
  let rows='';
  for(const[name,p]of Object.entries(CONFIG.providers))for(const m of p.models)rows+='<tr><td>'+esc(name)+'/'+esc(m)+'</td><td>'+esc(p.type)+'</td><td>'+healthOf(name)+'</td></tr>';
  let routes='';
  routes+='<tr><td>auto</td><td>adaptive — picks best healthy provider</td></tr>';
  for(const[name,list]of Object.entries(CONFIG.routes))routes+='<tr><td>'+esc(name)+'</td><td>'+esc(list.map(e=>e.split('/')[0]).join(', '))+'</td></tr>';
  return '<h1>Models</h1><div class="sub">Requestable model ids. Use a route name or provider/model directly.</div>'
    +'<h2>Routes</h2><table><thead><tr><th>Route</th><th>Underlying providers</th></tr></thead><tbody>'+routes+'</tbody></table>'
    +'<h2>Provider models</h2><table><thead><tr><th>Model id</th><th>Type</th><th>Health</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function viewFreetiers(){
  return '<h1>Free tiers</h1><div class="sub">Approximate monthly free allowances. Token compression is on, so you use less of each.</div>'
    +'<div class="empty" id="ft"><span class="spin"></span> loading…</div>';
}

async function loadFreetiers(){
  const el=document.getElementById('ft'); if(!el)return;
  let items;
  try{items=await fetch('/api/freetiers').then(r=>r.json());}catch(e){el.innerHTML='failed to load';return;}
  const totalCap=items.reduce((a,x)=>a+(x.capTokens||0),0);
  const usedAll=items.reduce((a,x)=>a+x.usedTokens,0);
  let rows='';
  for(const x of items){
    const pct=x.capTokens?Math.min(100,Math.round(x.usedTokens/x.capTokens*100)):0;
    const pcent='<div style="background:var(--panel2);border-radius:6px;height:8px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--accent)"></div></div>';
    rows+='<tr><td>'+esc(x.provider)+'</td><td>'+esc(x.model)+'</td><td>'+(x.freeForever?'<span class="badge ok">free forever</span>':(x.capTokens?num(x.capTokens)+' tokens':'—'))+'</td><td>'+num(x.usedTokens)+'</td><td>'+(x.remainingTokens!=null?num(x.remainingTokens):'∞')+'</td><td style="width:140px">'+pcent+'</td><td>'+esc(x.note)+'</td></tr>';
  }
  el.outerHTML='<table><thead><tr><th>Provider</th><th>Model</th><th>Approx monthly cap</th><th>Used (since start)</th><th>Remaining</th><th>Budget</th><th>Note</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'<div class="sub" style="margin-top:10px">Pooled budget: '+num(totalCap)+' tokens across listed providers · compression reduces actual usage automatically.</div>';
}

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
  if(!confirm('Delete '+kind+' "'+name+'"?'))return;
  fetch('/api/'+kind+'s',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({name})})
    .then(r=>r.json()).then(()=>loadAll());
}

function blk(kind,title,pre){
  const id='cp-'+kind;
  return '<div class="group"><div class="head"><h3>'+title+'</h3><button class="btn ghost sm" data-copy="'+id+'">Copy</button></div><div class="body"><pre class="block" id="'+id+'">'+pre+'</pre></div></div>';
}

function viewSetup(){
  const o=window.location.origin;
  const oai=o+'/v1';
  return '<h1>Setup</h1><div class="sub">Point your CLI or IDE at this gateway. OpenAI-compatible tools use <b>'+oai+'</b>; Claude Code uses <b>'+o+'</b>. Models: default, coder, fast, auto.</div>'
   +'<div style="background:rgba(245,182,66,.08);border:1px solid rgba(245,182,66,.25);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:13px">⚠️ <b>Pollinations.ai now requires a free API key.</b> Get one at <a href="https://enter.pollinations.ai/keys" target="_blank">enter.pollinations.ai/keys</a> and set <code>POLLINATIONS_API_KEY</code> in your environment or <code>.env</code>.</div>'
   +blk('claude','Claude Code','# add to your shell profile\\nexport ANTHROPIC_BASE_URL='+o+'\\nexport ANTHROPIC_AUTH_TOKEN=airroute\\nexport ANTHROPIC_MODEL=coder')
   +blk('opencode','OpenCode','export OPENAI_BASE_URL='+oai+'\\nexport OPENAI_API_KEY=airroute\\n\\nopencode run --model default "write tests"')
   +blk('cline','Cline (VS Code)','Settings -> API Provider -> OpenAI Compatible\\nBase URL: '+oai+'\\nAPI Key: airroute\\nModel ID: coder')
   +blk('continue','Continue (VS Code)','Add to config.json:\\n{\\n  "title": "AirRoute",\\n  "provider": "openai",\\n  "model": "coder",\\n  "apiBase": "'+oai+'",\\n  "apiKey": "airroute"\\n}')
   +blk('cursor','Cursor','Settings -> Models -> custom OpenAI API\\nBase URL: '+oai+'\\nAPI Key: airroute')
   +blk('generic','Generic OpenAI tools','export OPENAI_BASE_URL='+oai+'\\nexport OPENAI_API_KEY=airroute')
   +blk('agent','Bundled local agent','# from the AirRoute project folder\\nnode dist/index.js --via gateway "add unit tests"\\nnode dist/index.js --via gateway --model coder "refactor the API"')
   +blk('health','Quick health check','curl '+o+'/health')
   +'<div class="group"><div class="head"><h3>Test connection</h3></div><div class="body"><button class="btn" id="testchat">Send test message (auto)</button><pre class="block" id="testout" style="margin-top:10px">—</pre></div></div>';
}

function bindTest(){
  const b=document.getElementById('testchat'); if(!b)return;
  b.addEventListener('click',async()=>{
    const out=document.getElementById('testout'); out.textContent='sending…';
    try{
      const r=await fetch(window.location.origin+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'auto',messages:[{role:'user',content:'Reply with one word: OK'}]})});
      const j=await r.json();
      const msg=(r.status===200)?('OK | '+(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'(empty)')):('HTTP '+r.status+' | '+(j.error&&j.error.message||''));
      out.textContent=msg;
    }catch(e){out.textContent='request failed: '+e.message;}
  });
}

function closeModal(){document.getElementById('modal').classList.remove('open');}

function openProviderForm(name){
  const p=name&&CONFIG.providers[name];
  $('#dialog').innerHTML='<h3>'+(p?'Edit provider':'Add provider')+'</h3><div class="sub2">Provider type determines how the gateway talks to it. Keys are stored locally in the config file.</div>'
    +'<label>Provider name</label><input id="f-name" value="'+esc(p?name:'')+'" placeholder="e.g. mistral"'+(p?' disabled':'')+'>'
    +'<label>Type</label><select id="f-type">'+
      '<option value="openai"'+(p&&p.type==='openai'?' selected':'')+'>openai (OpenRouter / Groq / GitHub / any OpenAI-compatible)</option>'+
      '<option value="gemini"'+(p&&p.type==='gemini'?' selected':'')+'>gemini (Google)</option>'+
      '<option value="cloudflare"'+(p&&p.type==='cloudflare'?' selected':'')+'>cloudflare (Workers AI)</option></select>'
    +'<label>Base URL <span class="hint">(openai type only)</span></label><input id="f-base" value="'+esc(p?p.baseUrl||'':'')+'" placeholder="https://api.example.com/v1">'
    +'<label>API key</label><input id="f-key" type="password" value="'+esc(p?p.keySet?'__SET__':'':'')+'" placeholder="'+(p&&p.keySet?'(leave blank to keep existing)':'paste key or ENV:VAR')+'">'
    +'<label>Account ID <span class="hint">(cloudflare only)</span></label><input id="f-acct" value="'+esc(p?(p.accountSet?'__SET__':''):'')+'" placeholder="'+(p&&p.accountSet?'(leave blank to keep existing)':'32-char account id')+'">'
    +'<label>Models <span class="hint">(comma separated)</span></label><input id="f-models" value="'+esc(p?p.models.join(', '):'')+'" placeholder="model-a, model-b">'
    +'<div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="f-save">Save</button></div>';
  $('#f-save').onclick=()=>{
    const base=document.getElementById('f-base').value.trim();
    const body={name:document.getElementById('f-name').value.trim(),provider:{type:$('#f-type').value}};
    if(base)body.provider.baseUrl=base;
    const key=document.getElementById('f-key').value.trim();
    if(key&&key!=='__SET__')body.provider.apiKey=key;
    const acct=document.getElementById('f-acct').value.trim();
    if(acct&&acct!=='__SET__')body.provider.accountId=acct;
    body.provider.models=document.getElementById('f-models').value.split(',').map(x=>x.trim()).filter(Boolean);
    if(!body.name)return alert('Name required');
    fetch('/api/providers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(r=>r.json()).then(j=>{if(j.error)alert(j.error);else{$('#modal').classList.remove('open');loadAll();}});
  };
}

function openRouteForm(name){
  const r=name&&CONFIG.routes[name];
  $('#dialog').innerHTML='<h3>'+(r?'Edit route':'Add route')+'</h3><div class="sub2">One failover step per line, as <code>provider/model</code>. Order matters.</div>'
    +'<label>Route name</label><input id="r-name" value="'+esc(r?name:'')+'" placeholder="e.g. default"'+(r?' disabled':'')+'>'
    +'<label>Failover chain (provider/model per line)</label><textarea id="r-list">'+esc(r?r.list.join('\\n'):'')+'</textarea>'
    +'<div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="r-save">Save</button></div>';
  $('#r-save').onclick=()=>{
    const list=document.getElementById('r-list').value.split('\\n').map(x=>x.trim()).filter(Boolean);
    const nm=document.getElementById('r-name').value.trim();
    if(!nm)return alert('Name required');
    fetch('/api/routes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:nm,list})})
      .then(r=>r.json()).then(j=>{if(j.error)alert(j.error);else{$('#modal').classList.remove('open');loadAll();}});
  };
}

loadAll();
setInterval(()=>{fetch('/stats').then(r=>r.json()).then(s=>{STATS=s;if(VIEW==='dashboard')render();}).catch(()=>{});},3000);
</script>
</body>
</html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}