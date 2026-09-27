// ==UserScript==
// @name         RaffleIQ
// @namespace    https://github.com/swilliams9114-collab
// @version      0.1.0
// @description  Local Torn raffle tracker and weighted drawing wheel
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const STORE = 'raffleiq_data_v1', KEY = 'raffleiq_api_key_v1';
  const defaults = [
    ['Flash Grenade', 200, 0], ['High-Explosive Grenade', 330, 0],
    ['Smoke Grenade', 61, 0], ['Empty Blood Bag', 308, 0],
    ['Xanax', 6, 10], ['Firewalk Virus', 1, 2]
  ];
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { state = {}; }
  state.raffles ||= [];
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));
  const active = () => state.raffles.find(r => r.active);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = x => Number.isSafeInteger(+x) && +x >= 0 ? +x : 0;
  const code = x => String(x || '').trim().toUpperCase();
  const status = s => { const el = document.querySelector('#ri-status'); if (el) el.textContent = s; };
  const itemName = x => String(x || '').trim().toLowerCase();
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  const html = `<style>
    #ri-open{position:fixed;right:12px;bottom:75px;z-index:2147483646;background:#263d69;color:#fff;border:1px solid #8db8ff;border-radius:50%;width:46px;height:46px;font-weight:bold;cursor:pointer}
    #ri-panel{position:fixed;inset:5% max(8px,calc((100vw - 690px)/2));z-index:2147483647;background:#14213a;color:#eef3fa;border:1px solid #557bb7;border-radius:12px;padding:18px;overflow:auto;box-shadow:0 8px 40px #000c;font:14px system-ui}
    #ri-panel *{box-sizing:border-box}#ri-panel button,#ri-panel input,#ri-panel select{font:inherit}#ri-panel button{padding:8px;margin:3px;background:#305493;color:white;border:1px solid #799ad2;border-radius:6px;cursor:pointer}
    #ri-panel input,#ri-panel select{background:#eef3fa;color:#14213a;padding:7px;border-radius:5px;max-width:100%}#ri-panel table{width:100%;border-collapse:collapse}#ri-panel td,#ri-panel th{padding:6px;border-bottom:1px solid #445774;text-align:left}#ri-panel .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}#ri-panel .muted{color:#b9c7de}#ri-panel .wheel{height:200px;width:200px;margin:12px auto;border-radius:50%;border:10px solid #f1be52;background:conic-gradient(#447ac2 0 25%,#e7a949 25% 50%,#578dca 50% 75%,#e9b75b 75%);display:grid;place-items:center;text-align:center;font-size:20px;font-weight:bold;transition:transform 3s cubic-bezier(.12,.82,.17,1)}
  </style><button id="ri-open" title="RaffleIQ">R</button><section id="ri-panel" hidden></section>`;
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const panel = host.querySelector('#ri-panel');
  const itemRows = r => r.items.map((i,n) => `<tr><td><input data-item="${n}" data-field="name" value="${esc(i.name)}"></td><td><input data-item="${n}" data-field="bundle" type="number" min="1" value="${i.bundle}" style="width:85px"></td><td><input data-item="${n}" data-field="cap" type="number" min="0" value="${i.cap}" style="width:85px"></td></tr>`).join('');
  const drawEntries = r => r.receipts.filter(x => x.entries > 0);
  const tickets = r => drawEntries(r).reduce((n,x) => n+x.entries,0);
  function render() {
    const r = active();
    panel.innerHTML = `<div class="row"><h2 style="margin:0;flex:1">RaffleIQ 0.1.0</h2><button id="ri-close">Close</button></div><div id="ri-status" class="muted"></div>
    <div class="row"><button data-tab="dashboard">Dashboard</button><button data-tab="receipts">Contributions</button><button data-tab="draw">Draw</button><button data-tab="history">History</button><button data-tab="settings">Settings</button></div><main id="ri-main"></main>`;
    panel.querySelector('#ri-close').onclick = () => panel.hidden = true;
    panel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
    tab('dashboard');
  }
  function tab(name) {
    const r = active(), m = panel.querySelector('#ri-main');
    if (name === 'dashboard') {
      m.innerHTML = r ? `<h3>${esc(r.name)} · ${esc(r.code)}</h3><p>${tickets(r)} tickets · ${new Set(drawEntries(r).map(x=>x.sender)).size} participants · ${r.receipts.length} transfers recorded</p><p class="muted">Sync checks incoming item receipts while this Torn page is open. No background service runs when TornPDA is closed.</p><div class="row"><button id="ri-sync">Sync incoming transfers</button><button id="ri-archive">Close and archive</button></div>` : `<h3>Create a raffle</h3><div class="row"><label>Name <input id="ri-name" value="Faction raffle"></label><label>Exact message code <input id="ri-code" value="R1"></label><button id="ri-create">Create raffle</button></div>`;
      if (r) { m.querySelector('#ri-sync').onclick = sync; m.querySelector('#ri-archive').onclick = () => { if (!confirm('Close this raffle? Its receipts and drawings stay in History.')) return; r.active=false; save(); render(); }; }
      else m.querySelector('#ri-create').onclick = () => { const c=code(m.querySelector('#ri-code').value); if (!c) return status('Enter a raffle code.'); state.raffles.push({id:uid(),name:m.querySelector('#ri-name').value.trim()||'Faction raffle',code:c,active:true,created:Date.now(),items:defaults.map(([name,bundle,cap])=>({name,bundle,cap})),receipts:[],draws:[]});save();render(); };
    } else if (name === 'settings') {
      m.innerHTML = `<h3>Settings</h3><label>API key <input id="ri-key" type="password" placeholder="Stored on this device" autocomplete="off"></label><button id="ri-set-key">Save key</button><button id="ri-clear-key">Remove key</button><p class="muted">Use a Torn key allowed to read your user logs. The key stays on this device and is sent only to api.torn.com.</p>${r?`<h3>Approved items</h3><p>Cap is maximum credited quantity per player across this raffle. Zero means unlimited. Partial quantities accumulate within the same item.</p><table><tr><th>Item name</th><th>Per ticket</th><th>Cap</th></tr>${itemRows(r)}</table><button id="ri-items-save">Save items</button>`:''}<h3>Backup</h3><button id="ri-export">Export backup</button><label>Import backup <input id="ri-import" type="file" accept="application/json,.json"></label>`;
      m.querySelector('#ri-set-key').onclick=()=>{const k=m.querySelector('#ri-key').value.trim();if(k){localStorage.setItem(KEY,k);m.querySelector('#ri-key').value='';status('Key saved locally.');}};
      m.querySelector('#ri-clear-key').onclick=()=>{localStorage.removeItem(KEY);status('Key removed.');};
      if(r) m.querySelector('#ri-items-save').onclick=()=>{if(r.receipts.length)return status('Rules are locked after the first transfer. Create a new raffle to change them.');const items=[...m.querySelectorAll('tr')].slice(1).map(tr=>({name:tr.querySelector('[data-field=name]').value.trim(),bundle:number(tr.querySelector('[data-field=bundle]').value),cap:number(tr.querySelector('[data-field=cap]').value)}));if(items.some(i=>!i.name||!i.bundle)||new Set(items.map(i=>itemName(i.name))).size!==items.length)return status('Item names must be unique and bundle sizes positive.');r.items=items;save();status('Items saved.');};
      m.querySelector('#ri-export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'raffleiq-v1',state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RaffleIQ-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);};
      m.querySelector('#ri-import').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='raffleiq-v1'||!Array.isArray(raw.state?.raffles))throw Error('Unsupported backup');if(!confirm('Replace all local raffle history with this backup?'))return;state=raw.state;save();render();}catch(err){status('Import failed: '+err.message);}};
    } else if (name === 'receipts') {
      m.innerHTML = r ? `<h3>Contributions</h3><table><tr><th>Time</th><th>Sender ID</th><th>Item</th><th>Qty</th><th>Tickets</th><th>Note</th></tr>${r.receipts.slice().reverse().map(x=>`<tr><td>${new Date(x.time*1000).toLocaleString()}</td><td>${esc(x.sender)}</td><td>${esc(x.item)}</td><td>${x.qty}</td><td>${x.entries}</td><td>${esc(x.note)}</td></tr>`).join('')}</table>` : '<p>No active raffle.</p>';
    } else if (name === 'draw') {
      m.innerHTML = r ? `<h3>Draw winners</h3><p>${tickets(r)} tickets available. Drawing uses one random ticket per spin, weighted by earned entries.</p>${r.coverageWarning?'<p>Log results reached the API page limit. Review missing transfers before drawing.</p>':''}<div class="row"><label>Winners <input id="ri-count" type="number" min="1" value="1" style="width:70px"></label><label><input id="ri-unique" type="checkbox" checked> Different players</label><button id="ri-spin" ${r.coverageWarning?'disabled':''}>Spin and record</button></div><div class="wheel" id="ri-wheel">RaffleIQ</div><div id="ri-results"></div>` : '<p>No active raffle.</p>';
      if(r)m.querySelector('#ri-spin').onclick=()=>spin(r,m);
    } else if (name === 'history') {
      m.innerHTML=state.raffles.slice().reverse().map(r=>`<h3>${esc(r.name)} ${r.active?'(active)':'(closed)'}</h3><p>${r.receipts.length} transfers · ${tickets(r)} tickets</p>${r.draws.map(d=>`<p>${new Date(d.time).toLocaleString()}: ${d.winners.map(w=>`${esc(w.sender)} (#${w.ticket})`).join(', ')}</p>`).join('')}`).join('')||'<p>No raffles yet.</p>';
    }
  }
  function parseLogs(data) {
    const logs=data.log||data.logs||{};
    return Array.isArray(logs)?logs.map(x=>[String(x.id),x]):Object.entries(logs);
  }
  async function sync() {
    const r=active(), key=localStorage.getItem(KEY);
    if(!r||!key)return status('Create a raffle and save a Torn API key first.');
    status('Checking item receipt logs…');
    try {
      const from=Math.floor(r.created/1000);
      const url=`https://api.torn.com/user/?selections=log&log=4103&from=${from}&key=${encodeURIComponent(key)}&comment=RaffleIQ`;
      const response=await fetch(url);if(!response.ok)throw Error('API HTTP '+response.status);
      const data=await response.json();if(data.error)throw Error(data.error.error||'Torn API error');
      const seen=new Set(r.receipts.map(x=>x.id));let added=0,ignored=0;
      const rows=parseLogs(data).sort((a,b)=>(a[1].timestamp||0)-(b[1].timestamp||0)||a[0].localeCompare(b[0]));
      r.coverageWarning=rows.length>=100;
      for(const [logId,entry] of rows){
        if(number(entry.log)!==4103||number(entry.timestamp)<from||code(entry.data?.message)!==r.code)continue;
        const sender=String(entry.data?.sender||'');if(!/^\d+$/.test(sender)||sender==='0')continue;
        const itemMap=entry.data?.items||{};
        for(const [id,detail] of Object.entries(itemMap)){
          const receiptId=logId+':'+id;if(seen.has(receiptId))continue;
          const qty=number(Array.isArray(detail)?detail[0]:detail?.quantity??detail);
          if(!qty)continue;
          // Torn v1 item receipt logs use numeric item IDs. Names are resolved using Torn's item catalog.
          const item=catalog[String(id)];const rule=r.items.find(i=>itemName(i.name)===itemName(item));
          if(!rule){ignored++;continue;}
          const used=r.receipts.filter(x=>x.sender===sender&&itemName(x.item)===itemName(rule.name)).reduce((n,x)=>n+x.credited,0);
          const credited=rule.cap?Math.min(qty,Math.max(0,rule.cap-used)):qty;
          const previous=Math.floor(used/rule.bundle),next=Math.floor((used+credited)/rule.bundle);
          r.receipts.push({id:receiptId,time:number(entry.timestamp),sender,item:rule.name,qty,credited,entries:next-previous,note:credited<qty?'Limit reached':(next===previous?'Partial quantity carried forward':'Accepted')});
          seen.add(receiptId);added++;
        }
      }
      save();render();status(`${added} approved transfer(s) recorded; ${ignored} unrecognized item(s). ${r.coverageWarning?'API returned 100 or more logs; drawing blocked pending complete coverage.':''}`);
    }catch(err){status('Sync failed: '+err.message);}
  }
  let catalog={};
  async function loadCatalog() {
    const key=localStorage.getItem(KEY);if(!key)return;
    try{const response=await fetch(`https://api.torn.com/torn/?selections=items&key=${encodeURIComponent(key)}&comment=RaffleIQ`);const data=await response.json();if(data.error)throw Error(data.error.error);catalog=Object.fromEntries(Object.entries(data.items||{}).map(([id,v])=>[id,v.name]));}catch(err){status('Item catalog unavailable: '+err.message);}
  }
  const originalSync=sync;
  sync=async function(){if(!Object.keys(catalog).length)await loadCatalog();if(!Object.keys(catalog).length)return status('Could not load Torn item names. No transfers processed.');await originalSync();};
  function randomBelow(n){const range=0x100000000,limit=Math.floor(range/n)*n,buf=new Uint32Array(1);let v;do{crypto.getRandomValues(buf);v=buf[0];}while(v>=limit);return v%n;}
  async function spin(r,m){
    const count=number(m.querySelector('#ri-count').value),unique=m.querySelector('#ri-unique').checked;
    let pool=drawEntries(r).map(x=>({...x}));const players=new Set(pool.map(x=>x.sender));
    if(!count||count>100||count>(unique?players.size:tickets(r)))return status('Choose 1–100 winners within the eligible pool.');
    const button=m.querySelector('#ri-spin');button.disabled=true;const winners=[];
    for(let i=0;i<count;i++){
      const total=pool.reduce((n,x)=>n+x.entries,0);let pick=randomBelow(total),row,offset;
      for(const x of pool){if(pick<x.entries){row=x;offset=pick;break;}pick-=x.entries;}
      const ordered=drawEntries(r);let start=1;for(const x of ordered){if(x.id===row.id)break;start+=x.entries;}
      const winner={sender:row.sender,ticket:start+offset,receiptId:row.id};winners.push(winner);
      const wheel=m.querySelector('#ri-wheel');wheel.style.transform=`rotate(${(i+1)*1800+randomBelow(360)}deg)`;await new Promise(resolve=>setTimeout(resolve,3100));wheel.textContent=`${winner.sender} · #${winner.ticket}`;
      if(unique)pool=pool.filter(x=>x.sender!==row.sender);else{row.entries--;pool=pool.filter(x=>x.entries>0);}
      m.querySelector('#ri-results').insertAdjacentHTML('beforeend',`<p>Winner ${i+1}: player ID ${esc(winner.sender)}, ticket #${winner.ticket}</p>`);
    }
    r.draws.push({id:uid(),time:Date.now(),unique,winners});save();status('Draw recorded in History. Export a backup to preserve it.');button.disabled=false;
  }
  host.querySelector('#ri-open').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)render();};
})();
