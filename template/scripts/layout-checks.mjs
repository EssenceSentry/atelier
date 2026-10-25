// Layout problems any atelier page can have, found in the rendered page so
// they fail in every project, not only where someone happens to look:
// - a chart that did not render;
// - content spilling out of a panel;
// - the page scrolling sideways;
// - chart labels overlapping each other or running past their panel;
// - on touch screens, controls shorter than 40px to tap.
// Used by scripts/check.mjs and by atelier's gallery capture.

/** Returns a list of problems in the page as rendered now. */
export async function layoutProblems(page) {
  return page.evaluate(() => {
    const problems = []
    const visible = (e) => e.getClientRects().length > 0
    const name = (e) =>
      e.querySelector("h1, h2, h3, summary")?.textContent?.trim() || e.className.split(" ")[0]

    const root = document.documentElement
    if (root.scrollWidth > root.clientWidth)
      problems.push(`page scrolls sideways (${root.scrollWidth} > ${root.clientWidth})`)

    for (const figure of document.querySelectorAll("figure.plot-figure")) {
      // Charts in panels hidden at this width never get a size; skip them.
      if (visible(figure) && figure.dataset.state !== "ok")
        problems.push(`chart ${figure.dataset.state}`)
    }

    for (const panel of document.querySelectorAll(".panel")) {
      if (visible(panel) && panel.scrollHeight > panel.clientHeight + 2)
        problems.push(`content spills out of panel "${name(panel)}"`)
    }

    for (const svg of document.querySelectorAll("figure.plot-figure svg")) {
      if (!visible(svg)) continue
      const labels = [...svg.querySelectorAll("text")]
        .filter((t) => t.textContent.trim() && visible(t))
        .map((t) => ({ text: t.textContent.trim(), box: t.getBoundingClientRect() }))
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i].box
          const b = labels[j].box
          const across = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (across > 1 && down > 1)
            problems.push(`chart labels overlap: "${labels[i].text}" and "${labels[j].text}"`)
        }
      }
      const panel = svg.closest(".panel")
      if (!panel) continue
      const frame = panel.getBoundingClientRect()
      const style = getComputedStyle(panel)
      const left = frame.left + Number.parseFloat(style.paddingLeft)
      const right = frame.right - Number.parseFloat(style.paddingRight)
      for (const label of labels) {
        if (label.box.left < left - 1 || label.box.right > right + 1)
          problems.push(`chart label "${label.text}" runs past its panel "${name(panel)}"`)
      }
    }
    // Touch targets: the control's box, grown by any invisible hit area drawn
    // with ::after (as the switch does), must be at least 40px tall.
    if (matchMedia("(pointer: coarse)").matches) {
      const controls = document.querySelectorAll(
        "button, a[href], [role=tab], [role=switch], [role=combobox], select, textarea, input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range])"
      )
      for (const control of controls) {
        const box = control.getBoundingClientRect()
        if (!visible(control) || box.width <= 2 || box.height <= 2) continue
        const after = getComputedStyle(control, "::after")
        const grow =
          after.position === "absolute"
            ? Math.max(0, -Number.parseFloat(after.top) || 0) +
              Math.max(0, -Number.parseFloat(after.bottom) || 0)
            : 0
        if (box.height + grow < 40) {
          const text = (control.getAttribute("aria-label") || control.textContent || "").trim()
          problems.push(`"${text.slice(0, 40)}" is ${Math.round(box.height + grow)}px tall to tap`)
        }
      }
    }
    return problems
  })
}
