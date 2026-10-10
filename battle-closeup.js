/* Draw saved battle geography and heraldry without rerunning combat. */
function battleCloseupLocation(battle) {
  const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1200&&p[1]>=0&&p[1]<=700;
  const outcome=battle.scenes?.find(s=>s.tactical?.phase==='outcome'||s.heading?.startsWith('Outcome'));
  const point=[outcome?.location,outcome?.tactical?.location,...(battle.scenes||[]).map(s=>s.location),...(battle.arrows||[]).filter(a=>!a.retreat).map(a=>a.end)].find(valid);
  return point?{point:[...point],view:focusView(point,520)}:null;
}
async function renderBattleCloseup(battle) {
  const location=battleCloseupLocation(battle),map=await reportImage(battle.mapSnapshot||'');
  if(!location||!map)return null;
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=640;
  const ctx=canvas.getContext('2d'),{point}=location;
  const view=focusView(point,520);
  const members=(battle.participants||[]).filter(p=>['A','B'].includes(p.side)).slice(0,5);
  const shields=await Promise.all(members.map(p=>reportImage(p.shield||'')));
  ctx.fillStyle='#adc9d7';ctx.fillRect(0,0,1000,640);
  ctx.drawImage(map,view.x,view.y,view.w,view.h,0,0,1000,520);
  const x=(point[0]-view.x)/view.w*1000,y=(point[1]-view.y)/view.h*520;
  ctx.strokeStyle='#ae332d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-100,y+65);ctx.lineTo(x-24,y+16);ctx.lineTo(x-45,y+20);ctx.moveTo(x-24,y+16);ctx.lineTo(x-33,y+38);ctx.stroke();
  ctx.fillStyle='#fffdf6';ctx.fillRect(0,520,1000,120);ctx.fillStyle='#20352d';ctx.font='bold 17px sans-serif';
  const opening=battle.scenes?.find(s=>s.heading?.startsWith('Round '));
  ctx.fillText(opening?.heading||'Battle location',16,544,970);
  members.forEach((member,i)=>{
    const shield=shields[i],px=18+i*196,color=member.side==='A'?'#aa382c':'#225fac';
    if(shield)ctx.drawImage(shield,px,558,34,44);
    else {ctx.fillStyle=color;ctx.fillRect(px,558,28,36);}
    ctx.fillStyle='#20352d';ctx.font='bold 12px sans-serif';ctx.fillText(member.name,px+40,575,148);
    ctx.font='12px sans-serif';ctx.fillText(member.side==='A'?'Attacking coalition':'Defending coalition',px+40,594,148);
    const side=members.filter(m=>m.side===member.side),rank=side.indexOf(member);
    const bx=Math.max(4,Math.min(974,x+(member.side==='A'?-80:35))),by=Math.max(4,Math.min(484,y-70+rank*34));
    if(shield)ctx.drawImage(shield,bx,by,22,28);else{ctx.fillStyle=color;ctx.fillRect(bx,by,20,25);}
  });
  ctx.fillStyle='#405348';ctx.font='11px sans-serif';ctx.fillText('Illustrated battle position; arrows are schematic. Unit losses appear in the report below.',16,629);
  return canvas;
}
