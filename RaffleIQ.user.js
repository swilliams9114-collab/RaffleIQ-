// ==UserScript==
// @name         RaffleIQ
// @namespace    https://github.com/swilliams9114-collab
// @version      0.2.2
// @description  Local Torn raffle tracker and weighted drawing wheel
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const STORE = 'raffleiq_data_v1', KEY = 'raffleiq_api_key_v1';
  const KEY_BUILDER = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=RaffleIQ&user=basic,log&torn=items';
  const defaults = [
    ['Flash Grenade', 200, 0], ['HEG', 330, 0],
    ['Smoke Grenade', 61, 0], ['Empty Blood Bag', 308, 0],
    ['Xanax', 6, 10], ['Firewalk Virus', 1, 2]
  ];
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { state = {}; }
  state.raffles ||= [];
  state.names ||= {};
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
    #ri-panel[hidden]{display:none!important}
    #ri-panel *{box-sizing:border-box}#ri-panel button,#ri-panel input,#ri-panel select{font:inherit}#ri-panel button{padding:8px;margin:3px;background:#305493;color:white;border:1px solid #799ad2;border-radius:6px;cursor:pointer}
    #ri-panel input,#ri-panel select{background:#eef3fa;color:#14213a;padding:7px;border-radius:5px;max-width:100%}#ri-panel table{width:100%;border-collapse:collapse}#ri-panel td,#ri-panel th{padding:6px;border-bottom:1px solid #445774;text-align:left}#ri-panel .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}#ri-panel .muted{color:#b9c7de}#ri-panel .wheel{height:200px;width:200px;margin:12px auto;border-radius:50%;border:10px solid #f1be52;background:conic-gradient(#447ac2 0 25%,#e7a949 25% 50%,#578dca 50% 75%,#e9b75b 75%);display:grid;place-items:center;text-align:center;font-size:20px;font-weight:bold;transition:transform 3s cubic-bezier(.12,.82,.17,1)}#ri-panel .wheel span{background:#14213a;padding:8px;border-radius:8px;max-width:145px;overflow-wrap:anywhere}
  </style><button id="ri-open" title="RaffleIQ">R</button><section id="ri-panel" hidden></section>`;
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const panel = host.querySelector('#ri-panel');
  const itemRows = r => r.items.map((i,n) => `<tr><td><input data-item="${n}" data-field="name" value="${esc(i.name)}"></td><td><input data-item="${n}" data-field="bundle" type="number" min="1" value="${i.bundle}" style="width:85px"></td><td><input data-item="${n}" data-field="cap" type="number" min="0" value="${i.cap}" style="width:85px"></td></tr>`).join('');
  const drawEntries = r => r.receipts.filter(x => x.entries > 0);
  const tickets = r => drawEntries(r).reduce((n,x) => n+x.entries,0);
  const displayName = id => `${state.names[id] || 'Player'} [${id}]`;
  function render() {
    const r = active();
    panel.innerHTML = `<div class="row"><h2 style="margin:0;flex:1">RaffleIQ 0.2.2</h2><button id="ri-close">Close</button></div><div id="ri-status" class="muted"></div>
    <div class="row"><button data-tab="dashboard">Dashboard</button><button data-tab="receipts">Contributions</button><button data-tab="participants">Participants</button><button data-tab="draw">Draw</button><button data-tab="history">History</button><button data-tab="settings">Settings</button></div><main id="ri-main"></main>`;
    panel.querySelector('#ri-close').onclick = () => panel.hidden = true;
    panel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
    tab('dashboard');
  }
  function tab(name) {
    const r = active(), m = panel.querySelector('#ri-main');
    if (name === 'dashboard') {
      m.innerHTML = r ? `<h3>${esc(r.name)} · ${esc(r.code)}</h3><p>${tickets(r)} tickets · ${new Set(drawEntries(r).map(x=>x.sender)).size} participants · ${r.receipts.length} transfers recorded</p><p>${r.closedAt?'Entries closed; run final sync before drawing.':'Entries open.'}</p><p class="muted">Automatic API sync runs every five minutes while Torn is visible. It stops when TornPDA is closed.</p>${r.issues?.length?`<p>Receipt review: ${r.issues.map(esc).join('; ')}</p>`:''}<div class="row"><button id="ri-sync">${r.closedAt?'Final sync':'Sync incoming transfers'}</button>${r.closedAt?'':'<button id="ri-close-entries">Close entries</button>'}<button id="ri-archive">Archive raffle</button></div>` : `<h3>Create a raffle</h3><div class="row"><label>Name <input id="ri-name" value="Faction raffle"></label><label>Exact message code <input id="ri-code" value="R1"></label><button id="ri-create">Create raffle</button></div>`;
      if (r) { m.querySelector('#ri-sync').onclick = sync;const closing=m.querySelector('#ri-close-entries');if(closing)closing.onclick=()=>{if(!confirm('Close entries now? Transfers after this cutoff will not earn tickets.'))return;r.closedAt=Math.max(Math.floor(r.created/1000),Math.floor(Date.now()/1000)-1);r.finalSync=false;save();render();}; m.querySelector('#ri-archive').onclick = () => { if (!confirm('Archive this raffle? Its receipts and drawings stay in History.')) return; r.active=false; save(); render(); }; }
      else m.querySelector('#ri-create').onclick = () => { const c=code(m.querySelector('#ri-code').value); if (!c) return status('Enter a raffle code.'); state.raffles.push({id:uid(),name:m.querySelector('#ri-name').value.trim()||'Faction raffle',code:c,active:true,created:Date.now(),items:defaults.map(([name,bundle,cap])=>({name,bundle,cap})),receipts:[],draws:[]});save();render(); };
    } else if (name === 'settings') {
      m.innerHTML = `<h3>Settings</h3><button id="ri-create-key">Create RaffleIQ API key in Torn</button><p class="muted">Opens Torn's key form with User basic, User log, and Torn items selected. Torn creates the key; return here to paste it. The script never reads your key from Torn settings.</p><label>API key <input id="ri-key" type="password" placeholder="Stored on this device" autocomplete="off"></label><button id="ri-set-key">Save key</button><button id="ri-clear-key">Remove key</button><p class="muted">The key stays on this device and is sent only to api.torn.com.</p>${r?`<h3>Approved items</h3><p>Cap is maximum credited quantity per player across this raffle. Zero means unlimited. Partial quantities accumulate within the same item.</p><table><tr><th>Item name</th><th>Per ticket</th><th>Cap</th></tr>${itemRows(r)}</table><button id="ri-items-save">Save items</button>`:''}<h3>Backup</h3><button id="ri-export">Export backup</button><label>Import backup <input id="ri-import" type="file" accept="application/json,.json"></label>`;
      m.querySelector('#ri-create-key').onclick=()=>{window.location.href=KEY_BUILDER;};
      m.querySelector('#ri-set-key').onclick=()=>{const k=m.querySelector('#ri-key').value.trim();if(k){localStorage.setItem(KEY,k);m.querySelector('#ri-key').value='';status('Key saved locally.');}};
      m.querySelector('#ri-clear-key').onclick=()=>{localStorage.removeItem(KEY);status('Key removed.');};
      if(r) m.querySelector('#ri-items-save').onclick=()=>{if(r.receipts.length)return status('Rules are locked after the first transfer. Create a new raffle to change them.');const items=[...m.querySelectorAll('tr')].slice(1).map(tr=>({name:tr.querySelector('[data-field=name]').value.trim(),bundle:number(tr.querySelector('[data-field=bundle]').value),cap:number(tr.querySelector('[data-field=cap]').value)}));if(items.some(i=>!i.name||!i.bundle)||new Set(items.map(i=>itemName(i.name))).size!==items.length)return status('Item names must be unique and bundle sizes positive.');r.items=items;save();status('Items saved.');};
      m.querySelector('#ri-export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'raffleiq-v1',state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RaffleIQ-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);};
      m.querySelector('#ri-import').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='raffleiq-v1'||!Array.isArray(raw.state?.raffles))throw Error('Unsupported backup');if(!confirm('Replace all local raffle history with this backup?'))return;state=raw.state;save();render();}catch(err){status('Import failed: '+err.message);}};
    } else if (name === 'receipts') {
      m.innerHTML = r ? `<h3>Contributions</h3><table><tr><th>Time</th><th>Sender</th><th>Item</th><th>Qty</th><th>Tickets</th><th>Note</th></tr>${r.receipts.slice().reverse().map(x=>`<tr><td>${new Date(x.time*1000).toLocaleString()}</td><td>${esc(displayName(x.sender))}</td><td>${esc(x.item)}</td><td>${x.qty}</td><td>${x.entries}</td><td>${esc(x.note)}</td></tr>`).join('')}</table>` : '<p>No active raffle.</p>';
    } else if (name === 'participants') {
      if (!r) return void (m.innerHTML='<p>No active raffle.</p>');
      const ids=[...new Set(r.receipts.map(x=>x.sender))];
      m.innerHTML=`<h3>Participants</h3><p class="muted">Names are fetched on sync where your key permits it. You can correct a display name here; identity and limits always use the Torn player ID.</p><table><tr><th>Torn ID</th><th>Display name</th><th>Tickets</th></tr>${ids.map(id=>`<tr><td>${esc(id)}</td><td><input data-player="${esc(id)}" value="${esc(state.names[id]||'')}"></td><td>${r.receipts.filter(x=>x.sender===id).reduce((n,x)=>n+x.entries,0)}</td></tr>`).join('')}</table><button id="ri-save-names">Save names</button>`;
      m.querySelector('#ri-save-names').onclick=()=>{m.querySelectorAll('[data-player]').forEach(input=>{const value=input.value.trim().slice(0,40);if(value)state.names[input.dataset.player]=value;else delete state.names[input.dataset.player];});save();status('Names saved.');};
    } else if (name === 'draw') {
      m.innerHTML = r ? `<h3>Draw winners</h3><p>${tickets(r)} tickets available. Each slice represents one eligible ticket; the pointer lands on the selected ticket.</p>${!r.finalSync||r.coverageWarning?'<p>Close entries and complete the final sync before drawing.</p>':''}<div class="row"><label>Winners <input id="ri-count" type="number" min="1" value="1" style="width:70px"></label><label><input id="ri-unique" type="checkbox" checked> Different players</label><button id="ri-spin" ${!r.finalSync||r.coverageWarning?'disabled':''}>Spin and record</button></div><div style="text-align:center;color:#f1be52;font-size:28px">▼</div><div class="wheel" id="ri-wheel"><span>RaffleIQ</span></div><div id="ri-results"></div>` : '<p>No active raffle.</p>';
      if(r)m.querySelector('#ri-spin').onclick=()=>spin(r,m);
    } else if (name === 'history') {
      m.innerHTML=state.raffles.slice().reverse().map(r=>`<h3>${esc(r.name)} ${r.active?'(active)':'(closed)'}</h3><p>${r.receipts.length} transfers · ${tickets(r)} tickets</p>${r.draws.map(d=>`<p>${new Date(d.time).toLocaleString()}: ${d.winners.map(w=>`${esc(displayName(w.sender))} (#${w.ticket})`).join(', ')}</p>`).join('')}`).join('')||'<p>No raffles yet.</p>';
    }
  }
  function parseLogs(data) {
    const logs=data.log||data.logs||{};
    return Array.isArray(logs)?logs.map(x=>[String(x.id||x.log_id||''),x]):Object.entries(logs);
  }
  async function api(url) {
    const response=await fetch(url);if(!response.ok)throw Error('API HTTP '+response.status);
    const data=await response.json();if(data.error)throw Error(data.error.error||'Torn API error');
    return data;
  }
  function logUrl(key,from,to) {
    return `https://api.torn.com/user/?selections=log&log=4103&from=${from}&to=${to}&key=${encodeURIComponent(key)}&comment=RaffleIQ`;
  }
  async function allLogs(key,from,to) {
    // Split crowded time windows. Never commit a partial scan.
    const queue=[[from,to]],results=new Map();let requests=0;
    while(queue.length){
      if(++requests>45)throw Error('Scan needs more than 45 API calls. Sync again later or shorten the raffle period.');
      const [start,end]=queue.pop();
      status(`Scanning incoming receipts: request ${requests}…`);
      const rows=parseLogs(await api(logUrl(key,start,end)));
      if(rows.length>=100){
        if(start>=end)throw Error('At least 100 logs share one second; cannot verify complete coverage.');
        const middle=Math.floor((start+end)/2);
        queue.push([start,middle],[middle+1,end]);
      }else for(const [id,entry] of rows)if(id)results.set(id,entry);
    }
    return [...results].sort((a,b)=>(a[1].timestamp||0)-(b[1].timestamp||0)||a[0].localeCompare(b[0]));
  }
  let catalog={};
  async function loadCatalog(key) {
    const data=await api(`https://api.torn.com/torn/?selections=items&key=${encodeURIComponent(key)}&comment=RaffleIQ`);
    catalog=Object.fromEntries(Object.entries(data.items||{}).map(([id,v])=>[id,v.name]));
    if(!Object.keys(catalog).length)throw Error('Torn item catalog was empty.');
  }
  async function loadNames(key,ids) {
    let missing=0;
    for(const id of ids){
      if(state.names[id])continue;
      try{
        const data=await api(`https://api.torn.com/user/${encodeURIComponent(id)}?selections=basic&key=${encodeURIComponent(key)}&comment=RaffleIQ`);
        if(data.name)state.names[id]=String(data.name).slice(0,40);else missing++;
      }catch{missing++;}
      if(missing>=3)break; // Avoid repeated requests when the key lacks basic access.
    }
  }
  let syncing=false;
  async function sync() {
    if(syncing)return;
    const r=active(),key=localStorage.getItem(KEY);
    if(!r||!key)return status('Create a raffle and save a Torn API key first.');
    syncing=true;
    const button=panel.querySelector('#ri-sync');if(button)button.disabled=true;
    try {
      if(!Object.keys(catalog).length)await loadCatalog(key);
      const to=r.closedAt||Math.floor(Date.now()/1000),from=Math.min(to,Math.max(Math.floor(r.created/1000),r.lastSync? r.lastSync-2:0));
      const rows=await allLogs(key,from,to);
      const seen=new Set(r.receipts.map(x=>x.id));let added=0;
      const issues=[];
      for(const [logId,entry] of rows){
        if(number(entry.log)!==4103||number(entry.timestamp)<Math.floor(r.created/1000)||code(entry.data?.message)!==r.code)continue;
        const sender=String(entry.data?.sender||'');
        if(!/^\d+$/.test(sender)||sender==='0'){issues.push(`${logId}: missing sender`);continue;}
        const itemMap=entry.data?.items||{};
        for(const [id,detail] of Object.entries(itemMap)){
          const receiptId=logId+':'+id;if(seen.has(receiptId))continue;
          const qty=number(Array.isArray(detail)?detail[0]:detail?.quantity??detail);
          if(!qty){issues.push(`${receiptId}: invalid quantity`);continue;}
          const item=catalog[String(id)],rule=r.items.find(i=>itemName(i.name)===itemName(item));
          if(!rule){if(!item)issues.push(`${receiptId}: unknown item ${id}`);continue;}
          const used=r.receipts.filter(x=>x.sender===sender&&itemName(x.item)===itemName(rule.name)).reduce((n,x)=>n+x.credited,0);
          const credited=rule.cap?Math.min(qty,Math.max(0,rule.cap-used)):qty;
          const previous=Math.floor(used/rule.bundle),next=Math.floor((used+credited)/rule.bundle);
          r.receipts.push({id:receiptId,time:number(entry.timestamp),sender,item:rule.name,qty,credited,entries:next-previous,note:credited<qty?'Limit reached':(next===previous?'Partial quantity carried forward':'Accepted')});
          seen.add(receiptId);added++;
        }
      }
      r.issues=issues;r.coverageWarning=issues.length>0;r.lastSync=to;r.finalSync=!!r.closedAt&&!issues.length;
      await loadNames(key,[...new Set(r.receipts.map(x=>x.sender))]);
      save();render();status(`${added} approved transfer(s) recorded. ${issues.length?issues.length+' transfer item(s) need review before drawing.':'All matching transfers processed.'}`);
    }catch(err){r.coverageWarning=true;save();status('Sync incomplete; drawing blocked: '+err.message);}
    finally {syncing=false;if(button?.isConnected)button.disabled=false;}
  }
  function randomBelow(n){const range=0x100000000;if(!Number.isSafeInteger(n)||n<1||n>range)throw Error('Invalid ticket count');const limit=Math.floor(range/n)*n,buf=new Uint32Array(1);let v;do{crypto.getRandomValues(buf);v=buf[0];}while(v>=limit);return v%n;}
  function wheelGradient(pool){const total=pool.reduce((n,x)=>n+x.entries,0);let pos=0;const stops=[];for(const row of pool){const start=pos/total*360;pos+=row.entries;const end=pos/total*360;const hue=(Number(row.sender)*73)%360;stops.push(`hsl(${hue} 65% 54%) ${start}deg ${end}deg`);}return `conic-gradient(${stops.join(',')})`;}
  async function spin(r,m){
    const count=number(m.querySelector('#ri-count').value),unique=m.querySelector('#ri-unique').checked;
    let pool=drawEntries(r).map(x=>({...x}));const players=new Set(pool.map(x=>x.sender));
    if(!r.finalSync||r.coverageWarning)return status('Complete the final sync first.');
    if(!count||count>100||count>(unique?players.size:tickets(r)))return status('Choose 1–100 winners within the eligible pool.');
    const button=m.querySelector('#ri-spin');button.disabled=true;const winners=[];
    for(let i=0;i<count;i++){
      const total=pool.reduce((n,x)=>n+x.entries,0),chosen=randomBelow(total);let pick=chosen,row,offset;
      for(const x of pool){if(pick<x.entries){row=x;offset=pick;break;}pick-=x.entries;}
      const ordered=drawEntries(r);let start=1;for(const x of ordered){if(x.id===row.id)break;start+=x.entries;}
      const winner={sender:row.sender,ticket:start+offset,receiptId:row.id};winners.push(winner);
      const wheel=m.querySelector('#ri-wheel');wheel.style.transition='none';wheel.style.transform='rotate(0deg)';wheel.style.background=wheelGradient(pool);wheel.querySelector('span').textContent='Spinning…';void wheel.offsetWidth;wheel.style.transition='transform 3s cubic-bezier(.12,.82,.17,1)';wheel.style.transform=`rotate(${1800-((chosen+.5)/total*360)}deg)`;await new Promise(resolve=>setTimeout(resolve,3100));wheel.querySelector('span').textContent=`${displayName(winner.sender)} · #${winner.ticket}`;
      if(unique)pool=pool.filter(x=>x.sender!==row.sender);else{row.entries--;pool=pool.filter(x=>x.entries>0);}
      m.querySelector('#ri-results').insertAdjacentHTML('beforeend',`<p>Winner ${i+1}: ${esc(displayName(winner.sender))}, ticket #${winner.ticket}</p>`);
    }
    r.draws.push({id:uid(),time:Date.now(),unique,winners});save();status('Draw recorded in History. Export a backup to preserve it.');button.disabled=false;
  }
  host.querySelector('#ri-open').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)render();};
  setInterval(()=>{if(document.visibilityState==='visible'&&active()&&!active().closedAt&&localStorage.getItem(KEY))sync();},5*60*1000);
})();
