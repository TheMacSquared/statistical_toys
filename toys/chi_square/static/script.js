// === STAN APLIKACJI ===
const state = {
    mode: 'exploration',  // 'exploration' | 'custom'
    nRows: 2,
    nCols: 2,
    rowLabels: ['Kobiety', 'Mężczyźni'],
    colLabels: ['Zadowolony', 'Niezadowolony'],
    // Tryb exploration
    rowPercentages: [[60, 40], [55, 45]],
    sampleSize: 200,
    rowSplitPct: 50,  // procent dla pierwszego wiersza
    // Tryb custom
    table: [[48, 30], [28, 24]],
    // Wyniki z backendu
    expected: null,
    contributions: null,
    chiSquare: null,
    df: null,
    pValue: null,
    cramersV: null,
    significant: null,
    alpha: 0.05
};

// Debouncing
let debounceTimer = null;

// Kolory wierszy dla wykresu
const ROW_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444'];
const ROW_COLORS_LIGHT = ['rgba(99,102,241,0.35)', 'rgba(245,158,11,0.35)', 'rgba(34,197,94,0.35)', 'rgba(239,68,68,0.35)'];

// === PRESETY ===
const PRESETS = {
    independent: {
        nRows: 2, nCols: 2,
        rowLabels: ['Kobiety', 'Mężczyźni'],
        colLabels: ['Zadowolony', 'Niezadowolony'],
        rowPercentages: [[60, 40], [60, 40]],
        sampleSize: 200, rowSplitPct: 50
    },
    weak: {
        nRows: 2, nCols: 2,
        rowLabels: ['Kobiety', 'Mężczyźni'],
        colLabels: ['Zadowolony', 'Niezadowolony'],
        rowPercentages: [[60, 40], [50, 50]],
        sampleSize: 200, rowSplitPct: 50
    },
    strong: {
        nRows: 2, nCols: 2,
        rowLabels: ['Kobiety', 'Mężczyźni'],
        colLabels: ['Zadowolony', 'Niezadowolony'],
        rowPercentages: [[75, 25], [30, 70]],
        sampleSize: 200, rowSplitPct: 50
    },
    medicine: {
        nRows: 2, nCols: 2,
        rowLabels: ['Lek', 'Placebo'],
        colLabels: ['Poprawa', 'Brak poprawy'],
        rowPercentages: [[70, 30], [40, 60]],
        sampleSize: 300, rowSplitPct: 50
    }
};

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
    setupModeToggle();
    setupPresets();
    setupAlphaSelect();
    setupDimensionInputs();
    setupSampleSizeSlider();
    setupSplitSlider();
    setupExpectedToggle();

    buildSliderControls();
    buildTable();
    triggerComputation();
});

// === TRYB ===
function setupModeToggle() {
    document.querySelectorAll('.chi-mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.dataset.mode;
            switchMode(mode);
        });
    });
}

function switchMode(mode) {
    state.mode = mode;

    // Update button styles
    document.querySelectorAll('.chi-mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.remove('st-btn--secondary');
            btn.classList.add('st-btn--primary', 'chi-mode-btn--active');
        } else {
            btn.classList.remove('st-btn--primary', 'chi-mode-btn--active');
            btn.classList.add('st-btn--secondary');
        }
    });

    // Show/hide controls
    document.getElementById('exploration-controls').style.display =
        mode === 'exploration' ? '' : 'none';
    document.getElementById('custom-controls').style.display =
        mode === 'custom' ? '' : 'none';

    buildTable();
    triggerComputation();
}

// === PRESETY ===
function setupPresets() {
    document.querySelectorAll('.chi-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadPreset(this.dataset.preset);
        });
    });
}

function loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;

    // Przelacz na tryb exploration
    if (state.mode !== 'exploration') {
        switchMode('exploration');
    }

    state.nRows = preset.nRows;
    state.nCols = preset.nCols;
    state.rowLabels = [...preset.rowLabels];
    state.colLabels = [...preset.colLabels];
    state.rowPercentages = preset.rowPercentages.map(r => [...r]);
    state.sampleSize = preset.sampleSize;
    state.rowSplitPct = preset.rowSplitPct;

    // Aktualizuj UI
    document.getElementById('param-n').value = state.sampleSize;
    document.getElementById('param-n-value').textContent = state.sampleSize;
    document.getElementById('param-split').value = state.rowSplitPct;
    updateSplitLabel();

    buildSliderControls();
    buildTable();
    triggerComputation();
}

// === SUWAKI PROCENTOWE ===
function buildSliderControls() {
    const container = document.getElementById('slider-rows-container');
    container.innerHTML = '';

    for (let r = 0; r < state.nRows; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'chi-slider-row';

        const title = document.createElement('div');
        title.className = 'chi-slider-row__title';
        title.textContent = state.rowLabels[r] || `Wiersz ${r + 1}`;
        rowDiv.appendChild(title);

        // Suwaki dla pierwszych (nCols - 1) kolumn
        for (let c = 0; c < state.nCols - 1; c++) {
            const group = document.createElement('div');
            group.className = 'chi-slider-group';

            const label = document.createElement('label');
            const colName = state.colLabels[c] || `Kol. ${c + 1}`;
            const pctSpan = document.createElement('span');
            pctSpan.id = `pct-${r}-${c}`;
            pctSpan.textContent = `${state.rowPercentages[r][c]}%`;
            label.textContent = colName + ': ';
            label.appendChild(pctSpan);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = state.rowPercentages[r][c];
            slider.dataset.row = r;
            slider.dataset.col = c;

            slider.addEventListener('input', function() {
                onSliderChange(parseInt(this.dataset.row), parseInt(this.dataset.col), parseInt(this.value));
            });

            group.appendChild(label);
            group.appendChild(slider);
            rowDiv.appendChild(group);
        }

        // Ostatnia kolumna - obliczona
        const lastCol = state.nCols - 1;
        const computed = document.createElement('div');
        computed.className = 'chi-pct-computed';
        const lastPct = 100 - state.rowPercentages[r].slice(0, lastCol).reduce((a, b) => a + b, 0);
        const colName = state.colLabels[lastCol] || `Kol. ${lastCol + 1}`;
        computed.id = `pct-computed-${r}`;
        computed.textContent = `${colName}: ${Math.max(0, lastPct)}%`;
        rowDiv.appendChild(computed);

        container.appendChild(rowDiv);
    }
}

function onSliderChange(row, col, value) {
    const lastCol = state.nCols - 1;

    // Ogranicz: suma pierwszych (nCols-1) kolumn <= 100
    const otherSum = state.rowPercentages[row]
        .slice(0, lastCol)
        .reduce((a, b, i) => i === col ? a : a + b, 0);

    value = Math.min(value, 100 - otherSum);
    state.rowPercentages[row][col] = value;

    // Oblicz ostatnia kolumne
    const usedSum = state.rowPercentages[row].slice(0, lastCol).reduce((a, b) => a + b, 0);
    state.rowPercentages[row][lastCol] = Math.max(0, 100 - usedSum);

    // Aktualizuj labele
    document.getElementById(`pct-${row}-${col}`).textContent = `${value}%`;
    const lastPct = state.rowPercentages[row][lastCol];
    const colName = state.colLabels[lastCol] || `Kol. ${lastCol + 1}`;
    document.getElementById(`pct-computed-${row}`).textContent = `${colName}: ${lastPct}%`;

    // Aktualizuj slider value (mogl byc ograniczony)
    const sliders = document.querySelectorAll(`input[data-row="${row}"][data-col="${col}"]`);
    sliders.forEach(s => s.value = value);

    scheduleComputation();
}

// === SUWAKI N i SPLIT ===
function setupSampleSizeSlider() {
    const slider = document.getElementById('param-n');
    const label = document.getElementById('param-n-value');
    slider.addEventListener('input', function() {
        state.sampleSize = parseInt(this.value);
        label.textContent = state.sampleSize;
        scheduleComputation();
    });
}

function setupSplitSlider() {
    const slider = document.getElementById('param-split');
    slider.addEventListener('input', function() {
        state.rowSplitPct = parseInt(this.value);
        updateSplitLabel();
        scheduleComputation();
    });
}

function updateSplitLabel() {
    const label = document.getElementById('param-split-value');
    const pct1 = state.rowSplitPct;
    const pct2 = 100 - pct1;
    label.textContent = `${pct1}% / ${pct2}%`;
}

// === ALFA ===
function setupAlphaSelect() {
    document.getElementById('param-alpha').addEventListener('change', function() {
        state.alpha = parseFloat(this.value);
        scheduleComputation();
    });
}

// === WYMIARY (tryb custom) ===
function setupDimensionInputs() {
    ['param-rows', 'param-cols'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const newRows = parseInt(document.getElementById('param-rows').value);
            const newCols = parseInt(document.getElementById('param-cols').value);
            resizeTable(newRows, newCols);
        });
    });
}

function resizeTable(newRows, newCols) {
    const oldTable = state.table;
    const newTable = [];

    for (let r = 0; r < newRows; r++) {
        const row = [];
        for (let c = 0; c < newCols; c++) {
            if (r < oldTable.length && c < oldTable[0].length) {
                row.push(oldTable[r][c]);
            } else {
                row.push(10);  // Domyslna wartosc
            }
        }
        newTable.push(row);
    }

    state.nRows = newRows;
    state.nCols = newCols;

    // Rozszerz etykiety
    while (state.rowLabels.length < newRows) state.rowLabels.push(`Wiersz ${state.rowLabels.length + 1}`);
    while (state.colLabels.length < newCols) state.colLabels.push(`Kolumna ${state.colLabels.length + 1}`);
    state.rowLabels = state.rowLabels.slice(0, newRows);
    state.colLabels = state.colLabels.slice(0, newCols);

    // Rozszerz rowPercentages
    const newPcts = [];
    for (let r = 0; r < newRows; r++) {
        const pcts = [];
        const equalPct = Math.floor(100 / newCols);
        for (let c = 0; c < newCols; c++) {
            if (r < state.rowPercentages.length && c < state.rowPercentages[0].length) {
                pcts.push(state.rowPercentages[r][c]);
            } else {
                pcts.push(c === newCols - 1 ? 100 - equalPct * (newCols - 1) : equalPct);
            }
        }
        newPcts.push(pcts);
    }
    state.rowPercentages = newPcts;
    state.table = newTable;

    buildSliderControls();
    buildTable();
    triggerComputation();
}

// === EXPECTED TOGGLE ===
function setupExpectedToggle() {
    document.getElementById('show-expected').addEventListener('change', function() {
        document.querySelectorAll('.chi-expected').forEach(el => {
            el.classList.toggle('chi-expected--hidden', !this.checked);
        });
    });
}

// === TABELA HTML ===
function buildTable() {
    const container = document.getElementById('table-container');
    const isCustom = state.mode === 'custom';
    const nRows = state.nRows;
    const nCols = state.nCols;

    let html = '<table class="chi-table">';

    // Header
    html += '<thead><tr><th></th>';
    for (let c = 0; c < nCols; c++) {
        html += `<th>${state.colLabels[c] || `Kol. ${c + 1}`}</th>`;
    }
    html += '<th>Suma</th></tr></thead>';

    // Body
    html += '<tbody>';
    for (let r = 0; r < nRows; r++) {
        html += `<tr><th>${state.rowLabels[r] || `Wiersz ${r + 1}`}</th>`;
        for (let c = 0; c < nCols; c++) {
            const val = isCustom ? state.table[r][c] : '-';
            const readonly = isCustom ? '' : 'readonly';
            html += `<td class="chi-cell" id="cell-${r}-${c}">`;
            html += `<input type="number" class="chi-cell-input" `;
            html += `id="input-${r}-${c}" value="${val}" min="0" ${readonly} `;
            html += `data-row="${r}" data-col="${c}">`;
            html += `<span class="chi-expected" id="exp-${r}-${c}"></span>`;
            html += `<span class="chi-pct" id="pct-cell-${r}-${c}"></span>`;
            html += '</td>';
        }
        html += `<td class="chi-total" id="row-total-${r}">-</td>`;
        html += '</tr>';
    }
    html += '</tbody>';

    // Footer
    html += '<tfoot><tr><th>Suma</th>';
    for (let c = 0; c < nCols; c++) {
        html += `<td class="chi-total" id="col-total-${c}">-<span class="chi-pct chi-pct--footer" id="pct-col-${c}"></span></td>`;
    }
    html += `<td class="chi-grand-total" id="grand-total">-</td>`;
    html += '</tr></tfoot>';

    html += '</table>';
    container.innerHTML = html;

    // Podepnij event listenery (tryb custom)
    if (isCustom) {
        container.querySelectorAll('.chi-cell-input').forEach(input => {
            input.addEventListener('input', function() {
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                const val = parseInt(this.value);
                if (!isNaN(val) && val >= 0) {
                    state.table[r][c] = val;
                    scheduleComputation();
                }
            });
        });
    }

    // Zastosuj ustawienie show-expected
    const showExp = document.getElementById('show-expected').checked;
    if (!showExp) {
        document.querySelectorAll('.chi-expected').forEach(el => {
            el.classList.add('chi-expected--hidden');
        });
    }
}

// === OBLICZENIA ===
function scheduleComputation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => triggerComputation(), 300);
}

async function triggerComputation() {
    const loadingEl = document.getElementById('loading');

    try {
        loadingEl.classList.add('st-loading--active');

        let response;

        if (state.mode === 'exploration') {
            // Wyslij procenty do backendu
            const rowSplit = [state.rowSplitPct / 100, 1 - state.rowSplitPct / 100];
            response = await fetch('/api/generate-from-percentages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    row_percentages: state.rowPercentages,
                    n: state.sampleSize,
                    row_split: rowSplit,
                    alpha: state.alpha
                })
            });
        } else {
            // Wyslij tabele bezposrednio
            response = await fetch('/api/compute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: state.table,
                    alpha: state.alpha
                })
            });
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            // Zapisz wyniki
            state.expected = data.expected;
            state.contributions = data.contributions;
            state.chiSquare = data.chi_square;
            state.df = data.df;
            state.pValue = data.p_value;
            state.cramersV = data.cramers_v;
            state.significant = data.significant;

            // Jesli tryb exploration, zaktualizuj tabele z backendu
            if (state.mode === 'exploration' && data.table) {
                state.table = data.table;
            }

            updateTableDisplay();
            updateStats();
            plotGroupedBars();
            showWarnings(data.warnings || []);
        } else {
            showWarnings([data.error || 'Nieznany błąd']);
        }

    } catch (error) {
        showWarnings([error.message || 'Błąd połączenia z serwerem']);
    } finally {
        loadingEl.classList.remove('st-loading--active');
    }
}

// === AKTUALIZACJA TABELI ===
function updateTableDisplay() {
    const table = state.table;
    const expected = state.expected;
    const contributions = state.contributions;
    const showExp = document.getElementById('show-expected').checked;

    if (!table || !expected) return;

    const nRows = table.length;
    const nCols = table[0].length;

    // Oblicz sumy
    const rowTotals = table.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = [];
    for (let c = 0; c < nCols; c++) {
        colTotals.push(table.reduce((sum, row) => sum + row[c], 0));
    }
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

    // Znajdz max contribution dla normalizacji kolorow
    let maxContrib = 0;
    if (contributions) {
        for (let r = 0; r < nRows; r++) {
            for (let c = 0; c < nCols; c++) {
                maxContrib = Math.max(maxContrib, contributions[r][c]);
            }
        }
    }
    maxContrib = Math.max(maxContrib, 1); // Unikaj dzielenia przez 0

    // Aktualizuj komorki
    for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
            const cellEl = document.getElementById(`cell-${r}-${c}`);
            const inputEl = document.getElementById(`input-${r}-${c}`);
            const expEl = document.getElementById(`exp-${r}-${c}`);
            const pctEl = document.getElementById(`pct-cell-${r}-${c}`);

            if (!cellEl) continue;

            // Wartosc obserwowana
            inputEl.value = table[r][c];

            // Wartosc oczekiwana
            expEl.textContent = `ocz: ${expected[r][c].toFixed(1)}`;
            if (!showExp) expEl.classList.add('chi-expected--hidden');

            // Procent w wierszu
            const rowTotal = rowTotals[r];
            const pct = rowTotal > 0 ? (table[r][c] / rowTotal * 100).toFixed(1) : '0.0';
            pctEl.textContent = `${pct}%`;

            // Kolorowanie wg wkladu + znaczniki dla daltonistow
            if (contributions) {
                const contrib = contributions[r][c];
                const intensity = Math.min(contrib / Math.max(maxContrib, 3), 1) * 0.4;
                const obs = table[r][c];
                const exp = expected[r][c];

                if (obs > exp) {
                    cellEl.style.backgroundColor = `rgba(239, 68, 68, ${intensity})`;
                    cellEl.title = `▲ Więcej niż oczekiwane (wkład: ${contrib.toFixed(2)})`;
                } else if (obs < exp) {
                    cellEl.style.backgroundColor = `rgba(99, 102, 241, ${intensity})`;
                    cellEl.title = `▼ Mniej niż oczekiwane (wkład: ${contrib.toFixed(2)})`;
                } else {
                    cellEl.style.backgroundColor = '';
                    cellEl.title = `= Zgodne z oczekiwanymi`;
                }
            }
        }
    }

    // Sumy wierszy
    for (let r = 0; r < nRows; r++) {
        const el = document.getElementById(`row-total-${r}`);
        if (el) el.textContent = rowTotals[r];
    }

    // Sumy kolumn z procentami brzegowymi
    for (let c = 0; c < nCols; c++) {
        const el = document.getElementById(`col-total-${c}`);
        const pctEl = document.getElementById(`pct-col-${c}`);
        if (el) {
            el.textContent = '';
            el.appendChild(document.createTextNode(colTotals[c]));
            if (pctEl) {
                const marginalPct = grandTotal > 0 ? (colTotals[c] / grandTotal * 100).toFixed(1) : '0.0';
                pctEl.textContent = `${marginalPct}%`;
                el.appendChild(pctEl);
            }
        }
    }

    // Suma calkowita
    const gtEl = document.getElementById('grand-total');
    if (gtEl) gtEl.textContent = grandTotal;
}

// === PANEL WYNIKOW ===
function updateStats() {
    document.getElementById('stat-chi2').textContent =
        state.chiSquare != null ? state.chiSquare.toFixed(4) : '-';
    document.getElementById('stat-df').textContent =
        state.df != null ? state.df : '-';
    document.getElementById('stat-cramers').textContent =
        state.cramersV != null ? state.cramersV.toFixed(4) : '-';

    // p-value z formatowaniem
    const pEl = document.getElementById('stat-pvalue');
    if (state.pValue != null) {
        if (state.pValue < 0.001) {
            pEl.textContent = '< 0.001';
        } else {
            pEl.textContent = state.pValue.toFixed(4);
        }
    } else {
        pEl.textContent = '-';
    }

    // Werdykt
    const verdictEl = document.getElementById('stat-verdict');
    const container = document.getElementById('verdict-container');
    container.classList.remove('chi-verdict--significant', 'chi-verdict--not-significant');

    if (state.significant != null) {
        if (state.significant) {
            verdictEl.textContent = `Odrzucamy H₀ (p < ${state.alpha}) — istnieją istotne przesłanki zależności`;
            container.classList.add('chi-verdict--significant');
        } else {
            verdictEl.textContent = `Brak podstaw do odrzucenia H₀ (p ≥ ${state.alpha})`;
            container.classList.add('chi-verdict--not-significant');
        }
    } else {
        verdictEl.textContent = '-';
    }
}

// === WYKRES SLUPKOWY ===
function plotGroupedBars() {
    if (!state.table || !state.expected) return;

    const table = state.table;
    const expected = state.expected;
    const nRows = table.length;
    const nCols = table[0].length;

    const traces = [];

    for (let r = 0; r < nRows; r++) {
        const rowLabel = state.rowLabels[r] || `Wiersz ${r + 1}`;
        const color = ROW_COLORS[r % ROW_COLORS.length];

        // Obserwowane - slupki
        traces.push({
            x: state.colLabels.slice(0, nCols),
            y: table[r],
            name: `${rowLabel} (obs.)`,
            type: 'bar',
            marker: { color: color },
            legendgroup: rowLabel,
            hovertemplate: `<b>${rowLabel}</b><br>Obserwowane: %{y}<extra></extra>`
        });

        // Oczekiwane - kropki z linia pozioma
        traces.push({
            x: state.colLabels.slice(0, nCols),
            y: expected[r],
            name: `${rowLabel} (ocz.)`,
            type: 'scatter',
            mode: 'markers',
            marker: {
                symbol: 'line-ew-open',
                size: 18,
                color: color,
                line: { width: 3, color: color }
            },
            legendgroup: rowLabel,
            hovertemplate: `<b>${rowLabel}</b><br>Oczekiwane: %{y:.1f}<extra></extra>`
        });
    }

    const layout = {
        title: {
            text: 'Częstości obserwowane vs oczekiwane',
            font: { size: 16, family: 'Arial, sans-serif' }
        },
        barmode: 'group',
        xaxis: {
            title: '',
            gridcolor: '#e0e0e0'
        },
        yaxis: {
            title: 'Liczebność',
            gridcolor: '#e0e0e0'
        },
        plot_bgcolor: '#f8fafc',
        paper_bgcolor: '#f8fafc',
        margin: { t: 50, b: 50, l: 60, r: 20 },
        showlegend: true,
        legend: {
            x: 1, xanchor: 'right', y: 1,
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#ddd', borderwidth: 1,
            font: { size: 11 }
        },
        hovermode: 'closest'
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.react('plot', traces, layout, config);
}

// === OSTRZEZENIA ===
function showWarnings(warnings) {
    const box = document.getElementById('warnings-box');
    if (warnings.length > 0) {
        box.textContent = '';
        warnings.forEach((w, i) => {
            if (i > 0) box.appendChild(document.createElement('br'));
            box.appendChild(document.createTextNode(w));
        });
        box.style.display = '';
    } else {
        box.style.display = 'none';
    }
}
