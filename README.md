# SimCity 4 browser reconstruction

Version **0.4.0** — an incomplete native JavaScript/WebGL reconstruction of SimCity 4 Deluxe.

**This does not yet run the full original game.** It starts with region selection, opens original city terrain/content, and supports experimental construction and simulation. Simulation rules and new construction buildings remain provisional implementations, not a verified translation of the original engine. The asset explorer has been removed.

## Run

- Hosted build: https://mysticalg.github.io/simcity4-web/
- Open the hosted build directly. Its current game assets are bundled; no folder selection or upload is required.
- Choose a region, select a city tile and click Enter city.
- Region selection downloads the compressed index (approximately 1.9 MB) and thumbnail images. Opening Fulham adds one 3.7 MB asset pack; other city content loads on demand.
- The complete package is approximately 694 MB including region previews. Packs are integrity checked and fetched only when needed.
- Optional local data import is available with `?import` in the URL. Files selected there are read locally.

For local use, run `node server.mjs` with Node.js 22 or newer. It defaults to the extracted game data in this workspace. On another machine, set `SC4_DATA` to the installed game directory. Alternatively run `Launch.ps1 -GameData 'D:\path\to\SimCity 4 Deluxe'`.

All browser dependencies needed by the static page are vendored; no npm installation is needed just to serve the page. The local server binds to `127.0.0.1:4174`.

## Working features

- DBPF 1.0 archive index and resource access, RefPack/QFS decompression.
- Original `.sc4` terrain height fields at 64, 128 and 256 tile sizes.
- Region selection using all six original regions, 417 city layouts, original thumbnails and saved population/jobs metadata.
- Original saved buildings, cohort inheritance, network vertices/UVs and lot textures load when entering populated cities.
- Original static props and flora, with instanced models and merged ground geometry. Animated scenery is incomplete.
- S3D vertex/index/primitive/material/first-animation-frame parsing.
- FSH DXT1/DXT3/DXT5 and several uncompressed texture formats.
- Native WebGL terrain and model rendering using Three.js.
- Experimental road, residential, commercial, industrial, power, park and demolition tools.
- Experimental growth, budget, pause, month step, browser sandbox saves and restore.
- Visible version number; GitHub Actions publishes each main-branch update to Pages.

## Controls

Start by choosing a region and city. Left click/drag builds or queries. Right drag orbits; middle drag pans; wheel zooms. Space pauses/resumes. F toggles fullscreen. Return to region selects another city. “Build starter district” under New construction creates a generated district on a flat dry area of the original terrain.

## Remaining work

See [research/STATUS.md](research/STATUS.md). Animated scenery, exact flora states, lot overlays, complete networks, traffic, utilities, growth, desirability, pollution, finance, education, health, services, disasters, regional simulation, advisors, missions, original interface and audio are incomplete or absent. The current simulation handles new construction; original saved city behavior is not yet ported. Browser construction saves are a separate format.

The repository now includes browser packs built from the supplied copy's supported resources and saved cities, at the user's request. It does not contain the executable or installer. Original game content is not covered by the code's MIT license; see [THIRD_PARTY.md](THIRD_PARTY.md).
