# Neural networks

`neural` is a real TFJS dense-network lab inspired by TensorFlow Playground. It runs
in the browser, defaults to CPU, and uses no model server. The bundled recipe has
240 synthetic rows (192 train / 48 validation), Adam, deterministic seeds and
independent validation. It is not an auto-classifier/PyTorch model importer.

```js
const handle = Atelier.mount("neural", cell.view, {
  controls:cell.controls,
  config:{dataset:"xor",depth:2,width:4,activation:"tanh",learningRate:0.03,noise:0.08,seed:7},
  onSnapshot(snapshot) { /* update related outputs from real results */ }
});
await handle.ready;
await handle.api.step(20);
const bundle = handle.api.runtime.export();
```

Datasets: xor/circles/spiral; hidden activations: tanh/relu/sigmoid. For a different
network, use native TFJS from `Atelier.modules.neural.tf` and its actual data/model
APIs. `createNN`, `validateBundle`, `evaluate`, `makePoints` and `nnDefaults` are
also exposed. Dispose models/tensors when done; do not label a schematic as a live
activation or gradient unless it derives from the current weights.

Diagnostics: same family, mount `tfvis`, options `{renderer,data,options?}`. The real
tfjs-vis renderers include confusionMatrix, histogram, scatterplot, linechart,
heatmap, barchart and table. `modules.neural.tfvis` exposes its complete show/metrics
APIs. The default dense lab includes loss history and validation predictions. The preferred recipe uses the shared rich-table adapter for the 48 validation predictions; reuse it instead of hand-writing table markup. Neural/tfjs-vis adapters redraw on resize, including after training.

For CNN/transformer/large-model explanations use `external-viewers` or author native
TFJS operations from the workbench examples. The separate browser workbench has
local convolution and attention demonstrations; those are not standalone adapters
in this first release. The external viewer recipe offers TensorFlow Playground,
CNN Explainer, Transformer Explainer and Netron with explicit click-to-load and an
original-app link. Remote model downloads and embedding policies belong to those
apps. State whether an external viewer was actually exercised.
