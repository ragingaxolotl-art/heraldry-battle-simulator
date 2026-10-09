# Kingdoms at War

A browser-based world-building companion for a Google Docs classroom assignment.

[Open the simulator](https://ragingaxolotl-art.github.io/heraldry-battle-simulator/).

## Student workflow

1. Upload your own biome-view PNG with **Upload Map PNG**, or use **Reroll World** for a simplified biome map with fifteen named countries.
2. **Download Clean PNG** exports a 2400 × 1400 map with country names, but no shields or battle arrows. Insert that image into Google Docs and practice headings, image wrapping, and shield placement there.
3. Choose five different generated map countries, or name five countries on your uploaded map. Add a ruler, exports, currency, and sport. Names, gold, and army counts are editable. Starting economies, military compositions, and diplomacy are adapted from the teacher's Gria export with seeded variation.
4. Upload a shield image for each country. Drag shields on the map or focus them and use arrow keys. Moving a shield does not transfer territory.
5. Select the two opponents, adjust battle settings, and click **Resolve One Battle**. Losses are deducted once from participating armies.
6. Use **Next Event** or **Replay** to move from the overview into close-up battle rounds and back to the outcome. Each scene shows arrows, shields, narrative, and loss facts. **Download This Battle Picture** saves the current view.
7. In Google Docs, add headings, insert pictures, write captions, and build your own tables from the facts. The site has no finished casualty table or table-copy/export feature. Narrative text can be copied.

The map generator is a simplified, original classroom generator. It produces new geography and names, using D3 Voronoi geometry. It does not embed the full Azgaar application or reconstruct the original Gria artwork. Starting land forces exclude fleets, which are not modeled in combat.

## Saving and privacy

Worlds, choices, names, shields, army counts, relationships, settings, and the most recent twenty battle notebooks save in local browser storage. Refreshing restores them when storage is available. Uploaded maps and shields are resized locally and never sent to a server. Each browser profile has one current world; there are no student accounts or shared multiplayer sessions.

Use **Download My Progress** to keep a JSON backup or move to another computer. **Open My Progress** restores that backup. Reroll and restore ask before replacing current work. On shared computers, students should save their own progress file and reopen it rather than assume the browser belongs to them. Private browsing, cleared storage, or storage limits can prevent local saving; the UI reports failures.

Map uploads accept PNG, JPEG, or WebP up to 30 MB and resize to at most 2000 pixels. PNGs provide only a visual background; names, borders, biomes, and routes are not automatically interpreted.

Shield uploads accept browser-readable images up to 8 MB and resize them to at most 256 pixels. Backups accept only this site's save format; the full Azgaar JSON is not a student progress file.

## Combat and diplomacy

Infantry, archers, cavalry, and artillery contribute weighted strength. Combined arms, limited supply support from gold, heraldry morale, and defensive terrain affect combat. Gold alone cannot fight. Battles resolve up to six rounds with simultaneous losses. A force may withdraw below 45% of its initial strength. Surviving effective strength decides battles reaching the round limit; ties favor the defender.

Allies first roll to help. Hatred may draw countries against enemies, then an ally supporting an enemy may provoke betrayal. Each stage uses a fixed snapshot; chosen opponents never switch. Chances range from 0% to 100%. Neutral armies take no losses.

Loss fact cards report starting counts, losses, and survivors. Losses include personnel unavailable through death, wounds, capture, or dispersal, and equipment destroyed or abandoned. These are game estimates, not historically calibrated predictions.

Map arrows follow the same participating sides and outcomes as the battle event list. They depict schematic advance, reinforcement, and withdrawal, not pathfinding or calculated travel times. Student-chosen battlefield terrain affects combat; background map colors do not automatically change those settings. Replay never simulates another battle or deducts troops again.

## Attribution

Economy, troop composition, and initial diplomacy templates come from the teacher-provided **Gria** world exported from [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator), version 1.154.0. Attribution appears on the page and the clean PNG. The included [Azgaar MIT license](vendor/Azgaar-LICENSE.txt) covers generated map derivatives.

The vendored [D3 Delaunay](https://github.com/d3/d3-delaunay) 6.0.4 bundle is used for geometry under its [ISC license](vendor/d3-delaunay-LICENSE.txt). Its bundled dependencies retain the [Delaunator license](vendor/delaunator-LICENSE.txt) and [robust-predicates license](vendor/robust-predicates-LICENSE.txt).

## Development

No build step or external runtime requests are required. Serve this folder with `python3 -m http.server 8000`, then open `http://localhost:8000`. GitHub Pages deploys the `main` branch at the repository root.

Run `node tests/alliances.cjs` for diplomacy and combat checks and `node tests/world.cjs` for generation, save validation, and clean-map rendering checks.
