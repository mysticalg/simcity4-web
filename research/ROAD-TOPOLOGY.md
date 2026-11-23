# Existing-city road junctions — v0.15.0

Adding an ordinary road branch beside an ordinary saved road now replaces that saved tile with the corresponding native T-junction/crossroad texture and lane paths. Removing the branch restores the saved road's original mesh and paths. Demolishing a saved neighbor closes the remaining ordinary road's connection; placing a new road there reconnects it. Source jobs remain available through these updated junctions.

Since v0.16.0, regular streets and mixed road/street combinations also update; see STREETS.md. The restrictions below describe the initial v0.15.0 implementation.

## Source and implementation

Saved network vertices, UVs and connector values come from the native `c9c05c6e` city records parsed by `dbpf.mjs`. Cardinal masks use west/north/east/south bits. Replacement templates are the same 15 full-tile, single-road native texture/UV templates compiled in `tools/enrich-map-assets.mjs`. Their matching SC4PATHS records supply directed car paths (see TRAFFIC.md).

`road-topology.mjs` only replaces pieces with one type-0 road crossing, regular 0/2 connector values, four axis-aligned 16m corners and a standard-group native path definition. This admits 184 of Fulham's 498 road records. Diagonals, bridges, road/rail combinations, streets, avenues and one-way pieces retain their existing source geometry. New roads can meet the existing ports of supported surface networks; ordinary roads do not invent highway ramps.

The policy reconstructs connections from new neighboring road tiles and source-neighbor demolition. It is not the original RUL rule engine, automatic grading, wealth sidewalks, diagonal construction or transport interchange selection. Existing source ports facing an empty tile are preserved until a known adjacent network is demolished. Parallel untouched source roads are not joined merely because they are adjacent.

Rendering hides only the superseded source mesh span, retaining the native ownership record. Replacement meshes are derived from source edits and new road placements, not independent saved buildings. A single mask controls rendering and routing. The normal source-edit pass restores the original mesh when a replacement is no longer needed. Water view also hides these replacement meshes. Clearing construction removes branches while retaining prior source demolitions, matching existing save behavior.

## Verification

Eleven unit groups pass. `tools/test-road-topology.mjs` uses bundled Fulham records to verify an untouched city has no replacements, a west branch changes a north/south source road to mask 11, two branches produce mask 15, branch removal restores the original, source-neighbor demolition closes a port, replacement restores it, special pieces remain unchanged and a highway does not acquire a ramp. A fixture household cannot enter the original straight road from the side; changing to the matching native T-junction admits all 42 workers to saved city jobs.

Browser `work/verify-road-topology.mjs` uses an actual drag to build the branch at Fulham (-30,-29), checks its original junction texture and query, grows a powered original house and routes its two initial workers to saved jobs. Removing the only branch disconnects them; rebuilding reconnects them. The scenario also verifies source-road demolition/replacement, clear/restore, full reload, cached source jobs, funds, native edit persistence and water/traffic view switching with zero console errors. Standard skill-client and map/build regression pass. Screenshots are retained under workspace `work/tests/source-road-*.png`.

Full native traffic, demand, occupancy/abandonment, public transport, regional flows and full game parity remain unfinished.
