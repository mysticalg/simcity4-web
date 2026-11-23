# Changelog

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
