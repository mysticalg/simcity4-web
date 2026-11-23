# Reconstruction status

Updated 2026-11-23. Current release: 0.15.0. Full-game parity: **not achieved**.

## Current milestone

v0.15.0 adds existing-city road junction updates for new branches and demolition, matching native textures and directed paths; see [ROAD-TOPOLOGY.md](ROAD-TOPOLOGY.md). v0.14.0 added native road-path-based local job routing, traffic overlays and commute queries; see [TRAFFIC.md](TRAFFIC.md). Full demand, native occupancy/abandonment, multimodal and regional commuting remain unfinished.

## Evidence from the supplied copy

Source was a GOG installer named `setup_simcity4_deluxe_2.0.0.8.exe`. Extracted without running the installer using innoextract 1.9. Original installer remains unchanged.

- 439 DBPF archives, 232,301 index entries, 111,822 distinct TGI keys after overrides.
- 42,915 S3D resources and 40,549 FSH resources across indexed archives.
- 417 city terrain resources at full resolution. Lower-resolution terrain resources also exist.
- Core data includes `SimCity_1.dat` through `SimCity_5.dat`, `EP1.dat`, `Sound.dat`, locale data and regions.
- These counts are content measurements, not a count of working gameplay features.

## Implemented

The browser decodes the data itself. Pages now loads bundled compressed resource packs, without uploads or folder selection. Optional local folder import and the local Node data server remain available. Rendering is native WebGL. No executable emulation or executable translation is implemented.

DBPF, QFS, binary exemplars, FSH and S3D readers are in `dbpf.mjs`. The S3D reader must not trust section byte lengths: many original entries have stale lengths. It follows actual decoded section counts. Animation is currently limited to the first frame. Shader, alpha, depth, culling, view-dependent BAT geometry and lighting fidelity require more validation.

Terrain heights use a two-byte version followed by float32 samples in z-major rows (x varies fastest). An older reference described this incorrectly; saved network vertex alignment confirmed the corrected axes. Water uses a provisional 250m datum. Terrain surface colors are provisional; original terrain texture blending is absent.

Version 0.2.0 reads saved buildings, follows exemplar/cohort inheritance, selects original S3D variants, places buildings using saved bounds and orientation, and renders saved network vertices/UVs and lot base textures. Fulham resolves all 530 building records and renders 498 network tiles and 986 lot tiles. Visual parity is not established. Props, flora, complete network/lot composition, camera-dependent BAT variant changes and material fidelity remain unfinished. The original city view has separate counts and disables sandbox simulation controls.

Version 0.3.0 adds original static props and flora, model state/key type 4 and key type 5 resolution, and hardware instancing. Road/lot meshes are merged by material. Fulham renders 3,306 static props and all 3,121 flora records; 150 animated scenery records have no supported static S3D reference. No substitute models are used for those unresolved records. Flora growth/seasonal states and animation are not reproduced. The full data audit parses 134,420 props and 744,617 flora records across all supplied regions. Parsing success does not imply every record has a renderable asset.

Sandbox tools, buildings and simulation formulas are provisional and separate from the original city data. They must never be represented as original simulation parity.

Version 0.4.0 starts at region selection and removes the asset explorer UI. Original CA027EDB metadata supplies city coordinates, dimensions, residents and commercial/industrial jobs. Native saved thumbnails supply previews. All six regions and 417 cities are selectable. Existing geometry remains visible while constructing additions, and saved population/jobs establish the displayed baseline; existing city behavior is still static and not a working port of its simulation. Construction saves currently preserve additions only.

At the user's explicit request, 141,907 supported resources and saved-city resources are packaged under assets/. The executable/installer are excluded. There are 94 content-hashed gzip packs, approximately 674 MB, plus approximately 19 MB of region previews. All 775,475,608 packed payload bytes were independently compared to source resources without mismatches. The default city's resources occupy one 3.7 MB pack. The browser verifies SHA-256 and decoded lengths and fetches packs on demand. The user's asset-inclusion request supersedes the earlier choice to exclude assets.

Version 0.5.0 advances new-city gameplay: native growable models and active-wealth capacities, eight native power facility definitions, correct footprints and facility costs, connected transmission lines, capacity/funding response, adjacent-road/power-gated growth, difficulty starting funds and per-city construction saves. The graph, growth stage selection and tax income remain reconstructed/provisional. Original city occupants are a baseline and are not simulated by this new-construction loop. The original Wind model is only its static base: the native windmill effect is still missing. Full native lot composition, water, desirability, demand, education, traffic, aging and full finances remain outstanding. See POWER.md for evidence and explicit limits.

## Validation

`npm run audit` decodes original model, texture, terrain and binary exemplar resources and writes `research/decoder-audit.json`. This report tests parsing, not visual fidelity or game parity. Local and static folder-import browser tests exercise original terrain, an original textured network model, sandbox growth, budget, pause, stepping and save/restore. Screenshots must also be inspected because WebGL context loss can produce empty captures despite correct text state.

The full archive audit decoded 42,913/42,915 S3D entries, 40,525/40,549 FSH entries, all 417 full terrain fields and 8,957/8,959 binary exemplars. Remaining decoder failures are two nonstandard model sections, 24 palette FSH encodings and two text exemplars. `npm run verify-data` parsed 12,295 saved buildings, 9,343 network tiles and 28,815 lot texture tiles across the supplied regions. The median terrain-to-road height error is zero across 37,372 sampled road vertices. This is an independent consistency check of axis ordering and coordinate units, not proof of whole-game accuracy.

## Next engineering milestones

1. Extend the saved building/network/lot rendering to flora, props, overlays and complete network meshes; handle every supplied populated city without unsupported layouts.
2. Validate model transforms, BAT zoom/rotation variants, texture UVs, alpha and terrain orientation against native screenshots of the same saved city.
3. Extract and document actual exemplar tunables and simulator configuration. Inspect executable routines for mechanics not expressed in resources; implement one subsystem at a time with native-game differential fixtures.
4. Original networks and traffic/pathfinding, connected power/water systems, demand/growth, finance/tax, land value/desirability, pollution and services.
5. Regions, saving, original UI workflows, disasters, missions and audio.
6. Full scenario playthroughs, long-term simulation comparisons and browser performance verification before claiming a working full version.

The full-game objective remains active. Completing any one release above does not complete that objective.


2026-11-23 v0.6.0: Added native window-local night lighting. S3D day material FSH IDs use the corresponding ID with bit 0x8000 set for the native night overlay. Decoded source samples confirm transparent walls and lit window/fixture pixels; 12,878 matching texture pairs are already bundled. The shader dims day surfaces and composites the native overlay using its alpha while preserving the daytime silhouette. A Day/Night selector persists locally. This is surface emission; physical window light spill, native automatic time-of-day and native power-driven night states are not implemented.

Also integrated native saved lot ownership, Query and Bulldoze, original road access for new zones, natural scenery clearing and persistent native edits. Fulham checks cover 661 lots, 530 buildings, 498 roads, mouse query/demolition, road-dependent growth and reload persistence. Job changes use removed lots' saved capacity as deltas from the cached region total; this is not the full native occupancy simulation (Fulham lot industrial capacities sum to 4401, versus cached region total 4526). Region totals reflect local changes. Bundled city resources were already present; index metadata now exposes the lot subfile. Full game parity remains unfinished.

Validation: native power and imported-city unit checks; browser region flow, power/build/save/reload, native edit persistence, day/night shader rendering, selection persistence and screenshots. Native window overlays were inspected against daytime images. Remaining: demand, water, traffic, taxes, effects/animation, full native simulation and lighting power states.


Version 0.7.0 adds water infrastructure for new construction: original tower and two pump definitions/models, power-dependent output, connected underground pipes, service coverage, funding, consumption, upkeep, separate pipe demolition and version-4 construction snapshots. The surface is preserved when placing/removing pipes. A water network view batches its pipe geometry. Native parameter evidence and limits are in WATER.md. Existing saved-city pipes and utility simulation remain unported. No claim of complete native water simulation is made; native pollution, aging, disasters, source depletion and growth constraints still need integration. Current low-wealth/provisional level-1..3 growth is unchanged; water service is reported rather than imposing an invented stage requirement.


Version 0.8.0 connects saved-city utility records to the live graphs. The parser validates all 1,483 native pipes in six cities and all 265 power-line tiles in six cities. Original lot footprints conduct power, original building exemplars contribute utility supply/demand, and saved pole endpoint references connect power-line spans. New pumps use saved pipe networks; native pipe demolition is separate from surface demolition and persists in nativeEdits. Query uses recomputed utility states rather than presenting old source flags as live simulation. Fulham fixture: 6001 generation (coal 6000 plus fire station 1), 3052 power demand, 7664 water demand, 153 pipes and zero local water producers. Neighbor utility deals are not decoded, so the saved watered flags are not treated as invented supply. Existing-city finances, native wire/pole visuals and wire editing, utility wear/pollution/source availability and exact native graph/shortage allocation remain unfinished. See SAVED-UTILITIES.md.


Version 0.9.0 replaces the resident/job income shortcut with a budget ledger driven by saved tax assessments, original department line items, BuildingValue and native tax arithmetic. Developed source cities preserve treasury/tax/funding; untouched templates use selected new-city starting funds. Twelve tax controls and a budget breakdown are available, and tax state persists in v5 snapshots. All 417 financial records parse, including budget 4/5 and department 9/10. Existing cached-baseline financial deltas and full live assessment, native debt/deals/fares/ordinances and tax effects on demand still need integration and native differential comparisons. See FINANCE.md.


Version 0.10.0 prioritizes city maps/build tools/gameplay per user steering: original terrain textures and road art, continuous drag strokes, rectangular zoning/price/footprint previews, cancellation, occupied-tile protection and a terrain-triangle interpolation fix. See MAPS.md. Further region-selection work is not the immediate priority. Native lot composition, grading, stage/demand/traffic and original visual parity remain unfinished.


Version 0.11.0 implements original growable lot composition for initial R/C/dirty-industrial stage-one growth. Proper footprints, textures, static props, source building families and road-facing orientation replace bare one-tile new buildings; recipe/orientation/footprint state persists in v6 saves. Selection/demand/density/stage progression and several object/effect types remain reconstructed or missing. See LOTS.md. Full game parity is not achieved.

Version 0.12.0 adds mayor terrain editing with original masks, native operation evidence, sparse terrain saves, live geometry/shoreline updates and occupied-land protection. See TERRAIN-TOOLS.md for callback addresses, verification and limits. Timing, sampling, locking and smoothing scheduling still have reconstructed behavior. Native construction grading, edge reconciliation and full simulation remain unfinished. The full-game objective remains active.

Version 0.13.0 adds density zoning and original prices/colours, developer stage curves, native water-stage gating, parcel redevelopment and per-tile density persistence. See DEVELOPMENT.md. Native regional/tract stage allocation, demand/desirability, occupancy/wealth transitions, agriculture and original-city redevelopment remain incomplete. The complete-game objective is still active.
