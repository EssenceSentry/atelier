# Luna authoring benchmark

The active benchmark emphasizes **visual composition and interactions**, following
the user's correction that domain computation is secondary. See the
[fresh variant trial](runs/2026-11-08-fresh-complex-ui/REPORT.md), the earlier
[complex UI iteration](runs/2026-11-08-complex-ui/REPORT.md), its
[three supplied-fixture tasks](complex-ui-tasks.json), and the complete
`complex-review`, `architecture-explorer` and `visual-methods` recipes.

For these UI tasks, acceptance requires every requested view and interaction,
consistent theme tokens/action hierarchy, readable figures, full-width prose and
left control rails, retained state, complete canvas navigation, and no errors,
unexpected network or page overflow across all themes and desktop/phone states.
Score visual composition and interactions; do not grade the author on inventing
domain calculations. First-attempt, author-repair and maintainer-repack results
must stay separate. Passing repaired examples is not a fresh blind trial.

For parallel agents, use the shared checker with an isolated output directory:
`node ~/Repos/atelier/packages/artifacts/scripts/check.mjs /tmp/trial/author/output.html --matrix --out=/tmp/trial/checks`.
It checks control geometry as well as render/overflow/network state. Do not copy
the checker without its helper modules. The fresh variant run preserved its older
checker snapshots; current checks and post-trial fixes are recorded separately.

The earlier benchmark and its original computation-oriented rubric follow below
for historical comparison.

Three independent `gpt-6-luna` agents at medium effort ran on 2026-11-08, after the user approved the count/model/effort. See the [recorded results](runs/2026-11-08-luna-medium/REPORT.md). The frozen release did not meet the full acceptance gate: testing exposed a trained-state resize bug in the shared neural adapters. The maintainer fix is recorded separately from the original trial.

For a future run, obtain approval for the agent count, model and effort first.

Give the model the installed `atelier-artifacts` skill and one task at a time from
[tasks.json](tasks.json), in a new empty output folder outside this repository.
Supply the source data named by that task. No conversation history or implementation
tour is necessary. The model may read recipes/references and run new/pack/check; it
may not edit the package/skill, install dependencies or compile a release.

Record first-pack success, repair count, elapsed time, token usage if available,
recipe/references read, total authored JS lines and generated artifact size. Save
the transcript, original attempt, final files and checker output. Do not overwrite
failed attempts. If the kit needs a fix, record it separately, then run a fresh
authorized trial; do not count a repaired kit as the original first-pass success.

Score each task out of 10:

- 2: generates and packs without repository creation, installs, compilation or kit edits.
- 2: correct source attribution, calculations/data wiring, and no invented backend/model.
- 2: all required interactions work, including export and stop/reset where applicable.
- 2: consistent three-theme layout at 1440 and 390px, full-width prose, controls left.
- 2: no browser errors, unexpected network, overflow or broken section/canvas navigation.

Acceptance: all three tasks score at least 9/10, no unsupported factual claims, no
unapproved service connection, and at most one local authoring repair per task.
Track first-pass scores separately even if final scores pass. The 2026-11-08 run did not meet this gate on its frozen release.

Use [results-template.json](results-template.json) for a new run. Preserve original attempts and score before fixing the kit. The analysis prompt was clarified after the first run to explicitly require its group filter to update both chart and table; the original prompt and assertions remain in the recorded results.

Ordinary UI uses shared adapters and automated contract checks. Manual screenshots are reserved for new/custom plots and diagrams with overlap risk. Include state transitions such as training followed by resizing in automated checks.
