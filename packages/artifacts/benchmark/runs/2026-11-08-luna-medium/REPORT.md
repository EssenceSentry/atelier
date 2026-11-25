# Luna at medium: first authoring trial

Three independent `gpt-6-luna` agents ran at medium effort on 2026-11-08, one per task. They received the skill, public recipes/references and their task/data, without conversation history or other agents' work. The user explicitly approved three agents at these settings.

All three produced HTML on their first packing attempt. None created a repository, installed dependencies, compiled the kit or changed shared code. The release and authoring inputs remained unchanged during the trials: the post-trial fingerprint checked 117 files with no differences. Per-agent token counts and full tool-turn transcripts were unavailable from the native collaboration interface; prompts, author reports, source/packing archives and independent evaluation evidence were retained.

| Task | Packing attempts | Author repairs | Authored JS lines, final | HTML size | Frozen first → final score |
|---|---:|---:|---:|---:|---:|
| Observation review | 1 | 0 | 87 | 8.23 MB | 9 → 9 / 10* |
| Bayesian explanation | 2 | 1 | 104 | 10.98 MB | 9 → 10 / 10 |
| XOR + SQL lab | 1 | 0 | 95 | 6.19 MB, plus DuckDB assets | 8 → 8 / 10 |

Elapsed time from common run preparation to report submission was approximately 3m22s, 5m36s and 4m10s respectively. These are concurrent wall-clock observations, including setup/verification, not isolated model latency measurements.

The agents' fresh-load checks passed 48 theme/mode/viewport cases: 12 for each first attempt, plus 12 after the Bayesian repair. Independent behavioral checks passed 37 of 39 checks. The frozen release **did not meet the predeclared acceptance gate**, because the neural task scored below 9/10 on a shared adapter defect. A later maintainer fix does not change that result.

## Findings

1. **Observation review: filter-scope ambiguity.** The generated group control filters the scatter correctly, while the table retains four rows. The intended benchmark assertion required both views to filter. However, the original task prose said “a scatter with a group filter” without explicitly requiring the table to follow it. The provisional 9/10 reflects that intended assertion; it is not evidence that Luna cannot implement linked filtering. The prompt has since been clarified. The original prompt is preserved in `task.json` and `tasks-with-assertions.json`.

   Initial sorting, four supplied records, decision editing, the actual downloaded decision JSON, selected-row JSON inspection, navigation, attribution and layout all passed independently. The edited decision was present in the export.

2. **Bayesian explanation: one self-directed theme repair.** Its first artifact used two literal series colors and a literal grid color. The agent replaced them with shared defaults in its second attempt. Both versions rendered. Independent checks verified Beta(16,8), Beta(2,22) and Beta(22,2), numerical density integrals/means/modes, synchronized prose/cards/sequence, dragging, zoom, and both independent canvas tabs with the current state.

   The existing template color checker scans TS/TSX/CSS and missed plain JS. This made the first theme deviation invisible to that checker.

3. **Neural lab: shared adapter resize defect.** Training, all 48 validation predictions, the live confusion matrix, SQL's 4 records / 3 correct / 75%, weight export/validation/reload, and tensor disposal passed independently. After training at desktop width, switching to 390px left fixed-width tfjs-vis charts and expanded the page to 713px. Fresh-load phone screenshots did not reveal this state-dependent defect. Responsibility belongs to the kit, not Luna's task code.

The score rubric awards two points each for workflow, evidence/data, interactions, consistent UI, and runtime/navigation. The review loses one interaction point under the intended filter interpretation. The first Bayesian attempt loses one theme point. The neural task loses one UI and one runtime/overflow point for the resize defect. See `run.json` for the category scores.

## Maintainer follow-up, separate from the trial

- Neural and standalone tfjs-vis adapters redraw on resize; detached chart views are finalized.
- A packing preflight now checks author JS/custom CSS for literal color formats and palette classes. It rejects the Bayesian first-attempt overrides before producing HTML. Intentional content/brand colors retain an explicit scoped exemption.
- The neural recipe includes a shared rich-table view for validation predictions, reducing the need for custom table markup.
- Normal UI uses shared layout/theme/control/table contracts and automated checks. Screenshot capture is optional (`--screenshots`) for new/custom plots and diagrams with overlap risk.
- The analysis prompt and authoring guidance now state linked-filter scope explicitly.

Luna's original neural JavaScript was repacked **without author-source changes** against the repaired adapters. After 20 epochs, desktop → phone → desktop → phone transitions stayed at 390/1440/390px with 48 validation rows and epoch 20 retained. Cleanup returned zero tensors and zero mounted widgets, with no browser errors. This was a maintainer verification, **not another Luna trial**. Shared regression checks passed, including this state transition, and 33 packaging/recipe checks passed.

## Evidence and limits

- `run.json`: settings, release fingerprint, timings, scores and artifact hashes.
- `independent-results.json`: frozen-release behavioral observations, including the two failures; `evaluator.mjs.txt` preserves the evaluator as run.
- `theme-source-audit.json`: first/final literal-color findings.
- Each task folder preserves its prompt, agent report, packing records, fresh-load results, and exact authored source as `.txt` files. They are not reformatted or silently repaired.
- `maintainer-repack.json` / `maintainer-verification.json`: unchanged-author-source verification after the library fix.

The evaluator initially compared Markdown width to a padded parent and coerced an Arrow 128-bit value after browser serialization; those were evaluator defects, corrected before scoring. The SQL table itself displayed 3 correctly. The frozen results above use the corrected evaluator.

Compiled original attempts and the maintainer repack are preserved under:

`~/.codex/visualizations/2026/11/08/01a1bb8c-04be-78e0-9319-bbe2ea94d729/luna-benchmark/`

Three curated tasks, one agent per task, cannot establish reliability for arbitrary artifacts or compare model quality/cost. The updated workflow has not received a fresh Luna trial. No additional agents were launched after the approved three.
