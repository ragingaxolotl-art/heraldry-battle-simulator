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
  const has=key=>t.formations.some(f=>f.units.some(u=>u.key===key&&u.committed>0));
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
  const middle=pick(moments),last=pick([
    'The victory cheer could probably be heard three kingdoms away. The official report called it “a disciplined celebration.” The cook called it “please get off my table.”',
    'The winning banners rose through the settling dust. A messenger raced home with the news, rehearsing the dramatic version in which they personally saved the entire kingdom.',
    'The victors stood beneath their banners as the wind cleared the field. It would have made a perfect painting if someone had not been chasing a runaway sandwich across the foreground.',
    'The news set bells ringing back home. The royal poet immediately began a twelve-page poem, and the exhausted messengers immediately requested the one-sentence version.'
  ]);
  const losers=t.formations.filter(f=>f.side!==t.winnerSide),survivors=losers.reduce((n,f)=>n+f.units.reduce((sum,u)=>sum+u.remaining,0),0);
  return [`${attackers} faced ${defenders}. ${opening}`,middle,`${battle.winner} won the battle. ${survivors?'The defeated forces withdrew with their surviving troops.':'The defeated side had no committed troops remaining.'} ${last} Troops held in national reserve stayed out of the battle.`];
}
function simpleDiplomacyEvents(battle) {
  const decisions=battle.scenes?.find(s=>s.heading==='Alliances and decisions')?.text||'';
  return (battle.events||[]).filter(e=>decisions.includes(e)).map(e=>e.replace(/ \(\d+% (?:help chance|chance|hatred chance|betrayal chance)\)\.?$/,'.'));
}
