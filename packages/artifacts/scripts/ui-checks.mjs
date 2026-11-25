// Self-contained browser function, also used by the maintainer contract suite.
// Check all option labels so an unselected value cannot later hide under an arrow.
export function controlFindings() {
  const findings = []
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  for (const select of document.querySelectorAll(".at-select-shell select")) {
    const box = select.getBoundingClientRect()
    if (!box.width || !box.height) continue
    const shell = select.parentElement
    const arrow = getComputedStyle(shell, "::after")
    if (["none", "normal", '""'].includes(arrow.content)) continue
    const style = getComputedStyle(select)
    const number = (value) => Number.parseFloat(value) || 0
    const left = number(style.paddingLeft)
    const right = number(style.paddingRight)
    const contentWidth = Math.max(0, select.clientWidth - left - right)
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const spacing = number(style.letterSpacing)
    const labelWidth = Math.max(
      0,
      ...[...select.options].map((option) => {
        let text = option.label
        if (style.textTransform === "uppercase") text = text.toUpperCase()
        if (style.textTransform === "lowercase") text = text.toLowerCase()
        return context.measureText(text).width + spacing * Math.max(0, text.length - 1)
      })
    )
    // Measure from inline-start so both reading directions use the same geometry.
    const rtl = style.direction === "rtl"
    const shellBox = shell.getBoundingClientRect()
    const inset = rtl
      ? shellBox.left + number(arrow.left) - box.left
      : box.right - shellBox.right + number(arrow.right)
    const textStart = rtl
      ? number(style.borderRightWidth) + right
      : number(style.borderLeftWidth) + left
    const clearance =
      box.width - inset - number(arrow.width) - textStart - Math.min(contentWidth, labelWidth)
    const label =
      select.getAttribute("aria-label") ?? select.closest("label")?.innerText ?? "Select"
    if (inset < 12) findings.push({ issue: "select-arrow-edge", label, inset })
    if (clearance < 4)
      findings.push({
        issue: "select-arrow-clearance",
        label,
        clearance: Math.round(clearance * 100) / 100,
      })
  }
  return findings
}

export function workspaceFindings() {
  if (!matchMedia("(min-width:1100px) and (min-height:700px)").matches) return []
  const findings = []
  for (const cell of document.querySelectorAll(".at-workspace-cell")) {
    const box = cell.getBoundingClientRect()
    const top =
      Number.parseFloat(
        getComputedStyle(cell.closest(".at-notebook")).getPropertyValue("--at-top")
      ) || 0
    if (box.height > innerHeight - top - 46)
      findings.push({ issue: "workspace-height", cell: cell.id })
    for (const panel of cell.querySelectorAll(".at-workspace-panel")) {
      const rect = panel.getBoundingClientRect()
      if (
        rect.left < box.left - 1 ||
        rect.right > box.right + 1 ||
        rect.top < box.top - 1 ||
        rect.bottom > box.bottom + 1
      )
        findings.push({
          issue: "workspace-panel-outside",
          cell: cell.id,
          panel: panel.dataset.place,
        })
    }
  }
  return findings
}
