/* Map-first classroom editing and explicit attack/help orders. */
let territoryWorld=null,dropOrder=null,placingPictureShield=false;
function updateClassroomNames(){
  for(const id of ['editorCountrySelect','orderSource','orderTarget']){
    const select=document.getElementById(id),previous=select.value;
    select.replaceChildren(...studentWorld.countries.map(c=>new Option(c.name||'Unnamed country',c.id)));
    select.value=studentWorld.countries[Number(previous)]?previous:'0';
  }
  document.getElementById('editorCountrySelect').value=String(studentWorld.editorCountry??0);
  document.getElementById('countryEditorTitle').textContent=studentWorld.countries[studentWorld.editorCountry??0].name||'Edit a country';
  document.querySelectorAll('#countryTerritories .territory-hit').forEach(p=>p.setAttribute('aria-label',`Edit ${studentWorld.countries[Number(p.dataset.country)].name}`));
  renderClassroomPlan();
}
function selectClassroomCountry(id,save=true){
  if(!studentWorld.countries[id])return;
  if(studentWorld.editorCountry!==id)document.getElementById('countrySidebar').scrollTop=0;
  studentWorld.editorCountry=id;
  cards().forEach((card,i)=>{card.hidden=studentWorld.selected[i]!==id;card.querySelector('.country-details').open=true;card.querySelector('.map-country').parentElement.hidden=true;});
  document.getElementById('editorCountrySelect').value=String(id);document.getElementById('orderSource').value=String(id);
  document.getElementById('countryEditorTitle').textContent=studentWorld.countries[id].name;
  document.querySelectorAll('#countryTerritories [data-country]').forEach(p=>p.classList.toggle('selected-territory',Number(p.dataset.country)===id));
  if(save)saveWorld();
}
function refreshClassroom(){
  document.getElementById('countryEditorHost').append(grid);document.getElementById('placePictureShield').hidden=!studentWorld.background;placingPictureShield=false;
  territoryWorld=null;updateClassroomNames();renderTerritories();selectClassroomCountry(studentWorld.editorCountry??0,false);renderClassroomMarkers();renderClassroomPlan();
}
function renderTerritories(){
  let svg=document.getElementById('countryTerritories');
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='countryTerritories';svg.setAttribute('viewBox','0 0 1200 700');document.getElementById('mapScene').append(svg);}
  if(territoryWorld===studentWorld)return;territoryWorld=studentWorld;svg.replaceChildren();if(studentWorld.background)return;
  for(const country of studentWorld.countries){
    const cells=studentWorld.cells.filter(c=>c.land&&c.country===country.id),edges=new Map();
    const d=cells.map(c=>'M'+c.polygon.map(p=>p.join(',')).join('L')+'Z').join('');
    for(const c of cells)for(let i=0;i<c.polygon.length-1;i++){
      const a=c.polygon[i],b=c.polygon[i+1],key=[a.map(v=>v.toFixed(2)).join(','),b.map(v=>v.toFixed(2)).join(',')].sort().join('|');
      if(edges.has(key))edges.delete(key);else edges.set(key,`M${a.join(',')}L${b.join(',')}`);
    }
    const hit=document.createElementNS(svg.namespaceURI,'path');hit.setAttribute('d',d);hit.setAttribute('class','territory-hit');hit.dataset.country=country.id;hit.setAttribute('aria-label',`Edit ${country.name}`);hit.setAttribute('role','button');hit.setAttribute('tabindex','0');
    let origin;
    hit.addEventListener('pointerdown',e=>{origin=[e.clientX,e.clientY]});hit.addEventListener('click',e=>{if(!origin||Math.hypot(e.clientX-origin[0],e.clientY-origin[1])<5)selectClassroomCountry(country.id);origin=null;});
    hit.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();selectClassroomCountry(country.id);}});
    const outline=document.createElementNS(svg.namespaceURI,'path');outline.setAttribute('d',[...edges.values()].join(''));outline.setAttribute('class','territory-border');outline.dataset.country=country.id;
    svg.append(hit,outline);
  }
}
function countryAtPointer(x,y){
  const rect=worldMap.getBoundingClientRect(),p=[camera.x+(x-rect.left)/rect.width*camera.w,camera.y+(y-rect.top)/rect.height*camera.h];
  if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
  if(studentWorld.background){const c=studentWorld.countries.find(c=>Math.hypot(c.position[0]-p[0],c.position[1]-p[1])<35);return c?.id??null;}
  for(const cell of studentWorld.cells){if(!cell.land)continue;let inside=false;const poly=cell.polygon;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
    if(inside)return cell.country;
  }return null;
}
function renderClassroomMarkers(){
  const host=document.getElementById('shieldMarkers');host.replaceChildren();renderTerritories();
  for(const c of studentWorld.countries){
    if(!c.shield)continue;
    const button=document.createElement('button');button.type='button';button.className='map-shield classroom-shield';button.dataset.country=c.id;button.style.left=`${c.position[0]/12}%`;button.style.top=`${c.position[1]/7}%`;button.setAttribute('aria-label',`Edit or drag ${c.name}`);button.title=`${c.name}: click to edit, drag to Attack or Help`;
    if(c.shield){const img=document.createElement('img');img.src=c.shield;img.alt='';img.draggable=false;button.append(img);}else{button.textContent='⚑';button.style.background=c.color;}
    const name=document.createElement('span');name.className='shield-name';name.textContent=c.name;button.append(name);
    let origin=null,moved=false;
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;origin=[e.clientX,e.clientY];moved=false;button.setPointerCapture(e.pointerId);e.stopPropagation();});
    button.addEventListener('pointermove',e=>{if(!origin)return;if(Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>5)moved=true;if(!moved)return;const r=worldMap.getBoundingClientRect();button.style.left=`${(camera.x+(e.clientX-r.left)/r.width*camera.w)/12}%`;button.style.top=`${(camera.y+(e.clientY-r.top)/r.height*camera.h)/7}%`;});
    button.addEventListener('pointerup',e=>{if(!origin)return;origin=null;if(moved){const marker=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest?.('.classroom-shield')).find(el=>el&&Number(el.dataset.country)!==c.id);const target=marker?Number(marker.dataset.country):countryAtPointer(e.clientX,e.clientY);renderClassroomMarkers();if(target!==null&&target!==c.id){dropOrder={source:c.id,target};document.getElementById('countryOrderHeading').textContent=`${c.name} → ${studentWorld.countries[target].name}`;document.getElementById('countryOrderDialog').showModal();}else orderStatus('Drop onto another country to choose Attack or Help.');}else selectClassroomCountry(c.id);});
    button.addEventListener('pointercancel',()=>{origin=null;renderClassroomMarkers();});button.addEventListener('click',e=>{if(e.detail===0)selectClassroomCountry(c.id);});host.append(button);
  }
  selectClassroomCountry(studentWorld.editorCountry??0,false);
}
function orderStatus(text){document.getElementById('classroomOrderStatus').textContent=text;}
function setClassroomOrder(source,target,kind){
  if(source===target){orderStatus('Choose two different countries.');return;}
  if(kind==='attack'){
    studentWorld.battlePlan={attacker:source,defender:target,helpers:{}};
    orderStatus('Attack planned. Add helpers if you want, then click Simulate battle.');
  }else{
    const plan=studentWorld.battlePlan;
    if(!plan){orderStatus('Plan an attack first. Then choose which side to help.');return;}
    if([plan.attacker,plan.defender].includes(source)){orderStatus('The attacker and defender are already in the battle. Choose a different helper.');return;}
    if(![plan.attacker,plan.defender].includes(target)){orderStatus('Help the attacking or defending country in this battle.');return;}
    plan.helpers[source]=target;orderStatus(`${studentWorld.countries[source].name} will help ${studentWorld.countries[target].name}.`);
  }
  saveWorld();renderClassroomPlan();
}
function renderClassroomPlan(){
  const host=document.getElementById('classroomPlan');if(!host)return;renderOrderArrows();host.replaceChildren();const plan=studentWorld.battlePlan;document.getElementById('classroomSimulate').disabled=!plan;
  if(!plan){host.textContent='No attack planned yet.';return;}
  const title=document.createElement('p');title.textContent=`${studentWorld.countries[plan.attacker].name} attacks ${studentWorld.countries[plan.defender].name}.`;host.append(title);
  for(const [id,target] of Object.entries(plan.helpers)){
    const row=document.createElement('p');row.textContent=`${studentWorld.countries[id].name} helps ${studentWorld.countries[target].name}. `;const remove=document.createElement('button');remove.type='button';remove.textContent='Remove help';remove.addEventListener('click',()=>{delete plan.helpers[id];saveWorld();renderClassroomPlan();});row.append(remove);host.append(row);
  }
}
function renderOrderArrows(){
  const ns='http://www.w3.org/2000/svg';let svg=document.getElementById('classroomOrderArrows');
  if(!svg){svg=document.createElementNS(ns,'svg');svg.id='classroomOrderArrows';svg.setAttribute('viewBox','0 0 1200 700');document.getElementById('mapScene').append(svg);}
  svg.replaceChildren();const p=studentWorld.battlePlan;if(!p)return;
  for(const [source,target,color] of [[p.attacker,p.defender,'#b33226'],...Object.entries(p.helpers).map(([id,target])=>[Number(id),target,'#225fac'])]){
    const a=studentWorld.countries[source].position,b=studentWorld.countries[target].position,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const path=document.createElementNS(ns,'path');path.setAttribute('d',`M${a[0]},${a[1]}L${b[0]},${b[1]}M${b[0]-16*Math.cos(angle-.5)},${b[1]-16*Math.sin(angle-.5)}L${b[0]},${b[1]}L${b[0]-16*Math.cos(angle+.5)},${b[1]-16*Math.sin(angle+.5)}`);path.setAttribute('stroke',color);path.setAttribute('fill','none');path.setAttribute('stroke-width','3');svg.append(path);
  }
}
function resolveClassroomOrders(countries,attacker,defender){
  const plan=studentWorld.battlePlan,notes=[];
  for(const c of countries){c.side=c.index===attacker?'A':c.index===defender?'B':null;if(plan&&c.side===null){const target=plan.helpers[studentWorld.selected[c.index]];if(target===plan.attacker)c.side='A';if(target===plan.defender)c.side='B';if(c.side)notes.push(`${c.name} helps ${studentWorld.countries[target].name}, as ordered.`);}}
  return notes;
}
document.getElementById('editorCountrySelect').addEventListener('change',e=>selectClassroomCountry(Number(e.target.value)));
for(const kind of ['Attack','Help']){
  document.getElementById('order'+kind).addEventListener('click',()=>setClassroomOrder(Number(document.getElementById('orderSource').value),Number(document.getElementById('orderTarget').value),kind.toLowerCase()));
  document.getElementById('drop'+kind).addEventListener('click',()=>{document.getElementById('countryOrderDialog').close();if(dropOrder)setClassroomOrder(dropOrder.source,dropOrder.target,kind.toLowerCase());dropOrder=null;});
}
document.getElementById('dropCancel').addEventListener('click',()=>{dropOrder=null;document.getElementById('countryOrderDialog').close();});
document.getElementById('classroomClear').addEventListener('click',()=>{delete studentWorld.battlePlan;saveWorld();renderClassroomPlan();orderStatus('Orders cleared.');});
document.getElementById('classroomSimulate').addEventListener('click',()=>{
  const plan=studentWorld.battlePlan;if(!plan)return;captureWorld();document.getElementById('sideAName').value=String(studentWorld.selected.indexOf(plan.attacker));document.getElementById('sideBName').value=String(studentWorld.selected.indexOf(plan.defender));
  runBattle();orderStatus(formMessage.textContent||'Battle complete. Read your report below.');
});
window.addEventListener('pagehide',()=>saveWorld());
refreshClassroom();
// Zoomed maps capture pointers for panning. A stationary click still selects land.
let territoryPointer=null;
worldMap.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))territoryPointer=[e.clientX,e.clientY];});
worldMap.addEventListener('pointerup',e=>{if(territoryPointer&&Math.hypot(e.clientX-territoryPointer[0],e.clientY-territoryPointer[1])<5){if(placingPictureShield&&studentWorld.background){const r=worldMap.getBoundingClientRect();studentWorld.countries[studentWorld.editorCountry].position=[Math.max(0,Math.min(1200,camera.x+(e.clientX-r.left)/r.width*camera.w)),Math.max(0,Math.min(700,camera.y+(e.clientY-r.top)/r.height*camera.h))];placingPictureShield=false;saveWorld();renderClassroomMarkers();renderClassroomPlan();orderStatus('Shield placed.');}else{const id=countryAtPointer(e.clientX,e.clientY);if(id!==null)selectClassroomCountry(id);}}territoryPointer=null;});
worldMap.addEventListener('pointercancel',()=>{territoryPointer=null;});

document.getElementById('placePictureShield').addEventListener('click',()=>{placingPictureShield=true;orderStatus('Click the picture to place this country’s shield.');});
