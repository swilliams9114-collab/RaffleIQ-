// ==UserScript==
// @name         RaffleIQ
// @namespace    https://github.com/swilliams9114-collab
// @version      0.4.1
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
    #ri-panel input,#ri-panel select,#ri-panel textarea{background:#eef3fa;color:#14213a;padding:7px;border-radius:5px;max-width:100%}#ri-panel textarea{width:100%;min-height:330px;font:14px system-ui}#ri-panel table{width:100%;border-collapse:collapse}#ri-panel td,#ri-panel th{padding:6px;border-bottom:1px solid #445774;text-align:left}#ri-panel .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}#ri-panel .muted{color:#b9c7de}#ri-panel .wheel{height:200px;width:200px;margin:12px auto;border-radius:50%;border:10px solid #f1be52;background:conic-gradient(#447ac2 0 25%,#e7a949 25% 50%,#578dca 50% 75%,#e9b75b 75%);display:grid;place-items:center;text-align:center;font-size:20px;font-weight:bold;transition:transform 3s cubic-bezier(.12,.82,.17,1)}#ri-panel .wheel span{background:#14213a;padding:8px;border-radius:8px;max-width:145px;overflow-wrap:anywhere}#ri-panel .ri-suggest{max-height:140px;overflow:auto}#ri-panel .ri-suggest button{display:block;width:100%;margin:2px 0;text-align:left}
  </style><button id="ri-open" title="RaffleIQ">R</button><section id="ri-panel" hidden></section>`;
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const panel = host.querySelector('#ri-panel');
  const itemRows = r => r.items.map((i,n) => `<tr><td><input data-item="${n}" data-field="name" autocomplete="off" value="${esc(i.name)}"><div class="ri-suggest"></div></td><td><input data-item="${n}" data-field="bundle" type="number" min="1" value="${i.bundle}" style="width:85px"></td><td><input data-item="${n}" data-field="cap" type="number" min="0" value="${i.cap}" style="width:85px"></td></tr>`).join('');
  const drawEntries = r => r.receipts.filter(x => x.entries > 0);
  const tickets = r => drawEntries(r).reduce((n,x) => n+x.entries,0);
  const displayName = id => `${state.names[id] || 'Player'} [${id}]`;
  const money = n => '$'+Math.round(n).toLocaleString('en-US');
  const receiptValue = x => Number.isSafeInteger(x.unitMV)&&x.unitMV>=0 ? x.qty*x.unitMV : null;
  const receiptTotal = r => r.receipts.reduce((sum,x)=>sum+(receiptValue(x)||0),0);
  const prizeTotal = r => (r.prizeItems||[]).reduce((sum,x)=>sum+x.qty*x.unitMV,0);
  const missingValues = r => r.receipts.filter(x=>receiptValue(x)===null).length;
  const localInputTime = seconds => {const d=new Date(seconds*1000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  const tornTime = seconds => new Date(seconds*1000).toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' TCT';
  const startTime = r => r.startAt || Math.floor(r.created/1000);
  const endTime = r => Math.min(r.closedAt||Infinity,r.endAt||Infinity,Math.floor(Date.now()/1000));
  function announcement(r){
    const lines=r.items.map(i=>`• ${i.name}: ${i.bundle} = 1 ticket${i.cap?` (maximum ${i.cap} credited per player)`:''}`);
    return `🎟️ It's raffle time: ${r.name}!\n\n🏆 Prize: ${r.prize||'[add your prize]'}\n🕒 Starts: ${tornTime(startTime(r))}\n⏰ Ends: ${r.endAt?tornTime(r.endAt):'[set an end date and time]'}\n\nSend these item bundles to the raffle host:\n${lines.join('\n')}\n\n📨 Put exactly ${r.code} in the transfer message. That's your entry code! Different item types cannot be combined, but partial quantities of the same item carry forward. Every complete bundle earns one ticket. Stack those chances and let the raffle magic begin! 🍀`;
  }
  function render() {
    const r = active();
    panel.innerHTML = `<div class="row"><h2 style="margin:0;flex:1">RaffleIQ 0.4.1</h2><button id="ri-close">Close</button></div><div id="ri-status" class="muted"></div>
    <div class="row"><button data-tab="dashboard">Dashboard</button><button data-tab="receipts">Contributions</button><button data-tab="participants">Participants</button><button data-tab="announcement">Announcement</button><button data-tab="draw">Draw</button><button data-tab="history">History</button><button data-tab="settings">Settings</button></div><main id="ri-main"></main>`;
    panel.querySelector('#ri-close').onclick = () => panel.hidden = true;
    panel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
    tab('dashboard');
  }
  function tab(name) {
    const r = active(), m = panel.querySelector('#ri-main');
    if (name === 'dashboard') {
      const prizeMV=r&&prizeTotal(r),receivedMV=r&&receiptTotal(r),unknown=r&&missingValues(r);
      m.innerHTML = r ? `<h3>${esc(r.name)} · ${esc(r.code)}</h3><p>${tickets(r)} tickets · ${new Set(drawEntries(r).map(x=>x.sender)).size} participants · ${r.receipts.length} transfers recorded</p><p>${r.finalSync&&!r.coverageWarning?'Entries closed; final sync complete. Draw is ready.':r.closedAt?'Entries closed; run final sync before drawing.':r.endAt&&Date.now()/1000>=r.endAt?'Scheduled end reached; run final sync before drawing.':Date.now()/1000<startTime(r)?'Entries have not started yet.':'Entries open.'}</p><h3>Market value</h3><p>Received: ${money(receivedMV)}${unknown?` (${unknown} transfer value(s) unavailable)`:''}<br>Prize items: ${prizeMV?money(prizeMV):'Set prize items in Announcement'}</p>${prizeMV&&!unknown&&receivedMV>=prizeMV?'<p style="padding:10px;background:#764221;border:1px solid #ffcd62;border-radius:6px">⚠️ Received item MV has reached or exceeded the prize MV.</p>':prizeMV&&!unknown?`<p class="muted">${money(prizeMV-receivedMV)} until received item MV reaches prize MV.</p>`:''}<p class="muted">Market values are estimates from Torn’s item catalog, not sale proceeds. ${r.mvRefreshedAt?`Last MV refresh: ${new Date(r.mvRefreshedAt).toLocaleString()}.`:"Use Refresh market values for current estimates."}</p><button id="ri-refresh-mv">Refresh market values</button><p class="muted">Automatic API sync runs every five minutes while Torn is visible. It stops when TornPDA is closed.</p>${r.issues?.length?`<p>Receipt review: ${r.issues.map(esc).join('; ')}</p>`:''}<div class="row"><button id="ri-sync">${r.finalSync?'Recheck receipts':r.closedAt||r.endAt&&Date.now()/1000>=r.endAt?'Final sync':'Sync incoming transfers'}</button>${r.closedAt||r.endAt&&Date.now()/1000>=r.endAt?'':'<button id="ri-close-entries">Close entries</button>'}<button id="ri-archive">Archive raffle</button></div>` : `<h3>Create a raffle</h3><div class="row"><label>Name <input id="ri-name" value="Faction raffle"></label><label>Exact message code <input id="ri-code" value="R1"></label><button id="ri-create">Create raffle</button></div>`;
      if (r) { m.querySelector('#ri-sync').onclick = sync;m.querySelector('#ri-refresh-mv').onclick=refreshMarketValues;const closing=m.querySelector('#ri-close-entries');if(closing)closing.onclick=()=>{if(Date.now()/1000<=startTime(r))return status('The raffle has not started yet.');if(!confirm('Close entries now? Transfers after this cutoff will not earn tickets.'))return;r.closedAt=Math.max(startTime(r),Math.floor(Date.now()/1000)-1);r.finalSync=false;save();render();}; m.querySelector('#ri-archive').onclick = () => { if (!confirm('Archive this raffle? Its receipts and drawings stay in History.')) return; r.active=false; save(); render(); }; }
      else m.querySelector('#ri-create').onclick = () => { const c=code(m.querySelector('#ri-code').value); if (!c) return status('Enter a raffle code.'); state.raffles.push({id:uid(),name:m.querySelector('#ri-name').value.trim()||'Faction raffle',code:c,active:true,created:Date.now(),items:defaults.map(([name,bundle,cap])=>({name,bundle,cap})),receipts:[],draws:[]});save();render(); };
    } else if (name === 'settings') {
      m.innerHTML = `<h3>Settings</h3><button id="ri-create-key">Create RaffleIQ API key in Torn</button><p class="muted">Opens Torn's key form with User basic, User log, and Torn items selected. Torn creates the key; return here to paste it. The script never reads your key from Torn settings.</p><label>API key <input id="ri-key" type="password" placeholder="Stored on this device" autocomplete="off"></label><button id="ri-set-key">Save key</button><button id="ri-clear-key">Remove key</button><p class="muted">The key stays on this device and is sent only to api.torn.com.</p>${r?`<h3>Approved items</h3><p>Cap is maximum credited quantity per player across this raffle. Zero means unlimited. Partial quantities accumulate within the same item.</p><table><tr><th>Item name</th><th>Per ticket</th><th>Cap</th></tr>${itemRows(r)}</table><button id="ri-items-save">Save items</button>`:''}<h3>Backup</h3><button id="ri-export">Export backup</button><label>Import backup <input id="ri-import" type="file" accept="application/json,.json"></label>`;
      m.querySelector('#ri-create-key').onclick=()=>{window.location.href=KEY_BUILDER;};
      m.querySelector('#ri-set-key').onclick=()=>{const k=m.querySelector('#ri-key').value.trim();if(k){localStorage.setItem(KEY,k);m.querySelector('#ri-key').value='';status('Key saved locally.');}};
      m.querySelector('#ri-clear-key').onclick=()=>{localStorage.removeItem(KEY);status('Key removed.');};
      if(r) {
        const key=localStorage.getItem(KEY);
        if(key&&!Object.keys(catalog).length)loadCatalog(key).catch(err=>status('Item suggestions unavailable: '+err.message));
        m.querySelectorAll('[data-field=name]').forEach(input=>input.addEventListener('input',()=>{
          const box=input.nextElementSibling,query=itemName(input.value);
          box.replaceChildren();
          if(query.length<3)return;
          Object.values(catalog).filter(name=>itemName(name).includes(query)).slice(0,8).forEach(name=>{
            const option=document.createElement('button');option.type='button';option.textContent=name;
            option.onclick=()=>{input.value=name;box.replaceChildren();};box.append(option);
          });
        }));
      }
      if(r) m.querySelector('#ri-items-save').onclick=()=>{if(r.receipts.length)return status('Rules are locked after the first transfer. Create a new raffle to change them.');const items=[...m.querySelectorAll('tr')].slice(1).map(tr=>({name:tr.querySelector('[data-field=name]').value.trim(),bundle:number(tr.querySelector('[data-field=bundle]').value),cap:number(tr.querySelector('[data-field=cap]').value)}));if(items.some(i=>!i.name||!i.bundle)||new Set(items.map(i=>itemName(i.name))).size!==items.length)return status('Item names must be unique and bundle sizes positive.');r.items=items;save();status('Items saved.');};
      m.querySelector('#ri-export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'raffleiq-v1',state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RaffleIQ-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);};
      m.querySelector('#ri-import').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='raffleiq-v1'||!Array.isArray(raw.state?.raffles))throw Error('Unsupported backup');if(!confirm('Replace all local raffle history with this backup?'))return;state=raw.state;save();render();}catch(err){status('Import failed: '+err.message);}};
    } else if (name === 'receipts') {
      m.innerHTML = r ? `<h3>Contributions</h3><p>Received item MV: ${money(receiptTotal(r))}${missingValues(r)?` · ${missingValues(r)} value(s) unavailable`:''}</p><div style="overflow-x:auto"><table><tr><th>Time</th><th>Sender</th><th>Item</th><th>Qty</th><th>Unit MV</th><th>Total MV</th><th>Tickets</th><th>Note</th></tr>${r.receipts.slice().reverse().map(x=>`<tr><td>${new Date(x.time*1000).toLocaleString()}</td><td>${esc(displayName(x.sender))}</td><td>${esc(x.item)}</td><td>${x.qty}</td><td>${receiptValue(x)===null?'—':money(x.unitMV)}</td><td>${receiptValue(x)===null?'—':money(receiptValue(x))}</td><td>${x.entries}</td><td>${esc(x.note)}</td></tr>`).join('')}</table></div>` : '<p>No active raffle.</p>';
    } else if (name === 'participants') {
      if (!r) return void (m.innerHTML='<p>No active raffle.</p>');
      const ids=[...new Set(r.receipts.map(x=>x.sender))];
      m.innerHTML=`<h3>Participants</h3><p class="muted">Names are fetched on sync where your key permits it. You can correct a display name here; identity and limits always use the Torn player ID.</p><table><tr><th>Torn ID</th><th>Display name</th><th>Tickets</th></tr>${ids.map(id=>`<tr><td>${esc(id)}</td><td><input data-player="${esc(id)}" value="${esc(state.names[id]||'')}"></td><td>${r.receipts.filter(x=>x.sender===id).reduce((n,x)=>n+x.entries,0)}</td></tr>`).join('')}</table><button id="ri-save-names">Save names</button>`;
      m.querySelector('#ri-save-names').onclick=()=>{m.querySelectorAll('[data-player]').forEach(input=>{const value=input.value.trim().slice(0,40);if(value)state.names[input.dataset.player]=value;else delete state.names[input.dataset.player];});save();status('Names saved.');};
    } else if (name === 'announcement') {
      if(!r)return void (m.innerHTML='<p>Create a raffle first.</p>');
      m.innerHTML=`<h3>Raffle announcement</h3><p class="muted">Enter dates in your device's local time. The draft displays Torn City Time (TCT). Save details before copying.</p><div class="row"><label>Prize description <input id="ri-prize" value="${esc(r.prize||'')}" placeholder="What can the winner win?"></label><label>Starts <input id="ri-start" type="datetime-local" value="${localInputTime(startTime(r))}" ${r.receipts.length||r.closedAt?'disabled':''}></label><label>Ends <input id="ri-end" type="datetime-local" value="${r.endAt?localInputTime(r.endAt):''}" ${r.closedAt?'disabled':''}></label></div><p class="muted">${r.receipts.length?'The start is locked because transfers have already been recorded.':''}</p><button id="ri-save-details">Save details</button><h3>Prize items for MV comparison</h3><p class="muted">Type the exact Torn item name and quantity, then add each prize item. Values come from Torn's item catalog. This list only affects the MV comparison; the prize description above remains editable.</p><div id="ri-prize-items"></div><div class="row"><label>Item <input id="ri-prize-item" list="ri-item-list" placeholder="e.g. Xanax"></label><datalist id="ri-item-list"></datalist><label>Quantity <input id="ri-prize-qty" type="number" min="1" step="1" value="1" style="width:80px"></label><button id="ri-add-prize">Add prize item</button></div><h3>Edit your announcement</h3><textarea id="ri-announcement"></textarea><div class="row"><button id="ri-regenerate">Regenerate draft</button><button id="ri-copy">Copy announcement</button></div><p class="muted">Regenerating replaces your edits. Copying does not post anything to Torn.</p>`;
      const showPrizes=()=>{m.querySelector('#ri-prize-items').innerHTML=(r.prizeItems||[]).map((x,i)=>`<div class="row"><span>${esc(x.name)} × ${x.qty} = ${money(x.qty*x.unitMV)} (unit MV ${money(x.unitMV)})</span><button data-remove-prize="${i}">Remove</button></div>`).join('')||'<p>No prize items added.</p>';m.querySelectorAll('[data-remove-prize]').forEach(b=>b.onclick=()=>{r.prizeItems.splice(+b.dataset.removePrize,1);save();showPrizes();});};showPrizes();
      const fillPrizeSuggestions=()=>{m.querySelector('#ri-item-list').innerHTML=Object.values(catalog).map(x=>`<option value="${esc(x)}"></option>`).join('');};
      if(Object.keys(catalog).length)fillPrizeSuggestions();else{const key=localStorage.getItem(KEY);if(key)loadCatalog(key).then(fillPrizeSuggestions).catch(err=>status('Prize item values unavailable: '+err.message));}
      m.querySelector('#ri-add-prize').onclick=()=>{const name=m.querySelector('#ri-prize-item').value.trim(),qty=Number(m.querySelector('#ri-prize-qty').value),match=Object.entries(catalog).find(([,v])=>itemName(v)===itemName(name));if(!match||!Number.isSafeInteger(qty)||qty<1)return status('Choose an exact Torn item name and a positive whole quantity.');const value=catalogMV[match[0]];if(!Number.isSafeInteger(value)||value<0)return status('Torn did not provide a market value for that item.');r.prizeItems||=[];r.prizeItems.push({id:match[0],name:match[1],qty,unitMV:value});save();showPrizes();m.querySelector('#ri-prize-item').value='';status('Prize item added.');};
      const area=m.querySelector('#ri-announcement');area.value=r.announcementEdited?r.announcementText||'':announcement(r);
      area.oninput=()=>{r.announcementText=area.value;r.announcementEdited=true;save();};
      m.querySelector('#ri-save-details').onclick=()=>{
        const prize=m.querySelector('#ri-prize').value.trim(),start=Date.parse(m.querySelector('#ri-start').value),end=Date.parse(m.querySelector('#ri-end').value);
        if(!prize||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return status('Enter a prize and valid start/end times; end must be after start.');
        if(r.receipts.length&&end/1000<Math.max(...r.receipts.map(x=>x.time)))return status('The end cannot be before an already recorded transfer.');
        if(r.finalSync&&r.endAt&&end>r.endAt*1000)return status('The raffle has already completed its final sync.');
        r.prize=prize;if(!r.receipts.length&&!r.closedAt)r.startAt=Math.floor(start/1000);if(!r.closedAt)r.endAt=Math.floor(end/1000);
        r.finalSync=false;save();if(!r.announcementEdited)area.value=announcement(r);status(r.announcementEdited?'Details saved. Regenerate the draft to include them in your edited text.':'Details saved and announcement updated.');
      };
      m.querySelector('#ri-regenerate').onclick=()=>{area.value=announcement(r);r.announcementText=area.value;r.announcementEdited=false;save();status('Draft regenerated.');};
      m.querySelector('#ri-copy').onclick=async()=>{if(!r.prize||!r.endAt)return status('Save the prize and end time before copying.');try{await navigator.clipboard.writeText(area.value);}catch{area.focus();area.select();if(!document.execCommand('copy'))return status('Copy failed. Select and copy the text manually.');}status('Announcement copied.');};
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
  function receivedItems(items) {
    if(Array.isArray(items))return items.map((detail,index)=>{
      const id=detail?.id??detail?.item_id??detail?.item?.id??detail?.item;
      const qty=detail?.quantity??detail?.qty??detail?.amount??detail?.count;
      return [String(id??'unknown-'+index),qty];
    });
    return Object.entries(items||{}).map(([id,detail])=>[
      id,Array.isArray(detail)?detail[0]:detail?.quantity??detail?.qty??detail?.amount??detail?.count??detail
    ]);
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
  let catalog={},catalogMV={},refreshingMV=false;
  async function loadCatalog(key) {
    const data=await api(`https://api.torn.com/torn/?selections=items&key=${encodeURIComponent(key)}&comment=RaffleIQ`);
    catalog=Object.fromEntries(Object.entries(data.items||{}).map(([id,v])=>[id,v.name]));
    catalogMV=Object.fromEntries(Object.entries(data.items||{}).map(([id,v])=>[id,Number(v.market_value)]));
    if(!Object.keys(catalog).length)throw Error('Torn item catalog was empty.');
  }
  async function refreshMarketValues() {
    if(refreshingMV)return;
    const r=active(),key=localStorage.getItem(KEY);
    if(!r||!key)return status('Create a raffle and save a Torn API key first.');
    refreshingMV=true;
    const button=panel.querySelector('#ri-refresh-mv');if(button)button.disabled=true;
    try {
      await loadCatalog(key);
      const byName=new Map(Object.entries(catalog).map(([id,name])=>[itemName(name),id]));
      const receipts=r.receipts.map(x=>({row:x,id:byName.get(itemName(x.item))}));
      const prizes=(r.prizeItems||[]).map(x=>({row:x,id:catalog[x.id]?x.id:byName.get(itemName(x.name))}));
      const all=[...receipts,...prizes];
      if(all.some(x=>!x.id||!Number.isSafeInteger(catalogMV[x.id])||catalogMV[x.id]<0))return status('Refresh stopped: Torn did not return an MV for every recorded item. Existing values are unchanged.');
      for(const {row,id} of receipts){row.unitMV=catalogMV[id];row.mvEstimated=true;}
      for(const {row,id} of prizes){row.unitMV=catalogMV[id];row.id=id;}
      r.mvRefreshedAt=Date.now();save();render();status('Market values refreshed from Torn. Tickets and draw history are unchanged.');
    }catch(err){status('Market value refresh failed: '+err.message);}
    finally{refreshingMV=false;if(button?.isConnected)button.disabled=false;}
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
      for(const old of r.receipts){if(receiptValue(old)!==null)continue;const found=Object.entries(catalog).find(([,name])=>itemName(name)===itemName(old.item));const value=found&&catalogMV[found[0]];if(Number.isSafeInteger(value)&&value>=0){old.unitMV=value;old.mvEstimated=true;}}
      const to=endTime(r),from=Math.min(to,Math.max(startTime(r),r.lastSync&&!r.issues?.length? r.lastSync-2:0));
      const rows=await allLogs(key,from,to);
      const seen=new Set(r.receipts.map(x=>x.id));let added=0;
      const issues=[];
      for(const [logId,entry] of rows){
        if(number(entry.log)!==4103||number(entry.timestamp)<startTime(r)||number(entry.timestamp)>to||code(entry.data?.message)!==r.code)continue;
        const sender=String(entry.data?.sender||'');
        if(!/^\d+$/.test(sender)||sender==='0'){issues.push(`${logId}: missing sender`);continue;}
        for(const [id,rawQty] of receivedItems(entry.data?.items)){
          const receiptId=logId+':'+id;if(seen.has(receiptId))continue;
          const qty=number(rawQty);
          if(!qty){issues.push(`${receiptId}: invalid quantity`);continue;}
          const item=catalog[String(id)],rule=r.items.find(i=>itemName(i.name)===itemName(item));
          if(!rule){if(!item)issues.push(`${receiptId}: unknown item ${id}`);continue;}
          const used=r.receipts.filter(x=>x.sender===sender&&itemName(x.item)===itemName(rule.name)).reduce((n,x)=>n+x.credited,0);
          const credited=rule.cap?Math.min(qty,Math.max(0,rule.cap-used)):qty;
          const previous=Math.floor(used/rule.bundle),next=Math.floor((used+credited)/rule.bundle);
          const unitMV=catalogMV[String(id)];
          r.receipts.push({id:receiptId,time:number(entry.timestamp),sender,item:rule.name,qty,credited,entries:next-previous,unitMV:Number.isSafeInteger(unitMV)&&unitMV>=0?unitMV:null,note:credited<qty?'Limit reached':(next===previous?'Partial quantity carried forward':'Accepted')});
          seen.add(receiptId);added++;
        }
      }
      r.issues=issues;r.coverageWarning=issues.length>0;r.lastSync=to;r.finalSync=!!(r.closedAt||r.endAt&&Date.now()/1000>=r.endAt)&&!issues.length;
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
      const wheel=m.querySelector('#ri-wheel'),label=wheel.querySelector('span');wheel.style.transition='none';wheel.style.transform='rotate(0deg)';wheel.style.background=wheelGradient(pool);label.style.transform='';label.textContent='Spinning…';void wheel.offsetWidth;const angle=1800-((chosen+.5)/total*360);wheel.style.transition='transform 3s cubic-bezier(.12,.82,.17,1)';wheel.style.transform=`rotate(${angle}deg)`;await new Promise(resolve=>setTimeout(resolve,3100));label.style.transform=`rotate(${-angle}deg)`;label.textContent=`${displayName(winner.sender)} · #${winner.ticket}`;
      if(unique)pool=pool.filter(x=>x.sender!==row.sender);else{row.entries--;pool=pool.filter(x=>x.entries>0);}
      m.querySelector('#ri-results').insertAdjacentHTML('beforeend',`<p>Winner ${i+1}: ${esc(displayName(winner.sender))}, ticket #${winner.ticket}</p>`);
    }
    r.draws.push({id:uid(),time:Date.now(),unique,winners});save();status('Draw recorded in History. Export a backup to preserve it.');button.disabled=false;
  }
  host.querySelector('#ri-open').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)render();};
  setInterval(()=>{if(document.visibilityState==='visible'&&active()&&!active().closedAt&&localStorage.getItem(KEY))sync();},5*60*1000);
})();
