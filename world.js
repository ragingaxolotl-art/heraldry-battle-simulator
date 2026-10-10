const worldCanvas = document.getElementById('worldCanvas');
const worldMap = document.getElementById('worldMap');
const mapContext = worldCanvas.getContext('2d');
const worldStatus = document.getElementById('worldStatus');
const STORAGE_KEY = 'kingdoms-student-world-v1';
const SETTINGS_IDS = ['sideAName','sideBName','allyChance','hatredChance','betrayalChance','terrain','chaosLevel'];
let studentWorld, loadingWorld = false, saveTimer, playbackTimer, activeBattle, playbackIndex = -1;
let pendingAction = null;
let backgroundImage = null;
let reportRenderVersion=0;
let camera = {x:0,y:0,w:1200,h:700};
const cards = () => [...grid.querySelectorAll('.country-card')];
function freshSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function worldMessage(message) { worldStatus.textContent = message; }
function compactWorld() { const {cells,...data} = studentWorld; return data; }
function captureWorld() {
  if (!studentWorld || loadingWorld) return;
  getCountries().forEach((data,i) => {
    const country = studentWorld.countries[studentWorld.selected[i]];
    for (const key of ['name','gold','cannons','books','pens','mages']) country[key] = data[key];
    country.commitment = data.commitment;
    for (const key of ['ruler','exports','currency','sport']) country[key] = cards()[i].querySelector(`.country-${key}`).value;
    country.originalShield = cards()[i].dataset.originalShield || '';
    country.shield = cards()[i].querySelector('.heraldry-preview').getAttribute('src') || '';
  });
  studentWorld.selected.forEach((id,i) => studentWorld.selected.forEach((other,j) => {
    if (j <= i) return;
    studentWorld.relations[allianceKey(id,other)] = alliances.has(allianceKey(i,j)) ? 'ally' : enemies.has(allianceKey(i,j)) ? 'enemy' : 'neutral';
  }));
  SETTINGS_IDS.forEach(id => { studentWorld.settings[id] = document.getElementById(id).value; });
}
function saveWorld() {
  captureWorld();
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(compactWorld())); worldMessage('Saved in this browser. Download My Progress to keep a backup or change computers.'); }
  catch { worldMessage('Browser storage is full or unavailable. Use Download My Progress to save your work.'); }
}
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveWorld(); drawWorld(); renderMarkers(); refreshRegionChoices(); updateNeutrals(); },250); }
function clearBattle() {
  clearInterval(playbackTimer); activeBattle = null; playbackIndex = -1;
  document.getElementById('battleArrows').replaceChildren();
  document.getElementById('playbackPanel').hidden = true;
  document.getElementById('mapEvents').replaceChildren();
  document.getElementById('copyEvents').disabled = true;
  document.getElementById('downloadScene').disabled = true;
  setCamera({x:0,y:0,w:1200,h:700});
  results.classList.add('hidden'); lastReport=''; copyButton.disabled=true; downloadButton.disabled=true;
}
function applyWorld() {
  loadingWorld = true; clearBattle(); createCountryCards();
  cards().forEach((card,i) => {
    const country = studentWorld.countries[studentWorld.selected[i]];
    card.querySelector('.country-name').value = country.name;
    for (const key of ['gold','cannons','books','pens','mages']) card.querySelector(`.country-${key}`).value = country[key];
    for (const key of ['ruler','exports','currency','sport']) card.querySelector(`.country-${key}`).value=country[key] || '';
    if (country.shield) { card.dataset.originalShield=country.originalShield || country.shield; card.querySelector('.remove-white').disabled=false;card.querySelector('.restore-shield').disabled=country.shield===card.dataset.originalShield; card.querySelector('.heraldry-preview').src=country.shield; card.querySelector('.heraldry-drop').classList.add('has-image'); }
    UNIT_TYPES.forEach(u=>{card.querySelector(`.commit-${u.key}`).value=country.commitment?.[u.key] ?? '';});
    card.dispatchEvent(new Event('input'));
    const label=document.createElement('label'); label.className='wide-field'; label.append(document.createTextNode(`Country ${i+1} · Choose land location`));
    const select=document.createElement('select'); select.className='map-country'; select.setAttribute('aria-label',`Land location for country ${i+1}`); label.append(select);
    card.prepend(label);
    label.hidden=Boolean(studentWorld.background);
    select.addEventListener('change',() => {
      captureWorld(); const next=Number(select.value);
      if (studentWorld.selected.includes(next)) { refreshRegionChoices(); return; }
      studentWorld.selected[i]=next; studentWorld.countries[next].position=[...studentWorld.countries[next].capital]; applyWorld(); saveWorld();
      worldMessage(`Country ${i+1} is placed in ${studentWorld.countries[next].name}. Its troops, gold, and relationships are loaded. Drag its marker to adjust the position.`);
    });
  });
  alliances.clear(); enemies.clear();
  studentWorld.selected.forEach((id,i) => studentWorld.selected.forEach((other,j) => {
    if (j<=i) return;
    const relation=studentWorld.relations[allianceKey(id,other)];
    if (relation==='ally') alliances.add(allianceKey(i,j));
    if (relation==='enemy') enemies.add(allianceKey(i,j));
  }));
  refreshCountryChoices(); refreshRegionChoices();
  SETTINGS_IDS.forEach(id => { if (studentWorld.settings[id] !== undefined) document.getElementById(id).value=studentWorld.settings[id]; });
  chaosText.textContent=chaosLabels[chaosLevel.value];
  document.getElementById('worldTitle').textContent=`Your World · ${studentWorld.seed.toString(36).toUpperCase()}`;
  loadingWorld=false; loadBackground(); drawWorld(); renderMarkers(); renderHistory();
  renderBiomeKey();
  updateNeutrals();renderAfterAction();
}
function updateNeutrals() {
  cards().forEach((card,i)=>{const names=cards().filter((_,j)=>j!==i&&!alliances.has(allianceKey(i,j))&&!enemies.has(allianceKey(i,j))).map(c=>c.querySelector('.country-name').value);card.querySelector('.neutral-list').textContent=`Neutral: ${names.join(', ') || 'None'}`;});
}
function refreshRegionChoices() {
  if (!studentWorld) return;
  cards().forEach((card,i) => {
    const select=card.querySelector('.map-country'); if (!select) return;
    select.replaceChildren(...studentWorld.countries.map(country => {
      const [x,y]=country.capital;
      const region=(y<700/3?'North':y>1400/3?'South':'Central')+(x<400?'west':x>800?'east':'');
      const taken=studentWorld.selected.includes(country.id) && studentWorld.selected[i]!==country.id;
      const option=new Option(`${country.name || `Unnamed country ${country.id+1}`} · ${region}${taken?' (already chosen)':''}`,String(country.id));
      option.disabled=studentWorld.selected.includes(country.id) && studentWorld.selected[i]!==country.id; return option;
    })); select.value=String(studentWorld.selected[i]);
  });
}
function drawWorld(context=mapContext) {
  if (!studentWorld) return;
  context.clearRect(0,0,1200,700); context.fillStyle=studentWorld.biomes?.[0]?.color || '#adc9d7'; context.fillRect(0,0,1200,700);
  context.lineJoin='round';
  if(studentWorld.background && backgroundImage?.complete && backgroundImage.naturalWidth) {
    const scale=Math.min(1200/backgroundImage.naturalWidth,700/backgroundImage.naturalHeight);
    const w=backgroundImage.naturalWidth*scale,h=backgroundImage.naturalHeight*scale;context.drawImage(backgroundImage,(1200-w)/2,(700-h)/2,w,h);return;
  }
  studentWorld.cells.forEach(cell => {
    if (!cell.land) return;
    context.beginPath();cell.polygon.forEach(([x,y],i) => i ? context.lineTo(x,y) : context.moveTo(x,y));context.closePath();
    context.fillStyle=(cell.biome || biomeForCell(cell)).color;context.fill();
    context.fillStyle=`rgba(${cell.elevation>.7?'62,78,46':'255,255,220'},${cell.shade*.13})`;context.fill();
    context.strokeStyle='rgba(55,75,59,.16)';context.lineWidth=.6;context.stroke();
  });
  // Outline political borders and coastlines by sharing polygon edges.
  const edges=new Map();
  studentWorld.cells.filter(c=>c.land).forEach(cell=>cell.polygon.slice(0,-1).forEach((point,i)=>{
    const next=cell.polygon[i+1]; const key=[point.map(v=>v.toFixed(2)).join(','),next.map(v=>v.toFixed(2)).join(',')].sort().join('|');
    if(edges.has(key)){const edge=edges.get(key);edge.internal=edge.country===cell.country;edge.shared=true;} else edges.set(key,{point,next,country:cell.country,internal:false,shared:false});
  }));
  edges.forEach(edge=>{if(edge.internal)return;context.beginPath();context.moveTo(...edge.point);context.lineTo(...edge.next);context.strokeStyle=edge.shared?'rgba(63,54,38,.65)':'#547987';context.lineWidth=edge.shared?1.2:1.7;context.setLineDash(edge.shared?[3,3]:[]);context.stroke();});context.setLineDash([]);
  studentWorld.countries.forEach(country=>{
    const [x,y]=country.capital; context.fillStyle='#23332f';context.beginPath();context.arc(x,y,3,0,Math.PI*2);context.fill();
    context.font='bold 15px Georgia';context.textAlign='center';context.lineWidth=3;context.strokeStyle='rgba(255,253,235,.9)';
    const label=country.name || 'Unnamed';context.strokeText(label,x,y+22,140);context.fillText(label,x,y+22,140);
  });
  context.textAlign='left';context.fillStyle='#183746';context.font='bold 20px Georgia';context.fillText(`Kingdoms at War · World ${studentWorld.seed.toString(36).toUpperCase()}`,25,35);
  context.fillStyle='rgba(255,253,246,.95)';context.fillRect(20,625,1160,42);
  context.font='13px sans-serif';
  const key=studentWorld.biomes?.filter(Boolean).map(b=>[b.name,b.color]) || [['Grassland','#b6cc88'],['Forest','#6c9e78'],['Highlands','#9c9888'],['Drylands','#dfc88a'],['Ocean','#adc9d7']];
  context.font='10px sans-serif';key.forEach(([name,color],i)=>{const x=30+(i%7)*164,y=630+Math.floor(i/7)*18;context.fillStyle=color;context.fillRect(x,y,12,12);context.fillStyle='#183746';context.fillText(name,x+16,y+10,145);});
  context.fillStyle='#183746';context.font='12px sans-serif';context.fillText('Fictional classroom geography • Economy & military templates: Gria / Azgaar’s Fantasy Map Generator',25,678);
}
function downloadBlob(blob, filename) {const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function downloadPNG() {
  captureWorld(); const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1400;const context=canvas.getContext('2d');context.scale(2,2);drawWorld(context);
  canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`my-world-${studentWorld.seed}.png`);},'image/png');
  worldMessage('Clean PNG downloaded: country names included, shields and battle arrows excluded. Insert it into Google Docs.');
}
function renderMarkers() {
  const overlay=document.getElementById('shieldMarkers');overlay.replaceChildren();
  studentWorld.selected.forEach((id,i)=>{
    const country=studentWorld.countries[id],button=document.createElement('button');button.type='button';button.className='map-shield';button.dataset.country=id;
    button.style.left=`${country.position[0]/12}%`;button.style.top=`${country.position[1]/7}%`;button.setAttribute('aria-label',`${country.name}: move shield with arrow keys or drag`);button.title=`${country.name} • Gold ${country.gold} • ${armySize(country).toLocaleString()} units`;
    if(country.shield){const img=document.createElement('img');img.src=country.shield;img.alt='';img.draggable=false;button.append(img);} else {button.textContent=String(i+1);button.style.background=country.color;}
    const nameTag=document.createElement('span');nameTag.className='shield-name';nameTag.textContent=country.name;button.append(nameTag);
    let origin=null, moved=false;
    button.addEventListener('pointerdown',event=>{if(event.button!==0)return;origin=[event.clientX,event.clientY];moved=false;button.setPointerCapture(event.pointerId);});
    button.addEventListener('pointermove',event=>{if(!origin)return; if(Math.hypot(event.clientX-origin[0],event.clientY-origin[1])<3&&!moved)return;moved=true;const rect=worldMap.getBoundingClientRect();country.position=[Math.max(20,Math.min(1180,camera.x+(event.clientX-rect.left)/rect.width*camera.w)),Math.max(25,Math.min(650,camera.y+(event.clientY-rect.top)/rect.height*camera.h))];button.style.left=`${country.position[0]/12}%`;button.style.top=`${country.position[1]/7}%`;});
    button.addEventListener('pointerup',()=>{origin=null; if(moved){saveWorld();worldMessage(`${country.name}'s shield moved. Territory ownership is unchanged.`);}else{cards()[i].scrollIntoView({behavior:'smooth',block:'center'});cards()[i].querySelector('.country-name').focus();}});
    button.addEventListener('pointercancel',()=>{origin=null;saveWorld();});
    button.addEventListener('keydown',event=>{const directions={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(!directions[event.key])return;event.preventDefault();const [dx,dy]=directions[event.key];country.position=[Math.max(20,Math.min(1180,country.position[0]+dx)),Math.max(25,Math.min(650,country.position[1]+dy))];button.style.left=`${country.position[0]/12}%`;button.style.top=`${country.position[1]/7}%`;saveWorld();});
    overlay.append(button);
  });
}
function recordMapBattle(model) {
  captureWorld();
  const attacker=Number(document.getElementById('sideAName').value),defender=Number(document.getElementById('sideBName').value);
  const position=index=>[...studentWorld.countries[studentWorld.selected[index]].position];
  const target=position(defender), arrows=[];
  const events=[`${model.sideAName} attacked ${model.sideBName} at ${model.sideBName}'s marked position. Battlefield: ${document.getElementById('terrain').selectedOptions[0].textContent}.`];
  events.push(...[...document.querySelectorAll("#allyResponses li")].map(li=>li.textContent));
  model.countries.forEach(country=>{if(!country.side||!armySize(country)||country.index===defender)return;
    const start=position(country.index);arrows.push({start,end:target,color:country.side==='A'?'#aa382c':'#225fac',label:`${country.name}: ${country.side==='A'?'advance':'reinforce'}`,eventIndex:events.length});
    events.push(country.index===attacker ? `${country.name} advanced toward ${model.sideBName}'s marked position.` : `${country.name} moved to support ${country.side==='A'?model.sideAName:model.sideBName}.`);
  });
  events.push(...model.combat.rounds.map(text=>text.replace('attacker',model.sideAName).replace('defender',model.sideBName)));
  model.combat.casualties.forEach(record=>{const lost=record.units.reduce((sum,u)=>sum+u.lost,0),left=record.units.reduce((sum,u)=>sum+u.remaining,0);events.push(`${record.name}: ${lost} units lost; ${left} returning survivors; ${record.units.reduce((n,u)=>n+(u.reserve||0),0)} held in reserve${record.side?'':'; did not participate'}.`);});
  events.push(`${model.winnerName} won. ${model.loserName} withdrew. Losses are already deducted; replay does not run another battle.`);
  const loserIndex=model.loserSide==='A'?attacker:defender;
  arrows.push({start:target,end:loserIndex===attacker?position(attacker):[Math.min(1170,target[0]+75),Math.max(35,target[1]-65)],color:'#68557f',label:`${model.loserName}: withdrawal`,retreat:true,eventIndex:events.length-1});
  const battle={id:Date.now(),scenes:makeBattleScenes(model,position,target,arrows),title:`${model.sideAName} vs ${model.sideBName}`,winner:model.winnerName,events,arrows,mapSnapshot:document.getElementById('worldCanvas').toDataURL('image/png'),participants:model.countries.filter(c=>c.side).map(c=>({index:c.index,name:c.name,side:c.side,shield:studentWorld.countries[studentWorld.selected[c.index]].shield}))};
  attachTacticalScenes(battle, model, document.getElementById('terrain').value);
  studentWorld.history.unshift(battle);studentWorld.history=studentWorld.history.slice(0,20); activeBattle=battle;
  saveWorld();renderMarkers();renderHistory();showBattle(battle);renderAfterAction();
  document.getElementById('afterActionBlocks').scrollIntoView({behavior:'smooth',block:'start'});
}
function showBattle(battle) {
  clearInterval(playbackTimer);activeBattle=battle;playbackIndex=-1;
  document.getElementById('playbackPanel').hidden=false;
  document.getElementById('mapEvents').replaceChildren(...battle.events.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  document.getElementById('copyEvents').disabled=false;document.getElementById('downloadScene').disabled=false;
  document.getElementById('playbackTitle').textContent=battle.title;drawBattleArrows();advancePlayback();
  // Start paused so students can capture and study each scene.
}
function drawBattleArrows() {
  const svg=document.getElementById('battleArrows');svg.innerHTML='<defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke"/></marker></defs>';
  if(!activeBattle)return;
  const scene=activeBattle.scenes?.[playbackIndex];
  activeBattle.arrows.forEach(arrow=>{if(arrow.retreat&&playbackIndex<(activeBattle.scenes?.length || activeBattle.events.length)-1)return;
    const end=scene?.location&&!arrow.retreat?scene.location:arrow.end;const line=document.createElementNS('http://www.w3.org/2000/svg','path');const mid=[(arrow.start[0]+end[0])/2,(arrow.start[1]+end[1])/2-30];
    line.setAttribute('d',`M ${arrow.start.join(' ')} Q ${mid.join(' ')} ${end.join(' ')}`);line.setAttribute('fill','none');line.setAttribute('stroke',arrow.color);line.setAttribute('stroke-width','4');line.setAttribute('stroke-dasharray',arrow.retreat?'6 5':'10 4');line.setAttribute('marker-end','url(#arrowhead)');const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=arrow.label;line.append(title);svg.append(line);
  });
  if(scene?.location){
    const [x,y]=scene.location;
    const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');ring.setAttribute('cx',x);ring.setAttribute('cy',y);ring.setAttribute('r','12');ring.setAttribute('fill','#fff9');ring.setAttribute('stroke','#9c3229');ring.setAttribute('stroke-width','3');svg.append(ring);
    (activeBattle.participants||[]).forEach((p,i)=>{
      const px=x+(p.side==='A'?-65:40),py=y-45+i*20;
      if(p.shield){const img=document.createElementNS('http://www.w3.org/2000/svg','image');img.setAttribute('href',p.shield);img.setAttribute('x',px);img.setAttribute('y',py);img.setAttribute('width','26');img.setAttribute('height','32');svg.append(img);}
      const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',px);text.setAttribute('y',py+39);text.setAttribute('font-size','9');text.setAttribute('fill','#182e27');text.setAttribute('stroke','#fff');text.setAttribute('stroke-width','.5');text.textContent=p.name;svg.append(text);
    });
  }
}
function advancePlayback() {
  if(!activeBattle)return;
  const scenes=activeBattle.scenes || activeBattle.events.map(text=>({heading:'Battle event',text,view:{x:0,y:0,w:1200,h:700},facts:[]}));
  playbackIndex=Math.min(playbackIndex+1,scenes.length-1);
  const scene=scenes[playbackIndex];
  document.getElementById('sceneHeading').textContent=scene.heading;
  document.getElementById('currentEvent').textContent=`${playbackIndex+1}/${scenes.length} — ${scene.text}`;
  document.getElementById('sceneFacts').replaceChildren(...scene.facts.map(text=>{const fact=document.createElement('p');fact.textContent=text;return fact;}));
  setCamera(scene.view);drawBattleArrows();showTacticalPreview(activeBattle,scene);
  if(playbackIndex===scenes.length-1){clearInterval(playbackTimer);document.getElementById('playBattle').textContent='Replay Battle';}
}
function renderHistory() {
  const select=document.getElementById('battleHistory');select.replaceChildren(new Option('Choose a previous battle',''));
  studentWorld.history.forEach((battle,i)=>select.add(new Option(`${studentWorld.history.length-i}. ${battle.title} — ${battle.winner} won`,String(i))));
}
async function copyBattleData() {
  if(!activeBattle)return;
  const text=activeBattle.events.map((event,i)=>`${i+1}. ${event}`).join('\n');
  try {await navigator.clipboard.writeText(text);worldMessage('Battle narrative copied. Create your own headings and tables in Google Docs.');}
  catch {downloadBlob(new Blob([text],{type:'text/plain'}),'battle-events.txt');worldMessage('Clipboard unavailable. Battle events downloaded as text.');}
}
function requestReplacement(action,message) {pendingAction=action;document.getElementById('replaceMessage').textContent=message;document.getElementById('replaceWorldDialog').showModal();}
function newWorld() {
  studentWorld=generateStudentWorld(freshSeed(),GRIA_TEMPLATE);
  studentWorld.countries.forEach((country,i)=>studentWorld.countries.forEach((other,j)=>{
    if(j<=i)return;const relation=GRIA_TEMPLATE[i].diplomacy[other.templateId];studentWorld.relations[allianceKey(i,j)]=['Ally','Vassal','Suzerain'].includes(relation)?'ally':relation==='Enemy'?'enemy':'neutral';
  }));applyWorld();saveWorld();worldMessage('Your new world is ready. Download the clean PNG, then choose five countries below.');
}
function validateWorldSave(data) {
  if(!data||data.version!==1||!Number.isInteger(data.seed)||data.seed<0||data.seed>4294967295||!Array.isArray(data.countries)||data.countries.length!==(data.azgaar?.pack?.states?.length || 15)||!Array.isArray(data.selected)||data.selected.length!==5||new Set(data.selected).size!==5||data.selected.some(id=>!Number.isInteger(id)||id<0||id>=data.countries.length))throw Error('Not a student world save.');
  data.countries.forEach((country,i)=>{
    if(country.id!==i||typeof country.name!=='string'||country.name.length>38||!['gold','cannons','books','pens','mages'].every(key=>Number.isInteger(country[key])&&country[key]>=0&&country[key]<=999999))throw Error('Invalid country data.');
    if(!Array.isArray(country.position)||country.position.length!==2||!country.position.every(Number.isFinite)||country.position[0]<0||country.position[0]>1200||country.position[1]<0||country.position[1]>700)throw Error('Invalid shield position.');
    if(typeof country.shield!=='string'||country.shield.length>1000000||(country.shield&&!/^data:image\/(png|jpeg|webp);base64,/.test(country.shield)))throw Error('Invalid shield image.');
  });
  data.countries.forEach(c=>{if(c.commitment && !UNIT_TYPES.every(u=>c.commitment[u.key]==null || Number.isInteger(c.commitment[u.key])&&c.commitment[u.key]>=0&&c.commitment[u.key]<=999999))throw Error('Invalid troop commitment.');});
  const generated=data.azgaar?importAzgaarWorld(data.azgaar):generateStudentWorld(data.seed,GRIA_TEMPLATE);
  generated.countries.forEach((country,i)=>{country.commitment=data.countries[i].commitment || {};const original=data.countries[i].originalShield;country.originalShield=typeof original==='string'&&original.length<=1000000&&/^data:image\/(png|jpeg|webp);base64,/.test(original)?original:data.countries[i].shield;});
  generated.countries.forEach((country,i)=>{for(const key of ['name','gold','cannons','books','pens','mages','position','shield'])country[key]=data.countries[i][key];for(const key of ['ruler','exports','currency','sport'])country[key]=typeof data.countries[i][key]==='string'?data.countries[i][key].slice(0,80):'';});
  if(data.background && typeof data.background==='string' && data.background.length<6000000 && /^data:image\/(png|jpeg|webp);base64,/.test(data.background))generated.background=data.background;
  generated.selected=data.selected;generated.relations={};
  for(const [key,value] of Object.entries(data.relations||{}))if(/^\d+-\d+$/.test(key)&&['ally','enemy','neutral'].includes(value))generated.relations[key]=value;
  generated.settings={};for(const id of SETTINGS_IDS){const value=String(data.settings?.[id]??'');if(id==='terrain'&&['plains','hills','fortifications'].includes(value)||['sideAName','sideBName'].includes(id)&&/^[0-4]$/.test(value)||id==='chaosLevel'&&/^[1-5]$/.test(value)||['allyChance','hatredChance','betrayalChance'].includes(id)&&/^\d{1,3}$/.test(value)&&Number(value)<=100)generated.settings[id]=value;}
  // Replays are optional; malformed replay data never blocks recovery of the student's armies.
  generated.history=Array.isArray(data.history)?data.history.slice(0,20).filter(b=>b&&typeof b.title==='string'&&typeof b.winner==='string'&&Array.isArray(b.events)&&b.events.length<100&&b.events.every(e=>typeof e==='string'&&e.length<2000)&&Array.isArray(b.arrows)&&b.arrows.length<=6&&b.arrows.every(a=>[a.start,a.end].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&/^#[0-9a-f]{6}$/i.test(a.color)&&typeof a.label==='string'&&(a.eventIndex===undefined||Number.isInteger(a.eventIndex)&&a.eventIndex>=0&&a.eventIndex<100))):[];
  generated.history.forEach(b=>{
    if(typeof b.mapSnapshot!=='string'||b.mapSnapshot.length>3000000||!/^data:image\/png;base64,/.test(b.mapSnapshot))delete b.mapSnapshot;
    b.participants=Array.isArray(b.participants)?b.participants.filter(p=>p&&typeof p.name==='string'&&['A','B'].includes(p.side)&&typeof p.shield==='string'&&(!p.shield||/^data:image\/(png|jpeg|webp);base64,/.test(p.shield))).slice(0,5):[];
    delete b.rows;
    b.scenes=Array.isArray(b.scenes)?b.scenes.filter(s=>s&&typeof s.heading==='string'&&typeof s.text==='string'&&Array.isArray(s.facts)&&s.facts.every(f=>typeof f==='string')&&s.view&&['x','y','w','h'].every(k=>Number.isFinite(s.view[k]))&&s.view.w>=200&&s.view.w<=1200&&s.view.h>=100&&s.view.h<=700).slice(0,20):undefined;
    if(!b.scenes?.length)delete b.scenes;else b.scenes.forEach(s=>{if(!validTacticalScene(s.tactical))delete s.tactical;if(!Array.isArray(s.location)||s.location.length!==2||!s.location.every(Number.isFinite))delete s.location;});
  });
  return generated;
}
function setCamera(view) {
  const w=Math.max(300,Math.min(1200,view.w));const h=w*700/1200;
  camera={x:Math.max(0,Math.min(1200-w,view.x)),y:Math.max(0,Math.min(700-h,view.y)),w,h};
  const scale=1200/w;
  document.getElementById('mapScene').style.transform=`scale(${scale}) translate(${-camera.x/12}%,${-camera.y/7}%)`;
}
function focusView(point,width=520) {const w=Math.min(1200,width),h=w*700/1200;return {x:Math.max(0,Math.min(1200-w,point[0]-w/2)),y:Math.max(0,Math.min(700-h,point[1]-h/2)),w,h};}
function makeBattleScenes(model,position,target,arrows) {
  const attacker=Number(document.getElementById('sideAName').value),start=position(attacker);
  const overview={x:0,y:0,w:1200,h:700};
  const profiles=model.countries.filter(c=>c.side).map(c=>`${c.name}: ${armySize(c).toLocaleString()} committed units; ${Object.values(c.reserves||{}).reduce((n,v)=>n+v,0).toLocaleString()} held in reserve`);
  const scenes=[{heading:`${model.sideAName} against ${model.sideBName}`,text:`The two coalitions prepare for battle. ${model.countries.filter(c=>c.side==='A').map(c=>c.name).join(', ')} face ${model.countries.filter(c=>c.side==='B').map(c=>c.name).join(', ')}.`,view:overview,facts:profiles}];
  const diplomacy=[...document.querySelectorAll('#allyResponses li')].map(li=>li.textContent);
  scenes.push({heading:'Alliances and decisions',text:diplomacy.join(' '),view:overview,facts:[]});
  const details=model.combat.roundDetails || [];
  details.forEach((round,i)=>{
    const progress=.45+.5*(i/Math.max(1,details.length-1));const point=[start[0]+(target[0]-start[0])*progress,start[1]+(target[1]-start[1])*progress];
    const phase=i===0?'Opening clash':i===details.length-1?'Final engagement':'Continued engagement';
    let text=`${phase} on the approach to ${model.sideBName}. ${round.losses.A===round.losses.B?'Both coalitions suffered equal losses':`${round.losses.A>round.losses.B?model.sideAName:model.sideBName}'s coalition suffered heavier losses`}. ${model.sideAName} lost ${round.losses.A.toLocaleString()} units, while ${model.sideBName} lost ${round.losses.B.toLocaleString()}. ${round.remaining.A&&round.remaining.B?'Both sides reorganized their surviving forces.':'One coalition had no fighting units remaining when this exchange ended.'}`;
    const beat=[
      'Signals passed down the line as the forces committed to the opening clash. Commanders watched for gaps while messengers carried the first reports back from the fighting.',
      'The opening exchange gave way to a harder contest for ground. Orders travelled between the surviving formations, and each side tried to keep its line connected under pressure.',
      'By this stage, the battle had become a test of endurance. The growing loss lists changed what each commander could still commit, while scattered groups worked to remain with their own banners.',
      'Fresh orders could not replace the units already lost. The forces still in action concentrated around their banners as the struggle continued and the margin for mistakes narrowed.',
      'The long engagement left both commands weighing the cost of continuing. Messengers brought new counts from the formations, and the remaining units carried the burden of the next exchange.',
      'The final exchange settled the balance of the field. Commanders assessed the surviving formations and the ground ahead as the fighting reached its conclusion.'
    ][i%6];
    text += ' '+beat;
    const unitFacts=(round.countries||[]).flatMap(c=>[`${c.name} — ${c.side==='A'?'attacking':'defending'} coalition`,...c.units.map(u=>`${u.label}: ${u.lost.toLocaleString()} lost this round; ${u.remaining.toLocaleString()} remain.`)]);
    scenes.push({heading:`Round ${round.round} · ${phase}`,text,location:point,view:focusView(point),facts:[...unitFacts,`${model.sideAName} coalition — lost ${round.losses.A.toLocaleString()}; ${round.remaining.A.toLocaleString()} remain`,`${model.sideBName} coalition — lost ${round.losses.B.toLocaleString()}; ${round.remaining.B.toLocaleString()} remain`]});
  });
  scenes.push({heading:`Outcome · ${model.winnerName} wins`,text:`${model.winnerName} held the field. ${model.loserName}'s force ${model.combat.casualties.filter(c=>c.side===model.loserSide).every(c=>c.units.every(u=>u.remaining===0))?'was wiped out':'withdrew'}. The fighting ended with the surviving formations taking stock of their losses. Messengers carried the result home, leaving rulers to decide what this victory or defeat would mean for their next move. Record the outcome and each country's losses in a table you create in Google Docs.`,location:target,view:focusView(target),facts:model.combat.casualties.flatMap(c=>[...c.units.map(u=>`${c.name} · ${u.label}: ${u.before.toLocaleString()} started; ${u.lost.toLocaleString()} lost in this battle; ${u.remaining.toLocaleString()} returned; ${(u.reserve||0).toLocaleString()} held in reserve; ${(u.nationalRemaining??u.remaining).toLocaleString()} nationally available.`),`${c.name}: ${c.units.reduce((n,u)=>n+u.lost,0).toLocaleString()} lost; ${c.units.reduce((n,u)=>n+u.remaining,0).toLocaleString()} returned; ${c.units.reduce((n,u)=>n+(u.reserve||0),0).toLocaleString()} in reserve${c.side?'':' (neutral)'}`])});
  model.combat.casualties.filter(c=>c.side&&c.units.some(u=>u.before>0)&&c.units.every(u=>u.remaining===0)).forEach(c=>{
    scenes.push({heading:`Force wiped out · ${c.name}`,location:target,view:focusView(target,400),text:`${c.name} has no committed fighting units remaining after this battle. Its banner marks where the force ceased to function as an army. Any troops held in national reserve remain available for a later battle. In this simulation, losses include units wounded, captured, scattered, or destroyed—not only deaths.`,facts:c.units.map(u=>`${u.label}: ${u.lost.toLocaleString()} lost; 0 remain.`)});
  });
  return scenes;
}
function loadBackground() {
  backgroundImage=null;
  if(!studentWorld.background)return;
  const img=new Image();img.onload=()=>{backgroundImage=img;drawWorld();};img.src=studentWorld.background;
}
async function downloadScenePicture() {
  if(!activeBattle)return;
  const scene=activeBattle.scenes?.[playbackIndex];
  if(scene?.tactical){
    const canvas=await renderTacticalPicture(activeBattle,scene);
    canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`battle-scene-${playbackIndex+1}.png`);},'image/png');
    worldMessage('Tactical picture downloaded with unit markers, battle losses, survivors, and national reserves.');return;
  }
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1034;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fffdf6';ctx.fillRect(0,0,1600,1034);ctx.fillStyle='#20352d';ctx.font='bold 30px Georgia';ctx.fillText(document.getElementById('sceneHeading').textContent,30,44,1540);
  ctx.save();ctx.beginPath();ctx.rect(0,70,1600,934);ctx.clip();ctx.translate(0,70);ctx.scale(1600/camera.w,1600/camera.w);ctx.translate(-camera.x,-camera.y);drawWorld(ctx);
  const svg=document.getElementById('battleArrows').cloneNode(true);svg.setAttribute('width','1200');svg.setAttribute('height','700');
  const svgUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
  const arrowsImage=new Image();await new Promise(resolve=>{arrowsImage.onload=resolve;arrowsImage.onerror=resolve;arrowsImage.src=svgUrl;});if(arrowsImage.naturalWidth)ctx.drawImage(arrowsImage,0,0,1200,700);
  for(const id of studentWorld.selected){const c=studentWorld.countries[id];const [x,y]=c.position;ctx.fillStyle='#fffdf6';ctx.fillRect(x-19,y-23,38,46);if(c.shield){const img=new Image();await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;img.src=c.shield;});if(img.naturalWidth)ctx.drawImage(img,x-17,y-21,34,42);}else{ctx.fillStyle=c.color;ctx.fillRect(x-17,y-21,34,42);ctx.fillStyle='#182e27';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText(String(studentWorld.selected.indexOf(id)+1),x,y+7);}ctx.textAlign='center';ctx.font='bold 12px sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#fffdf6';ctx.strokeText(c.name,x,y+38);ctx.fillStyle='#182e27';ctx.fillText(c.name,x,y+38);}
  ctx.restore();ctx.textAlign='left';ctx.font='16px sans-serif';ctx.fillStyle='#345';ctx.fillText('Kingdoms at War • Illustrated simulation; movement locations are schematic.',25,1024);
  canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`battle-scene-${playbackIndex+1}.png`);},'image/png');
  worldMessage('Scene picture downloaded. Add your heading, account, and your own table in Google Docs.');
}
document.getElementById('uploadMapImage').addEventListener('change',event=>{
  const file=event.target.files[0];if(!file)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>30*1024*1024){worldMessage('Choose a PNG, JPEG, or WebP map smaller than 30 MB.');event.target.value='';return;}
  const reader=new FileReader(),img=new Image();
  img.onload=()=>{const canvas=document.createElement('canvas');const scale=Math.min(1,2000/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.9);requestReplacement(()=>{captureWorld();studentWorld.background=data;clearBattle();studentWorld.history=[];loadBackground();studentWorld.selected.forEach((id,i)=>{studentWorld.countries[id].position=[240+i*170,350];});applyWorld();saveWorld();worldMessage('Map uploaded. Type the five country names, add shields, and drag each to its place. A PNG supplies the picture; troop and terrain settings stay editable.');},'Use this map picture? Your country details and armies will stay, but the previous battle history will be cleared and shields will be placed across the new map.');};
  img.onerror=()=>{worldMessage('That image could not be opened. Try a smaller PNG or JPEG export.');};reader.onload=()=>{img.src=reader.result;};reader.onerror=()=>worldMessage('The map file could not be read. Please choose it again.');reader.readAsDataURL(file);event.target.value='';
});
document.getElementById('zoomIn').addEventListener('click',()=>setCamera(focusView([camera.x+camera.w/2,camera.y+camera.h/2],camera.w/1.4)));
document.getElementById('zoomOut').addEventListener('click',()=>setCamera(focusView([camera.x+camera.w/2,camera.y+camera.h/2],camera.w*1.4)));
document.getElementById('overviewMap').addEventListener('click',()=>setCamera({x:0,y:0,w:1200,h:700}));
document.getElementById('downloadScene').addEventListener('click',downloadScenePicture);
document.getElementById('rerollWorld').addEventListener('click',()=>requestReplacement(newWorld,'Reroll replaces your current map, five country choices, armies, shields, and battle history. Download My Progress first if you want to keep this world.'));
document.getElementById('cancelReplace').addEventListener('click',()=>{pendingAction=null;document.getElementById('replaceWorldDialog').close();});
document.getElementById('confirmReplace').addEventListener('click',()=>{document.getElementById('replaceWorldDialog').close();if(pendingAction)pendingAction();pendingAction=null;});
document.getElementById('downloadMap').addEventListener('click',downloadPNG);
document.getElementById('saveProgress').addEventListener('click',()=>{saveWorld();downloadBlob(new Blob([JSON.stringify(compactWorld())],{type:'application/json'}),`my-world-${studentWorld.seed}.json`);});
document.getElementById('loadProgress').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>40000000)throw Error('File too large.');const data=validateWorldSave(JSON.parse(await file.text()));requestReplacement(()=>{studentWorld=data;applyWorld();saveWorld();},'Open this saved world? It will replace your current work in this browser. Download My Progress first to keep a backup.');}catch{worldMessage('Please choose a My World JSON saved by this site. Your current work has not changed.');}event.target.value='';});
document.getElementById('copyEvents').addEventListener('click',copyBattleData);
document.getElementById('nextEvent').addEventListener('click',()=>{clearInterval(playbackTimer);advancePlayback();});
document.getElementById('playBattle').addEventListener('click',()=>{if(!activeBattle)return;clearInterval(playbackTimer);playbackIndex=-1;advancePlayback();playbackTimer=setInterval(advancePlayback,4000);});
document.getElementById('pauseBattle').addEventListener('click',()=>clearInterval(playbackTimer));
document.getElementById('battleHistory').addEventListener('change',event=>{if(event.target.value!=='')showBattle(studentWorld.history[Number(event.target.value)]);});
grid.addEventListener('input',scheduleSave);grid.addEventListener('change',scheduleSave);grid.addEventListener('shieldloaded',scheduleSave);
SETTINGS_IDS.forEach(id=>document.getElementById(id).addEventListener('change',scheduleSave));
window.addEventListener('pagehide',saveWorld);
try {const saved=localStorage.getItem(STORAGE_KEY);if(saved){studentWorld=validateWorldSave(JSON.parse(saved));applyWorld();worldMessage('Welcome back. Your world, shields, armies, and battle history are restored.');}else newWorld();}
catch {newWorld();worldMessage('Started a new world. If you have a backup, use Open My Progress.');}

function renderBiomeKey() {
  const key=document.getElementById('biomeLegend');key.hidden=Boolean(studentWorld.background);
  if(!key.dataset.defaultHtml)key.dataset.defaultHtml=key.innerHTML;
  if(!studentWorld.biomes){key.innerHTML=key.dataset.defaultHtml;return;}
  key.replaceChildren();const title=document.createElement('strong');title.textContent='Azgaar biome key';key.append(title);
  studentWorld.biomes.filter(Boolean).forEach(b=>{const item=document.createElement('span'),swatch=document.createElement('i');swatch.className='biome-swatch';swatch.style.background=b.color;swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(b.name));key.append(item);});
}
document.getElementById('importAzgaar').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try {if(file.size>40000000)throw Error('Choose a Full JSON smaller than 40 MB.');const world=importAzgaarWorld(JSON.parse(await file.text()));requestReplacement(()=>{studentWorld=world;applyWorld();saveWorld();worldMessage('Azgaar world imported: actual land, country boundaries, and biome colors. Choose five lands. Troops and gold are editable game defaults.');},'Import this Azgaar world? Save My Progress first to keep your current world.');}
  catch(error){worldMessage(error.message || 'Could not read this world. Choose Azgaar Export → JSON → full.');}event.target.value='';
});


async function renderAfterAction() {
  const host=document.getElementById('afterActionBlocks');if(!host)return;
  const version=++reportRenderVersion;host.replaceChildren();host.hidden=!studentWorld.history.length;
  const intro=document.createElement('h2');intro.textContent='Your battle reports';host.append(intro);
  const guide=document.createElement('p');guide.textContent='Read down the page. Each round is part of one battle. Download a picture, write your account, then create your own table from the facts below it. Flavor text is fictional; loss figures come from the simulation.';host.append(guide);
  for(const [battleIndex,battle] of [...studentWorld.history].reverse().entries()) {
    const heading=document.createElement('h2');heading.textContent=`Battle ${battleIndex+1} · ${battle.title}`;host.append(heading);
    const scenes=battle.scenes || [];const map=await reportImage(battle.mapSnapshot||'');
    for(const [sceneIndex,scene] of scenes.entries()) {
      if(version!==reportRenderVersion)return;
      const block=document.createElement('article');block.className='battle-block';
      const title=document.createElement('h3');title.textContent=scene.heading;block.append(title);
      const locationTitle=document.createElement('h4');locationTitle.textContent='Battle location';block.append(locationTitle);
      const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=640;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#adc9d7';ctx.fillRect(0,0,1000,640);
      const view=scene.view||{x:0,y:0,w:1200,h:700};
      if(map)ctx.drawImage(map,view.x,view.y,view.w,view.h,0,0,1000,520);
      else {ctx.fillStyle='#20352d';ctx.font='20px sans-serif';ctx.fillText('Earlier report: no map picture was saved for this battle.',30,60);}
      const p=scene.location||[600,350],x=(p[0]-view.x)/view.w*1000,y=(p[1]-view.y)/view.h*520;
      if(scene.location){ctx.strokeStyle='#ae332d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-100,y+65);ctx.lineTo(x-24,y+16);ctx.lineTo(x-45,y+20);ctx.moveTo(x-24,y+16);ctx.lineTo(x-33,y+38);ctx.stroke();}
      ctx.fillStyle='#fffdf6';ctx.fillRect(0,520,1000,120);ctx.fillStyle='#20352d';ctx.font='bold 17px sans-serif';ctx.fillText(scene.heading,16,544,970);
      for(const [i,member] of (battle.participants||[]).entries()) {
        const shield=await reportImage(member.shield);const px=18+i*196;
        if(shield)ctx.drawImage(shield,px,558,34,44);
        else {ctx.fillStyle=member.side==='A'?'#aa382c':'#225fac';ctx.fillRect(px,558,28,36);}
        ctx.fillStyle='#20352d';ctx.font='bold 12px sans-serif';ctx.fillText(member.name,px+40,575,148);ctx.font='12px sans-serif';ctx.fillText(member.side==='A'?'Attacking coalition':'Defending coalition',px+40,594,148);
        if(scene.location){const bx=x+(member.side==='A'?-80:35),by=y-70+i*26;if(shield)ctx.drawImage(shield,bx,by,22,28);else{ctx.fillStyle=member.side==='A'?'#aa382c':'#225fac';ctx.fillRect(bx,by,20,25);}}
      }
      ctx.fillStyle='#405348';ctx.font='11px sans-serif';ctx.fillText('Illustrated battle position; arrows are schematic. Unit losses appear in the report below.',16,629);
      if(version!==reportRenderVersion)return;
      const picture=document.createElement('img');picture.alt=`${scene.heading}: map location and participating country shields`;picture.src=canvas.toDataURL('image/png');block.append(picture);
      const download=document.createElement('button');download.type='button';download.className='secondary-button';download.textContent='Download location picture';download.addEventListener('click',()=>canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`battle-${battleIndex+1}-scene-${sceneIndex+1}.png`);},'image/png'));block.append(download);
      if(scene.tactical){
        const tacticalCanvas=await renderTacticalPicture(battle,scene);
        if(version!==reportRenderVersion)return;
        const tacticalTitle=document.createElement('h4');tacticalTitle.textContent='Formations and battle results';
        const tacticalImage=document.createElement('img');tacticalImage.className='tactical-battle-image';tacticalImage.alt=battlePictureDescription(scene);tacticalImage.src=tacticalCanvas.toDataURL('image/png');
        const tacticalDownload=document.createElement('button');tacticalDownload.type='button';tacticalDownload.className='secondary-button';tacticalDownload.textContent='Download battle picture';
        tacticalDownload.addEventListener('click',()=>tacticalCanvas.toBlob(blob=>{if(blob)downloadBlob(blob,`battle-${battleIndex+1}-scene-${sceneIndex+1}-tactical.png`);},'image/png'));
        block.append(tacticalTitle,tacticalImage,tacticalDownload);
      }
      const text=document.createElement('p');text.className='battle-narrative';text.textContent=scene.text;block.append(text);
      if(scene.facts.length){const label=document.createElement('h4');label.textContent='Facts for your own table';block.append(label);const facts=document.createElement('div');facts.className='battle-facts';scene.facts.forEach(f=>{const p=document.createElement('p');p.textContent=f;if(f.includes(' — attacking coalition')||f.includes(' — defending coalition'))p.className='fact-country';facts.append(p);});block.append(facts);}
      host.append(block);
    }
  }
}
function reportImage(src){return new Promise(resolve=>{if(!src){resolve(null);return;}const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});}
