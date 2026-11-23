# SimCity 4 browser reconstruction

Version **0.1.0** — an incomplete native JavaScript/WebGL reconstruction of SimCity 4 Deluxe.

**This does not yet run the full original game.** It currently provides original terrain rendering, an S3D/FSH asset explorer, and an experimental city sandbox. Simulation rules and sandbox buildings are new provisional implementations, not a verified translation of the original engine.

## Run

- Hosted build: https://mysticalg.github.io/simcity4-web/
- Select your own installed/extracted game folder, including `Regions`. The browser reads selected files locally; game files are not uploaded.
- GOG installer executables must be extracted or installed first.
- Chrome or Edge desktop is recommended for the directory picker and WebGL.

For local use, run `node server.mjs` with Node.js 22 or newer. It defaults to the extracted game data in this workspace. On another machine, set `SC4_DATA` to the installed game directory. Alternatively run `Launch.ps1 -GameData 'D:\path\to\SimCity 4 Deluxe'`.

All browser dependencies needed by the static page are vendored; no npm installation is needed just to serve the page. The local server binds to `127.0.0.1:4174`.

## Working features

- DBPF 1.0 archive index and resource access, RefPack/QFS decompression.
- Original `.sc4` terrain height fields at 64, 128 and 256 tile sizes.
- S3D vertex/index/primitive/material/first-animation-frame parsing.
- FSH DXT1/DXT3/DXT5 and several uncompressed texture formats.
- Original resource search by model name or TGI; material texture resolution.
- Native WebGL terrain and model rendering using Three.js.
- Experimental road, residential, commercial, industrial, power, park and demolition tools.
- Experimental growth, budget, pause, month step, browser sandbox saves and restore.
- Visible version number; GitHub Actions publishes each main-branch update to Pages.

## Controls

Left click/drag builds or inspects. Right drag orbits; middle drag pans; wheel zooms. Space pauses/resumes. F toggles fullscreen. “Build demo district” creates a generated sandbox district on a flat dry area of the original terrain.

## Remaining work

See [research/STATUS.md](research/STATUS.md). Original city objects, lots, networks, traffic, utilities, growth, desirability, pollution, finance, education, health, services, disasters, regions, advisors, missions, original interface and audio are incomplete or absent. Existing saves currently contribute terrain, not the original working city. Browser sandbox saves are a separate format.

The repository contains code and format research only. It does not include the commercial game's executable, installer, data archives, textures, music or sounds. See [THIRD_PARTY.md](THIRD_PARTY.md).
