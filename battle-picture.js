/* Original Canvas renderer. Tactical locations are illustrations of saved combat rounds,
   not a second simulation. Never mutates troop counts or rerolls battle results. */
function attachTacticalScenes(battle, model, terrain) {
  const records=model.combat.casualties.filter(c=>c.side);
  battle.scenes.forEach((scene,i)=>{
    const round=model.combat.roundDetails[i-2];
    const phase=i<2?'deployment':round?'combat':'outcome';
    scene.tactical={version:1,phase,terrain,winnerSide:model.winnerSide,round:round?.round || 0,
      formations:records.map(record=>({index:record.index,name:record.name,side:record.side,
        units:record.units.map(unit=>{
          const detail=round?.countries.find(c=>c.index===record.index)?.units.find(u=>u.label===unit.label);
          const remaining=phase==='deployment'?unit.before:detail?detail.remaining:unit.remaining;
          return {key:unit.key,label:unit.label,committed:unit.before,remaining,lost:unit.before-remaining,reserve:unit.reserve||0};
        })}))};
  });
}
function validTacticalScene(t) {
  const count=n=>Number.isInteger(n)&&n>=0&&n<=999999;
  return t&&t.version===1&&['deployment','combat','outcome'].includes(t.phase)&&['plains','hills','fortifications'].includes(t.terrain)&&['A','B'].includes(t.winnerSide)&&Number.isInteger(t.round)&&t.round>=0&&t.round<=6&&Array.isArray(t.formations)&&t.formations.length>0&&t.formations.length<=5&&new Set(t.formations.map(f=>f.index)).size===t.formations.length&&t.formations.every(f=>Number.isInteger(f.index)&&f.index>=0&&f.index<5&&typeof f.name==='string'&&f.name.length<=38&&['A','B'].includes(f.side)&&Array.isArray(f.units)&&f.units.length===4&&f.units.every((u,i)=>u.key===UNIT_TYPES[i].key&&u.label===UNIT_TYPES[i].label&&['committed','remaining','lost','reserve'].every(k=>count(u[k]))&&u.committed===u.remaining+u.lost&&u.committed+u.reserve<=999999));
}
function tacticalTotals(formations) {
  return formations.reduce((sum,f)=>{f.units.forEach(u=>{for(const k of ['committed','remaining','lost','reserve'])sum[k]+=u[k];});return sum;},{committed:0,remaining:0,lost:0,reserve:0});
}
function battlePictureDescription(scene) {
  const t=scene.tactical;
  if(!t)return scene.heading;
  return `${scene.heading}. ${t.formations.map(f=>{const n=tacticalTotals([f]);return `${f.name}: ${t.phase==='outcome'?(f.side===t.winnerSide?'winning':'defeated')+' side; ':''}${n.committed} committed, ${n.lost} lost, ${n.remaining} surviving, ${n.reserve} in reserve`;}).join('. ')}. Marker positions are schematic.`;
}
async function renderTacticalPicture(battle,scene) {
  const t=scene.tactical, canvas=document.createElement('canvas');canvas.width=1200;canvas.height=940;
  const ctx=canvas.getContext('2d'), ink='#213c38', paper='#faf6e9';
  const colors={A:'#9b3f32',B:'#255d83'}, light={A:'#f8e5da',B:'#e1edf1'};
  const shields=await Promise.all(t.formations.map(f=>reportImage((battle.participants||[]).find(p=>p.index===f.index)?.shield||'')));
  const map=await reportImage(battle.mapSnapshot||'');
  const text=(s,x,y,size=16,color=ink,max=undefined)=>{ctx.fillStyle=color;ctx.font=`${size>=20?'bold ':''}${size}px sans-serif`;ctx.fillText(String(s),x,y,max);};
  const line=(x1,y1,x2,y2,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  const arrow=(x1,y1,x2,y2,color,dashed=false)=>{
    ctx.save();ctx.setLineDash(dashed?[8,6]:[]);line(x1,y1,x2,y2,color,3);ctx.setLineDash([]);
    const angle=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-12*Math.cos(angle-.5),y2-12*Math.sin(angle-.5),color,3);line(x2,y2,x2-12*Math.cos(angle+.5),y2-12*Math.sin(angle+.5),color,3);ctx.restore();
  };
  const symbol=(key,x,y,color)=>{
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-16,y-10,32,20);
    if(key==='pens'){line(x-15,y-9,x+15,y+9,color);line(x+15,y-9,x-15,y+9,color);}
    if(key==='mages')line(x-15,y+9,x+15,y-9,color);
    if(key==='cannons'){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
    if(key==='books'){ctx.beginPath();ctx.arc(x-7,y,10,-Math.PI/2,Math.PI/2);ctx.stroke();line(x-7,y-10,x-7,y+10,color);arrow(x-7,y,x+14,y,color);}
  };
  ctx.fillStyle=paper;ctx.fillRect(0,0,1200,940);
  ctx.fillStyle=ink;ctx.fillRect(0,0,1200,91);
  text('KINGDOMS AT WAR  /  BATTLE RECORD',28,27,13,'#e6d8af');
  text(scene.heading,28,65,28,'#fffdf5',1144);
  for(const side of ['A','B']){
    const x=side==='A'?28:624, members=t.formations.filter(f=>f.side===side), totals=tacticalTotals(members);
    ctx.fillStyle=light[side];ctx.fillRect(x,106,548,78);
    const status=t.phase==='outcome'?(side===t.winnerSide?'VICTORY':'DEFEAT'):(side==='A'?'ATTACKING COALITION':'DEFENDING COALITION');
    text(status,x+14,132,20,colors[side]);
    text(`${totals.committed.toLocaleString()} committed  /  ${totals.remaining.toLocaleString()} surviving  /  ${totals.lost.toLocaleString()} lost`,x+14,154,15);
    text(`${totals.reserve.toLocaleString()} national reserves — not in this battle`,x+14,174,14);
  }
  // Neutral tactical ground: exact map pixels are shown separately as geographic context.
  ctx.fillStyle=t.terrain==='hills'?'#d7d9b8':'#e1dfc2';ctx.fillRect(28,202,1144,503);
  ctx.save();ctx.beginPath();ctx.rect(28,202,1144,503);ctx.clip();
  ctx.strokeStyle='#acb494';ctx.lineWidth=1;
  for(let x=28;x<1172;x+=40){ctx.beginPath();ctx.moveTo(x,202);ctx.lineTo(x,705);ctx.stroke();}
  for(let y=202;y<705;y+=40){ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(1172,y);ctx.stroke();}
  if(t.terrain==='hills')for(let r=80;r<220;r+=35){ctx.beginPath();ctx.ellipse(890,420,r,r*.7,.4,0,Math.PI*2);ctx.stroke();}
  if(t.terrain==='fortifications')for(let y=248;y<690;y+=30){ctx.fillStyle='#aaa58d';ctx.fillRect(640,y,10,22);}
  ctx.restore();
  text(`TACTICAL VIEW · ${t.terrain.toUpperCase()} · ${t.phase==='deployment'?'DEPLOYMENT':t.phase==='combat'?'ROUND '+t.round:'FINAL POSITIONS'}`,42,224,13);
  ['A','B'].forEach(side=>{
    const members=t.formations.filter(f=>f.side===side);
    members.forEach((f,row)=>{
      const x=side==='A'?46:672, y=245+(row+.5)*(448/members.length)-56;
      const shield=shields[t.formations.indexOf(f)];
      if(shield)ctx.drawImage(shield,x,y,24,28);else{ctx.fillStyle=colors[side];ctx.fillRect(x,y,23,26);text(f.index+1,x+7,y+18,14,'white');}
      text(f.name,x+32,y+18,17,ink,430);
      f.units.forEach((u,column)=>{
        const order=side==='A'?['cannons','books','mages','pens']:['pens','mages','books','cannons'];
        const bx=x+order.indexOf(u.key)*120,by=y+35,w=111,h=66;
        const destroyed=u.committed>0&&u.remaining===0, unused=u.committed===0;
        ctx.fillStyle=unused?'#eeeee4':light[side];ctx.fillRect(bx,by,w,h);ctx.strokeStyle=unused?'#8a9182':colors[side];ctx.lineWidth=2;ctx.strokeRect(bx,by,w,h);
        symbol(u.key,bx+24,by+18,unused?'#8a9182':colors[side]);
        text(u.remaining.toLocaleString(),bx+47,by+23,18,ink,60);
        text(u.label,bx+7,by+43,13);
        text(unused?'Not deployed':`−${u.lost.toLocaleString()} lost`,bx+7,by+59,12,destroyed?'#9b3028':ink);
        if(destroyed){line(bx+90,by+36,bx+104,by+50,'#9b3028',3);line(bx+104,by+36,bx+90,by+50,'#9b3028',3);}
      });
      const centerY=y+65;
      if(tacticalTotals([f]).remaining){
        if(t.phase==='outcome'&&side!==t.winnerSide){arrow(side==='A'?606:620,centerY,side==='A'?553:657,centerY,'#725288',true);}
        else if(t.phase!=='outcome'){arrow(side==='A'?542:660,centerY,side==='A'?584:618,centerY,colors[side]);}
      }
    });
  });
  if(t.phase==='combat'){
    line(588,445,612,469,'#9b3f32',4);line(612,445,588,469,'#9b3f32',4);text('CLASH',575,491,13);
  }else if(t.phase==='outcome'){
    line(600,408,600,462,ink,3);ctx.fillStyle=colors[t.winnerSide];ctx.fillRect(601,408,27,18);text('HELD',580,485,12);
  }
  ctx.fillStyle='#eee9d9';ctx.fillRect(28,721,1144,112);
  if(map){ctx.drawImage(map,42,733,146,85);text('World context',44,827,11);}
  text('NATIONAL RESERVES',210,747,17);
  t.formations.forEach((f,i)=>{const n=tacticalTotals([f]);text(`${f.name}: ${n.reserve.toLocaleString()} held back · ${(n.reserve+n.remaining).toLocaleString()} nationally available`,210,768+i*14,12,ink,940);});
  text('MARKER KEY',28,858,13);
  [['pens','Infantry'],['books','Archers'],['mages','Cavalry'],['cannons','Artillery']].forEach(([key,label],i)=>{symbol(key,48+i*151,882,ink);text(label,72+i*151,887,13);});
  arrow(660,880,696,880,ink);text('Advance / attack',705,886,13);
  arrow(862,880,898,880,'#725288',true);text('Retreat',909,886,13);
  line(1010,874,1024,888,'#9b3028',3);line(1024,874,1010,888,'#9b3028',3);text('Destroyed',1036,886,13);
  text('Counts are saved simulation results. Positions and arrows are schematic; each marker represents a unit type, not one soldier.',28,924,13);
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
