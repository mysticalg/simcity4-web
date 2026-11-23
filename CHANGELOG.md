# Changelog

## 0.13.0 — 2026-11-23

- Add low/medium/high residential and commercial zoning, plus medium/high industry.
- Use original zoning costs, density colours and population-based growth-stage curves.
- Apply native water-dependent stage limits; allow higher-stage parcel redevelopment.
- Preserve buildings during per-tile density changes and keep unused redevelopment land zoned.
- Save mixed plot densities and tool selections in version-8 snapshots, with older-save defaults.
- Full demand, regional allocation, wealth transitions and agricultural compound lots remain unfinished.

## 0.12.0 — 2026-11-23

- Add Raise, Lower and Level terrain tools using original brush masks and definitions.
- Preview brush footprints and costs; support holding and continuous strokes.
- Update terrain normals, raycast bounds and shoreline/cliff shading after edits.
- Protect occupied ground and preserve map edits in version-7 saves.
- Decode native grayscale FSH masks and batch repeated brush rendering.
- Native scheduling, construction grading and neighbour-edge reconciliation remain unfinished.

## 0.11.0 — 2026-11-23

- Develop residential, commercial and dirty-industrial zones into original stage-one lot recipes.
- Assemble contiguous zoned tiles into real plot footprints and orient plots toward roads.
- Render original lot paving, gardens, building positions, building-family variants and static props, including native window overlays.
- Preserve lot recipes, orientations and footprints in version-6 saves; query and bulldoze through any occupied tile.
- Keep legacy saves readable. Demand, higher-stage progression and density controls remain unfinished.

## 0.10.0 — 2026-11-23

- Replace flat ground colours with original grass, beach, rock and seabed artwork.
- Render new roads with original textures for ends, bends and junctions.
- Fill fast drag strokes continuously; add rectangular zoning, costs, footprint previews and Escape cancellation.
- Protect roads and grown buildings from accidental replacement.
- Match construction overlays to terrain triangles to fix clipping; improve city focus bounds.

## 0.9.0 — 2026-11-23

- Preserve original developed-city treasury, taxes and utility funding.
- Replace provisional population/job income with saved assessment-based taxes and existing department expenses.
- Add a monthly budget breakdown and twelve persisted tax rates; include new native building values and maintenance costs.
- Parse financial records across all 417 source saves and test native tax/expense arithmetic.
- Live assessment, loans/deals/ordinances and tax effects on demand remain unfinished.

## 0.8.0 — 2026-11-23

- Import original underground pipes and connect them to new water facilities.
- Include original building utility supply/demand and lot conduction in live utility graphs; join saved power-line spans by pole references.
- Remove original pipes independently of surface structures and persist those edits.
- Query current computed utility status and validate all supplied pipe/power-line layouts.
- Neighbor deals, original utility finances and native wire visuals remain unfinished.

## 0.7.1 — 2026-11-23

- Start unsaved cities at full power/water funding; preserve each saved city’s budget settings when returning.

## 0.7.0 — 2026-11-23

- Add original water tower and two water pump definitions/models with power-dependent output and water funding.
- Build and remove underground pipes without replacing roads or buildings; inspect connected service coverage in Water view.
- Track native building water consumption, water facility upkeep and pipe maintenance.
- Preserve pipes and water settings in construction saves; continue loading older saves.
- Add water graph/data tests to deployment checks. Existing native saved-city water systems are not yet simulated.

## 0.6.0 — 2026-11-23

- Light individual windows and fixtures using original transparent night textures; add a remembered Day/Night selector.
- Query and bulldoze original saved lots and transport tiles, preserving edits across saves.
- Connect new development to original saved roads; update region totals after local changes.
- Clear native natural scenery for new construction and prevent overlap with existing lots/networks.
- Validate native lot parsing, ownership, demolition costs and edit persistence in deployment checks.

## 0.5.1 — 2026-11-23

- Reset the region screen scroll position when opening a region, keeping its heading and navigation visible on shorter windows.

## 0.5.0 — 2026-11-23

- Replace new-zone building placeholders with original models and active-wealth capacity data.
- Load eight native power facility definitions and actual costs, capacity, footprints and funding response curve.
- Add connected circuits, transmission lines, power shortages and growth gated by connected supply/adjacent roads.
- Add native difficulty starting funds and power funding controls; restore plant types, funding and camera.
- Save additions separately for every city and checkpoint automatically on month/return.
- Handle the two overlapping Timbuktu save variants through a city variant selector.
- Version application module/index URLs so older browser caches do not load incompatible metadata.
- Native taxes, demand, water, effects and original saved-city simulation remain unfinished.

## 0.4.0 — 2026-11-23

- Start with region selection: six original regions, 417 city layouts, thumbnails, population/job totals, selection and entering/returning from cities.
- Remove the asset explorer interface. Keep original city geometry visible while building new construction.
- Bundle supported game resources and saved cities so the hosted reconstruction opens without any upload or folder selection.
- Add compressed, content-hashed asset packs, SHA-256 validation, retries and a bounded in-memory pack cache.
- Put the default city assets into one 3.7 MB pack; the compressed index is 1.9 MB. Other resources load on demand.
- The current package contains 141,907 indexed resources, approximately 674 MB in total. Executable and installer are excluded.
- Preserve optional local import through `?import`.

## 0.3.0 — 2026-11-23

- Read original saved props and flora, state model keys and flora model keys.
- Render repeated models using hardware instancing; merge road/lot geometry by material.
- Fulham now renders 530 buildings, 498 roads, 986 lot tiles, 3,306 static props and all 3,121 saved flora records. 150 animated scenery records remain unresolved.
- Full-data checks parsed 134,420 props and 744,617 flora records in the supplied regions.
- Original simulation, animation and visual parity remain unfinished.

## 0.2.0 — 2026-11-23

- Read original saved building records, SGProps, exemplar/cohort inheritance and model variant references.
- Render original saved buildings, network tile vertices/UVs and lot base textures in a separate city viewer.
- Correct terrain row ordering, verified by the alignment of original buildings and roads with the land.
- Label model zoom/rotation variants using building exemplars.
- Separate original city viewing from the provisional sandbox, including different statistics.
- Fulham verification: 530 buildings resolved, 498 network tiles and 986 lot texture tiles rendered. This is a rendering milestone; original simulation remains absent.

## 0.1.0 — 2026-11-23

- First DBPF/QFS/FSH/S3D/exemplar/terrain readers, original asset explorer, local folder import and native WebGL rendering.
- Experimental city sandbox, separate browser saves, visible version and automatic Pages deployment.
