# Original terrain brush reconstruction — v0.12.0

## Source evidence

The supplied native executable remains local. Brush definitions are original exemplars in SimCity_1.dat group 6a01fc2a: ea33e2fd (MayorMountainHill), 0a33e37b (MayorValleyDefault), 4a524342 (MayorLevelBrush). BrushCost 8a020101 supplies §10 per application at all five zoom levels. Width/strength/base/operation use properties 8a020202–205 and 8a020302–305. Native property loading at 0x747f45 reads BrushCost; 0x74f4b9 walks component definitions with a 0x100 property stride.

The original 64×64 grayscale FSH masks (format 0x7b, group 891b0e1a) are in SimCity_2.dat. Raise uses 6a6c9dd4, width 60m, strength ~0.01, base 0, operation 0; plus e9860785, width 32m, operation 2 for smoothing. Lower uses e8f79138, width 48m, strength ~0.005, base 255, operation 0. Level uses 28f7a0e2, width 48m, strength 3, operation 5. Masks are decoded into map metadata; provenance and pixel hashes are in map-art.json. Original bundled payloads remain unchanged.

Native operation table 0x74db64 maps operations 0/2/5 to 0x745c60/0x745de0/0x745ba0. Operation 0 applies (sampled byte minus base) × effective strength. Operation 5 approaches its target without overshooting, capped by sampled byte × strength × 1/256. Constant 0xaa6e60 is exactly 0.00390625. Operation 2 transfers excess slope across eight neighbours. Initial cardinal slope threshold is 16 (0xa75080), diagonal 16×sqrt(2); 0x74e1f0 can update it from the active slope angle. Height setters 0x744af0/0x744ca0 clamp values and respect locked vertices. Native initialization at 0x74b712 loads height limits from TerrainProperties 48cd7b26/27: 2500m maximum, 20m minimum in the supplied configuration.

## Browser behavior

Raise, Lower and Level have terrain-following circular previews, widths, per-application prices and protected-land feedback. Clicking applies once; holding repeats every 150ms; dragging fills intervening tiles. Level retains the height sampled at stroke start. Escape stops applications. Existing structures/networks and shared city edges are protected. Unbuilt zones follow grading; natural scenery intersecting changed ground is cleared through persistent native edits.

The mesh updates heights, normals, raycast bounds and shoreline distances. Fixed sea-level water and beach/cliff art respond to edited geometry. Rendering is batched per frame. Version-7 snapshots preserve sparse absolute vertex edits; old saves remain readable. Terrain restores before construction. Clearing new construction also clears new map edits. Source archives stay unchanged.

## Verification and unfinished work

The native fixture check compares every mask pixel against the bundled FSH bytes, validates settings, and exercises non-mutating plans, raise/lower direction, capped leveling, protection, height limits and sparse restore/invalid-edit rejection. Browser coverage uses hover/hold/level strokes, a hill and submerged excavation, exact application charges, grading followed by road placement, new/original road protection, insufficient funds, clear/restore and full reload. Captures are visually inspected; console/shader errors must be absent. Existing map, lot, utility and finance checks cover surrounding systems.

Mask sampling, pointer-to-grid placement and 150ms cadence are reconstructed. Native time scaling, wiggle and scheduling are unverified. Smoothing uses the initial 45-degree threshold; exact native iteration and locked-neighbour behavior remain unverified. Occupied land is protected rather than reproducing native foundation/development changes. Automatic construction grading and cut/fill costs, neighbour-edge reconciliation, erosion/god-mode tools, effects/sounds, terrain undo and dynamic region thumbnails remain unfinished. Shared edges stay locked pending reconciliation. Full-game parity is not achieved.
