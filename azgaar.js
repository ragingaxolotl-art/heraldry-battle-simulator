// Default palette from Azgaar's Fantasy Map Generator (MIT; vendor/Azgaar-LICENSE.txt).
const AZGAAR_BIOMES=['Marine','Hot desert','Cold desert','Savanna','Grassland','Tropical seasonal forest','Temperate deciduous forest','Tropical rainforest','Temperate rainforest','Taiga','Tundra','Glacier','Wetland'].map((name,i)=>({i,name,color:['#466eab','#fbe79f','#b5b887','#d2d082','#c8d68f','#b6d95d','#29bc56','#7dcb35','#409c43','#4b6b32','#96784b','#d5e7eb','#0b9131'][i]}));
function importAzgaarWorld(input) {
  const pack=input?.pack, info=input?.info;
  if(!pack||!Array.isArray(pack.cells)||!Array.isArray(pack.vertices)||!Array.isArray(pack.states)||!Number.isFinite(info?.width)||!Number.isFinite(info?.height)||info.width<=0||info.height<=0||pack.cells.length>100000||pack.vertices.length>300000||pack.states.length>10000)throw Error('Choose Azgaar Export → JSON → full. A PNG or minimal JSON does not include biome geometry.');
  const states=pack.states.filter(s=>s&&s.i>0&&!s.removed&&pack.cells.some(c=>c.state===s.i&&c.h>=20));
  if(states.length<5||states.length>200||states.some(s=>!Number.isInteger(s.i))||new Set(states.map(s=>s.i)).size!==states.length)throw Error('Choose a world with at least five countries (maximum 200).');
  const safeColor=(c,fallback)=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:fallback;
  const custom=pack.biomes || input.biomesData || input.settings?.biomesData;
  const biomes=AZGAAR_BIOMES.map(b=>({...b}));
  if(Array.isArray(custom))custom.forEach((b,i)=>{if(b&&typeof b.name==='string'&&Number.isInteger(b.i??i)&&(b.i??i)>=0&&(b.i??i)<256)biomes[b.i??i]={i:b.i??i,name:b.name.slice(0,60),color:safeColor(b.color,'#adc9d7')};});
  else if(Array.isArray(custom?.name))custom.name.slice(0,256).forEach((name,i)=>{biomes[i]={i,name:String(name).slice(0,60),color:safeColor(custom.color?.[i],AZGAAR_BIOMES[i]?.color||'#adc9d7')};});
  const scale=Math.min(1160/info.width,580/info.height), ox=(1200-info.width*scale)/2,oy=55;
  const point=p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>info.width||p[1]<0||p[1]>info.height)throw Error('Invalid map coordinates.');return [ox+p[0]*scale,oy+p[1]*scale];};
  const vertices=new Map(pack.vertices.map(v=>[v.i,v.p]));
  const ids=new Map(states.map((s,i)=>[s.i,i]));
  const cells=pack.cells.map(c=>{if(!Array.isArray(c.v)||c.v.length<3||c.v.length>30)throw Error('Invalid map cell.');const polygon=c.v.map(v=>point(vertices.get(v)));polygon.push([...polygon[0]]);return {point:point(c.p),polygon,land:c.h>=20,elevation:c.h/100,moisture:0,shade:0,country:ids.get(c.state)??-1,biome:biomes[c.biome]||biomes[0]};});
  const base=generateStudentWorld(1,GRIA_TEMPLATE);
  const countries=states.map((s,id)=>{const cell=cells.find(c=>c.country===id&&c.land);const burg=pack.burgs?.find(b=>b.i===s.capital);const capital=burg&&Number.isFinite(burg.x)&&Number.isFinite(burg.y)?point([burg.x,burg.y]):cell.point;return {...base.countries[id%15],id,name:String(s.fullName||s.name||`Country ${id+1}`).slice(0,38),capital,position:[...capital],color:safeColor(s.color,'#b6cc88'),shield:'',originalShield:''};});
  const settlements=(pack.burgs||[]).filter(b=>b&&b.i>0&&!b.removed&&ids.has(b.state)&&Number.isFinite(b.x)&&Number.isFinite(b.y)).map(b=>({id:`azgaar-city-${b.i}`,country:ids.get(b.state),name:String(b.name||'Unnamed city').slice(0,60),capital:Boolean(b.capital),position:point([b.x,b.y]),source:'azgaar'})).filter(b=>b.position[0]>=0&&b.position[0]<=1200&&b.position[1]>=0&&b.position[1]<=700);
  const relations={};states.forEach((s,i)=>states.forEach((t,j)=>{if(j<=i)return;const d=s.diplomacy?.[t.i];relations[`${i}-${j}`]=['Ally','Vassal','Suzerain'].includes(d)?'ally':d==='Enemy'?'enemy':'neutral';}));
  const azgaar={info:{width:info.width,height:info.height,mapName:String(info.mapName||'Imported world').slice(0,60)},pack:{cells:pack.cells.map(c=>({i:c.i,p:c.p,v:c.v,h:c.h,state:c.state,biome:c.biome})),vertices:pack.vertices.map(v=>({i:v.i,p:v.p})),states:states.map(s=>({i:s.i,name:s.name,fullName:s.fullName,color:s.color,capital:s.capital,diplomacy:s.diplomacy})),burgs:(pack.burgs||[]).filter(b=>b&&b.i>0&&!b.removed).map(b=>({i:b.i,x:b.x,y:b.y,capital:b.capital,state:b.state,name:String(b.name||'').slice(0,60)})),biomes}};
  return {...base,cells,countries,selected:[0,1,2,3,4],relations,azgaar,biomes,settlements,history:[]};
}
