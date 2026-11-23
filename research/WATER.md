# Water reconstruction evidence

Original supplied SimCity_1.dat / EP1.dat binary exemplars and inherited cohorts are the parameter source. compileGameData resolves them and tools/enrich-game-data.mjs updates bundled metadata. Existing resource packs already contain the three native water models and textures; no new asset upload is required.

| Definition | TGI | Output | Placement | Monthly | Power demand |
|---|---|---:|---:|---:|---:|
| Water tower | 6534284a-c8dbccba-1f4a0000 | 2400 | 150 | 50 | 1 |
| Pump | 6534284a-c8dbccba-1f490000 | 20000 | 1400 | 350 | 3 |
| Large pump | 6534284a-c8dbccba-03870000 | 200000 | 15400 | 3150 | 33 |

Relevant building properties: WaterProduced=88ed3303, WaterSource=48f23a7e, PowerConsumed=27812854, WaterConsumed=c8ed2d84, PlopCost=49cac341, BudgetItemCost=ea54d286, BulldozeCost=099afacd. Source type is 2 for these three facilities. Footprints come from their LotResourceKey/lot definitions.

Utilities exemplar 6534284a-e7e2c2db-c911e35b contains WaterPipeEffectRadius (68f5436a)=7; MonthlyCostPerPipe (8a84778f)=0.10000000149; WaterFundingToEfficiencyCurve (6a410bf2)=[0,0,50,30,90,80,100,100,120,110]. Pipe placement tuning 6534284a-084344e0-095117db has SimoleanCostPerTile (4a2d49b9)=5 and SimoleanCostPerTileToDemolish (ea86e3b5)=1. The menu exemplar for Pipes instead advertises PlopCost 9; actual network tuning is used here. Native-game cost comparison is still needed to prove all construction modifiers.

The current graph joins cardinally adjacent pipe/source footprint tiles. Consumers do not conduct water or bridge disconnected pipes. Coverage expands each carrier footprint by seven tiles in a square. Overlapping catchments stay separate and a consumer is assigned once to a reachable circuit; proportional shortages and this assignment policy are reconstructed, not verified executable parity. Power supply and water funding determine new pump output. New buildings contribute their exemplar consumption. Source tiles supply their own radius without requiring a separate pipe on that tile.

Water view is an explicit diagram of the underground network projected onto terrain. Original surface structures are hidden in that view and preserved in state; cyan and gray instanced geometry distinguishes active and disconnected pipes, and blue coverage indicates a fully supplied circuit. This diagram is not the original pipe mesh rendering. Surface mode renders original water facility models. Pipe placement/removal has separate occupancy and costs and can cross surface roads/buildings.

Snapshots version 4 add pipes, water funding and chosen facility; versions 1–3 still load. As of v0.8.0 native saved-city water networks are imported; see SAVED-UTILITIES.md. Native pollution, pumping-distance/source availability, wear, bursts, neighbor deals, density/wealth growth requirements and shortage allocation are not reproduced. WaterSupplyCap=87cd6370 in the developer exemplars should be integrated together with native lot stage/density selection; the existing capacity-based three growth bands cannot honestly be treated as native stages.

Validation: tools/test-water.mjs checks source parameters, connection cuts despite overlapping coverage, unpowered supply, capacity shortage, radius boundary, and single demand allocation across overlapping catchments. Browser work/verify-water.mjs exercises power-dependent pumping, pipes beneath roads, cut/reconnect, 50% funding (720 tower output), surface/native models, save/restore and page reload with no console errors. Power, imported-city edits and region flow are regression checked. These checks do not establish full-game or native utility parity.
