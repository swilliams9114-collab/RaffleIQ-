// ==UserScript==
// @name         RaffleIQ
// @namespace    https://github.com/swilliams9114-collab
// @version      0.9.2
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
  const PRIZE_PLACES=['First','Second','Third','Fourth'];
  const PRIZE_MEDALS=['🥇','🥈','🥉','🎖️'];
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { state = {}; }
  state.raffles ||= [];
  state.names ||= {};
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));
  const active = () => state.raffles.find(r => r.active);
  const storageSize = () => new Blob([localStorage.getItem(STORE)||JSON.stringify(state)]).size;
  const storageLabel = bytes => bytes<1024?`${bytes} bytes`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = x => Number.isSafeInteger(+x) && +x >= 0 ? +x : 0;
  const code = x => String(x || '').trim().toUpperCase();
  const status = s => { const el = document.querySelector('#ri-status'); if (el) el.textContent = s; };
  const itemName = x => String(x || '').trim().toLowerCase();
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  const html = `<style>
    #ri-open{position:fixed;right:12px;bottom:75px;z-index:2147483646;background:#262b32;color:#f2c45a;border:1px solid #a88642;border-radius:50%;width:46px;height:46px;font:700 17px system-ui;cursor:pointer;box-shadow:0 4px 14px #0009}
    #ri-panel{position:fixed;inset:4% max(8px,calc((100vw - 740px)/2));z-index:2147483647;display:flex;flex-direction:column;background:#1c2026;color:#eef0f2;border:1px solid #525860;border-radius:10px;overflow:hidden;box-shadow:0 12px 42px #000d;font:14px/1.4 system-ui,-apple-system,sans-serif}
    #ri-panel[hidden]{display:none!important}#ri-panel *{box-sizing:border-box}
    #ri-panel button,#ri-panel input,#ri-panel select{font:inherit}#ri-panel button{padding:7px 10px;margin:0;background:#343a42;color:#f2f3f5;border:1px solid #59616a;border-radius:5px;cursor:pointer;min-height:36px}#ri-panel button:hover{background:#424a53}#ri-panel button:disabled{opacity:.5;cursor:default}#ri-panel button:focus-visible,#ri-panel input:focus-visible,#ri-panel select:focus-visible,#ri-panel textarea:focus-visible{outline:2px solid #f2c45a;outline-offset:2px}
    #ri-panel input,#ri-panel select,#ri-panel textarea{background:#eef0f2;color:#20252a;border:1px solid #9da6ae;padding:7px;border-radius:5px;max-width:100%}#ri-panel input[type=checkbox]{accent-color:#e5ae43}#ri-panel textarea{width:100%;min-height:290px;font:14px/1.45 system-ui}#ri-panel table{width:100%;border-collapse:collapse;color:#eef0f2}#ri-panel td,#ri-panel th{padding:7px;border-bottom:1px solid #454b52;text-align:left;vertical-align:top;overflow-wrap:anywhere}#ri-panel table td{color:#eef0f2!important;background:transparent!important}#ri-panel table th{color:#f2c45a!important;background:transparent!important;font-weight:600}#ri-panel h3{font-size:17px;line-height:1.25;margin:16px 0 9px;color:#f5f5f5}#ri-panel p{margin:9px 0}#ri-panel label{display:inline-block;max-width:100%}#ri-panel .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}#ri-panel .muted{color:#aeb7bf}#ri-panel .wheel{height:200px;width:200px;margin:12px auto;border-radius:50%;border:10px solid #f1be52;background:conic-gradient(#447ac2 0 25%,#e7a949 25% 50%,#578dca 50% 75%,#e9b75b 75%);display:grid;place-items:center;text-align:center;font-size:20px;font-weight:bold;transition:transform 3s cubic-bezier(.12,.82,.17,1)}#ri-panel .wheel span{background:#1c2026;padding:8px;border-radius:8px;max-width:145px;overflow-wrap:anywhere}#ri-panel .ri-suggest{max-height:140px;overflow:auto}#ri-panel .ri-suggest button{display:block;width:100%;margin:2px 0;text-align:left}
    #ri-panel .ri-header{flex:none;display:flex;align-items:center;gap:9px;padding:10px 14px;background:#292e35;border-bottom:1px solid #494e53}#ri-panel .ri-brand{font-size:17px;font-weight:750;letter-spacing:.01em;flex:1}#ri-panel .ri-version{font-size:11px;font-weight:500;color:#aeb7bf}#ri-panel #ri-close{min-height:32px;padding:4px 9px}#ri-panel #ri-status{flex:none;padding:0 14px;background:#292e35;font-size:12px}#ri-panel #ri-status:not(:empty){padding:6px 14px;border-bottom:1px solid #494e53}#ri-panel .ri-tabs{flex:none;display:flex;gap:2px;overflow-x:auto;scrollbar-width:thin;padding:6px 10px;background:#262b31;border-bottom:1px solid #494e53}#ri-panel .ri-tabs button{flex:none;white-space:nowrap;min-height:34px;background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;color:#bcc5ce;padding:6px 10px}#ri-panel .ri-tabs button[aria-current=page]{color:#f2c45a;border-bottom-color:#f2c45a;background:#333840}#ri-panel #ri-main{flex:1;min-height:0;overflow:auto;padding:12px 16px 20px;overscroll-behavior:contain}
    #ri-panel .ri-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 10px}#ri-panel .ri-title h3{margin:0;flex:1;min-width:120px}#ri-panel .ri-code{display:inline-block;color:#ffcf64;background:#393329;border:1px solid #806a3c;border-radius:4px;padding:3px 8px;font-weight:750;letter-spacing:.04em}#ri-panel .ri-card{background:#292e35;border:1px solid #474e55;border-radius:7px;padding:12px;margin:9px 0}#ri-panel .ri-card h3{margin:0 0 9px;font-size:14px;color:#cbd3db}#ri-panel .ri-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#ri-panel .ri-stat{background:#292e35;border:1px solid #474e55;border-radius:6px;padding:9px;min-width:0}#ri-panel .ri-stat strong{display:block;color:#f2c45a;font-size:19px;line-height:1.2;overflow-wrap:anywhere}#ri-panel .ri-stat span{display:block;color:#b9c2ca;font-size:11px;margin-top:3px}#ri-panel .ri-state{border-left:3px solid #e4ac43;background:#343126;border-radius:3px;padding:8px 10px;margin:9px 0}#ri-panel .ri-state.ready{border-color:#71bd86;background:#25392d}#ri-panel .ri-alert{border:1px solid #b6824e;background:#443326;color:#ffe2ab;border-radius:5px;padding:9px;margin:9px 0}#ri-panel .ri-money{display:flex;gap:6px;justify-content:space-between;align-items:baseline;margin:6px 0}#ri-panel .ri-money strong{color:#f2c45a;text-align:right}#ri-panel .ri-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}#ri-panel .ri-actions button:first-child{background:#755a30;border-color:#ab8648;color:#fff}#ri-panel .ri-actions .ri-danger{background:#402e30;border-color:#775256}#ri-panel .ri-prize{border-top:1px solid #444a51;padding:6px 0;font-size:13px}#ri-panel .ri-prize:first-of-type{border:0}
    #ri-panel .ri-list{display:grid;gap:8px}#ri-panel .ri-entry{background:#292e35;border:1px solid #474e55;border-radius:7px;padding:10px 12px;color:#eef0f2;min-width:0}#ri-panel .ri-entry-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}#ri-panel .ri-entry-head strong{color:#f2c45a;font-size:15px;overflow-wrap:anywhere}#ri-panel .ri-entry-head time{color:#b9c2ca;font-size:12px;text-align:right;flex:none}#ri-panel .ri-entry-sub{color:#b9c2ca;font-size:12px;overflow-wrap:anywhere;margin:2px 0 8px}#ri-panel .ri-entry-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;border-top:1px solid #454b52;padding-top:8px}#ri-panel .ri-entry-details span{display:block;color:#b9c2ca;font-size:11px}#ri-panel .ri-entry-details strong{display:block;color:#eef0f2;font-size:13px;overflow-wrap:anywhere}#ri-panel .ri-entry-note{color:#d5dde4;margin-top:8px;overflow-wrap:anywhere}#ri-panel .ri-person{display:flex;align-items:center;flex-wrap:wrap;gap:7px}#ri-panel .ri-person label{flex:1;min-width:145px;color:#b9c2ca}#ri-panel .ri-person input{display:block;width:100%;margin-top:4px}#ri-panel .ri-person strong{color:#f2c45a}
    #ri-panel .ri-audit{border-left:3px solid #71bd86}#ri-panel .ri-audit.problem{border-left-color:#f1a45c}#ri-panel .ri-audit-title{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}#ri-panel .ri-audit-title strong{color:#f2c45a}#ri-panel .ri-audit-title span{color:#aee0b9}#ri-panel .ri-audit.problem .ri-audit-title span{color:#ffd094}#ri-panel .ri-audit p{margin:5px 0}#ri-panel .ri-audit details{margin-top:8px;border-top:1px solid #454b52;padding-top:7px}#ri-panel .ri-audit summary{cursor:pointer;color:#c4d1dd}#ri-panel .ri-audit .muted{font-size:12px}
    @media(max-width:700px){#ri-panel{inset:8px 8px 58px;border-radius:8px;font-size:13px}#ri-panel #ri-main{padding:10px 12px 18px}#ri-panel .ri-header{padding:7px 11px}#ri-panel .ri-tabs{padding:3px 7px}#ri-panel .ri-tabs button{font-size:12px;padding:5px 8px}#ri-panel .ri-card{padding:10px}#ri-panel .ri-stats{gap:5px}#ri-panel .ri-stat{padding:7px}#ri-panel .ri-stat strong{font-size:16px}#ri-panel .ri-actions button{flex:1 1 auto}#ri-rule-table{display:block}#ri-rule-table tbody{display:block}#ri-rule-table tr:first-child{display:none}#ri-rule-table tr{display:block;margin:9px 0;padding:8px;border:1px solid #454b52;border-radius:6px}#ri-rule-table td{display:block;border:0;padding:4px}#ri-rule-table td:before{content:attr(data-label);display:block;color:#b9c2ca;margin-bottom:3px}#ri-rule-table input{width:100%!important}#ri-rule-table .ri-value button{display:block;white-space:normal;text-align:left}}
  </style><button id="ri-open" title="RaffleIQ">R</button><section id="ri-panel" hidden></section>`;
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const panel = host.querySelector('#ri-panel');
  const itemRows = r => r.items.map((i,n) => `<tr><td data-label="Item name"><input data-item="${n}" data-field="name" autocomplete="off" value="${esc(i.name)}"><div class="ri-suggest"></div></td><td data-label="Items / bundle"><input data-item="${n}" data-field="bundle" type="number" min="1" value="${i.bundle}" style="width:75px"></td><td data-label="Tickets / bundle"><input data-item="${n}" data-field="tickets" type="number" min="1" value="${i.tickets||1}" style="width:70px"></td><td data-label="Item cap / player"><input data-item="${n}" data-field="cap" type="number" min="0" value="${i.cap}" style="width:70px"></td><td data-label="MV comparison" class="ri-value"></td></tr>`).join('');
  const drawEntries = r => r.receipts.filter(x => x.entries > 0);
  const tickets = r => drawEntries(r).reduce((n,x) => n+x.entries,0);
  function ticketAudits(r) {
    const groups=new Map();
    for(const receipt of r.receipts){
      const key=String(receipt.sender)+'|'+itemName(receipt.item);
      if(!groups.has(key))groups.set(key,{sender:String(receipt.sender),item:receipt.item,received:0,credited:0,awarded:0,invalid:false,receipts:[]});
      const group=groups.get(key);group.receipts.push(receipt);
      if(![receipt.qty,receipt.credited,receipt.entries].every(x=>Number.isSafeInteger(x)&&x>=0)||receipt.credited>receipt.qty){group.invalid=true;continue;}
      group.received+=receipt.qty;group.credited+=receipt.credited;group.awarded+=receipt.entries;
      if(![group.received,group.credited,group.awarded].every(Number.isSafeInteger))group.invalid=true;
    }
    return [...groups.values()].map(group=>{
      const rule=r.items.find(x=>itemName(x.name)===itemName(group.item));
      const validRule=rule&&Number.isSafeInteger(rule.bundle)&&rule.bundle>0&&Number.isSafeInteger(rule.tickets||1)&&(rule.tickets||1)>0&&Number.isSafeInteger(rule.cap||0)&&(rule.cap||0)>=0&&!group.invalid;
      const calculated=validRule?Math.floor(group.credited/rule.bundle)*(rule.tickets||1):null;
      const valid=validRule&&Number.isSafeInteger(calculated),expected=valid?calculated:null;
      const extra=valid?group.credited%rule.bundle:0;
      const short=valid&&extra?rule.bundle-extra:0;
      const capRemaining=valid&&rule.cap?Math.max(0,rule.cap-group.credited):Infinity;
      const excluded=valid?group.received-group.credited:0;
      const capViolation=valid&&(rule.cap?group.credited>rule.cap||excluded>0&&group.credited<rule.cap:excluded>0);
      return {...group,rule:valid?rule:null,expected,extra,short,excluded,canComplete:!short||capRemaining>=short,capViolation,discrepancy:valid&&group.awarded!==expected};
    }).sort((a,b)=>Number(b.discrepancy||b.capViolation||!b.rule)-Number(a.discrepancy||a.capViolation||!a.rule)||b.received-a.received);
  }
  function auditRemainder(check,closed){
    if(!check.extra)return 'Exact full bundles; no leftover items.';
    if(!check.canComplete)return `${check.extra} credited item(s) left after full bundles; the player cap prevents another full bundle.`;
    return closed?`${check.extra} credited item(s) left after full bundles; ${check.short} short of another bundle when entries closed.`:`${check.extra} extra credited item(s) carried forward; ${check.short} more needed for the next bundle.`;
  }
  const displayName = id => `${state.names[id] || 'Player'} [${id}]`;
  const money = n => '$'+Math.round(n).toLocaleString('en-US');
  const receiptValue = x => Number.isSafeInteger(x.unitMV)&&x.unitMV>=0 ? x.qty*x.unitMV : null;
  const receiptTotal = r => r.receipts.reduce((sum,x)=>sum+(receiptValue(x)||0),0);
  const prizeTotal = r => (r.prizeItems||[]).reduce((sum,x)=>sum+x.qty*x.unitMV,0);
  const prizeLine = (r,place) => (r.prizeItems||[]).filter(x=>(x.place||1)===place).map(x=>`${x.qty}× ${x.name}`).join(' + ');
  const hostName = r => r.hostName || '_samara_';
  const hostId = r => r.hostId || '3979390';
  const missingValues = r => r.receipts.filter(x=>receiptValue(x)===null).length;
  const localInputTime = seconds => {const d=new Date(seconds*1000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  const tornTime = seconds => new Date(seconds*1000).toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' TCT';
  const startTime = r => r.startAt || Math.floor(r.created/1000);
  const endTime = r => Math.min(r.closedAt||Infinity,r.endAt||Infinity,Math.floor(Date.now()/1000));
  function announcement(r){
    const lines=r.items.map(i=>`• ${i.name}: ${i.bundle} = ${i.tickets||1} ticket${(i.tickets||1)===1?'':'s'}${i.cap?` (maximum ${i.cap} items credited per player)`:''}`);
    const prizes=PRIZE_PLACES.map((label,i)=>{const line=prizeLine(r,i+1);return line?`${PRIZE_MEDALS[i]} ${label}: ${line}`:'';}).filter(Boolean).join('\n');
    return `🎟️ It's raffle time: ${r.name}!\n\n🏆 Prizes:\n${prizes||r.prize||'[add your prizes]'}${prizes&&r.prize?`\n${r.prize}`:''}\n🕒 Starts: ${tornTime(startTime(r))}\n⏰ Ends: ${r.endAt?tornTime(r.endAt):'[set an end date and time]'}\n\nSend items directly to ${hostName(r)} [${hostId(r)}].\n\nREQUIRED TRANSFER MESSAGE: ${r.code}\nUse exactly ${r.code} as the item transfer message. This code is specific to this raffle; other messages will not earn tickets.\n\nAccepted item bundles:\n${lines.join('\n')}\n\nDifferent item types cannot be combined. Partial quantities of the same item carry forward until the raffle closes. An incomplete bundle at closing earns no tickets and is considered a donation to the faction. The host is not responsible for incomplete donations; contact ${hostName(r)} before sending if you need to arrange an exception.\n\nGood luck, Aurorians! 🍀`;
  }
  function leadershipReceipt(r) {
    const recordedWinners=(r.draws||[]).flatMap(d=>d.winners.map(w=>({...w,drawTime:d.time}))),seenWinners=new Set(),winners=recordedWinners.filter(w=>{if(seenWinners.has(w.sender))return false;seenWinners.add(w.sender);return true;}),prizes=r.prizeItems||[];
    const items=new Map();
    for(const x of r.receipts){const old=items.get(x.item)||{qty:0,value:0,prices:new Set(),unknown:0};old.qty+=x.qty;const value=receiptValue(x);if(value===null)old.unknown++;else{old.value+=value;old.prices.add(x.unitMV);}items.set(x.item,old);}
    const awarded=prizes.filter(x=>winners[(x.place||1)-1]),awardedMV=awarded.reduce((n,x)=>n+x.qty*x.unitMV,0),receivedMV=receiptTotal(r),missing=missingValues(r);
    const difference=!missing?`${receivedMV-awardedMV<0?'-':'+'}${money(Math.abs(receivedMV-awardedMV))}`:'unavailable (missing receipt MV)';
    const lines=[`RAFFLEIQ LEADERSHIP RECEIPT — ${r.finalSync&&!r.coverageWarning?'FINAL SYNC COMPLETE':'PROVISIONAL'}`,`Raffle: ${r.name} | Transfer message: ${r.code}`,`Host: ${hostName(r)} [${hostId(r)}]`,`Generated: ${tornTime(Math.floor(Date.now()/1000))}`,`Entry window: ${tornTime(startTime(r))} to ${tornTime(r.closedAt||r.endAt||Math.floor(Date.now()/1000))}`,`Tickets: ${tickets(r)} | Participants: ${new Set(drawEntries(r).map(x=>x.sender)).size} | Recorded transfers: ${r.receipts.length}`,'',`ITEMS RECEIVED (approved transfers with message ${r.code})`];
    for(const [name,x] of items)lines.push(`${name}: ${x.qty} received | unit MV: ${x.unknown?'unavailable':x.prices.size===1?money([...x.prices][0]):'mixed saved prices; refresh MV'} | total MV: ${money(x.value)}${x.unknown?` (${x.unknown} transfer value(s) unavailable)`:''}`);
    if(!items.size)lines.push('No approved coded transfers recorded.');
    lines.push(`TOTAL RECEIVED MV: ${missing?'Incomplete — '+money(receivedMV)+' known':money(receivedMV)}`,'','PRIZES AND DRAW RESULTS');
    for(let place=1;place<=PRIZE_PLACES.length;place++){
      const winner=winners[place-1],label=PRIZE_PLACES[place-1],rows=prizes.filter(x=>(x.place||1)===place),mv=rows.reduce((n,x)=>n+x.qty*x.unitMV,0);
      lines.push(`${label}: ${winner?`${displayName(winner.sender)} (ticket #${winner.ticket}; drawn ${tornTime(Math.floor(winner.drawTime/1000))})`:'No winner recorded'} | prize MV ${money(mv)}${winner?' (assigned)':' (planned)'}`);
      for(const x of rows)lines.push(`  ${x.qty}× ${x.name} @ ${money(x.unitMV)} = ${money(x.qty*x.unitMV)}`);
      if(!rows.length)lines.push('  No prize items configured.');
    }
    lines.push(`PLANNED PRIZE MV: ${money(prizeTotal(r))}`,`ASSIGNED PRIZE MV: ${money(awardedMV)}`,`DIFFERENCE (received MV minus assigned prize MV): ${difference}`);
    if(winners.length>PRIZE_PLACES.length)lines.push(`${winners.length-PRIZE_PLACES.length} additional distinct recorded winner(s) have no configured prize place.`);
    if(recordedWinners.length>winners.length)lines.push(`${recordedWinners.length-winners.length} repeat draw result(s) for an already listed player were excluded from prize placement.`);
    if(r.issues?.length)lines.push(`REVIEW REQUIRED: ${r.issues.join('; ')}`);
    lines.push('',`Prizes marked assigned follow the order of the first distinct recorded winners; actual item delivery is not verified by RaffleIQ. Valuations use saved Torn item catalog MV${r.mvRefreshedAt?` refreshed ${tornTime(Math.floor(r.mvRefreshedAt/1000))}`:''}; they are estimates, not sale proceeds. This receipt includes approved incoming items with this raffle's exact message code. Other incoming transfers are outside this report.`);
    return lines.join('\n');
  }
  let reportSelection=null;
  function removeArchivedRaffle(id) {
    const index=state.raffles.findIndex(r=>r.id===id&&!r.active);
    if(index<0)return false;
    state.raffles.splice(index,1);
    const used=new Set(state.raffles.flatMap(r=>[...r.receipts.map(x=>String(x.sender)),...r.draws.flatMap(d=>d.winners.map(w=>String(w.sender)))]));
    for(const player of Object.keys(state.names))if(!used.has(player))delete state.names[player];
    if(reportSelection===id)reportSelection=null;
    save();return true;
  }
  let currentTab = 'dashboard';
  function render() {
    const r = active();
    panel.innerHTML = `<header class="ri-header"><span class="ri-brand">RaffleIQ <span class="ri-version">v0.9.2</span></span><button id="ri-close" aria-label="Close RaffleIQ">Close</button></header><div id="ri-status" class="muted" role="status" aria-live="polite"></div>
    <nav class="ri-tabs" aria-label="RaffleIQ sections"><button data-tab="dashboard">Dashboard</button><button data-tab="receipts">Contributions</button><button data-tab="audit">Ticket audit</button><button data-tab="participants">Participants</button><button data-tab="announcement">Announcement</button><button data-tab="draw">Draw</button><button data-tab="report">Leadership receipt</button><button data-tab="history">History</button><button data-tab="settings">Settings</button></nav><main id="ri-main"></main>`;
    panel.querySelector('#ri-close').onclick = () => panel.hidden = true;
    panel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {status('');tab(b.dataset.tab);});
    tab(currentTab);
  }
  function tab(name) {
    currentTab=name;
    panel.querySelectorAll('[data-tab]').forEach(b => {if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    const r = active(), m = panel.querySelector('#ri-main');
    if (name === 'dashboard') {
      const prizeMV=r&&prizeTotal(r),receivedMV=r&&receiptTotal(r),unknown=r&&missingValues(r);
      const auditProblems=r?ticketAudits(r).filter(x=>x.discrepancy||x.capViolation||!x.rule).length:0;
      const ended=r&&(r.closedAt||r.endAt&&Date.now()/1000>=r.endAt);
      m.innerHTML = r ? `<div class="ri-title"><h3>${esc(r.name)}</h3><span class="ri-code" title="Exact message required for transfers">Message ${esc(r.code)}</span></div>
      <div class="ri-stats"><div class="ri-stat"><strong>${tickets(r)}</strong><span>Tickets</span></div><div class="ri-stat"><strong>${new Set(drawEntries(r).map(x=>x.sender)).size}</strong><span>Participants</span></div><div class="ri-stat"><strong>${r.receipts.length}</strong><span>Transfers</span></div></div>
      <div class="ri-state ${r.finalSync&&!r.coverageWarning?'ready':''}">${r.finalSync&&!r.coverageWarning?'Entries closed · final sync complete · ready to draw':r.closedAt?'Entries closed · final sync needed':r.endAt&&Date.now()/1000>=r.endAt?'Scheduled end reached · final sync needed':Date.now()/1000<startTime(r)?'Entries have not started yet':'Entries open'}</div>
      ${r.issues?.length?`<div class="ri-alert">Receipt review: ${r.issues.map(esc).join('; ')}</div>`:''}
      ${auditProblems?`<div class="ri-alert">⚠ ${auditProblems} player/item ticket check(s) need review. <button id="ri-audit-open">Open ticket audit</button></div>`:''}
      <section class="ri-card"><h3>Market value</h3><div class="ri-money"><span>Items received${unknown?` · ${unknown} value(s) unavailable`:''}</span><strong>${money(receivedMV)}</strong></div><div class="ri-money"><span>Planned prizes</span><strong>${prizeMV?money(prizeMV):'Not set'}</strong></div>
      ${prizeMV&&!unknown&&receivedMV>=prizeMV?'<div class="ri-alert">⚠ Received item MV has reached or exceeded planned prize MV.</div>':prizeMV&&!unknown?`<p class="muted">${money(prizeMV-receivedMV)} until received item MV reaches planned prize MV.</p>`:''}
      ${PRIZE_PLACES.map((label,i)=>prizeLine(r,i+1)?`<div class="ri-prize">${label} · ${esc(prizeLine(r,i+1))}</div>`:'').join('')}
      <p class="muted">Torn catalog estimates, not sale proceeds. ${r.mvRefreshedAt?`Updated ${new Date(r.mvRefreshedAt).toLocaleString()}.`:'Refresh to get current estimates.'}</p><button id="ri-refresh-mv">Refresh market values</button></section>
      <section class="ri-card"><h3>Raffle controls</h3><div class="ri-actions"><button id="ri-sync">${r.finalSync?'Recheck receipts':ended?'Final sync':'Sync transfers'}</button>${ended?'':'<button id="ri-close-entries">Close entries</button>'}<button id="ri-archive" class="ri-danger">Archive raffle</button></div><p class="muted">Automatic API sync runs every five minutes while Torn is visible; it stops when TornPDA is closed.</p></section>` : `<section class="ri-card"><h3>Create a raffle</h3><div class="row"><label>Name <input id="ri-name" value="Faction raffle"></label><label>Exact message code <input id="ri-code" value="R1"></label><button id="ri-create">Create raffle</button></div></section>`;
      if (r) { m.querySelector('#ri-sync').onclick = sync;m.querySelector('#ri-refresh-mv').onclick=()=>refreshMarketValues();const audit=m.querySelector('#ri-audit-open');if(audit)audit.onclick=()=>tab('audit');const closing=m.querySelector('#ri-close-entries');if(closing)closing.onclick=()=>{if(Date.now()/1000<=startTime(r))return status('The raffle has not started yet.');if(!confirm('Close entries now? Transfers after this cutoff will not earn tickets.'))return;r.closedAt=Math.max(startTime(r),Math.floor(Date.now()/1000)-1);r.finalSync=false;save();render();}; m.querySelector('#ri-archive').onclick = () => { if (!confirm('Archive this raffle? Its receipts and drawings stay in History.')) return; r.active=false; save(); render(); }; }
      else m.querySelector('#ri-create').onclick = () => { const c=code(m.querySelector('#ri-code').value); if (!c) return status('Enter a raffle code.'); state.raffles.push({id:uid(),name:m.querySelector('#ri-name').value.trim()||'Faction raffle',code:c,hostName:'_samara_',hostId:'3979390',active:true,created:Date.now(),items:defaults.map(([name,bundle,cap])=>({name,bundle,cap})),receipts:[],draws:[]});save();render(); };
    } else if (name === 'settings') {
      m.innerHTML = `<h3>Settings</h3><button id="ri-create-key">Create RaffleIQ API key in Torn</button><p class="muted">Opens Torn's key form with User basic, User log, and Torn items selected. Torn creates the key; return here to paste it. The script never reads your key from Torn settings.</p><label>API key <input id="ri-key" type="password" placeholder="Stored on this device" autocomplete="off"></label><button id="ri-set-key">Save key</button><button id="ri-clear-key">Remove key</button><p class="muted">The key stays on this device and is sent only to api.torn.com.</p>${r?`<h3>Ticket value and approved items</h3><p>Set a target MV per ticket. Suggestions round item quantities up so each standard ticket meets that target. You may override any bundle and tickets earned. Cap is maximum credited item quantity per player; zero means unlimited. Partial quantities carry forward.</p><label>Target MV per ticket ($) <input id="ri-target-mv" type="number" min="1" step="1" value="${r.targetTicketMV||5000000}"></label>${(r.prizeItems||[]).some(x=>(x.place||1)===1)?'<p id="ri-prize-estimate" class="muted"></p>':""}<div style="overflow-x:auto"><table id="ri-rule-table"><tr><th>Item name</th><th>Items / bundle</th><th>Tickets / bundle</th><th>Item cap / player</th><th>MV comparison</th></tr>${itemRows(r)}</table></div><button id="ri-items-save">Save target and rules</button><p id="ri-rule-save-feedback" class="muted">${r.receipts.length?"This raffle has transfers, so its rules are locked. Reset all raffle data or create a new raffle to set new rules.":"Suggestions change the fields; tap Save target and rules to keep them."}</p>`:''}<h3>Storage on this device</h3><p><strong>${storageLabel(storageSize())}</strong> of RaffleIQ raffle data · ${state.raffles.length} raffle(s) (${state.raffles.filter(x=>!x.active).length} archived) · ${state.raffles.reduce((n,x)=>n+x.receipts.length,0)} transfer record(s).</p><p class="muted">Approximate size of saved raffle data only. Downloaded backups and other Torn scripts are separate. Archived raffles keep their details until deleted in History.</p><h3>Backup and reset</h3><button id="ri-export">Export backup</button><label>Import backup <input id="ri-import" type="file" accept="application/json,.json"></label><p>Reset removes all local raffles, receipts, prize settings, and draw history on this device. Your saved API key stays in place.</p><button id="ri-reset-open">Reset all raffle data</button><div id="ri-reset-confirm" hidden><p>To confirm deletion, type RESET below, then tap Confirm reset.</p><input id="ri-reset-word" autocomplete="off" placeholder="RESET"><button id="ri-reset-final">Confirm reset</button><button id="ri-reset-cancel">Cancel</button></div>`;
      m.querySelector('#ri-create-key').onclick=()=>{window.location.href=KEY_BUILDER;};
      m.querySelector('#ri-set-key').onclick=()=>{const k=m.querySelector('#ri-key').value.trim();if(k){localStorage.setItem(KEY,k);m.querySelector('#ri-key').value='';status('Key saved locally.');}};
      m.querySelector('#ri-clear-key').onclick=()=>{localStorage.removeItem(KEY);status('Key removed.');};
      if(r) {
        const key=localStorage.getItem(KEY);
        const targetInput=m.querySelector('#ri-target-mv');
        const updateRuleValues=()=>{
          const target=Number(targetInput.value),firstPrizeMV=(r.prizeItems||[]).filter(x=>(x.place||1)===1).reduce((n,x)=>n+x.qty*x.unitMV,0),estimate=m.querySelector("#ri-prize-estimate");
          if(estimate)estimate.textContent=`First place prize MV: ${money(firstPrizeMV)}. ${Number.isSafeInteger(target)&&target>0?`At the entered target, about ${Math.ceil(firstPrizeMV/target)} standard tickets match that MV.`:"Enter a positive target to see the ticket estimate."} This is a reference, not a guaranteed return.`;
          m.querySelectorAll('#ri-rule-table tr').forEach((tr,index)=>{
            if(!index)return;
            const name=tr.querySelector('[data-field=name]').value.trim(),bundle=Number(tr.querySelector('[data-field=bundle]').value),award=Number(tr.querySelector('[data-field=tickets]').value),cell=tr.querySelector('.ri-value');
            const id=Object.keys(catalog).find(id=>itemName(catalog[id])===itemName(name)),mv=id&&catalogMV[id];
            if(!Number.isSafeInteger(mv)||mv<=0){cell.textContent='MV unavailable';return;}
            const effective=Number.isSafeInteger(bundle)&&bundle>0&&Number.isSafeInteger(award)&&award>0?bundle*mv/award:0;
            const suggested=Number.isSafeInteger(target)&&target>0?Math.ceil(target/mv):0;
            cell.replaceChildren();const summary=document.createElement('span');summary.textContent=`${money(mv)} each · ${effective?money(effective)+'/ticket':'enter a valid rule'}${effective&&target?` (${effective<target?'below':'at/above'} target)`:''}. `;cell.append(summary);
            if(suggested&&Number.isSafeInteger(suggested)){if(r.receipts.length){const locked=document.createElement('span');locked.textContent=" Rules locked after the first transfer.";cell.append(locked);}else{const button=document.createElement('button');button.type='button';button.textContent=`Apply suggestion: ${suggested} for 1 ticket`;button.onclick=()=>{tr.querySelector('[data-field=bundle]').value=suggested;tr.querySelector('[data-field=tickets]').value=1;updateRuleValues();const feedback=document.createElement('div');feedback.textContent="Applied. Tap Save target and rules below.";cell.append(feedback);};cell.append(button);}}
          });
        };
        targetInput.oninput=updateRuleValues;
        if(key&&!Object.keys(catalog).length)loadCatalog(key).then(()=>{if(targetInput.isConnected)updateRuleValues();}).catch(err=>status('Item suggestions unavailable: '+err.message));
        m.querySelectorAll('#ri-rule-table input').forEach(input=>input.addEventListener('input',updateRuleValues));
        updateRuleValues();
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
      if(r) m.querySelector('#ri-items-save').onclick=()=>{if(r.receipts.length){m.querySelector('#ri-rule-save-feedback').textContent='Rules are locked after the first transfer. Start a new raffle to change them.';return;}const target=Number(m.querySelector('#ri-target-mv').value),items=[...m.querySelectorAll('#ri-rule-table tr')].slice(1).map(tr=>({name:tr.querySelector('[data-field=name]').value.trim(),bundle:Number(tr.querySelector('[data-field=bundle]').value),tickets:Number(tr.querySelector('[data-field=tickets]').value),cap:Number(tr.querySelector('[data-field=cap]').value)}));if(!Number.isSafeInteger(target)||target<1||!Number.isSafeInteger(items.reduce((n,x)=>n+x.bundle*x.tickets,0))||items.some(i=>!i.name||!Number.isSafeInteger(i.bundle)||i.bundle<1||!Number.isSafeInteger(i.tickets)||i.tickets<1||!Number.isSafeInteger(i.cap)||i.cap<0||i.cap>0&&i.cap<i.bundle)||new Set(items.map(i=>itemName(i.name))).size!==items.length)return status('Use a positive target, unique items, positive whole bundles/tickets, and caps of zero or at least one full bundle.');r.targetTicketMV=target;r.items=items;save();m.querySelector('#ri-rule-save-feedback').textContent='Target and item rules saved. Regenerate the announcement draft to reflect them.';status('Target and item rules saved.');};
      m.querySelector('#ri-export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'raffleiq-v1',state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RaffleIQ-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);};
      m.querySelector('#ri-import').onchange=async e=>{try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='raffleiq-v1'||!Array.isArray(raw.state?.raffles))throw Error('Unsupported backup');if(!confirm('Replace all local raffle history with this backup?'))return;state=raw.state;save();render();}catch(err){status('Import failed: '+err.message);}};
      const resetBox=m.querySelector('#ri-reset-confirm');
      m.querySelector('#ri-reset-open').onclick=()=>{resetBox.hidden=false;m.querySelector('#ri-reset-word').value='';resetBox.scrollIntoView({block:'nearest'});};
      m.querySelector('#ri-reset-cancel').onclick=()=>{resetBox.hidden=true;m.querySelector('#ri-reset-word').value='';};
      m.querySelector('#ri-reset-final').onclick=()=>{
        if(m.querySelector('#ri-reset-word').value.trim()!=='RESET')return status('Type RESET exactly to confirm.');
        if(syncing||refreshingMV)return status('Wait for the current API request to finish before resetting.');
        if(!confirm('Delete every RaffleIQ raffle, transfer, prize, and drawing on this device? This cannot be undone without a backup. Your API key will stay saved.'))return;
        state={raffles:[],names:{}};save();render();status('All raffle data reset. Your API key is still saved.');
      };
    } else if (name === 'receipts') {
      m.innerHTML = r ? `<h3>Contributions</h3><div class="ri-card"><div class="ri-money"><span>Received item MV</span><strong>${money(receiptTotal(r))}</strong></div>${missingValues(r)?`<p class="muted">${missingValues(r)} transfer value(s) unavailable.</p>`:''}</div><div class="ri-list">${r.receipts.slice().reverse().map(x=>`<article class="ri-entry"><div class="ri-entry-head"><strong>${esc(x.item)} × ${x.qty}</strong><time>${esc(new Date(x.time*1000).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))}</time></div><div class="ri-entry-sub">From ${esc(displayName(x.sender))}</div><div class="ri-entry-details"><div><span>Tickets</span><strong>${x.entries}</strong></div><div><span>Unit MV</span><strong>${receiptValue(x)===null?'—':money(x.unitMV)}</strong></div><div><span>Total MV</span><strong>${receiptValue(x)===null?'—':money(receiptValue(x))}</strong></div></div>${x.note?`<div class="ri-entry-note">${esc(x.note)}</div>`:''}</article>`).join('')||'<p class="muted">No transfers recorded yet.</p>'}</div>` : '<p>No active raffle.</p>';
    } else if (name === 'audit') {
      if(!r)return void(m.innerHTML='<p>No active raffle.</p>');
      const checks=ticketAudits(r),mismatches=checks.filter(x=>x.discrepancy),unverified=checks.filter(x=>!x.rule),capProblems=checks.filter(x=>x.capViolation);
      m.innerHTML=`<h3>Ticket audit</h3><p class="muted">Checks approved transfers with this raffle's message code. Each player and item is calculated separately; partial quantities from separate transfers carry forward.</p><div class="ri-card"><strong>${mismatches.length||unverified.length||capProblems.length?'Some receipts need review':'Recorded tickets match the saved rules'}</strong><p>${checks.length} player/item check(s) · ${mismatches.length} ticket mismatch(es) · ${capProblems.length} cap issue(s) · ${unverified.length} unable to verify</p>${!r.finalSync||r.coverageWarning?'<p class="ri-alert">Results are provisional until entries close and final sync completes.</p>':''}${r.issues?.length?`<p class="ri-alert">Receipt review: ${r.issues.map(esc).join('; ')}</p>`:''}<button id="ri-sync">${r.finalSync?'Recheck transfers':'Sync and verify'}</button></div><div class="ri-list">${checks.map(x=>`<article class="ri-entry ri-audit ${x.discrepancy||x.capViolation||!x.rule?'problem':''}"><div class="ri-audit-title"><strong>${esc(displayName(x.sender))} · ${esc(x.item)}</strong><span>${!x.rule?'Review saved data':x.discrepancy?'Ticket mismatch':x.capViolation?'Cap issue':'Tickets match'}</span></div>${x.rule?`<p>${x.received} received · ${x.credited} credited${x.excluded?` · ${x.excluded} above cap`:''}</p><p>${x.rule.bundle} item(s) per bundle × ${x.rule.tickets||1} ticket(s): <strong>${x.expected} expected · ${x.awarded} recorded</strong>${x.discrepancy?` (${x.awarded>x.expected?'+':''}${x.awarded-x.expected} ticket difference)`:''}</p>${x.capViolation?'<p class="ri-alert">Credited quantity does not follow the saved player cap. Review before drawing.</p>':''}<p class="muted">${auditRemainder(x,!!(r.closedAt||r.endAt&&Date.now()/1000>=r.endAt))}${x.excluded?` ${x.excluded} item(s) above the player cap earn no tickets.`:''}</p>`:'<p class="ri-alert">A saved rule or receipt quantity is missing or invalid. Check this item before drawing.</p>'}<details><summary>Show ${x.receipts.length} transfer(s)</summary>${x.receipts.map(y=>`<p class="muted">${esc(new Date(y.time*1000).toLocaleString())}: ${esc(y.qty)} received · ${esc(y.credited??'—')} credited · ${esc(y.entries??'—')} ticket(s)</p>`).join('')}</details></article>`).join('')||'<p class="muted">No approved coded transfers recorded yet.</p>'}</div>`;
      m.querySelector('#ri-sync').onclick=sync;
    } else if (name === 'participants') {
      if (!r) return void (m.innerHTML='<p>No active raffle.</p>');
      const ids=[...new Set(r.receipts.map(x=>x.sender))];
      m.innerHTML=`<h3>Participants</h3><p class="muted">Names are fetched on sync where your key permits it. You can correct a display name here; identity and limits always use the Torn player ID.</p><div class="ri-list">${ids.map(id=>`<div class="ri-entry ri-person"><label>Player ${esc(id)}<input data-player="${esc(id)}" value="${esc(state.names[id]||'')}" placeholder="Display name"></label><strong>${r.receipts.filter(x=>x.sender===id).reduce((n,x)=>n+x.entries,0)} ticket(s)</strong></div>`).join('')||'<p class="muted">No participants yet.</p>'}</div><div class="ri-actions"><button id="ri-save-names">Save names</button></div>`;
      m.querySelector('#ri-save-names').onclick=()=>{m.querySelectorAll('[data-player]').forEach(input=>{const value=input.value.trim().slice(0,40);if(value)state.names[input.dataset.player]=value;else delete state.names[input.dataset.player];});save();status('Names saved.');};
    } else if (name === 'announcement') {
      if(!r)return void (m.innerHTML='<p>Create a raffle first.</p>');
      m.innerHTML=`<h3>Raffle announcement</h3><p class="muted">Enter dates in your device's local time. The draft displays Torn City Time (TCT).</p><div class="row"><label>Host name <input id="ri-host-name" value="${esc(hostName(r))}" autocomplete="off"></label><label>Host Torn ID <input id="ri-host-id" inputmode="numeric" value="${esc(hostId(r))}"></label></div><div class="row"><label>Extra prize details (optional) <input id="ri-prize" value="${esc(r.prize||'')}" placeholder="Any additional details?"></label><label>Starts <input id="ri-start" type="datetime-local" value="${localInputTime(startTime(r))}" ${r.receipts.length||r.closedAt?'disabled':''}></label><label>Ends <input id="ri-end" type="datetime-local" value="${r.endAt?localInputTime(r.endAt):''}" ${r.closedAt?'disabled':''}></label></div><p class="muted">${r.receipts.length?'The start is locked because transfers have already been recorded.':''}</p><button id="ri-save-details">Save details</button><h3>First through fourth place prizes</h3><p class="muted">Select a place, search for an item, enter the quantity, then tap Add prize item. All places count toward the total prize MV.</p><div id="ri-prize-items"></div><div class="row"><label>Place <select id="ri-prize-place">${PRIZE_PLACES.map((label,i)=>`<option value="${i+1}">${label}</option>`).join('')}</select></label><label>Item <input id="ri-prize-item" autocomplete="off" placeholder="Type 3 letters"><div id="ri-prize-suggestions" class="ri-suggest"></div></label><label>Quantity <input id="ri-prize-qty" type="number" min="1" step="1" value="1" style="width:80px"></label><button id="ri-add-prize">Add prize item</button></div><h3>Edit your announcement</h3><textarea id="ri-announcement"></textarea><div class="row"><button id="ri-regenerate">Regenerate draft</button><button id="ri-copy">Copy announcement</button></div><p class="muted">Regenerating replaces your edits. Copying does not post anything to Torn.</p>`;
      const area=m.querySelector('#ri-announcement');
      const updateDraft=()=>{if(!r.announcementEdited){area.value=announcement(r);r.announcementText=area.value;save();}};
      const showPrizes=()=>{m.querySelector('#ri-prize-items').innerHTML=(r.prizeItems||[]).map((x,i)=>`<div class="row"><span>${PRIZE_PLACES[(x.place||1)-1]||'Prize'}: ${esc(x.name)} × ${x.qty} = ${money(x.qty*x.unitMV)}</span><button data-remove-prize="${i}">Remove</button></div>`).join('')||'<p>No prize items added.</p>';m.querySelectorAll('[data-remove-prize]').forEach(b=>b.onclick=()=>{r.prizeItems.splice(+b.dataset.removePrize,1);save();showPrizes();updateDraft();status('Prize removed; check the draft.');});};showPrizes();
      const itemInput=m.querySelector('#ri-prize-item'),suggestions=m.querySelector('#ri-prize-suggestions');
      itemInput.oninput=()=>{suggestions.replaceChildren();const query=itemName(itemInput.value);if(query.length<3)return;Object.values(catalog).filter(name=>itemName(name).includes(query)).slice(0,8).forEach(name=>{const option=document.createElement('button');option.type='button';option.textContent=name;option.onclick=()=>{itemInput.value=name;suggestions.replaceChildren();};suggestions.append(option);});};
      if(!Object.keys(catalog).length){const key=localStorage.getItem(KEY);if(key)loadCatalog(key).then(()=>{if(itemInput.isConnected)itemInput.oninput();}).catch(err=>status('Prize item values unavailable: '+err.message));}
      m.querySelector('#ri-add-prize').onclick=()=>{const name=itemInput.value.trim(),qty=Number(m.querySelector('#ri-prize-qty').value),match=Object.entries(catalog).find(([,v])=>itemName(v)===itemName(name));if(!match||!Number.isSafeInteger(qty)||qty<1)return status('Select a matching Torn item and a positive whole quantity.');const value=catalogMV[match[0]];if(!Number.isSafeInteger(value)||value<0)return status('Torn did not provide a market value for that item.');r.prizeItems||=[];r.prizeItems.push({id:match[0],name:match[1],qty,unitMV:value,place:Number(m.querySelector('#ri-prize-place').value)});save();showPrizes();updateDraft();itemInput.value='';suggestions.replaceChildren();status(r.announcementEdited?'Prize saved. Regenerate the draft to include it.':'Prize saved and draft updated.');};
      area.value=r.announcementEdited?r.announcementText||'':announcement(r);
      area.oninput=()=>{r.announcementText=area.value;r.announcementEdited=true;save();};
      m.querySelector('#ri-save-details').onclick=()=>{
        const prize=m.querySelector('#ri-prize').value.trim(),host=m.querySelector('#ri-host-name').value.trim(),hostID=m.querySelector('#ri-host-id').value.trim(),start=Date.parse(m.querySelector('#ri-start').value),end=Date.parse(m.querySelector('#ri-end').value);
        if(!host||!/^\d+$/.test(hostID)||hostID==='0')return status('Enter a host name and a valid numeric Torn player ID.');
        if(!Number.isFinite(start)||m.querySelector('#ri-end').value&&(!Number.isFinite(end)||end<=start))return status('Enter valid times; end must be after start.');
        if(Number.isFinite(end)&&r.receipts.length&&end/1000<Math.max(...r.receipts.map(x=>x.time)))return status('The end cannot be before an already recorded transfer.');
        if(r.finalSync&&r.endAt&&Number.isFinite(end)&&end>r.endAt*1000)return status('The raffle has already completed its final sync.');
        r.prize=prize;r.hostName=host;r.hostId=hostID;if(!r.receipts.length&&!r.closedAt)r.startAt=Math.floor(start/1000);if(!r.closedAt&&Number.isFinite(end)){if(r.endAt!==Math.floor(end/1000))r.finalSync=false;r.endAt=Math.floor(end/1000);}
        save();updateDraft();status(r.announcementEdited?'Details saved. Regenerate the draft to include them in your edited text.':'Details saved and announcement updated.');
      };
      m.querySelector('#ri-regenerate').onclick=()=>{area.value=announcement(r);r.announcementText=area.value;r.announcementEdited=false;save();status('Draft regenerated.');};
      m.querySelector('#ri-copy').onclick=async()=>{if(!(r.prize||r.prizeItems?.length)||!r.endAt)return status('Save at least one prize and an end time before copying.');try{await navigator.clipboard.writeText(area.value);}catch{area.focus();area.select();if(!document.execCommand('copy'))return status('Copy failed. Select and copy the text manually.');}status('Announcement copied.');};
    } else if (name === 'draw') {
      m.innerHTML = r ? `<h3>Draw winners</h3><p id="ri-preview" class="muted"></p>${!r.finalSync||r.coverageWarning?'<p>Close entries and complete the final sync before drawing.</p>':''}<div class="row"><label>Winners <input id="ri-count" type="number" min="1" value="1" style="width:70px"></label><label><input id="ri-unique" type="checkbox" checked> Different players</label><button id="ri-spin" ${!r.finalSync||r.coverageWarning?'disabled':''}>Spin and record</button></div><div style="text-align:center;color:#f1be52;font-size:28px">▼</div><div class="wheel" id="ri-wheel"><span>RaffleIQ</span></div><div id="ri-results"></div>` : '<p>No active raffle.</p>';
      if(r){m.querySelector('#ri-unique').onchange=()=>previewWheel(r,m);m.querySelector('#ri-spin').onclick=()=>spin(r,m);previewWheel(r,m);}
    } else if (name === 'report') {
      if(!state.raffles.length)return void(m.innerHTML='<p>Create a raffle to generate a leadership receipt.</p>');
      const chosen=state.raffles.find(x=>x.id===reportSelection)||r||state.raffles.at(-1);reportSelection=chosen.id;
      m.innerHTML=`<h3>Leadership receipt</h3><label>Raffle <select id="ri-report-raffle">${state.raffles.map(x=>`<option value="${esc(x.id)}" ${x.id===chosen.id?'selected':''}>${esc(x.name)} · ${esc(x.code)}</option>`).join('')}</select></label><p class="muted">Refresh market values before sharing for current estimates. The receipt summarizes approved coded items and assigns first through fourth place to distinct winners in draw order.</p><div class="row"><button id="ri-refresh-mv">Refresh MV for this raffle</button><button id="ri-report-copy">Copy receipt</button><button id="ri-report-download">Download receipt</button></div><textarea id="ri-report-text" readonly></textarea>`;
      const area=m.querySelector('#ri-report-text');area.value=leadershipReceipt(chosen);
      m.querySelector('#ri-report-raffle').onchange=e=>{reportSelection=e.target.value;tab('report');};
      m.querySelector('#ri-refresh-mv').onclick=()=>refreshMarketValues(chosen,'report');
      m.querySelector('#ri-report-copy').onclick=async()=>{try{await navigator.clipboard.writeText(area.value);}catch{area.focus();area.select();if(!document.execCommand('copy'))return status('Copy failed; select and copy the receipt manually.');}status('Leadership receipt copied.');};
      m.querySelector('#ri-report-download').onclick=()=>{const blob=new Blob([area.value],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RaffleIQ-'+chosen.code.replace(/[^a-z0-9_-]/gi,'')+'-receipt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);status('Receipt downloaded.');};
    } else if (name === 'history') {
      m.innerHTML=`<h3>History</h3><p class="muted">Archived raffles stay on this device until you delete them. Export a backup in Settings before removing a raffle you may need later.</p>${state.raffles.slice().reverse().map(r=>`<section class="ri-card"><h3>${esc(r.name)} · ${esc(r.code)} ${r.active?'(active)':'(archived)'}</h3><p>${r.receipts.length} transfers · ${tickets(r)} tickets</p>${r.draws.map(d=>`<p>${new Date(d.time).toLocaleString()}: ${d.winners.map(w=>`${esc(displayName(w.sender))} (#${w.ticket})`).join(', ')}</p>`).join('')}${r.active?'':`<button data-delete-raffle="${esc(r.id)}">Delete archived raffle</button>`}</section>`).join('')||'<p>No raffles yet.</p>'}`;
      m.querySelectorAll('[data-delete-raffle]').forEach(button=>button.onclick=()=>{
        if(syncing||refreshingMV)return status('Wait for the current API request to finish before deleting a raffle.');
        const target=state.raffles.find(x=>x.id===button.dataset.deleteRaffle&&!x.active);
        if(!target)return status('Only archived raffles can be deleted.');
        if(!confirm(`Delete archived raffle ${target.name} (${target.code}) and its ${target.receipts.length} transfer(s) and ${target.draws.length} draw(s) from this device? Export a backup first if you need these records.`))return;
        if(removeArchivedRaffle(target.id)){render();status('Archived raffle deleted from this device.');}
      });
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
  async function refreshMarketValues(targetR=active(),returnTab='dashboard') {
    if(refreshingMV)return;
    const r=targetR,key=localStorage.getItem(KEY);
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
      r.mvRefreshedAt=Date.now();save();render();if(returnTab==='report')tab('report');status('Market values refreshed from Torn. Tickets and draw history are unchanged.');
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
          const entries=(next-previous)*(rule.tickets||1);
          const unitMV=catalogMV[String(id)];
          r.receipts.push({id:receiptId,time:number(entry.timestamp),sender,item:rule.name,qty,credited,entries,unitMV:Number.isSafeInteger(unitMV)&&unitMV>=0?unitMV:null,note:credited<qty?'Limit reached':(next===previous?'Partial quantity carried forward':'Accepted')});
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
  function eligiblePool(r,unique){const won=new Set(unique?(r.draws||[]).flatMap(d=>d.winners.map(w=>w.sender)):[]);return drawEntries(r).filter(x=>!won.has(x.sender)).map(x=>({...x}));}
  function wheelGradient(pool){const total=pool.reduce((n,x)=>n+x.entries,0);if(!total)return '#39414b';let pos=0;const stops=[],colors=new Map();for(const row of pool){const start=pos/total*360;pos+=row.entries;const end=pos/total*360;if(!colors.has(row.sender))colors.set(row.sender,(205+colors.size*137)%360);stops.push(`hsl(${colors.get(row.sender)} 65% 54%) ${start}deg ${end}deg`);}return `conic-gradient(${stops.join(',')})`;}
  function previewWheel(r,m){const pool=eligiblePool(r,m.querySelector('#ri-unique').checked),total=pool.reduce((n,x)=>n+x.entries,0),players=new Set(pool.map(x=>x.sender)).size;const wheel=m.querySelector('#ri-wheel');wheel.style.background=wheelGradient(pool);wheel.querySelector('span').textContent=total?`${total} ticket${total===1?'':'s'} · ${players} player${players===1?'':'s'}`:'No eligible tickets';m.querySelector('#ri-preview').textContent=total?`${total} eligible ticket${total===1?'':'s'} from ${players} player${players===1?'':'s'}. Colored areas show each player's share of the ticket pool; every ticket has an equal chance.`:'No eligible tickets for this draw. If Different players is selected, prior winners are excluded.';m.querySelector('#ri-spin').disabled=!total||!r.finalSync||!!r.coverageWarning;}
  async function spin(r,m){
    const count=number(m.querySelector('#ri-count').value),unique=m.querySelector('#ri-unique').checked;
    let pool=eligiblePool(r,unique);const players=new Set(pool.map(x=>x.sender));
    if(!r.finalSync||r.coverageWarning)return status('Complete the final sync first.');
    if(!count||count>100||count>(unique?players.size:tickets(r)))return status(unique?'Choose 1–100 winners from players who have not won this raffle yet.':'Choose 1–100 winners within the eligible pool.');
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
