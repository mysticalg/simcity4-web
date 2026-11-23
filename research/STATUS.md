# Reconstruction status

Updated 2026-11-23. Current release: 0.1.0. Full-game parity: **not achieved**.

## Evidence from the supplied copy

Source was a GOG installer named `setup_simcity4_deluxe_2.0.0.8.exe`. Extracted without running the installer using innoextract 1.9. Original installer remains unchanged.

- 439 DBPF archives, 232,301 index entries, 111,822 distinct TGI keys after overrides.
- 42,915 S3D resources and 40,549 FSH resources across indexed archives.
- 417 city terrain resources at full resolution. Lower-resolution terrain resources also exist.
- Core data includes `SimCity_1.dat` through `SimCity_5.dat`, `EP1.dat`, `Sound.dat`, locale data and regions.
- These counts are content measurements, not a count of working gameplay features.

## Implemented

The browser decodes the data itself. A local Node server can supply individual resource bytes for convenience; Pages instead reads File objects from the selected local directory. Rendering is native WebGL. No executable emulation or executable translation is implemented.

DBPF, QFS, binary exemplars, FSH and S3D readers are in `dbpf.mjs`. The S3D reader must not trust section byte lengths: many original entries have stale lengths. It follows actual decoded section counts. Animation is currently limited to the first frame. Shader, alpha, depth, culling, view-dependent BAT geometry and lighting fidelity require more validation.

Terrain heights use a two-byte version followed by float32 samples; x-major file storage is transposed into the mesh grid. Water uses a provisional 250m datum. Terrain surface colors are provisional; original terrain texture blending is absent.

Sandbox tools, buildings and simulation formulas are provisional and separate from the original city data. They must never be represented as original simulation parity.

## Validation

`npm run audit` decodes original model, texture, terrain and binary exemplar resources and writes `research/decoder-audit.json`. This report tests parsing, not visual fidelity or game parity. Local and static folder-import browser tests exercise original terrain, an original textured network model, sandbox growth, budget, pause, stepping and save/restore. Screenshots must also be inspected because WebGL context loss can produce empty captures despite correct text state.

## Next engineering milestones

1. Decode saved building and network records; resolve exemplar/cohort inheritance and model keys; reconstruct actual cities, lot textures, flora and props.
2. Validate model transforms, BAT zoom/rotation variants, texture UVs, alpha and terrain orientation against native screenshots of the same saved city.
3. Extract and document actual exemplar tunables and simulator configuration. Inspect executable routines for mechanics not expressed in resources; implement one subsystem at a time with native-game differential fixtures.
4. Original networks and traffic/pathfinding, connected power/water systems, demand/growth, finance/tax, land value/desirability, pollution and services.
5. Regions, saving, original UI workflows, disasters, missions and audio.
6. Full scenario playthroughs, long-term simulation comparisons and browser performance verification before claiming a working full version.

The full-game objective remains active. Completing any one release above does not complete that objective.
