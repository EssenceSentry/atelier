(belief-update)=
# A belief, updated

MyST gives an analytical explanation structure: equations, references, callouts, definitions and executable-looking code without requiring a notebook kernel.

:::{note} Illustrative observations
The coin outcomes are synthetic: **14 heads and 6 tails**. All values below come from the same Beta–Binomial example.
:::

## The conjugate update

Let $p$ be the unknown probability of heads. Starting with $p \sim \mathrm{Beta}(2,2)$, the update is:

```{math}
:label: eq-posterior
p \mid y \sim \mathrm{Beta}(2+14,\;2+6) = \mathrm{Beta}(16,8)
```

The posterior mean is $16/24 \approx 0.667$. See {eq}`eq-posterior` and {ref}`belief-update`. The local reference metadata is cited here {cite:p}`beta-note`.

```{prf:theorem} Beta–Binomial conjugacy
:label: thm-conjugacy
A Beta prior and Binomial likelihood give a Beta posterior. The shape parameters gain the observed heads and tails.
```

:::{dropdown} Inspect the derivation
Multiplying the density and likelihood gives a kernel proportional to $p^{\alpha+h-1}(1-p)^{\beta+t-1}$. The exponents identify the updated Beta parameters.
:::

::::{tab-set}
:::{tab-item} Parameters
| Quantity | Prior | Posterior |
| :--- | ---: | ---: |
| Alpha | 2 | 16 |
| Beta | 2 | 8 |
| Mean | 0.500 | 0.667 |
:::
:::{tab-item} Python
```python
alpha, beta = 2, 2
heads, tails = 14, 6
posterior = (alpha + heads, beta + tails)
mean = posterior[0] / sum(posterior)
```
The code is displayed for inspection; this document does not execute Python.
:::
::::

Prior
: A distribution before the observed data enter the update.

Posterior
: The distribution after conditioning on those observations.

- [x] Keep example data explicit.
- [x] Carry values consistently through the explanation.
- [ ] Connect a live inference backend when one is needed.
