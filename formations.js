/* Original schematic layouts based on the linked historical references.
   Coordinates describe an illustration, not historical measurements or combat bonuses. */
const FORMATION_SOURCE='https://www.gutenberg.org/files/16170/16170-h/16170-h.htm';
const FORMATIONS=[
 {id:'line',name:'Extended line',description:'A broad front with ranged support behind it.',source:FORMATION_SOURCE},
 {id:'column',name:'Deep column',description:'A narrow front with successive ranks extending toward the rear.',source:FORMATION_SOURCE},
 {id:'square',name:'Hollow square',description:'Infantry faces outward around protected support troops.',source:'https://www.nationalarchives.gov.uk/education/resources/significant-events/battle-of-waterloo-1815/'},
 {id:'skirmish',name:'Skirmish screen',description:'Dispersed forward groups screen a supporting body.',source:FORMATION_SOURCE},
 {id:'oblique',name:'Oblique order',description:'One wing leads while the other is held back.',source:FORMATION_SOURCE},
 {id:'echelon',name:'Stepped echelon',description:'Successive groups advance in a stair-step arrangement.',source:FORMATION_SOURCE},
 {id:'concave',name:'Concave crescent',description:'The wings project forward around a recessed center.',source:FORMATION_SOURCE},
 {id:'convex',name:'Convex front',description:'The center projects forward with the wings drawn back.',source:FORMATION_SOURCE},
 {id:'center',name:'Reinforced center',description:'Extra depth concentrates in the center of the line.',source:FORMATION_SOURCE},
 {id:'wing',name:'Reinforced wing',description:'Extra depth concentrates on one end of the line.',source:FORMATION_SOURCE},
 {id:'refused',name:'Refused flank',description:'One end bends back to protect an exposed flank.',source:FORMATION_SOURCE},
 {id:'layers',name:'Three supporting lines',description:'A forward screen, main body and committed rear line provide depth.',source:'https://www.nps.gov/cowp/learn/historyculture/the-battle-of-cowpens.htm'}
];
const MANEUVERS=[
 {id:'advance',name:'Frontal advance',description:'Move the front toward the opposing line.',source:FORMATION_SOURCE},
 {id:'hold',name:'Hold position',description:'Keep the deployed formation in place.',source:FORMATION_SOURCE},
 {id:'left',name:'Left-flank approach',description:'Illustrate a turn around the upper map flank.',source:FORMATION_SOURCE},
 {id:'right',name:'Right-flank approach',description:'Illustrate a turn around the lower map flank.',source:FORMATION_SOURCE},
 {id:'pincer',name:'Double envelopment',description:'Both wings curve inward toward the opposing force.',source:'https://www.nps.gov/places/double-envelopment.htm'},
 {id:'charge',name:'Cavalry advance',description:'Cavalry leads the movement while other troops support.',source:'https://www.nam.ac.uk/explore/cavalry-roles'},
 {id:'withdraw',name:'Covered withdrawal',description:'Forward groups cover a movement back from contact.',source:'https://www.nps.gov/articles/000/the-embattled-british-column-survival-against-the-odds-on-the-battle-road.htm'}
];
function formationChoice(id){return FORMATIONS.find(f=>f.id===id)||FORMATIONS[0];}
function maneuverChoice(id){return MANEUVERS.find(f=>f.id===id)||MANEUVERS[0];}
function splitFormationCount(total,n){return Array.from({length:n},(_,i)=>Math.floor(total/n)+(i<total%n?1:0));}
function formationPoint(id,i,n,key){
 const v=n===1?0:i/(n-1)*2-1;
 // Cavalry occupies the wings, artillery the rear. The front/support lines take the selected shape.
 if(key==='mages')return {x:.42,y:i%2?1:-1};
 if(key==='cannons')return {x:-.08,y:v*.62};
 if(key==='books'&&id!=='square')return {x:.05,y:v*.9};
 const support=key==='books',back=support ? .24 : 0;
 let x=.7,y=v*.75;
 switch(id){
  case 'column':x=.25+Math.floor(i/2)*.15; y=(i%2?1:-1)*.4;break;
  case 'square':{
   const ring=[[.32,-.7],[.57,-.7],[.82,-.7],[.82,0],[.82,.7],[.57,.7],[.32,.7],[.32,0]];
   [x,y]=support?[.5+(i%2)*.15,(Math.floor(i/2)-.5)*.4]:ring[Math.floor(i*8/n)%8];break;
  }
  case 'skirmish':x=.64+(i%2)*.17;y=v*.8;break;
  case 'oblique':x=.42+(v+1)*.22;break;
  case 'echelon':x=.3+Math.floor(i/2)*.16;break;
  case 'concave':x=.43+.42*Math.abs(v);break;
  case 'convex':x=.85-.42*Math.abs(v);break;
  case 'center':x=i<4?.8:.56;y=i<4?(i/3*2-1)*.75:((i-4)/Math.max(1,n-5)*2-1)*.4;break;
  case 'wing':x=i<4?.8:.56;y=i<4?(i/3*2-1)*.75:-.75+(i-4)*.22;break;
  case 'refused':x=v>.3?.7-(v-.3)*.65:.7;break;
  case 'layers':x=[.8,.54,.28][Math.floor(i/3)%3];y=(i%3-1)*.56;break;
 }
 if(id!=='square')x-=back;
 if(support&&id==='square')return {x,y};
 return {x:Math.max(.02,x),y};
}
function buildFormationLayout(id,units){
 const pattern=formationChoice(id).id, nodes=[];
 const limits={pens:8,books:4,mages:2,cannons:2};
 units.forEach(u=>{
  const n=Math.min(limits[u.key]||1,u.committed);
  if(!n)return;
  const committed=splitFormationCount(u.committed,n),remaining=splitFormationCount(u.remaining,n);
  committed.forEach((count,i)=>nodes.push({key:u.key,label:u.label,part:i,committed:count,remaining:remaining[i],lost:count-remaining[i],...formationPoint(pattern,i,n,u.key)}));
 });
 return nodes;
}
function maneuverDisplacement(id,node,phase,round,roundCount){
 const progress=phase==='deployment'?0:phase==='outcome'?1:Math.min(1,round/Math.max(1,roundCount));
 if(id==='hold')return {x:0,y:0};
 if(id==='withdraw')return {x:-.12*progress,y:0};
 if(id==='left')return {x:.10*progress,y:-.12*progress};
 if(id==='right')return {x:.10*progress,y:.12*progress};
 if(id==='pincer')return {x:.14*Math.abs(node.y)*progress,y:-node.y*.12*progress};
 if(id==='charge')return {x:(node.key==='mages'?.19:.04)*progress,y:0};
 return {x:.10*progress,y:0};
}
function drawFormationPreview(canvas,formation,maneuver){
 const ctx=canvas.getContext('2d');canvas.width=440;canvas.height=180;
 ctx.fillStyle='#eef0df';ctx.fillRect(0,0,440,180);
 const units=['pens','books','mages','cannons'].map(key=>({key,label:key,committed:80,remaining:80}));
 buildFormationLayout(formation,units).forEach(n=>{
  ctx.fillStyle={pens:'#285747',books:'#976622',mages:'#355e91',cannons:'#763a35'}[n.key];
  ctx.fillRect(35+n.x*300,88+n.y*62,18,10);
 });
 ctx.fillStyle='#203c33';ctx.font='13px sans-serif';ctx.fillText('Front →',360,92);
 ctx.fillText(maneuverChoice(maneuver).name,14,169);
}
function addFormationControls(card,host){
 const field=document.createElement('fieldset');field.className='wide-field formation-controls';
 const legend=document.createElement('legend');legend.textContent='Formation and maneuver';field.append(legend);
 [['formation-choice','Formation',FORMATIONS],['maneuver-choice','Maneuver',MANEUVERS]].forEach(([className,title,options])=>{
  const label=document.createElement('label');label.textContent=title;
  const select=document.createElement('select');select.className=className;
  options.forEach(option=>select.add(new Option(option.name,option.id)));label.append(select);field.append(label);
 });
 const preview=document.createElement('canvas');preview.className='formation-preview';preview.setAttribute('role','img');
 const description=document.createElement('p'),source=document.createElement('a');source.target='_blank';source.rel='noopener';
 const maneuverSource=document.createElement('a');maneuverSource.target='_blank';maneuverSource.rel='noopener';
 const key=document.createElement('small');key.textContent='Preview colors: green infantry · ochre archers · blue cavalry · red artillery.';
 const note=document.createElement('small');note.textContent='These choices set the illustrated deployment and movement arrows. They do not add combat bonuses. Rear lines are committed troops; national reserves stay out of battle.';
 field.append(preview,key,description,source,maneuverSource,note);host.append(field);
 const refresh=()=>{
  const f=formationChoice(card.querySelector('.formation-choice').value),m=maneuverChoice(card.querySelector('.maneuver-choice').value);
  drawFormationPreview(preview,f.id,m.id);preview.setAttribute('aria-label',`${f.name}: ${f.description} ${m.name}: ${m.description}`);
  description.textContent=`${f.description} ${m.description}`;source.href=f.source;source.textContent='Historical formation reference';maneuverSource.href=m.source;maneuverSource.textContent='Historical maneuver reference';
 };
 card.addEventListener('input',refresh);card.addEventListener('change',refresh);refresh();
}
