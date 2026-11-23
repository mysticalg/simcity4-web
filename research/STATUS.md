# Reconstruction status

Updated 2026-11-23. Current release: 0.5.0. Full-game parity: **not achieved**.

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
