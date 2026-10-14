/* Fictional classroom stories; seeded from the saved battle so rereading never rerolls. */
function simpleBattleStory(battle,t) {
  let seed=2166136261;
  for(const ch of `${battle.id}|${battle.title}`)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
  const pick=items=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return items[seed%items.length];};
  const attackers=t.formations.filter(f=>f.side==='A').map(f=>f.name).join(' and '),defenders=t.formations.filter(f=>f.side==='B').map(f=>f.name).join(' and ');
  const opening=pick([
    'The opening trumpet sounded magnificent. The second trumpet sounded like a duck falling into a bucket. Everyone charged anyway.',
    'Banners snapped in the wind as the armies faced each other. A messenger arrived at full speed, saluted a scarecrow, and demanded immediate orders.',
    'The drums thundered across the field. One drummer was playing a completely different song, but somehow it made the army sound even more terrifying.',
    'A mighty war cry rolled across the battlefield. From somewhere at the back came a much smaller cry: “WHO PACKED MY LEFT BOOT WITH CHEESE?”',
    'Both armies waited in heroic silence—until a supply goat ate the corner of the battle plan. The commanders declared that corner “strategically unnecessary.”',
    'The signal flags rose. Unfortunately, the laundry officer had added a pair of enormous socks. Historians would later disagree about what the socks meant.'
  ]);
  const actor=pick(t.formations);
  const has=key=>actor.units.some(u=>u.key===key&&u.committed>0);
  const moments=[
    'Messengers zigzagged through the commotion. One delivered the same order three times and then asked whether this counted as extra credit.',
    'The field disappeared beneath dust and fluttering banners. Someone shouted “STICK TO THE PLAN!” Three officers immediately unfolded three different plans.',
    'A banner bearer climbed a mound and raised the flag against the sky. For one glorious moment, even the supply goat stopped chewing.',
    'A cook defended the lunch cart with a ladle held like a royal sword. Both sides agreed that spilling the soup would be a terrible loss for civilization.'
  ];
  if(has('pens'))moments.push('The infantry marched forward with shields together, boots pounding like thunder. A soldier in the back loudly insisted this was still better than the mile run in PE.');
  if(has('books'))moments.push('The archers lifted their bows in a sweeping line. Their officer called for perfect timing; a nearby goose honked at exactly the wrong moment and promoted itself to assistant commander.');
  if(has('mages'))moments.push('The cavalry swept through the dust with banners streaming behind them. One horse looked so proud that its rider suspected it was planning to claim all the credit.');
  if(has('cannons'))moments.push('The artillery boomed across the field. The echo was so impressive that a nearby officer saluted a hill, convinced reinforcements had arrived.');
  const middle=`On ${actor.name}'s part of the field: ${pick(moments)}`,last=pick([
    'The victory cheer could probably be heard three kingdoms away. The official report called it “a disciplined celebration.” The cook called it “please get off my table.”',
    'The winning banners rose through the settling dust. A messenger raced home with the news, rehearsing the dramatic version in which they personally saved the entire kingdom.',
    'The victors stood beneath their banners as the wind cleared the field. It would have made a perfect painting if someone had not been chasing a runaway sandwich across the foreground.',
    'The news set bells ringing back home. The royal poet immediately began a twelve-page poem, and the exhausted messengers immediately requested the one-sentence version.'
  ]);
  const losers=t.formations.filter(f=>f.side!==t.winnerSide),survivors=losers.reduce((n,f)=>n+f.units.reduce((sum,u)=>sum+u.remaining,0),0);
  const arrivals=storyReinforcements(battle,t,pick);
  return [`${attackers} faced ${defenders}. ${opening}`,middle,...arrivals,`${battle.winner} won the battle. ${survivors?'The defeated forces withdrew with their surviving troops.':'The defeated side had no committed troops remaining.'} ${last} Troops held in national reserve stayed out of the battle.`];
}
function simpleDiplomacyEvents(battle) {
  const decisions=battle.scenes?.find(s=>s.heading==='Alliances and decisions')?.text||'';
  return (battle.events||[]).filter(e=>decisions.includes(e)).map(e=>e.replace(/ \(\d+% (?:help chance|chance|hatred chance|betrayal chance)\)\.?$/,'.'));
}

function storyReinforcements(battle,t,pick) {
  const forces=t.formations;
  // Old saves retain the exact opening event; new saves also store the two leader indices.
  const original=forces.flatMap(a=>forces.filter(b=>b.side!==a.side&&battle.events?.[0]?.startsWith(`${a.name} attacked ${b.name} at `)).map(b=>({a,b})))[0];
  const a=forces.find(f=>Number.isInteger(battle.leaders?.attacker)&&f.index===battle.leaders.attacker)||original?.a;
  const b=forces.find(f=>Number.isInteger(battle.leaders?.defender)&&f.index===battle.leaders.defender)||original?.b;
  if(!a||!b)return []; // Do not invent which country was a reinforcement in older incomplete saves.
  const decisions=simpleDiplomacyEvents(battle);
  return forces.filter(f=>f.index!==a.index&&f.index!==b.index&&f.units.some(u=>u.committed>0)).map(f=>{
    const friend=f.side==='A'?a.name:b.name,enemy=f.side==='A'?b.name:a.name;
    const entrance=pick([
      `Just as the dust swallowed the banners, ${f.name} appeared to help ${friend}! Their trumpet player held one heroic note for so long that everyone wondered whether they had forgotten how to stop.`,
      `A cry rose from ${friend}'s ranks: “Look over there!” ${f.name} arrived with banners flying—and a supply cart bouncing behind them like an angry shopping trolley.`,
      `At a suitably dramatic moment, ${f.name} swept into the story on ${friend}'s side. Someone yelled “REINFORCEMENTS!” Someone else yelled “DID THEY BRING SNACKS?” Both questions felt urgent.`,
      `${friend}'s messenger waved frantically as ${f.name} arrived to help. ${f.name}'s banner bearer struck such a heroic pose that the wind seemed to cooperate out of respect.`,
      `Through the swirling dust came ${f.name}, joining ${friend} against ${enemy}. Their drums boomed, their flags snapped, and their official battle goose looked ready to take command.`
    ]);
    const switched=decisions.find(e=>e.startsWith(`${f.name} turned against ally `));
    const grudge=decisions.find(e=>e.startsWith(`${f.name} joined ${friend} out of hatred for `));
    return `${entrance} ${switched?`${switched} The messenger responsible for updating the team list nearly swallowed the pencil.`:grudge?`${grudge} Apparently, that grudge had been packed before the lunch supplies.`:`${f.name} fought alongside ${friend} against ${enemy}.`}`;
  });
}

function troopPerformance(formation) {
  const deployed=formation.units.filter(u=>u.committed>0);
  const percent=u=>(100*u.remaining/u.committed).toFixed(1).replace(/\.0$/,'');
  const rows=deployed.map(u=>{
    const fraction=u.remaining/u.committed;
    const assessment=!u.remaining?'No committed troops returned':!u.lost?'Returned at full strength':fraction>=.9?'Light losses':fraction>=.7?'Most troops returned':fraction>=.5?'Heavy losses':'Very heavy losses';
    return {key:u.key,text:`${u.label}: ${percent(u)}% returned — ${assessment.toLowerCase()}.`};
  });
  if(!deployed.length)return {rows,summary:'No troops were committed to this battle.'};
  const best=deployed.reduce((a,b)=>a.remaining*b.committed>=b.remaining*a.committed?a:b);
  const leaders=deployed.filter(u=>u.remaining*best.committed===best.remaining*u.committed);
  const worst=deployed.reduce((a,b)=>a.lost*b.committed>=b.lost*a.committed?a:b);
  const hardest=deployed.filter(u=>u.lost*worst.committed===worst.lost*u.committed);
  const summary=leaders.length===deployed.length
    ?`${formation.name}'s deployed troop types all had the same return rate (${percent(best)}%).`
    :`${formation.name}'s ${leaders.map(u=>u.label.toLowerCase()).join(' and ')} kept the largest share of their troops (${percent(best)}% returned). ${hardest.map(u=>u.label).join(' and ')} lost the largest share of their deployed troops.`;
  return {rows,summary};
}
