# Streets and primary network rules — v0.16.0

Street construction, native street artwork, mixed road/street junctions, job access and road upgrades are playable. Street placement costs §5 per tile, demolition §1; road placement costs §10 and demolition §2. Traffic uses street speed 21 km/h and capacity 100, versus road speed 31 and capacity 1000. Maintenance and queries distinguish the network types. Version 9 construction saves retain street tiles and their construction order; versions 1–8 remain readable.

## Original data

- Street placement tuning: `6534284a-084344e0-492a03a3`; road placement tuning: `6534284a-084344e0-0781214f`. `4a2d49b9` is per-tile construction cost; `ea86e3b5` is demolition cost. These are compiled into `catalog.game.networkTools` by `game-data.mjs`.
- Traffic simulator: `6534284a-e7e2c2db-c9133286`. Street is network index 3, road index 0. Speeds `491332e8`, capacities `a92356b3`, monthly costs `6a84493e`. Current maintenance sums truncated per-type aggregates using these original float values, consistent with the existing budget reconstruction.
- Original primary RULs: `0a5bcf4b-aa5bcf57-00000003` (road) and `0a5bcf4b-aa5bcf57-00000009` (street) in `SimCity_1.dat`. Each contains 412 pairs of input connector records and output graphic/rotation/mirror records. `network-rules.mjs` parses these primary records; `tools/enrich-networks.mjs` compiles all 824 and selects all sixteen cardinal shapes per network. Original street save examples independently identify the `0500....` graphic IDs and quarter-turns. Standard car paths use group `69668828` with matching native instance IDs. Texture IDs add 4 for the full-detail FSH image.
- Mixed junctions: 26 regular source road/street port patterns sampled from original saved city networks expand under quarter-turn and mirror transforms to all 50 mixed cardinal patterns. Geometry and its attached UV coordinates transform together; native lane paths use the same UV transform. No generated texture substitutes are used.

## Reconstruction choices and limits

The primary selector uses connector values 0/2. Secondary RUL neighbor rewrites, diagonal draw behavior, Transmogrify rules, intersection placement tools, grading, bridge/tunnel construction and wealth sidewalks are not yet ported. Although diagonal mappings are compiled as evidence, the current tools construct cardinal strokes.

For adjacent new network types, the earlier tile receives the later approach type; a street branch added to a road therefore makes a mixed junction at the road, and a road approach added to an older street makes the junction at the street. Relative construction order is preserved by save-array order. This is a reconstructed construction policy, not the native rewrite scheduler. Source roads/streets are older than new construction. The shared regular-source eligibility now admits regular road/street combinations; special/diagonal/bridge pieces retain source geometry and permitted ports. Ordinary surface tools do not create highway ramps.

The native zero-connector graphic is `0x100`, with no car path. An isolated tile uses that empty graphic until it gains a connection; it is not treated as a driveable road or as an unsupported asset. The original tool's anchor/ghost-port behavior still needs reconstruction.

New streets can be upgraded using the Road tool at the full native road placement cost. Downgrading requires demolition. Direct upgrades of occupied source-city street tiles remain unfinished. Mixed tiles participate in both road and street maintenance counts. Their routing speed/capacity currently uses road index 0; exact per-path network-change cost is still unresolved. Combined source-network demolition uses the maximum available per-network demolition charge; native combined charge sequencing remains unverified. Saved demographic, demand, traffic assignment, public transport and regional limitations in TRAFFIC.md still apply. Power-line construction over a road also remains unfinished; the browser fixture connects power around the branch end explicitly.

## Verification

Twelve unit groups pass. `tools/test-streets.mjs` checks source constants, 824 primary rules, 16 street shapes, all 50 mixed UV/lane transformations, construction order, invalid rules, an isolated empty tile, actual slower street routing and congestion that cuts off a later household while the road still serves it. Existing native road topology, utility, terrain, lot, finance and development tests also pass.

Browser `work/verify-streets.mjs` builds 20 street tiles by mouse drag (§100 placement, §1 monthly maintenance), queries native speed, constructs a mixed junction, grows original homes and shops, routes eight workers, disconnects/reconnects the street, verifies §1 street demolition, saves/restores/reloads version 9, upgrades all streets to roads at §10 each, observes shorter actual commutes, rejects direct downgrade and verifies §2 road demolition. Zero console errors. An initial fixture lacked power on the far side of its road branch; an explicit line bypass fixed the test setup without changing power distribution.

`work/verify-street-native.mjs` extends Fulham with a street, verifies the mixed source junction and existing-city job access, demolition/replacement, clear/restore, full reload and view switching with zero errors. The standard develop-web-game client and map/build regression also pass. Screenshots are retained under workspace `work/tests/streets-*.png` and `source-road-*.png`.

Full original game parity is not achieved.
