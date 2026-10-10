# Battle pictures and expedition forces

Each country card has **Commit to next battle** fields for artillery, archers, infantry and cavalry. Blank means all currently available troops of that type. Enter 0 to leave a type at home, use exact counts, or click **Send half**. Requests exceeding availability are capped at the available count. The displayed commitment summary shows the actual force and the reserve. Choices apply if diplomacy brings that country into the battle; a neutral country commits nothing. Both main opponents must commit at least one unit.

A battle deducts losses only from the expedition. National availability afterward equals untouched reserves plus returning survivors. Choices persist for subsequent battles, so a numeric commitment remains the same requested count (capped by the new availability); **Send half** calculates half of the current army when clicked.

Every new report scene has two downloadable PNGs:

- **Location picture:** the saved world map, zoomed to the scene location, with participating heraldry.
- **Battle picture:** a large close-up of the saved battle map with type-specific formation counters drawn directly on it, shield/name identification, committed and surviving counts, cumulative losses, reserves, victory/defeat, retreat arrows and destroyed markers. The legend explains the symbols. Deployment, combat rounds, and final outcome use immutable snapshots from the same combat result.

A destroyed expedition does not imply that its nation's reserves were destroyed. The outcome image and facts retain that distinction. Replay and downloads read saved results; neither simulates or deducts losses again. Old saves remain readable; old battles without tactical snapshots retain their original map illustrations.

## Sparta assessment

Evaluated [Sparta](https://github.com/Lacaedemon/sparta), its [architecture](https://lacaedemon.github.io/sparta/architecture.html), and its `scripts/Unit.gd` renderer on 2026-10-09. Its formation tokens, unit states, and victory display are relevant references. Rendering and combat are coupled to Godot nodes, scene state, and its own simulation; it is not an independent browser image renderer.

The current classroom app is static JavaScript with saved combat rounds. Running Sparta's separate combat engine would produce different outcomes unless the two simulations were reconciled. For this image-only feature we therefore implemented an original Canvas renderer of the existing results. No Sparta code or art is bundled, and these are not Sparta-generated screenshots. Exact positions, arrows, and terrain decorations are schematic rather than a pathfinding or collision simulation. The tactical picture now uses the same saved map geography as its background. A separate location picture remains available as an optional clean geographic view.

## Verification

Run `node tests/battle-picture.cjs` for commitment accounting, consecutive battles, scene reconciliation, and JSON restoration. Existing diplomacy, world, shield, Azgaar, and report checks also remain applicable.

With a local HTTP server running, run `node tests/browser-battle.cjs` with Playwright installed. Optional environment variables: `BATTLE_URL`, `PLAYWRIGHT_MODULE`, `BROWSER_PATH`, and `BATTLE_PICTURE` (download destination). It verifies a five-nation battle including custom shields, a wiped-out expedition with reserves, two images per scene, downloading, replay and reload conservation, zero-commitment rejection, and mobile width.

## Historical formation choices

Each country has a **Formation and maneuver** selector with a live preview. The twelve presets are extended line, deep column, hollow square, skirmish screen, oblique order, stepped echelon, concave crescent, convex front, reinforced center, reinforced wing, refused flank, and three supporting lines. The seven maneuvers are frontal advance, hold position, left-flank approach, right-flank approach, double envelopment, cavalry advance, and covered withdrawal (84 selectable combinations per country).

The layouts are schematic classroom adaptations across historical eras, not exact drill diagrams. Infantry sets the main shape, archers provide supporting groups, cavalry occupies the wings, and artillery stays toward the rear. Each counter shows one portion of the committed force; integer counts and losses sum to the original saved unit totals. Neither rear lines nor the formation selector add any national reserves to combat. Choices persist in country settings and are copied into each new battle snapshot. Old battles without a recorded choice default to line/advance.

Maneuvers change depicted progress and arrows between scenes; they do not influence combat probabilities, pathfinding, or terrain avoidance. Victory and losses still come from the simulator's existing combat model. Map pixels are the actual saved world, cropped consistently around the battle location; no invented rivers or roads are added.

### Sources consulted, 2026-10-09

- [H. W. Halleck, Elements of Military Art and Science](https://www.gutenberg.org/files/16170/16170-h/16170-h.htm), orders of battle and figures 14–33: line, column, square, skirmish, oblique, echelon, curved fronts, reinforcement and refused flanks. Historical primary source; its claims of superiority are not game bonuses.
- [The National Archives, Waterloo](https://www.nationalarchives.gov.uk/education/resources/significant-events/battle-of-waterloo-1815/): contemporary account of infantry squares facing cavalry.
- [National Park Service, Battle of Cowpens](https://www.nps.gov/cowp/learn/historyculture/the-battle-of-cowpens.htm): three successive lines and their supporting roles.
- [National Park Service, Double Envelopment](https://www.nps.gov/places/double-envelopment.htm): converging attacks around both flanks.
- [National Army Museum, Cavalry Roles](https://www.nam.ac.uk/explore/cavalry-roles): cavalry's role in attacking formations.
- [National Park Service, The Embattled British Column](https://www.nps.gov/articles/000/the-embattled-british-column-survival-against-the-odds-on-the-battle-road.htm): rear and flank protection during retreat.

`node tests/formations.cjs` verifies all twelve distinct geometries, seven maneuvers, bounded coordinates and exact troop conservation after splitting into blocks. The browser test additionally exercises different choices, export, reload and mobile layout.

## Narration and action badges

New battles narrate all 84 formation/maneuver combinations from saved round counts. Map badges identify deployment, engagement, recorded losses, victory, defeat/withdrawal, and loss of the committed force. Reserves remain separate. See [the audit](AUDIT.md) for verification and remaining limitations.
