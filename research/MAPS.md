# City maps and construction — v0.10.0

User priority: city maps, build tools, textures and gameplay. Region selection is already usable; it is not the focus of this release.

## Original artwork and source data

Terrain properties: 6534284a-88cd66e9-00000001. Terrain texture INI: 00000000-8a5971c5-aa597172 in supplied SimCity_1.dat. The active Tropical table and miscellaneous textures identify the native palette. Compiled metadata uses original sea level 250, beach maximum altitude 4 and width 2, cliff normal-Y threshold 0.5 and tiling factor 0.2. Highest-detail grass textures 431/434/438, beach439, rocks444/443 and deep seabed4e0 all use FSH group891b0e1a and were already bundled. tools/enrich-map-assets.mjs verifies every texture reference and records the native table and source IDs.

The WebGL shader projects original grass/sand artwork on terrain and rock artwork along three axes to avoid stretching vertical cliffs. It blends shoreline sand using distance from submerged height-field vertices, with grass and rock based on surface normal/height and stable broad colour variation. Mipmaps and anisotropic sampling reduce distant shimmer. This is a rendering reconstruction, not the native weather/temperature/moisture assignment or its exact texture randomization. Native rendering parity still needs native screenshots and climate-state decoding. The shader does not substitute generated artwork.

New road tiles use original saved-road texture and UV templates for15 connected cardinal masks plus a straight isolated fallback. The compiler selects single-road, full-tile records, preferring regular connector codes over diagonal/special codes, and verifies all referenced FSH payloads. Roads refresh their own and neighboring shapes when changed. End caps, bends, straights, T-junctions and crossings use original artwork. Full native network RUL selection, grading, diagonal roads, sidewalks/wealth changes and retopologizing an existing imported road at an attachment are still pending.

## Tool behavior and fixes

Fast drags fill every intervening cardinal tile for road, power line, pipe and other brush tools. Zoning uses a rectangular drag with an outline, dimensions, price and blocked-cell count before release. Blocked surface/footprint/dry-land checks are reflected in the preview. Escape cancels a pending rectangle. New roads and developed buildings require explicit demolition before replacement. A two-tile wind footprint is shown accurately even while its native animated tower/rotor remains unimplemented.

Strokes batch graph and budget updates. A footprint index replaces linear searches for multi-tile occupancy. Surface overlays follow the same SW-to-NE diagonal as the Three.js height-field mesh; height queries now interpolate its triangles instead of using a different bilinear surface. This fixes terrain showing through roads and zone pads on uneven land. Zoning overlays are translucent, and grown buildings expose the textured terrain below instead of solid green/blue/yellow cubes. Focus city uses building/construction bounds rather than the full forest.

## Verification and limitations

tools/test-map-tools.mjs covers original asset references/settings, every road mask, gap-free cardinal strokes in all directions, rectangle dimensions, shore distance and saddle-height fixtures that distinguish triangular from bilinear interpolation. Browser work/verify-maps-tools.mjs uses actual mouse input for a fast stroke, rectangle preview/charge, cancel and plant footprint. It checks straight/end/T-junction/elbow masks, growth with road/power access, protection of occupied tiles, and save/restore. Screenshots are inspected for texture continuity and terrain clipping, and console shader errors must be absent.

Original stage-one lot composition was added in v0.11.0 (see LOTS.md). Automatic grading/cut/fill costs, terrain editing, native stage/density/demand selection, traffic and full simulation remain incomplete. Art and tool improvements are not proof of full gameplay parity. Original saved model BAT rotations/zoom views, native wire/pole graphics and the wind effect also remain outstanding.
