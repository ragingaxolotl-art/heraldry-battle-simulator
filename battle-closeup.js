/* Draw saved battle geography and heraldry without rerunning combat. */
function battleCloseupLocation(battle) {
  const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1200&&p[1]>=0&&p[1]<=700;
  const outcome=battle.scenes?.find(s=>s.tactical?.phase==='outcome'||s.heading?.startsWith('Outcome'));
  const point=[outcome?.location,outcome?.tactical?.location,...(battle.scenes||[]).map(s=>s.location),...(battle.arrows||[]).filter(a=>!a.retreat).map(a=>a.end)].find(valid);
  return point?{point:[...point],view:{x:point[0]-200,y:point[1]-400*700/1200/2,w:400,h:400*700/1200}}:null;
}
async function renderBattleCloseup(battle) {
  const location=battleCloseupLocation(battle),map=await reportImage(battle.mapSnapshot||'');
  if(!location||!map)return null;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
  const ctx=canvas.getContext('2d'),{view,point}=location;
  const members=(battle.participants||[]).filter(p=>['A','B'].includes(p.side)).slice(0,5);
  const shields=await Promise.all(members.map(p=>reportImage(p.shield||'')));
  ctx.fillStyle='#faf7ec';ctx.fillRect(0,0,1200,800);
  ctx.fillStyle='#adc9d7';ctx.fillRect(0,70,1200,700);
  ctx.drawImage(map,view.x,view.y,view.w,view.h,0,70,1200,700);
  ctx.fillStyle='#244c3e';ctx.fillRect(0,0,1200,70);ctx.fillStyle='#fffdf5';ctx.font='bold 28px sans-serif';ctx.fillText('Battle close-up',24,43);
  const target=[(point[0]-view.x)/view.w*1200,70+(point[1]-view.y)/view.h*700];
  // Labels stay in the picture even for coastal or edge-of-map battle sites.
  const labelX=Math.max(420,Math.min(780,target[0])),labelY=Math.max(150,Math.min(675,target[1]-42));
  members.forEach((p,i)=>{
    const sideMembers=members.filter(m=>m.side===p.side),rank=sideMembers.indexOf(p);
    const x=p.side==='A'?22:912,y=140+rank*Math.min(174,460/Math.max(1,sideMembers.length-1)),w=266,h=136;
    const color=p.side==='A'?'#a83f31':'#245e91';
    const start=[p.side==='A'?x+w:x,y+55],angle=Math.atan2(target[1]-start[1],target[0]-start[0]);
    const end=[target[0]-30*Math.cos(angle),target[1]-30*Math.sin(angle)];
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...end);ctx.stroke();
    ctx.beginPath();ctx.moveTo(...end);ctx.lineTo(end[0]-19*Math.cos(angle-.45),end[1]-19*Math.sin(angle-.45));ctx.lineTo(end[0]-19*Math.cos(angle+.45),end[1]-19*Math.sin(angle+.45));ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,253,245,.96)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
    if(shields[i]){const img=shields[i],scale=Math.min(55/img.naturalWidth,66/img.naturalHeight);ctx.drawImage(img,x+18+(55-img.naturalWidth*scale)/2,y+12,img.naturalWidth*scale,img.naturalHeight*scale);}
    else {ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+19,y+14);ctx.lineTo(x+70,y+14);ctx.lineTo(x+68,y+54);ctx.lineTo(x+44,y+76);ctx.lineTo(x+21,y+54);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(String((p.index??i)+1),x+44,y+47);ctx.textAlign='left';}
    ctx.fillStyle=color;ctx.font='bold 18px sans-serif';ctx.fillText(p.side==='A'?'Attacking side':'Defending side',x+87,y+36,170);
    ctx.fillStyle='#213d32';ctx.font='bold 19px sans-serif';ctx.fillText(p.name,x+14,y+109,w-28);
  });
  ctx.strokeStyle='#912e29';ctx.fillStyle='#fff8';ctx.lineWidth=5;ctx.beginPath();ctx.arc(...target,23,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fffdf5';ctx.fillRect(labelX-91,labelY-24,182,35);ctx.fillStyle='#792f29';ctx.textAlign='center';ctx.font='bold 21px sans-serif';ctx.fillText('Battle site',labelX,labelY);ctx.textAlign='left';
  ctx.fillStyle='#faf7ec';ctx.fillRect(0,770,1200,30);ctx.fillStyle='#405348';ctx.font='14px sans-serif';ctx.fillText('Saved battle map · Shields identify participants; arrows illustrate their approach, not calculated routes.',18,790,1160);
  return canvas;
}
