# Finance reconstruction — v0.9.0

## Native evidence

Original executable SHA-256: 3bc5c7fe807fe5aa24a3abb06e40f13486670bc1150612c09baf4ecedafe1a4b. Executable code was inspected locally; no executable is published. Binary save resources were already bundled, and only metadata needed enrichment.

- Budget simulator type E990BE01, serializer VA 00690530 and loader VA 00694B00. Supported versions 4/5 have the same decoded prefix: record size/CRC/memory/version; four signed 64-bit values; department reference count and triples; twelve 128-byte tax records. The first signed value is treasury. Its object field (base+0x28, interface+0x20) is modified by the native spending routine at 00690200 and set by 00690140.
- Each tax record has two floats, twelve signed 64-bit history values, one accumulator, an assessed-value integer and a cached monthly tax integer. Auxiliary time/history fields are preserved with neutral names rather than assigned unverified semantics. The tail (including loan/history/category structures) is not fully decoded.
- Native tax getter 006904C0 multiplies assessed value by the difficulty multiplier, tax rate and float32 constant 1/1200 at 00AB08B8, then truncates through the native integer conversion helper. Whole-city calculation at 00691E50–00692109 accumulates unrounded values before truncation; summing rounded cohort rows is not equivalent. Cached assessment totals are retained as a baseline, including the small cached whole-city versus aggregate assessment rounding difference.
- Tax cohort lookup table at 00AB0840 resolves to R$/R$$/R$$$, CS$/CS$$/CS$$$, CO$$/CO$$$, agriculture, dirty industry, manufacturing and high-tech. The table contains purpose/wealth-to-index entries, not a generic population wage formula.
- Budget exemplar 6534284a-e7e2c2db-0bff6824 supplies initial tax rates, maximum rate 25%, difficulty multipliers [1.2,1.1,1], and starting funds. Existing cities' multiplier is inferred only when exactly one source multiplier reproduces every nonzero cached cohort tax. All eight supplied cities with nonzero taxes match uniquely. New-city difficulty uses the selected setting.
- Department type E990BFFC versions 9/10. Loader 006AC1D0 explicitly converts version-9 funding percentages to ratios; version 10 already stores ratios. Parsed fields include IDs, names, category, funding, maximum funding, accumulator, line pointers and building references.
- Line-item type AA313C9F version 4. Serializer 006A9AA0 confirms four signed 64-bit fields after the name: the first field's meaning is unverified (the MIT reference interprets its low/high halves as two integers); cost, expense and revenue are used here. Source line-item getters at 006B9850, 006AAEF0 and 006AAF00 expose the latter fields. Department expense getter 006A9F60 sums the referenced line-item expenses. This avoids counting every serialized line item and its parent twice.

Native reference structures department-budget.ts and line-item.ts are in the MIT sc4 reference; the executable disassembly refines their incomplete field names. See THIRD_PARTY.md for attribution.

## Source audit

tools/audit-finance.mjs parses budget, departments and line items across all 417 supplied saves; research/finance-audit.json records values. No supplied budget has debt in the decoded debt field. This is parser coverage, not native-game financial parity.

Fulham: treasury 21148; two nonzero assessed tax bases (dirty industry 138613, manufacturing 36163) at 9%; cached whole-city tax 1310. Eighteen departments reference 25 serialized line items; their current expenses total 1087, including sanitation 571, power 250, water pipes 15, roads/streets 77 and fire 174. Fire funding is native float32 0.7. The saved category snapshot elsewhere in the budget contains fire 175; the actual department getter uses line expense 174. Current forecast is therefore +223, not a fabricated income based on new residents.

## Implemented behavior

Developed cities begin with their original treasury, tax rates, inferred source difficulty multiplier and utility funding. Untouched templates with no buildings, no saved income/expenses and a standard initial treasury use the selected new-city difficulty/funds. Their one seeded network tile does not make them a developed city. Existing browser saves retain their saved treasury instead of being silently reset to the original.

The monthly ledger replaces the former population/jobs income shortcut. It includes existing saved tax assessments, department expenses and serialized revenue. New growables add their original BuildingValue to the active tax cohort. Native lot demolition subtracts building exemplar value and upkeep from the cached baseline; native building upkeep, pipe/line costs and network costs adjust existing department baselines without replacing the saved city with a newly estimated budget. New facilities use original budget department/cost properties. Pipe, power-line and road maintenance use original tuning and aggregate integer charges. Parks remain the existing provisional park object/upkeep.

City budget displays income, expenses and current forecast; twelve tax rate inputs permit 0–25%. Utility funding changes existing and new utility costs and capacity. Version-5 construction snapshots retain tax rates/multiplier/difficulty as well as earlier construction, utility, native edit and camera data. Older snapshot versions remain supported. Source budget data is immutable.

## Limits and next work

This is not full native financial parity. Saved assessments are cached, and complete live assessment recomputation is still unported. Fulham's visible dirty-industry exemplar values sum to 149403, while its saved assessed value is 138613; manufacturing matches 36163. The native assessment routine includes active-state, land-value/area, wealth decay and occupant weighting paths; not all prerequisite lot state is decoded. Cached-baseline demolition deltas therefore need native differential validation.

Native bond schedules, neighbor deal income/expense, dynamic fares, ordinances/business deals, exact age/failure cost modifiers and all service funding behavior are unfinished. Tax rates currently change revenue; native tax-to-demand effects are not integrated with the provisional growth loop. The UI states this limitation. Time is still elapsed browser months rather than the original saved calendar. Native executable rounding paths are researched, but no native-game multi-month comparison has yet established full parity.

Validation includes source record parsing; exact Fulham treasury/cohort expenses, tax/funding edits, aggregate rounding, malformed records and demolition-cost deltas; browser monthly credit/debit, tax edits, existing utility funding, city return/persistence and the existing power/water/region/native-edit regressions. Screenshots were inspected. The full-game objective remains active.
