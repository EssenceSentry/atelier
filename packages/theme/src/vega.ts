import type { VizTokens } from "./viz"

/** Shared marks, guides and captions for a figure or a thumbnail of one. */
export function vegaConfig(t: VizTokens, compact = false) {
  const size = compact ? 10 : 12
  return {
    background: "transparent",
    font: t.font,
    view: { stroke: null },
    mark: { color: t.series[0] },
    text: { color: t.ink, font: t.labelFont, fontSize: size, fontWeight: 600 as const },
    line: { strokeWidth: compact ? 1.7 : 2.3 },
    range: {
      category: t.series,
      heatmap: [t.rampLow, t.series[0], t.ink],
      ramp: [t.rampLow, t.series[0], t.ink],
      diverging: [t.divNeg, t.divMid, t.divPos],
    },
    title: { color: t.ink, font: t.font },
    axis: {
      domain: false,
      tickSize: 0,
      gridColor: t.grid,
      gridWidth: 0.8,
      labelColor: t.text,
      titleColor: t.ink,
      labelFont: t.labelFont,
      labelFontSize: size,
      titleFontSize: size,
      titleFontWeight: 600 as const,
      labelPadding: compact ? 4 : 8,
      titlePadding: compact ? 5 : 12,
      labelLimit: compact ? 60 : 125,
      tickCount: compact ? 3 : 5,
      ...(compact ? { title: null } : {}),
    },
    legend: {
      disable: compact,
      orient: "bottom" as const,
      direction: "horizontal" as const,
      labelColor: t.text,
      titleColor: t.ink,
      labelFontSize: size,
      titleFontSize: size,
      symbolSize: compact ? 42 : 70,
      columnPadding: 16,
    },
    header: { labelColor: t.text, titleColor: t.ink, labelFontSize: size, titleFontSize: size },
  }
}
