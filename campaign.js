/* Student atlas UI; settlements and regiment data live in the existing world save. */
let atlasWorld=null, atlasCountryId=null, atlasCityId=null, atlasView={x:0,y:0,w:1200,h:700};
const atlasCanvas=document.getElementById('atlasCanvas');
const atlasBase=document.createElement('canvas');atlasBase.width=1200;atlasBase.height=700;
const ATLAS_COLORS=['#b74432','#235e91','#775295','#297252','#9b6315'];
globalThis.campaignReady=true;
// Simple edition uses national commitments; saved regiment choices do not limit battles.
function enrichCampaignCountries(countries) {return countries;}
function settleCampaignBattle() {}
function attachCampaignReport() {}
function campaignElement(tag,text,className) {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function campaignInput(host,labelText,value,onInput,{max=80,multiline=false}={}) {
  const label=campaignElement('label',labelText),input=document.createElement(multiline?'textarea':'input');
  if(!multiline)input.type='text';input.maxLength=max;input.value=value??'';if(multiline)input.rows=3;
  input.addEventListener('input',()=>onInput(input.value));label.append(input);host.append(label);return input;
}
function activeAtlasCountry(){return studentWorld.countries[atlasCountryId];}
function setWorkspace(atlas) {
  captureWorld();
  document.getElementById('battleWorkspace').hidden=atlas;
  document.getElementById('atlasWorkspace').hidden=!atlas;
  document.getElementById('battleTabButton').setAttribute('aria-pressed',String(!atlas));
  document.getElementById('atlasTabButton').setAttribute('aria-pressed',String(atlas));
  if(atlas)refreshCampaign();else{drawWorld();renderMarkers();updateNeutrals();updateCampaignDeploymentSummaries();}
}
function refreshCampaign() {
  if(!studentWorld)return;
  if(atlasWorld!==studentWorld){atlasWorld=studentWorld;atlasCountryId=null;atlasCityId=null;atlasView={x:0,y:0,w:1200,h:700};movingAtlasCity=false;}
  studentWorld.selected.forEach(id=>{const c=studentWorld.countries[id];ensureCountryCampaign(studentWorld,c);syncRegimentTotals(c);});
  if(!studentWorld.selected.includes(atlasCountryId)){atlasCountryId=studentWorld.selected[0];atlasCityId=null;atlasView={x:0,y:0,w:1200,h:700};}
  const c=activeAtlasCountry();if(!c.cities.some(city=>city.id===atlasCityId))atlasCityId=c.cities[0]?.id;
  drawWorld(atlasBase.getContext('2d'));
  renderAtlasCountries();renderAtlasEditors();renderRegiments();drawAtlas();updateCampaignDeploymentSummaries();
}
function renderAtlasCountries() {
  const host=document.getElementById('atlasCountries');host.replaceChildren();
  studentWorld.selected.forEach((id,i)=>{
    const country=studentWorld.countries[id],b=campaignElement('button',`${i+1} · ${country.name}`,'atlas-country-button');b.type='button';b.style.setProperty('--country-color',ATLAS_COLORS[i]);b.setAttribute('aria-pressed',String(id===atlasCountryId));
    b.addEventListener('click',()=>selectAtlasCountry(id,true));host.append(b);
  });
}
function selectAtlasCountry(id,zoom=false,cityId=null) {
  atlasCountryId=id;const country=activeAtlasCountry();atlasCityId=cityId||country.cities[0]?.id;
  if(zoom){
    const points=studentWorld.background?country.cities.map(c=>c.position):studentWorld.cells.filter(c=>c.land&&c.country===id).flatMap(c=>c.polygon);
    const [minX,minY,maxX,maxY]=points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1200,700,0,0]);
    atlasView=focusView([(minX+maxX)/2,(minY+maxY)/2],Math.max(400,maxX-minX+160,(maxY-minY+120)*1200/700));
  }
  renderAtlasCountries();renderAtlasEditors();renderRegiments();drawAtlas();
}
function atlasScreen(point){return [(point[0]-atlasView.x)/atlasView.w*1200,(point[1]-atlasView.y)/atlasView.h*700];}
function visibleAtlasCities(){return studentWorld.selected.flatMap(id=>studentWorld.countries[id].cities).filter(city=>{const [x,y]=atlasScreen(city.position);return x>=0&&x<=1200&&y>=0&&y<=700;});}
function drawAtlas(context=atlasCanvas.getContext('2d'),exporting=false) {
  const {x,y,w,h}=atlasView;
  context.clearRect(0,0,1200,700);context.save();context.scale(1200/w,700/h);context.translate(-x,-y);drawWorldBase(context,w<1200?{zoom:1200/w,view:atlasView}:null);context.restore();
  context.save();context.scale(1200/w,700/h);context.translate(-x,-y);
  if(!studentWorld.background){
    context.fillStyle='rgba(255,253,245,.5)';context.fillRect(0,0,1200,700);
    const selected=new Set(studentWorld.selected),edges=new Map();
    studentWorld.cells.filter(c=>c.land&&selected.has(c.country)).forEach(cell=>{
      context.beginPath();cell.polygon.forEach((p,i)=>i?context.lineTo(...p):context.moveTo(...p));context.closePath();
      context.fillStyle=ATLAS_COLORS[studentWorld.selected.indexOf(cell.country)];context.globalAlpha=cell.country===atlasCountryId ? .36 : .2;context.fill();context.globalAlpha=1;
      cell.polygon.slice(0,-1).forEach((p,i)=>{const q=cell.polygon[i+1],key=[p.map(v=>v.toFixed(2)).join(','),q.map(v=>v.toFixed(2)).join(',')].sort().join('|');const previous=edges.get(key);if(previous&&previous.country===cell.country)edges.delete(key);else edges.set(key,{p,q,country:cell.country});});
    });
    edges.forEach(e=>{context.beginPath();context.moveTo(...e.p);context.lineTo(...e.q);context.strokeStyle=ATLAS_COLORS[studentWorld.selected.indexOf(e.country)];context.lineWidth=e.country===atlasCountryId?2:1;context.stroke();});
  }else{
    studentWorld.selected.forEach((id,i)=>{const c=studentWorld.countries[id];context.beginPath();context.arc(...c.position,38,0,Math.PI*2);context.fillStyle=ATLAS_COLORS[i]+'35';context.fill();context.strokeStyle=ATLAS_COLORS[i];context.lineWidth=3;context.stroke();});
  }
  context.restore();
  if(exporting){
    visibleAtlasCities().forEach(city=>{const [px,py]=atlasScreen(city.position);context.fillStyle=ATLAS_COLORS[studentWorld.selected.indexOf(city.country)];context.beginPath();context.arc(px,py,5,0,Math.PI*2);context.fill();context.font='bold 14px sans-serif';context.textAlign=px>1000?'right':'left';context.strokeStyle='#fffdf5';context.lineWidth=4;const label=`${city.capital?'★ ':''}${city.name}`;context.strokeText(label,px+8,py-8,210);context.fillText(label,px+8,py-8,210);});
    if(document.getElementById('atlasShowArmies').checked)[atlasCountryId].forEach(id=>{
      const c=studentWorld.countries[id];c.regiments.forEach((r,i)=>{const city=c.cities.find(s=>s.id===r.cityId)||c.cities[0];const [px,py]=atlasScreen(city.position);if(px<0||px>1200||py<0||py>650)return;context.font='12px sans-serif';context.textAlign=px>1000?'right':'left';context.strokeStyle='#fffdf5';context.lineWidth=3;context.fillStyle='#233c32';context.strokeText(`⚑ ${r.name}`,px+8,py+20+c.regiments.slice(0,i).filter(other=>other.cityId===r.cityId).length*17,230);context.fillText(`⚑ ${r.name}`,px+8,py+20+c.regiments.slice(0,i).filter(other=>other.cityId===r.cityId).length*17,230);});
    });
    context.textAlign='left';context.fillStyle='#fffdf5';context.fillRect(0,665,1200,35);context.font='12px sans-serif';context.fillStyle='#233c32';context.fillText('Kingdoms at War · Student atlas · '+(studentWorld.azgaar?'Map and settlements: Azgaar’s Fantasy Map Generator':'Generated classroom settlements')+(studentWorld.background?' · PNG placements are illustrative':''),15,688,1160);
  }else{
    renderAtlasMarkers();
    document.getElementById('atlasMapNote').textContent=studentWorld.background?'Uploaded picture: colored circles identify your countries; borders cannot be read from a PNG. City positions are suggested. Use “Move this city” to place them yourself.':studentWorld.azgaar?'Azgaar country borders and settlement locations are preserved. Countries without exported settlements receive generated cities on their land.':'Cities are generated on each country’s land. Click a country button to zoom in; All five countries returns to the overview.';
  }
}
let movingAtlasCity=false;
function renderAtlasMarkers() {
  const host=document.getElementById('atlasMarkers');host.replaceChildren();
  visibleAtlasCities().forEach(city=>{
    const [x,y]=atlasScreen(city.position),b=campaignElement('button',`${city.capital?'★':'●'}${city.country===atlasCountryId||city.capital?' '+(city.name||'Unnamed city'):''}`,'atlas-city-marker');b.type='button';b.style.left=`${x/12}%`;b.style.top=`${y/7}%`;b.style.setProperty('--country-color',ATLAS_COLORS[studentWorld.selected.indexOf(city.country)]);b.setAttribute('aria-label',`${city.name}, ${studentWorld.countries[city.country].name}, ${city.capital?'capital city':'village'}`);b.setAttribute('aria-pressed',String(city.id===atlasCityId));b.title=b.getAttribute('aria-label');
    b.addEventListener('click',()=>{selectAtlasCountry(city.country,false,city.id);document.getElementById('atlasCityEditor').querySelector('input').focus({preventScroll:true});});host.append(b);
  });
  if(document.getElementById('atlasShowArmies').checked)[atlasCountryId].forEach(id=>{
    const country=studentWorld.countries[id];country.regiments.forEach((r,i)=>{
      const city=country.cities.find(c=>c.id===r.cityId)||country.cities[0];const [x,y]=atlasScreen(city.position);
      if(x<0||x>1200||y<0||y>610)return;
      const b=campaignElement('button',`⚑ ${r.name}`,'atlas-regiment-marker');b.type='button';b.style.left=`${x/12}%`;b.style.top=`${(y+30+country.regiments.slice(0,i).filter(other=>other.cityId===r.cityId).length*24)/7}%`;b.title=`General ${r.general} · ${CAMPAIGN_KEYS.reduce((n,k)=>n+r.units[k],0)} units${r.selected?' · Ready':' · Staying home'}`;
      b.addEventListener('click',()=>{selectAtlasCountry(id,false,city.id);document.getElementById(`army-${r.id}`).scrollIntoView({behavior:'smooth',block:'center'});});host.append(b);
    });
  });
}
function renderAtlasEditors() {
  const c=activeAtlasCountry(),countryHost=document.getElementById('atlasCountryEditor');countryHost.replaceChildren();document.getElementById('atlasCountryTitle').textContent=c.name;
  const index=studentWorld.selected.indexOf(c.id);
  const editCountry=(key,value)=>{c[key]=value;if(selectedSettlement())updateSettlementCaption(selectedSettlement());cards()[index].querySelector(`.country-${key}`).value=value;saveWorld();if(key==='name'){document.getElementById('atlasCountryTitle').textContent=value;renderAtlasCountries();drawWorld(atlasBase.getContext('2d'));drawAtlas();refreshCountryChoices();refreshRegionChoices();renderBattleChoices();}};
  campaignInput(countryHost,'Country name',c.name,v=>editCountry('name',v),{max:38});
  CAMPAIGN_FIELDS.forEach(([key,label])=>campaignInput(countryHost,label,c[key],v=>editCountry(key,v)));
  const citySelect=document.getElementById('atlasCitySelect');citySelect.replaceChildren(...c.cities.map(city=>new Option(`${city.capital?'★ Capital city: ':'Village: '}${city.name||'Unnamed settlement'}`,city.id)));citySelect.value=atlasCityId;
  const city=c.cities.find(city=>city.id===atlasCityId),host=document.getElementById('atlasCityEditor');host.replaceChildren();if(!city)return;
  const kind=city.capital?'City':'Village';
  document.getElementById('atlasSettlementType').textContent=city.capital?'Your capital city':'Your village';
  document.getElementById('atlasCityTitle').textContent=city.name||`Your ${kind.toLowerCase()}`;
  const note=campaignElement('p',city.source==='azgaar'?'Settlement imported from Azgaar. Give it your own story.':'A generated settlement. Rename it and make it yours.','map-help');host.append(note);
  const cityNameInput=campaignInput(host,`${kind} name`,city.name,v=>{city.name=v;saveWorld();document.getElementById('atlasCityTitle').textContent=v||`Your ${kind.toLowerCase()}`;citySelect.selectedOptions[0].textContent=`${city.capital?'★ Capital city: ':'Village: '}${v||'Unnamed settlement'}`;document.querySelectorAll('#regimentCards .regiment-base option').forEach(option=>{if(option.value===city.id)option.textContent=v||'Unnamed city';});drawAtlas();updateSettlementFacts(city);},{max:60});
  cityNameInput.addEventListener('change',()=>renderSettlementMap(city));
  campaignInput(host,city.capital?'Governor (fictional)':'Mayor (fictional)',city.mayor,v=>{city.mayor=v;saveWorld();updateSettlementFacts(city);});
  const popInput=campaignInput(host,'Population',city.population??'',v=>{if(v.trim()===''){city.population=null;city.populationSource='unknown';}else if(/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))){city.population=Number(v);city.populationSource='student';}else return;saveWorld();updateSettlementFacts(city);});popInput.inputMode='numeric';popInput.addEventListener('change',()=>renderSettlementMap(city));
  host.append(campaignElement('p',`Uses ${c.name}’s currency${c.currency?': '+c.currency:''}.`,'map-help'));
  if(!city.capital){
    for(const [key,label,help] of [['crop','Major crop','Crops are plants grown to sell, such as wheat, apples, or cotton. You can make up an imaginary crop!'],['artisan','Artisanal good','Artisanal goods are things people make by hand, such as pottery, woven baskets, or jewelry. You can make up an imaginary good!']]){
      const input=campaignInput(host,label,city[key],v=>{city[key]=v;saveWorld();updateSettlementCaption(city);});
      const hint=campaignElement('p',help,'map-help');hint.id=`settlement-${key}-help`;input.setAttribute('aria-describedby',hint.id);input.parentElement.after(hint);
    }
  }
  campaignInput(host,`What makes this ${kind.toLowerCase()} special?`,city.notes,v=>{city.notes=v;saveWorld();updateSettlementCaption(city);},{max:1200,multiline:true});
  renderSettlementMap(city);
  if(studentWorld.background){const move=campaignElement('button',`Move this ${kind.toLowerCase()}`,'secondary-button');move.type='button';move.addEventListener('click',()=>{movingAtlasCity=true;document.getElementById('atlasMapNote').textContent='Click the map to place this city. Press Escape to cancel.';document.getElementById('atlasMap').focus();});host.append(move);}
}
function updateSettlementFacts(city) {
  document.getElementById('settlementTitle').textContent=city.name||'Settlement map';
  const source={azgaar:'from Azgaar',estimated:'classroom estimate',student:'student edited',unknown:'not included in this import'};
  document.getElementById('settlementFacts').textContent=`${city.capital?'Governor':'Mayor'}: ${city.mayor||'Add a fictional leader above'} · Population: ${city.population===null?'unknown':city.population.toLocaleString()} (${source[city.populationSource]||'unknown'}).`;
  updateSettlementCaption(city);
  document.getElementById('settlementOpen').href=settlementMapURL(city);
  const exportURL=new URL(settlementMapURL(city));if(city.capital)exportURL.searchParams.set('export','png');
  document.getElementById('settlementExport').href=exportURL.href;
  document.getElementById('settlementExportHelp').textContent=city.capital?'Export PNG opens Watabou and starts its PNG export.':'Export PNG opens this village in Watabou. Right-click the map, then choose Export → PNG. On a touch screen, use its menu.';
}
function renderSettlementMap(city) {
  updateSettlementFacts(city);
  document.getElementById('settlementKindLabel').textContent=city.capital?'Capital city · named districts':'Village map';
  const frame=document.getElementById('settlementFrame'),url=settlementMapURL(city,true);
  // Avoid reloading the external generator on ordinary notebook edits.
  if(!document.getElementById('atlasWorkspace').hidden&&frame.getAttribute('src')!==url)frame.src=url;
  frame.style.transform=`rotate(${city.mapRotation}deg)`;
  const host=document.getElementById('atlasBiomes');host.replaceChildren();
  (studentWorld.biomes||AZGAAR_BIOMES).filter(Boolean).forEach(b=>{const item=campaignElement('span'),swatch=campaignElement('i',undefined,'biome-swatch');swatch.style.background=b.color;swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(b.name));host.append(item);});
  document.getElementById('atlasBiomeNote').textContent=studentWorld.azgaar?'All biomes from the imported world, including any custom names and colors. Not every biome occurs in every country.':'This whole world uses Azgaar’s 13 biome types, colors, and classification rules. Local temperature and moisture are simulated for this classroom map. Biomes vary with climate and elevation; not every world contains every type.';
}
function selectedSettlement(){return activeAtlasCountry().cities.find(c=>c.id===atlasCityId);}
document.getElementById('settlementGenerate').addEventListener('click',()=>{const city=selectedSettlement();city.mapSeed=crypto.getRandomValues(new Uint32Array(1))[0]%2147483646+1;saveWorld();renderSettlementMap(city);});
document.getElementById('settlementRotate').addEventListener('click',()=>{const city=selectedSettlement();city.mapRotation=(city.mapRotation+90)%360;saveWorld();renderSettlementMap(city);});
function renderRegiments() {
  return; // Advanced roster UI is retained in the archived edition.

  const country=activeAtlasCountry(),host=document.getElementById('regimentCards');host.replaceChildren();
  document.getElementById('armyTitle').textContent=`${country.name} · regiments & fictional generals`;
  country.regiments.forEach(r=>{
    const card=campaignElement('article',undefined,'regiment-card');card.id=`army-${r.id}`;
    const selected=campaignElement('label',undefined,'regiment-selection'),check=document.createElement('input');check.type='checkbox';check.checked=r.selected;selected.append(check,document.createTextNode('Available for battle'));check.addEventListener('change',()=>{r.selected=check.checked;saveWorld();renderArmySummary();drawAtlas();});card.append(selected);
    campaignInput(card,'Regiment name',r.name,v=>{r.name=v;saveWorld();drawAtlas();},{max:60});
    campaignInput(card,'General’s name',r.general,v=>{r.general=v;saveWorld();drawAtlas();},{max:60});
    const traitLabel=campaignElement('label','Personality (story only)'),trait=document.createElement('select');COMMANDER_TRAITS.forEach(t=>trait.add(new Option(t,t)));trait.value=r.trait;trait.addEventListener('change',()=>{r.trait=trait.value;saveWorld();});traitLabel.append(trait);card.append(traitLabel);
    const baseLabel=campaignElement('label','Stationed at'),base=document.createElement('select');base.className='regiment-base';country.cities.forEach(c=>base.add(new Option(c.name||'Unnamed city',c.id)));base.value=r.cityId;base.addEventListener('change',()=>{r.cityId=base.value;saveWorld();drawAtlas();});baseLabel.append(base);card.append(baseLabel);
    const total=CAMPAIGN_KEYS.reduce((n,k)=>n+r.units[k],0);card.append(campaignElement('p',`${total.toLocaleString()} units · ${r.battles} battles fought`,'regiment-total'));
    const details=document.createElement('details');details.append(campaignElement('summary','Companies & batteries'));const list=document.createElement('ul');regimentCompanies(r).forEach(company=>list.append(campaignElement('li',`${company.name}: ${company.count.toLocaleString()} units`)));if(!total)list.append(campaignElement('li','No troops remain in this regiment.'));details.append(list);card.append(details);
    campaignInput(card,'General’s story',r.notes,v=>{r.notes=v;saveWorld();},{max:1200,multiline:true});host.append(card);
  });renderArmySummary();
}
function updateCampaignDeploymentSummaries() {
  if(loadingWorld)return;
  getCountries().forEach((data,i)=>{const total=CAMPAIGN_KEYS.reduce((n,k)=>n+data[k],0),committed=CAMPAIGN_KEYS.reduce((n,k)=>n+Math.min(data[k],data.commitment?.[k]??data[k]),0);const summary=cards()[i].querySelector('.deployment-summary');if(summary)summary.textContent=`${committed.toLocaleString()} troops selected · ${(total-committed).toLocaleString()} held in reserve.`;});
}
function renderArmySummary() {
  const c=activeAtlasCountry(),total=c.regiments.reduce((n,r)=>n+CAMPAIGN_KEYS.reduce((s,k)=>s+r.units[k],0),0),ready=c.regiments.filter(r=>r.selected).reduce((n,r)=>n+CAMPAIGN_KEYS.reduce((s,k)=>s+r.units[k],0),0);
  document.getElementById('armySummary').textContent=`${ready.toLocaleString()} units available from checked regiments · ${(total-ready).toLocaleString()} staying home.${ready?'':' Select at least one regiment with troops before starting a battle.'}`;
}
document.getElementById('battleTabButton').addEventListener('click',()=>setWorkspace(false));
document.getElementById('atlasTabButton').addEventListener('click',()=>setWorkspace(true));
document.getElementById('atlasOverview').addEventListener('click',()=>{atlasView={x:0,y:0,w:1200,h:700};drawAtlas();});
document.getElementById('atlasCitySelect').addEventListener('change',event=>{atlasCityId=event.target.value;renderAtlasEditors();drawAtlas();});
document.getElementById('atlasShowArmies').addEventListener('change',()=>drawAtlas());
document.getElementById('atlasSaveProgress').addEventListener('click',()=>document.getElementById('saveProgress').click());
document.getElementById('atlasDownload').addEventListener('click',()=>{const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1400;const ctx=canvas.getContext('2d');ctx.scale(2,2);drawAtlas(ctx,true);canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`my-country-atlas-${studentWorld.seed}.png`);},'image/png');});
const atlasMap=document.getElementById('atlasMap');atlasMap.tabIndex=0;
atlasMap.addEventListener('keydown',event=>{if(event.key==='Escape'){movingAtlasCity=false;drawAtlas();}});
atlasMap.addEventListener('click',event=>{
  if(!movingAtlasCity||event.target.closest('button'))return;const rect=atlasMap.getBoundingClientRect();const c=activeAtlasCountry().cities.find(city=>city.id===atlasCityId);
  c.position=[Math.max(0,Math.min(1200,atlasView.x+(event.clientX-rect.left)/rect.width*atlasView.w)),Math.max(0,Math.min(700,atlasView.y+(event.clientY-rect.top)/rect.height*atlasView.h))];movingAtlasCity=false;saveWorld();drawAtlas();
});
refreshCampaign();

enableMapPanning(atlasMap,()=>atlasView,view=>{atlasView=view;drawAtlas();},()=>!movingAtlasCity);

function settlementCaptionLines(city,country) {
  const source={azgaar:'Azgaar data',estimated:'classroom estimate',student:'student edited',unknown:'unknown'};
  const lines=[`${city.capital?'Capital city':'Village'} of ${country.name}`,`${city.capital?'Governor':'Mayor'}: ${city.mayor||'Not yet named'}`,`Population: ${city.population==null?'Unknown':city.population.toLocaleString()} (${source[city.populationSource]||'unknown'})`];
  if(!city.capital)lines.push(`Major crop: ${city.crop||'Not yet chosen'}`,`Artisanal good: ${city.artisan||'Not yet chosen'}`);
  if(city.notes)lines.push(`Our story: ${city.notes}`);
  return lines;
}
function updateSettlementCaption(city) {
  const host=document.getElementById('settlementCaption');host.replaceChildren(campaignElement('h4',city.name||'Unnamed settlement'));
  settlementCaptionLines(city,activeAtlasCountry()).forEach(line=>host.append(campaignElement('p',line)));
}
function wrapSettlementText(ctx,text,width) {
  const lines=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/)){
      if(ctx.measureText(line+(line?' ':'')+word).width<=width){line+=(line?' ':'')+word;continue;}
      if(line){lines.push(line);line='';}
      for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line);
  }
  return lines;
}
async function exportSettlementCaption(file,city,country) {
  if(file.type!=='image/png')throw Error('Choose the PNG map downloaded from Watabou.');
  if(file.size>40000000)throw Error('Choose a PNG smaller than 40 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    const width=1200,mapHeight=Math.round(bitmap.height*width/bitmap.width);
    if(mapHeight>6000)throw Error('Choose a landscape or square map PNG.');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font='bold 36px sans-serif';const title=wrapSettlementText(ctx,city.name||'Unnamed settlement',1100);
    ctx.font='24px sans-serif';const paragraphs=settlementCaptionLines(city,country).map(text=>wrapSettlementText(ctx,text,1100));
    canvas.width=width;canvas.height=mapHeight+100+title.length*45+paragraphs.reduce((n,p)=>n+p.length*34+14,0)+44;
    ctx.fillStyle='#fffdf5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,width,mapHeight);
    ctx.fillStyle='#233c32';ctx.textBaseline='top';ctx.font='bold 36px sans-serif';let y=mapHeight+36;
    for(const line of title){ctx.fillText(line,50,y);y+=45;}y+=16;ctx.font='24px sans-serif';
    for(const lines of paragraphs){for(const line of lines){ctx.fillText(line,50,y);y+=34;}y+=14;}
    ctx.font='18px sans-serif';ctx.fillStyle='#52665b';ctx.fillText('Map by Watabou · Fictional settlement information by the student',50,y+12);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not create this PNG. Please try again.');
    downloadBlob(blob,`${(city.name||'settlement').replace(/[^a-z0-9-]+/gi,'-')}-map-and-information.png`);
  }finally{bitmap.close();}
}
document.getElementById('settlementCaptionFile').addEventListener('change',async event=>{
  const input=event.target,file=input.files[0];if(!file)return;
  const city={...selectedSettlement()},country={...activeAtlasCountry()},status=document.getElementById('settlementCaptionStatus');
  status.textContent=`Adding ${city.name}’s information…`;
  try{await exportSettlementCaption(file,city,country);status.textContent=`Downloaded ${city.name}’s map with its custom information underneath.`;}catch(error){status.textContent=error.message;}
  input.value='';
});
