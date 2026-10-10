# Battle pictures and expedition forces

Each country card has **Commit to next battle** fields for artillery, archers, infantry and cavalry. Blank means all currently available troops of that type. Enter 0 to leave a type at home, use exact counts, or click **Send half**. Requests exceeding availability are capped at the available count. The displayed commitment summary shows the actual force and the reserve. Choices apply if diplomacy brings that country into the battle; a neutral country commits nothing. Both main opponents must commit at least one unit.

A battle deducts losses only from the expedition. National availability afterward equals untouched reserves plus returning survivors. Choices persist for subsequent battles, so a numeric commitment remains the same requested count (capped by the new availability); **Send half** calculates half of the current army when clicked.

Every new report scene has two downloadable PNGs:

- **Location picture:** the saved world map, zoomed to the scene location, with participating heraldry.
- **Battle picture:** type-specific formation counters, shield/name identification, committed and surviving counts, cumulative losses, reserves, victory/defeat, retreat arrows and destroyed markers. The legend explains the symbols. Deployment, combat rounds, and final outcome use immutable snapshots from the same combat result.

A destroyed expedition does not imply that its nation's reserves were destroyed. The outcome image and facts retain that distinction. Replay and downloads read saved results; neither simulates or deducts losses again. Old saves remain readable; old battles without tactical snapshots retain their original map illustrations.

## Sparta assessment

Evaluated [Sparta](https://github.com/Lacaedemon/sparta), its [architecture](https://lacaedemon.github.io/sparta/architecture.html), and its `scripts/Unit.gd` renderer on 2026-10-09. Its formation tokens, unit states, and victory display are relevant references. Rendering and combat are coupled to Godot nodes, scene state, and its own simulation; it is not an independent browser image renderer.

The current classroom app is static JavaScript with saved combat rounds. Running Sparta's separate combat engine would produce different outcomes unless the two simulations were reconciled. For this image-only feature we therefore implemented an original Canvas renderer of the existing results. No Sparta code or art is bundled, and these are not Sparta-generated screenshots. Exact positions, arrows, and terrain decorations are schematic rather than a pathfinding or collision simulation. The separate map picture provides the actual geographic context.

## Verification

Run `node tests/battle-picture.cjs` for commitment accounting, consecutive battles, scene reconciliation, and JSON restoration. Existing diplomacy, world, shield, Azgaar, and report checks also remain applicable.

With a local HTTP server running, run `node tests/browser-battle.cjs` with Playwright installed. Optional environment variables: `BATTLE_URL`, `PLAYWRIGHT_MODULE`, `BROWSER_PATH`, and `BATTLE_PICTURE` (download destination). It verifies a five-nation battle including custom shields, a wiped-out expedition with reserves, two images per scene, downloading, replay and reload conservation, zero-commitment rejection, and mobile width.
