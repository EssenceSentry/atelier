import * as tf from "@tensorflow/tfjs"

export type NNConfig = {
  dataset: "xor" | "circles" | "spiral"
  depth: number
  width: number
  activation: "tanh" | "relu" | "sigmoid"
  learningRate: number
  noise: number
  seed: number
}
export const nnDefaults: NNConfig = {
  dataset: "xor",
  depth: 2,
  width: 4,
  activation: "tanh",
  learningRate: 0.03,
  noise: 0.08,
  seed: 7,
}
export type NNPoint = { x: number; y: number; label: number; split: "train" | "validation" }
export type NNEpoch = { epoch: number; loss: number; val_loss: number }
export type NNLayer = {
  name: string
  input: number
  output: number
  weights: number[][]
  biases: number[]
}
export type NNSnapshot = {
  epoch: number
  points: NNPoint[]
  probabilities: number[]
  layers: NNLayer[]
  field: number[][]
  activations: number[][]
  gradients: { name: string; norm: number }[]
  history: NNEpoch[]
  params: number
}
export type NNBundle = {
  format: "atelier-neural-study-v1"
  config: NNConfig
  epoch: number
  history: NNEpoch[]
  layers: NNLayer[]
}
export function random(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0
    return value / 4294967296
  }
}
export function makePoints(config: NNConfig): NNPoint[] {
  const next = random(config.seed)
  return Array.from({ length: 240 }, (_, index) => {
    let x = next() * 2 - 1,
      y = next() * 2 - 1,
      label = 0
    if (config.dataset === "xor") label = +(x * y > 0)
    else if (config.dataset === "circles") {
      label = index % 2
      const angle = next() * Math.PI * 2
      const radius = (label ? 0.72 : 0.3) + (next() - 0.5) * 0.16
      x = Math.cos(angle) * radius
      y = Math.sin(angle) * radius
    } else {
      label = index % 2
      const radius = 0.1 + 0.8 * next()
      const angle = radius * 5 + label * Math.PI
      x = Math.cos(angle) * radius
      y = Math.sin(angle) * radius
    }
    x = Math.max(-1, Math.min(1, x + (next() - 0.5) * config.noise))
    y = Math.max(-1, Math.min(1, y + (next() - 0.5) * config.noise))
    return { x, y, label, split: index % 5 === 0 ? "validation" : "train" }
  })
}

export function createNN(config: NNConfig, bundle?: NNBundle) {
  const points = makePoints(config)
  const model = tf.sequential()
  const widths = [...Array.from({ length: config.depth }, () => config.width), 1]
  widths.forEach((units, index) => {
    model.add(
      tf.layers.dense({
        units,
        ...(index === 0 ? { inputShape: [2] } : {}),
        activation: index === widths.length - 1 ? "sigmoid" : config.activation,
        kernelInitializer: tf.initializers.glorotUniform({ seed: config.seed + index }),
        biasInitializer: "zeros",
        name: index === widths.length - 1 ? "probability" : `hidden_${index + 1}`,
      })
    )
  })
  if (bundle) {
    const weights = bundle.layers.flatMap((layer) => [
      tf.tensor2d(layer.weights),
      tf.tensor1d(layer.biases),
    ])
    try {
      model.setWeights(weights)
    } finally {
      tf.dispose(weights)
    }
  }
  const optimizer = tf.train.adam(config.learningRate)
  model.compile({ optimizer, loss: "binaryCrossentropy" })
  const training = points.filter((point) => point.split === "train")
  const validation = points.filter((point) => point.split === "validation")
  const xs = tf.tensor2d(training.map((p) => [p.x, p.y]))
  const ys = tf.tensor2d(training.map((p) => [p.label]))
  const vx = tf.tensor2d(validation.map((p) => [p.x, p.y]))
  const vy = tf.tensor2d(validation.map((p) => [p.label]))
  const probe = tf.model({
    inputs: model.inputs,
    outputs: model.layers.map((layer) => layer.output as tf.SymbolicTensor),
  })
  let epoch = bundle?.epoch ?? 0
  const history: NNEpoch[] = bundle ? [...bundle.history] : []
  let disposed = false
  return {
    model,
    points,
    async step() {
      const result = await model.fit(xs, ys, {
        epochs: 1,
        batchSize: 24,
        shuffle: false,
        validationData: [vx, vy],
        verbose: 0,
      })
      epoch++
      history.push({
        epoch,
        loss: Number(result.history.loss[0]),
        val_loss: Number(result.history.val_loss[0]),
      })
      if (!Number.isFinite(history.at(-1)?.loss))
        throw new Error("Training became non-finite. Reset with a lower learning rate.")
    },
    snapshot(): NNSnapshot {
      return tf.tidy(() => {
        const all = tf.tensor2d(points.map((p) => [p.x, p.y]))
        const probabilities = Array.from((model.predict(all) as tf.Tensor).dataSync())
        const activations = (probe.predict(all) as tf.Tensor[]).map((value) =>
          Array.from(value.dataSync())
        )
        const grid = Array.from({ length: 28 * 28 }, (_, i) => [
          ((i % 28) / 27) * 2 - 1,
          (Math.floor(i / 28) / 27) * 2 - 1,
        ])
        const fields = (probe.predict(tf.tensor2d(grid)) as tf.Tensor[]).map((value) =>
          Array.from(value.dataSync())
        )
        const layers = model.layers.map((layer, index) => {
          const [kernel, bias] = layer.getWeights()
          return {
            name: layer.name,
            input: kernel.shape[0],
            output: widths[index],
            weights: kernel.arraySync() as number[][],
            biases: Array.from(bias.dataSync()),
          }
        })
        const variables = model.trainableWeights.map((weight) => weight.read() as tf.Variable)
        const { grads } = tf.variableGrads(() => {
          const prediction = model.apply(xs) as tf.Tensor
          return tf.losses.logLoss(ys, prediction).mean()
        }, variables)
        const gradients = variables.map((variable) => ({
          name: variable.name,
          norm: Math.sqrt(
            Array.from(grads[variable.name].dataSync()).reduce(
              (sum, value) => sum + value * value,
              0
            )
          ),
        }))
        return {
          epoch,
          points,
          probabilities,
          layers,
          field: fields,
          activations,
          gradients,
          history: [...history],
          params: model.countParams(),
        }
      })
    },
    export(): NNBundle {
      return {
        format: "atelier-neural-study-v1",
        config,
        epoch,
        history: [...history],
        layers: this.snapshot().layers,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      tf.dispose([xs, ys, vx, vy])
      // The inspection container shares layers; dispose through the trained model once.
      model.dispose()
      optimizer.dispose()
    },
  }
}
export type NNRuntime = ReturnType<typeof createNN>

export function validateBundle(value: unknown): NNBundle {
  if (!value || typeof value !== "object")
    throw new Error("Choose an exported neural study JSON file.")
  const bundle = value as NNBundle,
    config = bundle.config
  if (
    bundle.format !== "atelier-neural-study-v1" ||
    !config ||
    !["xor", "circles", "spiral"].includes(config.dataset) ||
    !["tanh", "relu", "sigmoid"].includes(config.activation) ||
    !Number.isInteger(config.depth) ||
    config.depth < 1 ||
    config.depth > 3 ||
    !Number.isInteger(config.width) ||
    config.width < 2 ||
    config.width > 8 ||
    !Number.isFinite(config.learningRate) ||
    config.learningRate < 0.001 ||
    config.learningRate > 0.1 ||
    !Number.isFinite(config.noise) ||
    config.noise < 0 ||
    config.noise > 0.5 ||
    !Number.isInteger(config.seed) ||
    config.seed < 0 ||
    config.seed > 1000000 ||
    !Number.isInteger(bundle.epoch) ||
    bundle.epoch < 0 ||
    bundle.epoch > 1000 ||
    !Array.isArray(bundle.layers) ||
    bundle.layers.length !== config.depth + 1 ||
    !Array.isArray(bundle.history) ||
    bundle.history.length !== bundle.epoch
  )
    throw new Error(
      "This file is not a supported neural study. Use the Export study button to create one."
    )
  bundle.layers.forEach((layer, index) => {
    const input = index === 0 ? 2 : config.width,
      output = index === config.depth ? 1 : config.width
    if (
      !Array.isArray(layer.weights) ||
      layer.weights.length !== input ||
      !layer.weights.every(
        (row) => Array.isArray(row) && row.length === output && row.every(Number.isFinite)
      ) ||
      !Array.isArray(layer.biases) ||
      layer.biases.length !== output ||
      !layer.biases.every(Number.isFinite)
    )
      throw new Error("The weight dimensions or values do not match this network.")
  })
  if (
    !bundle.history.every(
      (row, index) =>
        row.epoch === index + 1 && Number.isFinite(row.loss) && Number.isFinite(row.val_loss)
    )
  )
    throw new Error("Training history contains invalid values.")
  return bundle
}

export function evaluate(snapshot: NNSnapshot, threshold: number) {
  const points = snapshot.points
    .map((point, i) => ({ ...point, probability: snapshot.probabilities[i] }))
    .filter((p) => p.split === "validation")
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0
  for (const p of points) {
    if (p.probability >= threshold) {
      if (p.label) tp++
      else fp++
    } else if (p.label) fn++
    else tn++
  }
  return {
    points,
    tp,
    fp,
    tn,
    fn,
    accuracy: (tp + tn) / points.length,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
  }
}
