# SimCity 4 browser reconstruction

Version **0.14.0** — an incomplete native JavaScript/WebGL reconstruction of SimCity 4 Deluxe.

**This does not yet run the full original game.** It starts with region selection, opens original city terrain/content, and supports experimental construction and simulation. New development uses original lot recipes, footprints, textures and static props, with density controls and population-based stage eligibility. Full demand, regional allocation and the wider simulation remain incomplete. The asset explorer has been removed.

## Run

- Hosted build: https://mysticalg.github.io/simcity4-web/
- Open the hosted build directly. Its current game assets are bundled; no folder selection or upload is required.
- Choose a region, select a city tile and click Enter city.
- Select a zoning tool and its density. Original R/C zoning prices are §10/20/50 per tile; higher stages need enough population and, above the native cap, water. Rezoning preserves existing buildings.
- View road traffic to inspect local car commuting. Road connections and congestion affect access to finite local job capacity; query homes and roads for details. Public transport and regional commuting remain unfinished.
- Click or hold Raise/Lower to edit terrain. Level keeps the height where you start the stroke. Each changed application costs §10; map edits save with your city.
- Region selection downloads the compressed index (approximately 4.65 MB) and thumbnail images. Opening Fulham adds one 3.7 MB asset pack; other city content loads on demand.
- The complete package is approximately 696 MB including region previews. Packs are integrity checked and fetched only when needed.
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
- Road, residential, commercial, industrial, power plant, power line, park and demolition tools.
- Original building models for new residential/commercial/industrial development and power facilities, with native capacity/consumption and facility footprint data.
- Native lane-path-based local car commuting, road volume overlay and household job-access queries. Source speeds/capacities/congestion and raw travel cutoff; allocation and demographic defaults remain reconstructed (research/TRAFFIC.md).
- Connected power circuits, transmission lines, isolated loads, capacity shortages and funding controls. Production, costs, two-tile radiation distance and the funding response curve come from the supplied game data; complete native distribution behavior remains unverified.
- Eight original power facility definitions, native placement/monthly/demolition costs and native difficulty starting funds.
- Reconstructed growth, budget, pause and month stepping. Growth rules and tax income remain provisional.
- Separate construction saves for each city, automatic checkpoints on month/return, and restored plant types, funding and camera.
- Visible version number; GitHub Actions publishes each main-branch update to Pages.

## Controls

Start by choosing a region and city. Left click/drag builds or queries. Right drag orbits; middle drag pans; wheel zooms. Space pauses/resumes. F toggles fullscreen. Return to region selects another city. “Build starter district” under New construction creates a generated district on a flat dry area of the original terrain.

## Remaining work

See [research/STATUS.md](research/STATUS.md). Animated scenery/effects, exact flora states, lot composition, complete networks, traffic, water, native demand/growth, desirability, pollution, full finance, education, health, services, disasters, regional simulation, advisors, missions, original interface and audio are incomplete or absent. The windmill effect is not yet rendered; its native base model and power behavior are present. The current simulation handles new construction; original saved city behavior is not yet ported. Browser construction saves are a separate format.

The repository now includes browser packs built from the supplied copy's supported resources and saved cities, at the user's request. It does not contain the executable or installer. Original game content is not covered by the code's MIT license; see [THIRD_PARTY.md](THIRD_PARTY.md).

Night lighting: select **Lighting → Night · window lights** in a city. Original transparent night overlays illuminate individual windows and fixtures. Day/Night choice is remembered. Physical light spill and native power-based lighting are still pending.

Water: build a powered water tower or pump, lay pipes, and choose **View water network** to inspect coverage. Water supply, funding and pipes are saved with your city. Original saved pipes and building utility supply/demand now participate in the live graphs. Neighbor utility deals and full native utility simulation remain unfinished.

City budget now imports original developed-city funds, assessments, tax rates and expenses. Open **City budget** to inspect the forecast or change taxes. Live native valuation and tax effects on demand are still in progress.

Map tools: drag roads/pipes continuously; drag a rectangle to zone. The outline shows footprint, cost and blocked placement. Escape cancels zoning. Original terrain and road textures are included.
