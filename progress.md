Original prompt: can you reverse engineer D:\Games\SimCity.4.Deluxe.Edition.MULTi8-GoodOldGames so i can run it in a browser as a javascript/webgl game

User continuation: continue until full working game in browser; publish GitHub repository and Pages; keep updated with visible versions.

2026-11-23: Extracted GOG installer into workspace work/extracted/app. Implemented DBPF/QFS/FSH/S3D/exemplar/terrain readers, resource indexing server, browser folder import, original terrain renderer, original model explorer and provisional city sandbox. Version 0.1.0. Full-game objective remains active. See research/STATUS.md for limits and next milestones. Browser verification scripts and captures are in workspace work/; external reference repositories are also in work/. Do not publish original archives or installer.

2026-11-23: v0.2.0 added original saved buildings, SGProps, cohort inheritance, model variant labels, network vertices/UVs and lot base textures. Fixed terrain axes after saved buildings exposed a transposed layout in the older reference. Fulham verification resolves 530 buildings, 498 network tiles and 986 lot tiles. Original city view is separate from sandbox. Repo https://github.com/mysticalg/simcity4-web and Pages https://mysticalg.github.io/simcity4-web/ are configured with automatic deployment. Full original simulation remains absent.
