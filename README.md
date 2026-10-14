# Kingdoms at War

A browser-based world-building companion for a Google Docs classroom assignment.

[Open the simulator](https://ragingaxolotl-art.github.io/heraldry-battle-simulator/).

## Student workflow

1. Use **Import Azgaar World** with Azgaar **Export → JSON → full** to preserve exported cell geometry, countries, diplomacy, and biome IDs. Exported biome names/colors are used when included, with the standard Azgaar palette as fallback. Troops and economy remain editable game defaults, not an import of all Azgaar military systems. Alternatively, upload your own biome-view PNG with **Upload Map PNG**, or use **Reroll World** for a simplified biome map with fifteen named countries.
2. **Download Clean PNG** exports a 2400 × 1400 map with country names, but no shields or battle arrows. Insert that image into Google Docs and practice headings, image wrapping, and shield placement there.
3. Choose five different generated map countries, or name five countries on your uploaded map. Add a ruler, exports, currency, and sport. Names, gold, and army counts are editable. Starting economies, military compositions, and diplomacy are adapted from the teacher's Gria export with seeded variation.
4. Upload a shield image for each country. Drag shields on the map or focus them and use arrow keys. Moving a shield does not transfer territory.
5. Under **Choose two countries at odds**, click the attacker, then its opponent. The second choice starts the battle automatically. Advanced battle settings are hidden. Battlefield location, biome, and elevation come from land near the defender’s marker; elevated ground gives a defensive bonus. Uploaded PNGs use neutral open-ground rules because they contain no terrain data. Losses are deducted once from participating armies.
6. Read **Your battle reports** from top to bottom: overview, diplomacy, each round, outcome, and any wiped-out force. Each block has its own picture download, fictional narrative, and actual simulation facts. Per-round facts include losses and survivors for each country and unit type. Later battles follow underneath. Pictures retain their original map snapshot when names or marker positions change.
7. In Google Docs, add headings, insert pictures, write captions, and build your own tables from the facts. The site has no finished casualty table or table-copy/export feature. Narrative text can be copied.

The map generator is a simplified, original classroom generator. It produces new geography and names, using D3 Voronoi geometry. It does not embed the full Azgaar application or reconstruct the original Gria artwork. Starting land forces exclude fleets, which are not modeled in combat.

## Saving and privacy

Worlds, choices, names, shields, army counts, relationships, settings, and the most recent twenty battle notebooks save in local browser storage. Refreshing restores them when storage is available. Uploaded maps and shields are resized locally and never sent to a server. Each browser profile has one current world; there are no student accounts or shared multiplayer sessions.

Use **Download My Progress** to keep a JSON backup or move to another computer. **Open My Progress** restores that backup. Reroll and restore ask before replacing current work. On shared computers, students should save their own progress file and reopen it rather than assume the browser belongs to them. Private browsing, cleared storage, or storage limits can prevent local saving; the UI reports failures.

Map uploads accept PNG, JPEG, or WebP up to 30 MB and resize to at most 2000 pixels. PNGs provide only a visual background; names, borders, biomes, and routes are not automatically interpreted.

Shield uploads accept browser-readable images up to 8 MB and resize them to at most 256 pixels. Use **Open My Progress** for this site's backups, and **Import Azgaar World** for Azgaar Full JSON. Imported maps must contain at least five countries. Browser storage can fill for large worlds; download a progress file to preserve work.

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

Run `node tests/azgaar.cjs` for imported geometry, palettes and save restoration, `node tests/shields.cjs` for background removal, and `node tests/alliances.cjs` for diplomacy and combat checks and `node tests/world.cjs` for generation, save validation, and clean-map rendering checks.

## Battle pictures and partial armies

Choose exact troop commitments in each country card, or use **Send half**. Uncommitted troops remain in national reserve. New battle reports include both geographic location pictures and tactical formation pictures with heraldry, losses, survivors, victory/defeat, and a symbol key. See [battle image details and Sparta assessment](docs/battle-images.md).

Run `node tests/battle-picture.cjs` for commitment and image-data checks; `tests/browser-battle.cjs` covers browser rendering, PNG export, and replay/restoration.

Choose from **12 formations and 7 maneuvers** in each country card. New tactical PNGs place formation blocks directly on a zoomed-in version of the saved map, with heraldry and force accounting. These are illustrated plans; formation choices do not change the combat math. Historical references and behavior are documented in [battle image details](docs/battle-images.md).

## Countries, cities, and named armies

The **Countries & cities** tab highlights the five selected countries. Choose a country to zoom to its territory, then click a city or choose it from the list. Country and city notebooks use the assignment's ruler, major export, money name, and favorite sport prompts, plus a city story field. Country edits stay synchronized with the battle cards.

Azgaar Full JSON imports now retain settlement names, state ownership, capitals, and locations, including non-capital settlements. Old backups that discarded those settlements cannot recover them; reimport the original Full JSON to start a world with them. Simplified worlds generate up to three cities on each country's land. PNG backgrounds have no readable borders; country circles and editable city placements are illustrative. Existing city notes survive switching to a PNG background. **Download this map** exports the highlighted atlas view for students to insert in Google Docs.

Each country has three persistent, editable regiments with fictional generals, story personalities, home cities, and company/battery breakdowns. These subdivide the existing national army; they do not add troops. Uncheck a regiment to keep it home. Numeric troop commitments can further limit the checked force. Combat still uses the existing national simulation; recorded losses are allocated proportionally among the deployed regiments by unit type with exact integer accounting. Uncommitted troops remain intact. Commander personalities are narrative only, and regiment map locations are home stations rather than travel/pathfinding rules. New reports name generals and show regiment losses and survivors as fact paragraphs. No ready-made student tables are generated.

Cities, notes, army names, deployment choices, and surviving unit totals persist in browser storage and **Download My Progress** backups. Earlier saves receive generated cities and regiment identities on upgrade. Battle replay never applies losses again.

Run `node tests/campaign.cjs` for settlement import, persistent identity, and troop conservation. Run `node tests/browser-campaign.cjs` against a local server with `BATTLE_URL`, `PLAYWRIGHT_MODULE`, and `BROWSER_PATH` as needed for editing, PNG downloads, save/restore, battles, deployment choices, mobile layout, and Azgaar settlement checks. Run `node tests/azgaar.cjs` first to create its import fixture.

## Simple classroom edition

The visible battle report shows countries, winner, troops sent/lost/returned by type, national reserves, and a short fictional story. Cities and map navigation remain. Formation controls, animated action lines, and regiment management are not part of this edition. Saved regiment data is retained for compatibility but does not restrict commitments.

The advanced version was preserved before simplification at `../saved-versions/advanced-battles-2026-10-09.zip`. Extract it into a separate directory to revisit formations, motion, regiments, and generals. Browser progress is stored separately: use Download My Progress to back up your own world. The simple edition browser check is `tests/browser-simple.cjs`; advanced report/roster browser tests describe the archived interface.

Simplified battle reports include a downloadable close-up of the saved battlefield, with participating shields and approach arrows. Older saved battles regain this picture when their saved map and battle location are available. Run `node tests/browser-closeup.cjs` to verify downloads, replay stability, and mobile layout.

### Settlement maps
Countries & cities embeds Watabou city and village previews. Each settlement keeps its own map seed, generator choice, preview rotation, fictional mayor, and population in Download My Progress. Only capitals use the city generator with named districts; all other settlements use village maps. Country fields appear above settlement fields. Capitals have governors and villages have mayors; currency is country-level. Export PNG starts the city generator’s PNG download; village export opens Watabou for its Export → PNG menu. The external editor provides palette controls; editor changes do not sync back into this app. Rotation applies only to the preview.

New Azgaar Full JSON imports convert burg population points using the exported populationRate and urbanization settings and preserve these settings in backups. Where population is unavailable, an automatically filled classroom estimate is explicitly labeled. The atlas includes all 13 standard Azgaar biomes and any imported custom palette. Generated worlds use the same full Azgaar biome palette.

Village notebooks include student-invented major crops and artisanal goods, with definitions and examples. The settlement preview shows its custom information below the map. To export one combined PNG, first download the map from Watabou, then choose it using “Add information to map PNG.” This local canvas export includes the settlement name, country, governor/mayor, population with source, village products, and story beneath the supplied image. Watabou’s cross-origin map cannot be read directly by this static site; the supplied PNG stays in the browser and is not uploaded.

Generated worlds now use Azgaar’s full 13-biome palette and classification matrix (MIT), with local illustrative temperature and moisture. Geometry, seeded names, and country locations remain stable for existing progress files. Imported worlds retain their original biome assignments. Uploaded PNGs remain images and cannot be recolored from biome data.

### Capture map and download
The primary settlement download uses getDisplayMedia after a user click. Students select the current tab; a temporary color strip verifies that it is this page before the visible map rectangle is cropped. The map is fitted to the viewport, captioned using existing student fields, and downloaded locally as PNG. Tracks stop immediately after capture and on every exit path. Audio is disabled. Unsupported browsers, declined permission, wrong surfaces, and unverifiable tabs receive an explanation and retain the existing PNG-file alternative. Desktop Chrome actual tab capture and synthetic cancellation/high-DPI cleanup tests cover this workflow.

### Map-first classroom editor
World & battles now edits every country in a sidebar next to clickable territory outlines. Selecting a territory, marker, or country-list item opens one editor. Uploaded shields appear on the map. Existing five-country saves migrate to the complete country roster without dropping country fields, settlement notes, or shields. Browser saving includes the selected editor, battle orders, country details, and progress. If battle images exhaust storage, the save retries without replay images while preserving country work and textual history.

Dragging a marker onto another territory offers Attack or Help; accessible country/destination lists provide the same actions without dragging. One attack is planned at a time. Other countries can help either principal, with red attack and blue help arrows. Help is an explicit battle order, not a permanent diplomacy change. Simulation starts only with Simulate battle, honors the chosen helpers without random recruitment or betrayal, and uses the existing combat/report engine. Neutral troops remain in reserve. Uploaded PNG maps use markers/list selection and a Place shield button because images contain no country polygons.
