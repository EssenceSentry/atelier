const book = Atelier.notebook({
  title: "Research notebook",
  description: "Illustrative mathematics and documentation syntax.",
})
const prose = book.cell({ id: "summary", title: "A Bayesian update" })
Atelier.mount("markdown", prose.view, {
  source:
    "## Coin example\nWith a Beta(2,2) prior and 14 heads in 20 synthetic tosses, the posterior is Beta(16,8).\n\n$$p\\mid y \\sim \\operatorname{Beta}(16,8)$$\n\n| Quantity | Value |\n|---|---:|\n| Posterior mean | 0.667 |",
})
const myst = book.cell({ id: "derivation", title: "MyST documentation" })
Atelier.mount("myst", myst.view, {
  source:
    "# Derivation\n\n:::{note} Evidence boundary\nThese are synthetic observations.\n:::\n\n:::{prf:theorem} Conjugacy\n:label: beta-update\nThe Beta prior is conjugate to the Bernoulli likelihood.\n:::\n\nSee {ref}`beta-update`.",
})
const code = book.cell({ id: "query", title: "SQL example" })
Atelier.mount("editor", code.view, {
  language: "sql",
  source: "SELECT region, AVG(score) AS mean_score\nFROM observations\nGROUP BY region;",
})
