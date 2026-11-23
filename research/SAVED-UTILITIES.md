# Saved-city utility integration — v0.8.0

The source is the supplied original saves and exemplar/cohort bank. All saved resource payloads were already bundled; only manifest subfile metadata changed. Native record structures were compared with the MIT sc4 reference (pipe.ts) and cpp-classes.ts; provenance is in THIRD_PARTY.md.

## Pipe evidence

Type 49c05b9f contains 1,483 pipe records across six saves. All are major/minor 3.3. The parser reads variable SGProps, original TGI, matrix, position, four vertices/UVs, texture, orientation, connector fields and the coordinate/height tail. Each record's x/z tile agrees with the minimum vertex x/z divided by 16. tools/audit-pipes.mjs reproduces the full bundled audit; research/pipe-audit.json records counts. Malformed/truncated layouts are rejected rather than guessed.

Pipes are separate underground occupants. Their original IDs (pipe:byteOffset) participate in the native edit set. Removing a native pipe charges the original pipe demolition tuning and hides only that pipe, preserving roads, buildings and lots. Resetting new construction does not undo native edits; restoring saved edits reconstructs the native pipe state. Adjacent native pipes require nonzero matching connector directions; adding a new pipe updates its junction with an adjacent native pipe. This interpretation of connector values still needs executable differential verification. New and native pipes feed the same water graph.

## Power evidence

Type c9c05c5d contains 265 power-line tile occupants across six supplied saves. All inspected records are 85 bytes, version 2.4, with zero SGProps. Position at offsets 48/52/56 agrees with tile coordinates at 60/64 plus the half-tile center. Both endpoint references (offsets 69 and 77) point to type 09c05c6a, cSC4PowerPoleOccupant. Saved line tiles sharing an endpoint are joined in the power graph. All records are validated by tools/test-saved-utilities.mjs. Other record layouts are rejected explicitly.

Original lots and original buildings now contribute their footprint, exemplar generation, power consumption and water consumption/production. Native edits remove their graph nodes. Original source powered/watered flags remain available in parsed lot records for comparison, but Query reports the current graph states. Original power-line graphics, pole models and direct line editing are still pending; parsing and topology do not prove visual fidelity.

## Fulham fixture and browser verification

The original save has 153 pipes, 661 lots and 530 building records. Its 6000-capacity coal plant and fire station's native PowerGenerated=1 total 6001. Building exemplar power consumption totals 3052, with 529 consuming lots connected to supply; water consumption totals 7664. No local WaterProduced building occurs in this save. The cached watered flags therefore do not establish a local source; neighbor deals and plumbing simulator state still need decoding.

Browser checks verify the starting counts, building a 20000-output pump alongside an existing pipe without replacing any pipe, serving more than 100 original consumers, native pipe demolition under the surface, preservation of surface lot/road counts, persistence on leaving/re-entering, and removing the actual saved coal plant stopping the new pump. Source data is not modified. Existing new-construction power/water and region/edit tests continue to pass.

## Remaining fidelity work

Power/water graphs and shortage allocation are reconstructed. Native power-grid/neighbor deal imports, exact connector semantics/radius metric, saved occupancy utility modifiers, source availability, decay, pollution, pipe bursts and finance integration need native differential fixtures. Existing utility budgets/taxes are not ported: only new-construction upkeep remains charged in the provisional financial loop. Native wire visuals/editing and original time-dependent light states are not implemented. This release does not establish full simulation parity.
