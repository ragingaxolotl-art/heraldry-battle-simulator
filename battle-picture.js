/* Original Canvas renderer. Tactical locations are illustrations of saved combat rounds,
   not a second simulation. Never mutates troop counts or rerolls battle results. */
function attachTacticalScenes(battle, model, terrain) {
  const records=model.combat.casualties.filter(c=>c.side);
  battle.scenes.forEach((scene,i)=>{
    const round=model.combat.roundDetails[i-2];
    const phase=i<2?'deployment':round?'combat':'outcome';
    scene.tactical={version:1,phase,terrain,winnerSide:model.winnerSide,round:round?.round || 0,roundCount:model.combat.roundDetails.length,
      location:model.battlefield?.point || battle.scenes.find(s=>s.heading?.startsWith('Outcome'))?.location || scene.location || [600,350],
      formations:records.map(record=>({index:record.index,name:record.name,side:record.side,
        formation:formationChoice(model.countries?.find(c=>c.index===record.index)?.formation).id,
        maneuver:maneuverChoice(model.countries?.find(c=>c.index===record.index)?.maneuver).id,
        units:record.units.map(unit=>{
          const detail=round?.countries.find(c=>c.index===record.index)?.units.find(u=>u.label===unit.label);
          const remaining=phase==='deployment'?unit.before:detail?detail.remaining:unit.remaining;
          return {roundLost:detail?.lost||0,key:unit.key,label:unit.label,committed:unit.before,remaining,lost:unit.before-remaining,reserve:unit.reserve||0};
        })}))};
    scene.text = (scene.text||"") + " " + scene.tactical.formations.map(f=>narrateFormation(f,scene.tactical)).join(" ");
  });
}
function validTacticalScene(t) {
  const count=n=>Number.isInteger(n)&&n>=0&&n<=999999;
  return t&&t.version===1&&(t.location===undefined||Array.isArray(t.location)&&t.location.length===2&&t.location.every(Number.isFinite)&&t.location[0]>=0&&t.location[0]<=1200&&t.location[1]>=0&&t.location[1]<=700)&&(t.roundCount===undefined||Number.isInteger(t.roundCount)&&t.roundCount>=0&&t.roundCount<=6)&&['deployment','combat','outcome'].includes(t.phase)&&['plains','hills','fortifications'].includes(t.terrain)&&['A','B'].includes(t.winnerSide)&&Number.isInteger(t.round)&&t.round>=0&&t.round<=6&&Array.isArray(t.formations)&&t.formations.length>0&&t.formations.length<=5&&new Set(t.formations.map(f=>f?.index)).size===t.formations.length&&t.formations.every(f=>f&&(f.formation===undefined||FORMATIONS.some(p=>p.id===f.formation))&&(f.maneuver===undefined||MANEUVERS.some(p=>p.id===f.maneuver))&&Number.isInteger(f.index)&&f.index>=0&&f.index<5&&typeof f.name==='string'&&f.name.length<=38&&['A','B'].includes(f.side)&&Array.isArray(f.units)&&f.units.length===4&&f.units.every((u,i)=>u&&u.key===UNIT_TYPES[i].key&&u.label===UNIT_TYPES[i].label&&['committed','remaining','lost','reserve'].every(k=>count(u[k]))&&(u.roundLost===undefined||count(u.roundLost)&&u.roundLost<=u.lost)&&u.committed===u.remaining+u.lost&&u.committed+u.reserve<=999999));
}
function tacticalTotals(formations) {
  return formations.reduce((sum,f)=>{f.units.forEach(u=>{for(const k of ['committed','remaining','lost','reserve'])sum[k]+=u[k];});return sum;},{committed:0,remaining:0,lost:0,reserve:0});
}
// Outcome badges describe saved counts, never an inferred morale or tactical success.
function formationStatus(f,t) {
  const n=tacticalTotals([f]);
  if(n.committed>0&&!n.remaining)return {icon:'×',label:'Force lost',color:'#a4392c'};
  if(t.phase==='outcome')return f.side===t.winnerSide?{icon:'⚑',label:'Victory',color:'#286044'}:{icon:'↩',label:'Defeat · withdrawal',color:'#735087'};
  if(t.phase==='deployment')return {icon:'◇',label:'Deployed',color:'#235e91'};
  return {icon:n.lost?'−':'⋈',label:n.lost?'Losses recorded':'Engaged',color:n.lost?'#a4392c':'#235e91'};
}
function narrateFormation(f,t) {
  const n=tacticalTotals([f]),layout=formationChoice(f.formation),plan=maneuverChoice(f.maneuver);
  const status=formationStatus(f,t);
  if(t.phase==='outcome')return `${f.name}: ${status.label.toLowerCase()}. Of ${n.committed.toLocaleString()} committed units, ${n.remaining.toLocaleString()} survive and ${n.lost.toLocaleString()} are recorded as losses. ${n.reserve.toLocaleString()} national reserves stayed outside this battle.`;
  const infantry=f.units.find(u=>u.key==='pens')?.remaining||0,cavalry=f.units.find(u=>u.key==='mages')?.remaining||0;
  const limitation=f.formation==='square'&&!infantry?' No infantry remain to form the intended square.':'';
  const maneuver=f.maneuver==='charge'&&!cavalry?'The cavalry advance cannot be represented by cavalry because none remain.':`The ordered maneuver is ${plan.name.toLowerCase()}: ${plan.description}`;
  return `${f.name} uses ${layout.name.toLowerCase()}: ${layout.description}${limitation} ${maneuver} ${t.phase==='combat'?`${f.units.reduce((sum,u)=>sum+(u.roundLost||0),0).toLocaleString()} units were lost this round; ${n.remaining.toLocaleString()} remain in the committed force.`:`${n.committed.toLocaleString()} units deploy; ${n.reserve.toLocaleString()} stay in national reserve.`} These positions illustrate the plan; the simulation does not resolve individual maneuver success.`;
}
function battlePictureDescription(scene) {
  const t=scene.tactical;
  if(!t)return scene.heading;
  return `${scene.heading}. ${t.formations.map(f=>{const n=tacticalTotals([f]);return `${f.name}, ${formationStatus(f,t).label}, ${formationChoice(f.formation).name}, ${maneuverChoice(f.maneuver).name}: ${t.phase==='outcome'?(f.side===t.winnerSide?'winning':'defeated')+' side; ':''}${n.committed} committed, ${n.lost} lost, ${n.remaining} surviving, ${n.reserve} in reserve`;}).join('. ')}. Marker positions are schematic.`;
}
// The geographic crop is shared by every phase of this battle, so formations stay on the same ground.
function tacticalMapHeight(t){return Math.max(860,Math.max(...['A','B'].map(side=>t.formations.filter(f=>f.side===side).length))*350+90);}
function tacticalMapView(t,scene){
  const point=Array.isArray(t.location)&&t.location.length===2&&t.location.every(Number.isFinite)?t.location:scene.location||[600,350];
  const w=360,h=w*tacticalMapHeight(t)/1720;
  return {x:Math.max(0,Math.min(1200-w,point[0]-w/2)),y:Math.max(0,Math.min(700-h,point[1]-h/2)),w,h};
}
async function renderTacticalPicture(battle,scene) {
  const t=scene.tactical,canvas=document.createElement('canvas'),mapHeight=tacticalMapHeight(t),footer=210+mapHeight;canvas.width=1800;canvas.height=footer+390;
  const ctx=canvas.getContext('2d'),ink='#203b34',paper='#faf7ec';
  const colors={A:'#a4392c',B:'#235e91'},light={A:'#ffebe1',B:'#e6f3ff'};
  const map=await reportImage(battle.mapSnapshot||'');
  const shields=await Promise.all(t.formations.map(f=>reportImage((battle.participants||[]).find(p=>p.index===f.index)?.shield||'')));
  function text(value,x,y,size=18,color=ink,max){ctx.fillStyle=color;ctx.font=`${size>=24?'bold ':''}${size}px sans-serif`;ctx.fillText(String(value),x,y,max);}
  function line(x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function arrow(points,color,dashed=false){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.setLineDash(dashed?[12,8]:[]);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
    const [x,y]=points.at(-1),[px,py]=points.at(-2),angle=Math.atan2(y-py,x-px);
    line(x,y,x-17*Math.cos(angle-.5),y-17*Math.sin(angle-.5),color,4);line(x,y,x-17*Math.cos(angle+.5),y-17*Math.sin(angle+.5),color,4);ctx.restore();
  }
  function symbol(key,x,y,color){
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-12,y-7,24,14);
    if(key==='pens'){line(x-11,y-6,x+11,y+6,color);line(x+11,y-6,x-11,y+6,color);}
    if(key==='mages')line(x-11,y+6,x+11,y-6,color);
    if(key==='cannons'){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
    if(key==='books'){ctx.beginPath();ctx.arc(x-5,y,7,-Math.PI/2,Math.PI/2);ctx.stroke();line(x-5,y-7,x-5,y+7,color);line(x-5,y,x+10,y,color);}
  }
  ctx.fillStyle=paper;ctx.fillRect(0,0,1800,canvas.height);ctx.fillStyle=ink;ctx.fillRect(0,0,1800,93);
  text('KINGDOMS AT WAR · BATTLEFIELD FORMATIONS',40,29,16,'#e6d8af');text(scene.heading,40,72,32,'#fffdf5',1720);
  for(const side of ['A','B']){
    const x=side==='A'?40:920,totals=tacticalTotals(t.formations.filter(f=>f.side===side));
    ctx.fillStyle=light[side];ctx.fillRect(x,110,840,82);
    text(t.phase==='outcome'?(side===t.winnerSide?'VICTORY':'DEFEAT'):(side==='A'?'ATTACKING COALITION':'DEFENDING COALITION'),x+16,140,25,colors[side]);
    text(`${totals.committed.toLocaleString()} committed · ${totals.remaining.toLocaleString()} surviving · ${totals.lost.toLocaleString()} lost · ${totals.reserve.toLocaleString()} reserve`,x+16,175,18,ink,807);
  }
  const box={x:40,y:210,w:1720,h:mapHeight},view=tacticalMapView(t,scene);
  ctx.fillStyle='#dce2ce';ctx.fillRect(box.x,box.y,box.w,box.h);
  if(map)ctx.drawImage(map,view.x,view.y,view.w,view.h,box.x,box.y,box.w,box.h);
  ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.w,box.h);ctx.clip();
  // A light wash keeps the actual map geography visible beneath the counters.
  ctx.fillStyle='rgba(255,253,240,.12)';ctx.fillRect(box.x,box.y,box.w,box.h);
  ctx.fillStyle='rgba(250,247,236,.92)';ctx.fillRect(54,222,930,35);
  text(`MAP CLOSE-UP · ${t.terrain.toUpperCase()} · ${t.phase==='combat'?'ROUND '+t.round:t.phase.toUpperCase()} · schematic troop positions`,66,247,17);
  ['A','B'].forEach(side=>{
    const members=t.formations.filter(f=>f.side===side),direction=side==='A'?1:-1;
    const laneHeight=(mapHeight-90)/members.length;
    members.forEach((f,row)=>{
      const top=278+row*laneHeight,cy=top+laneHeight*.53;
      const rear=side==='A'?112:1688,front=rear+direction*665;
      const nameX=side==='A'?62:990,shield=shields[t.formations.indexOf(f)];
      ctx.fillStyle='rgba(250,247,236,.95)';ctx.fillRect(nameX,top,740,49);
      if(shield)ctx.drawImage(shield,nameX+5,top+5,27,37);else{ctx.fillStyle=colors[side];ctx.fillRect(nameX+6,top+9,26,27);text(f.index+1,nameX+13,top+29,17,'white');}
      text(`${f.index+1} · ${f.name}`,nameX+43,top+21,18,ink,685);
      text(`${formationChoice(f.formation).name} · ${maneuverChoice(f.maneuver).name}`,nameX+43,top+42,16,colors[side],685);
      const status=formationStatus(f,t);
      ctx.fillStyle='rgba(250,247,236,.96)';ctx.fillRect(nameX,top+51,300,25);
      text(`${status.icon}  ${status.label}`,nameX+8,top+70,17,status.color,285);
      const nodes=buildFormationLayout(f.formation,f.units);
      const deployedHeight=Math.max(130,laneHeight-100);
      // Show the maneuver before counters so arrows never cover their counts.
      if(tacticalTotals([f]).remaining){
        const withdraw=t.phase==='outcome'?side!==t.winnerSide:f.maneuver==='withdraw';
        const mx=front+direction*38;
        if(withdraw)arrow([[mx,cy],[mx-direction*100,cy+30]],'#735087',true);
        else if(t.phase!=='outcome'&&f.maneuver!=='hold'){
          if(f.maneuver==='pincer')[-1,1].forEach(sign=>arrow([[mx,cy+sign*deployedHeight*.38],[mx+direction*70,cy+sign*deployedHeight*.38],[mx+direction*107,cy+sign*30]],colors[side]));
          else if(['left','right'].includes(f.maneuver)){const sign=f.maneuver==='left'?-1:1;arrow([[mx,cy],[mx+direction*40,cy+sign*deployedHeight*.3],[mx+direction*107,cy+sign*deployedHeight*.3]],colors[side]);}
          else arrow([[mx,cy],[mx+direction*105,cy]],colors[side]);
        }
      }
      nodes.forEach(n=>{
        const d=maneuverDisplacement(f.maneuver,n,t.phase,t.round,t.roundCount||6);
        const defeated=t.phase==='outcome'&&side!==t.winnerSide;
        const x=rear+direction*((n.x+d.x)*590-(defeated&&n.remaining?24:0));
        const y=cy+(n.y+d.y)*deployedHeight*.5;
        ctx.fillStyle=n.remaining?light[side]:'#eee8df';ctx.fillRect(x-24,y-11,48,24);ctx.strokeStyle=colors[side];ctx.lineWidth=2;ctx.strokeRect(x-24,y-11,48,24);
        symbol(n.key,x-8,y-3,colors[side]);text(String(f.index+1),x+14,y+1,10,colors[side]);
        text(n.remaining.toLocaleString(),x-20,y+11,11,ink,40);
        if(!n.remaining){line(x-21,y-10,x+21,y+14,'#aa3329',3);line(x+21,y-10,x-21,y+14,'#aa3329',3);}
      });
    });
  });
  // Flag marks the encounter location; it is not a claim of territorial ownership.
  const location=t.location||scene.location||[600,350],px=box.x+(location[0]-view.x)/view.w*box.w,py=box.y+(location[1]-view.y)/view.h*box.h;
  ctx.strokeStyle='#fff9de';ctx.lineWidth=5;ctx.beginPath();ctx.arc(px,py,16,0,Math.PI*2);ctx.stroke();
  if(t.phase==='outcome'){line(px,py-40,px,py,ink,3);ctx.fillStyle=colors[t.winnerSide];ctx.fillRect(px,py-40,30,18);}else{line(px-8,py-8,px+8,py+8,ink,3);line(px+8,py-8,px-8,py+8,ink,3);}
  ctx.restore();
  text('FORCE ACCOUNTING · marker numbers identify nations; each block is part of the committed force',40,footer+34,19);
  t.formations.forEach((f,i)=>{
    const n=tacticalTotals([f]),y=footer+67+i*39;
    text(`${f.index+1} · ${f.name}`,40,y,17,ink,520);
    text(f.units.map(u=>`${u.label}: ${u.remaining.toLocaleString()} left / ${u.lost.toLocaleString()} lost`).join('   ·   '),575,y,16,ink,1180);
    text(`${n.reserve.toLocaleString()} untouched national reserves · ${(n.reserve+n.remaining).toLocaleString()} nationally available`,40,y+17,13);
  });
  [['pens','Infantry'],['books','Archers'],['mages','Cavalry'],['cannons','Artillery']].forEach(([key,label],i)=>{symbol(key,57+i*190,footer+295,ink);text(label,80+i*190,footer+301,17);});
  arrow([[860,footer+295],[910,footer+295]],ink);text('Advance',925,footer+301,17);arrow([[1060,footer+295],[1110,footer+295]],'#735087',true);text('Retreat',1125,footer+301,17);
  line(1250,footer+285,1270,footer+305,'#aa3329',3);line(1270,footer+285,1250,footer+305,'#aa3329',3);text('Destroyed group',1285,footer+301,17);
  text('◇ Deployed · ⋈ Engaged · − Losses · ⚑ Victory · ↩ Defeat / withdrawal · × Committed force lost',40,footer+330,16);
  text('Saved map geography with illustrated formations. Maneuvers are plans, not pathfinding; they do not alter the recorded combat result.',40,footer+352,16);
  text('Rear support lines belong to the committed army. National reserves are never placed on the battlefield.',40,footer+370,16);
  return canvas;
}
let tacticalPreviewVersion=0;
async function showTacticalPreview(battle,scene){
  const version=++tacticalPreviewVersion,preview=document.getElementById('tacticalPreview');
  if(!preview)return;
  preview.hidden=!scene.tactical;
  if(!scene.tactical)return;
  const canvas=await renderTacticalPicture(battle,scene);
  if(version!==tacticalPreviewVersion)return;
  preview.src=canvas.toDataURL('image/png');preview.alt=battlePictureDescription(scene);
}

// These routes show coalition action, not simulated one-to-one unit targeting.
function battleFlowPaths(t) {
  const height=tacticalMapHeight(t),middle=210+height/2;
  const points=side=>t.formations.filter(f=>f.side===side).map((f,row,all)=>{
    const lane=(height-90)/all.length,cy=278+row*lane+lane*.53,direction=side==='A'?1:-1,rear=side==='A'?112:1688;
    const nodes=buildFormationLayout(f.formation,f.units).map(n=>{const d=maneuverDisplacement(f.maneuver,n,t.phase,t.round,t.roundCount||6);return {x:rear+direction*((n.x+d.x)*590),y:cy+(n.y+d.y)*Math.max(130,lane-100)*.5};});
    const anchor=nodes.reduce((best,p)=>!best||Math.hypot(p.x-(rear+direction*590),p.y-cy)<Math.hypot(best.x-(rear+direction*590),best.y-cy)?p:best,null);
    return {f,...(anchor||{x:side==='A'?690:1110,y:cy})};
  });
  const a=points('A'),b=points('B'),paths=[];
  const add=(side,start,end,kind,curve=0)=>paths.push({side,kind,d:`M ${start.x} ${start.y} Q ${(start.x+end.x)/2} ${(start.y+end.y)/2+curve} ${end.x} ${end.y}`,x:end.x,y:end.y,impact:end.f?.units.some(u=>u.roundLost>0)||false});
  if(t.phase==='outcome'){
    [...a,...b].filter(p=>p.f.side!==t.winnerSide&&tacticalTotals([p.f]).remaining).forEach(p=>add(p.f.side,p,{x:p.f.side==='A'?190:1610,y:p.y},'retreat',45));
  }else if(t.phase==='deployment'){
    [...a,...b].forEach(p=>add(p.f.side,{x:p.f.side==='A'?230:1570,y:p.y},p,'deploy',-35));
  }else{
    // Shared junctions explicitly connect coalitions without inventing individual matchups.
    const redHub={x:900,y:middle-35},blueHub={x:900,y:middle+35};
    a.filter(p=>tacticalTotals([p.f]).remaining||p.f.units.some(u=>u.roundLost)).forEach(p=>add('A',p,redHub,'attack',-35));
    b.forEach(p=>add('A',redHub,{...p},'attack',-35));
    b.filter(p=>tacticalTotals([p.f]).remaining||p.f.units.some(u=>u.roundLost)).forEach(p=>add('B',p,blueHub,'counter',35));
    a.forEach(p=>add('B',blueHub,{...p},'counter',35));
  }
  return paths;
}
let battleFlowId=0;
function createBattleMotion(scene,picture) {
  const t=scene.tactical,host=document.createElement('div');host.className='battle-motion';
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 1800 ${210+tacticalMapHeight(t)+390}`);svg.setAttribute('role','img');
  svg.setAttribute('aria-label',t.phase==='combat'?'Red attacking coalition and blue defending coalition exchange attacks. Moving lines illustrate coalition action, not individual targets.':t.phase==='outcome'?'Surviving defeated forces retreat.':'Both coalitions move into position before combat.');
  const make=(name,attrs,parent=svg)=>{const el=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));parent.append(el);return el;};
  const defs=make('defs',{}),id=++battleFlowId;
  for(const [side,color] of [['A','#bf3529'],['B','#176aac']]){const marker=make('marker',{id:`flow-${id}-${side}`,viewBox:'0 0 12 12',refX:10,refY:6,markerWidth:4,markerHeight:4,orient:'auto'},defs);make('path',{d:'M 1 1 L 11 6 L 1 11 Z',fill:color},marker);}
  battleFlowPaths(t).forEach((route,i)=>{
    make('path',{d:route.d,fill:'none',stroke:'#fffdf2','stroke-width':13,'stroke-linecap':'round',opacity:.9});
    const path=make('path',{d:route.d,fill:'none',stroke:route.side==='A'?'#bf3529':'#176aac','stroke-width':7,'stroke-linecap':'round','marker-end':`url(#flow-${id}-${route.side})`,class:`battle-flow ${route.kind}`});
    path.style.animationDelay=`${-i*.3}s`;
  });
  if(t.phase==='combat')battleFlowPaths(t).filter(route=>route.impact).forEach(route=>{
    make('circle',{cx:route.x,cy:route.y,r:22,fill:'none',stroke:'#a62f22','stroke-width':5,class:'battle-impact'});
  });
  const button=document.createElement('button');button.type='button';button.className='secondary-button battle-motion-toggle';
  let paused=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  const update=()=>{host.classList.toggle('motion-paused',paused);button.textContent=paused?'▶':'Ⅱ';button.setAttribute('aria-label',paused?'Play battle movement':'Pause battle movement');button.title=button.getAttribute('aria-label');};
  button.addEventListener('click',()=>{paused=!paused;update();});update();
  host.append(picture,svg,button);return host;
}
