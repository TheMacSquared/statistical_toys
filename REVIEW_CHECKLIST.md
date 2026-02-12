# Pearson Correlation Toy -- Adversarial Review

Reviewer: Critic Agent
Date: 2025-02-12
Commit: 2a17f12
Files reviewed: 8 files in `toys/pearson_correlation/`

---

## Critical Issues (must fix)

- [ ] **[static/script.js:114]** **plotly_click cannot add points to an empty plot.** The code uses `plotEl.on('plotly_click', ...)` to handle adding points. However, Plotly's `plotly_click` event ONLY fires when the user clicks on an existing trace data point (or an existing line). When the chart is empty (zero points, no regression line), there are no traces to click, so the user literally cannot add their first point. Even with some points present, clicking on empty space between points will not fire the event. This makes the core interaction ("click on chart to add a point") fundamentally broken for the initial empty state and unreliable in general. **Fix:** Use a native DOM `click` event on the plot div and convert pixel coordinates to data coordinates via `Plotly.toPlotCoordinate` or `plotEl._fullLayout.xaxis.p2d()`, OR overlay an invisible dense scatter trace that covers the entire plot area so `plotly_click` always fires.

- [ ] **[static/script.js:119-148]** **Adding new points only works when clicking on the regression line (trace 1), not on empty space.** When `clickedPoint.curveNumber !== 0`, the code falls through to the "add new point" branch. This means clicking the regression line (trace 1) will add a point at the regression line's position, but clicking empty areas will do nothing. This is confusing UX -- the only way to add a point is to (a) start with a preset dataset, or (b) click exactly on the regression line. The instruction text "Kliknij na wykresie, by dodac punkt" is misleading.

## Important Issues (should fix)

- [ ] **[templates/index.html:178]** **Typo: "zaleznoscig"** should be "zaleznoscia" (missing letter 'a', extra letter 'g'). The sentence reads "np. zaleznoscig kwadratowa" but should be "np. zaleznoscia kwadratowa".

- [ ] **[templates/index.html:186]** **Typo: "Wrrazliwosc"** should be "Wrazliwosc" (double 'r'). The experiments section title has "Wrrazliwosc na outfiery".

- [ ] **[templates/index.html:40, 186 and app.py:245]** **Typo: "outfier" / "outfiery"** should be "outlier" / "outliery". The English loanword "outlier" is misspelled in 3 places: button label "Efekt outfiera", comment "Dodaj outfier daleko od reszty", and experiments text "Wrrazliwosc na outfiery". While Polish doesn't have a native word for this, the standard Polish usage is "outlier" (borrowed from English).

- [ ] **[app.py:94-97]** **Zero-variance check uses `np.std() == 0` which is fragile with floating-point arithmetic.** Due to floating-point rounding, `np.std(x_arr)` might return a tiny non-zero value (e.g., 1e-16) for arrays that are effectively constant. This means the check could pass, and `scipy.stats.pearsonr` would then return NaN or raise a warning. **Fix:** Use a small epsilon threshold, e.g., `np.std(x_arr) < 1e-10`, or check `np.all(x_arr == x_arr[0])`.

- [ ] **[app.py:34-39]** **`safe_float()` does not handle the case where `val` is not convertible to float.** If `val` is a numpy type that somehow doesn't convert cleanly, or if `val` is None, `float(val)` will throw an exception that propagates up unhandled by the function (it has no try/except). While the calling code wraps things in try/except at the route level, the `safe_float` function's contract implies it returns None for bad values, but it actually throws. This is inconsistent with its docstring "returns None for NaN/Inf".

- [ ] **[static/script.js:414-420]** **r coloring threshold of 0.05 is inconsistent with strength thresholds.** The r-display box is colored positive/negative based on `r > 0.05` / `r < -0.05`, but the backend strength thresholds are `|r| < 0.3` (weak), `0.3-0.7` (moderate), `>= 0.7` (strong). A value of r = 0.10 gets green coloring (positive) on the frontend but is labeled "slaba" (weak) by the backend. This can confuse students -- the visual cue (green = good) contradicts the text interpretation (weak). The threshold for positive/negative coloring should arguably be 0 (or match the 0.3 boundary).

- [ ] **[static/script.js:444-448]** **Redundant interpretation text: "Slaba korelacja dodatnia" is grammatically odd.** The code concatenates `strength_label` + direction, e.g., "Slaba korelacja dodatnia". But `strength_label` already contains the word "korelacja" (it's "Slaba korelacja"). The resulting text "Slaba korelacja dodatnia" sounds a bit off in Polish. A cleaner phrasing would be "Slaba korelacja, kierunek dodatni" or the label should be just "Slaba" without "korelacja".

- [ ] **[app.py:214]** **`np.random.seed()` without argument uses system entropy, but the call is pointless.** Calling `np.random.seed()` with no argument reseeds from OS entropy, which is the default behavior anyway. This is a no-op and dead code. If the intent was to ensure different results each call (as commented in histogram's app.py:51), it's unnecessary because numpy already uses different entropy by default. Remove to avoid confusion.

- [ ] **[static/script.js:189-192]** **`Math.min(...xs)` / `Math.max(...xs)` will crash with a RangeError if `state.points` has more than ~65,000 elements.** Spreading a large array into `Math.min()` / `Math.max()` exceeds the call stack. The backend limits to 100 points, so this isn't a real crash risk in practice, but it's a latent code smell.

## Minor Issues (nice to fix)

- [ ] **[templates/index.html:8]** **Plotly.js 2.26.0 is loaded from CDN, which requires internet.** Since this app is designed to run as a desktop app via PyWebView, CDN loading will fail if the user is offline. Consider bundling Plotly.js locally in `static/`. (Note: this is the same pattern as chi_square and histogram, so it's a project-wide issue, not specific to this toy.)

- [ ] **[app.py:131]** **`scipy.stats.pearsonr` already computes r and p-value; the manual components (sum_products, sum_dx_sq, etc.) are redundant for the computation itself.** They are used for educational display in the table, which is fine, but the code computes r twice -- once via scipy and once implicitly through manual components. This is not a bug, but it's worth noting that the two could diverge due to floating-point differences. The displayed formula values could produce a slightly different r than the scipy value shown in the header.

- [ ] **[static/script.js:472]** **Unicode characters `\u0177` and `\u00B7` in the regression equation display.** `\u0177` is the letter "w-circumflex" (w with a hat), not "y-hat". The correct Unicode for y-hat (y with combining circumflex) would be `\u0079\u0302` or simply using HTML like `y&#770;` or the more common `\u0177`. Actually `\u0177` is the Welsh letter. For "y-hat" in statistics, the standard approach is to use `y\u0302` (y + combining circumflex accent) or just display `y` with a hat via HTML. The current code displays the Welsh letter rather than a proper y-hat.

- [ ] **[static/script.js:489]** **`innerHTML` is used to set formula values, introducing a potential XSS vector.** While the data comes from the trusted backend, best practice is to use `textContent` or DOM creation methods. The values injected are numeric strings that come from the backend's `safe_float` -> `round`, so exploitation risk is minimal, but it's still a code quality concern.

- [ ] **[app.py:10]** **`import numpy as np` is used, but `import math` is also imported for `math.isnan` and `math.isinf`.** These checks could use `np.isnan` and `np.isinf` instead, eliminating the `math` import. Not a bug, just redundancy.

- [ ] **[static/script.js:31]** **`CLICK_TOLERANCE` constant is defined but never used.** It was presumably intended for proximity-based point deletion but the implementation uses Plotly's built-in `pointIndex` instead. Dead code.

- [ ] **[app.py:245]** **Comment typo: "outfier"** should be "outlier" (already covered above, but also a code comment issue).

- [ ] **[main.py:12]** **PORT = 15004 is hardcoded.** This follows the pattern of other toys (15000-15003), and 15004 is the next sequential port, which is good. However, no port-in-use detection is performed. If the port is already occupied, the app will crash silently. This is a project-wide pattern, not specific to this toy.

- [ ] **[templates/index.html:131-132]** **Checkbox label "Pokaz odchylenia na wykresie" is not inside a `<label>` element that wraps the input.** Actually, looking more carefully, the `<label>` does wrap both the `<input>` and the text, so this is fine. No issue here.

- [ ] **[static/style.css:146]** **`grid-template-columns: repeat(2, 1fr) !important`** uses `!important` to override the shared `.st-stats-grid` which has `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))` at the 640px breakpoint. This is somewhat heavy-handed; a more specific selector or higher specificity would be cleaner.

- [ ] **[app.py:141-149]** **Strength thresholds (0.3 and 0.7) are a common convention but not the only one.** Some textbooks use 0.1/0.3/0.5/0.7. The chosen thresholds are defensible and documented in the HTML (lines 169-172), which is good. No change needed, just noting for completeness.

## Consistency Issues

- [ ] **requirements.txt matches chi_square exactly** (flask, pywebview, numpy, scipy, pyinstaller). This is consistent. Good.

- [ ] **build.py follows the chi_square pattern exactly** (same structure, same common_static handling, same hidden-import). Good.

- [ ] **main.py follows the chi_square pattern** (same Thread+webview pattern, PORT = 15004 is next in sequence after chi_square's 15003). Window width is 1400 vs chi_square's 1200 -- this is justified by the wider 2-column layout with data table. Good.

- [ ] **app.py uses `get_bundle_dir()` and `register_common_static()` from common** -- consistent with chi_square. Good.

- [ ] **HTML template follows chi_square pattern** (same `<head>` structure, same Plotly CDN, same shared.css + local style.css, same `st-app st-page` body classes, same `st-card--wide` wrapper). Good.

- [ ] **Error handling follows chi_square pattern** (try/except ValueError+TypeError -> 400, catch-all Exception -> 500 with generic message). Good.

- [ ] **The histogram toy does NOT have `get_bundle_dir()` or PyInstaller-aware path handling** in its app.py (lines 8-11 -- it uses plain `Flask(__name__)`). The Pearson toy correctly uses the bundle_dir pattern like chi_square. This is actually an inconsistency with histogram, but the Pearson toy follows the better (chi_square) pattern.

- [ ] **The histogram toy's build.py does NOT include common/static** in its PyInstaller args. The Pearson toy correctly includes it, matching chi_square. Good.

- [ ] **CSS class naming uses `pc-` prefix** (Pearson Correlation), following the convention of chi_square's `chi-` prefix. Good.

## What's Good

- **Pearson r formula is mathematically correct.** The backend uses `scipy.stats.pearsonr` which is the gold-standard implementation. The manual component calculations (dx, dy, products, squared terms) correctly mirror the formula shown in the UI.

- **p-value calculation is correct.** Delegated to scipy, which handles it properly for the t-distribution with n-2 degrees of freedom.

- **Edge cases are well-handled.** n < 3 is rejected with a clear message. Zero-variance arrays (all same x or all same y) are caught before scipy can produce NaN. Max 100 points prevents abuse. NaN/Inf inputs are rejected.

- **Educational content is solid.** The breakdown table showing dx, dy, products, and squared terms per point is an excellent teaching tool. Color-coding positive/negative products visually demonstrates how each point contributes to r. The deviation rectangles on the chart are a great visual metaphor.

- **Preset datasets are well-chosen.** The five presets cover the most important pedagogical scenarios: strong positive, strong negative, no correlation, nonlinear (Pearson's main limitation), and outlier sensitivity. These directly support the learning objectives.

- **The formula display with computed values** is excellent for connecting the abstract formula to concrete numbers.

- **Input validation is thorough.** The backend validates JSON structure, point format, numeric types, NaN/Inf, array length, and variance -- all with clear Polish error messages.

- **Code organization is clean.** Separation of validation (`_validate_*`), computation (`_compute_pearson`), and routes is good. The frontend has clear function separation (setup, update, clear patterns).

- **The R-squared display and regression equation** provide extra statistical context beyond just r.

- **The deviation rectangles toggle** is a thoughtful UX touch -- students can turn them off when they become distracting with many points.

- **Consistent use of the shared design system** (`st-*` CSS classes, shared.css tokens) ensures visual coherence with other toys.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2     |
| Important| 8     |
| Minor    | 8     |
| Consistency| 8 (7 good, 1 neutral) |

The two **critical issues** both relate to the `plotly_click` event handler -- users cannot add points by clicking on empty plot space, which is the core interaction advertised by the UI instruction text. This must be fixed before the toy is usable. Everything else is solid: the math is correct, the educational design is strong, and the code follows project conventions well.
