# Power reconstruction evidence

The values are read from the supplied original resources, not embedded as a replacement data set in the simulation implementation.

- Utilities: `6534284a-e7e2c2db-c911e35b`; radiation radius property `a911e2f1` is 2, funding curve `6911e2df` maps 0→0, 50→25, 90→80, 100→100, 120→110 percent output.
- Wind: `6534284a-c8dbccba-1f450000`; production 200, placement 500, monthly cost 50; lot footprint 2×1.
- Coal: `6534284a-c8dbccba-1f4d0000`; production 6000, placement 10000, monthly cost 250; lot footprint 4×4.
- Budget: `6534284a-e7e2c2db-0bff6824`; difficulty starting funds 500000, 200000, 100000.
- Traffic: `6534284a-e7e2c2db-c9133286`; road upkeep 0.1 per tile/month.
- CapacitySatisfied entries for different wealth tiers are alternative capacities; they are not summed. New growth currently uses low-wealth residential/commercial and dirty industry candidates. Density, education, water, desirability and native developer selection are not yet reproduced.

Static inspection of the supplied 32-bit executable locates the radius property read at VA `0x6ed55b` into utility object offset `+0x2b0`. The helper routines near `0x6ead70` and `0x6eae20` expand grid coordinates/rectangles by this radius and clamp to zero and the grid dimension minus one. `radiationBounds` expresses that bounded rectangle operation. This does not prove the complete native distribution algorithm.

The circuit graph in power.mjs is reconstructed. It joins building/zone footprints through their radiation reach and cardinal transmission-line connections. Generation/demand totals and funding use native resource values. Capacity shortage is represented as proportional circuit supply and stops new growth. Native allocation order, aging, wear, neighbor deals, power simulator cadence, strikes and outages require further reverse engineering and differential tests.

Power line placement currently creates one wire/pole cell at a time and charges the original wire and pole component prices. Original automatic pole spacing and exact construction billing are not reproduced. Wind's rotor/tower is a separate native windmill effect and is still absent; the original static base is rendered. Other effects and detailed lot composition remain incomplete.

`npm test` checks native data values, bounded radiation, disconnected/connected loads, line interruption, overload and funding interpolation. Browser checks exercise facility footprints/costs, growth before/after connection, demolition, funding, native model loading and save/restore. These tests verify the implemented model; they do not establish full native game parity.
