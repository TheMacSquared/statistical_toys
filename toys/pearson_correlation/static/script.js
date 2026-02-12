// === STAN APLIKACJI ===
const state = {
    points: [],          // [{x, y}, ...]
    results: null,       // wyniki z backendu
    showDeviations: true // czy pokazywac odchylenia na wykresie
};

// Debouncing
let debounceTimer = null;

// Kolory
const COLORS = {
    point: '#6366f1',
    pointHover: '#4f46e5',
    regression: '#ef4444',
    meanLineX: 'rgba(99, 102, 241, 0.3)',
    meanLineY: 'rgba(99, 102, 241, 0.3)',
    deviationPos: 'rgba(34, 197, 94, 0.25)',
    deviationNeg: 'rgba(239, 68, 68, 0.25)',
    productPos: '#22c55e',
    productNeg: '#ef4444'
};

// Staly zakres wykresu
const PLOT_RANGE = {
    x: [-2, 18],
    y: [-2, 18]
};

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
    setupPlot();
    setupPresets();
    setupDeviationToggle();
});

// === WYKRES ===
function setupPlot() {
    const traces = [
        // Punkty danych
        {
            x: [],
            y: [],
            mode: 'markers',
            type: 'scatter',
            name: 'Dane',
            marker: {
                color: COLORS.point,
                size: 12,
                line: { color: 'white', width: 2 },
                opacity: 0.9
            },
            hovertemplate: '<b>(%{x:.2f}, %{y:.2f})</b><extra></extra>'
        },
        // Linia regresji
        {
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: 'Regresja',
            line: {
                color: COLORS.regression,
                width: 2.5,
                dash: 'solid'
            },
            hoverinfo: 'skip'
        }
    ];

    const layout = {
        title: '',
        xaxis: {
            title: 'X',
            range: [...PLOT_RANGE.x],
            gridcolor: '#e2e8f0',
            zeroline: true,
            zerolinecolor: '#cbd5e1',
            zerolinewidth: 1
        },
        yaxis: {
            title: 'Y',
            range: [...PLOT_RANGE.y],
            gridcolor: '#e2e8f0',
            zeroline: true,
            zerolinecolor: '#cbd5e1',
            zerolinewidth: 1
        },
        plot_bgcolor: '#f8fafc',
        paper_bgcolor: 'transparent',
        margin: { t: 20, b: 50, l: 60, r: 20 },
        showlegend: false,
        hovermode: 'closest',
        dragmode: false,
        shapes: [],
        annotations: []
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        scrollZoom: false,
        doubleClick: false
    };

    Plotly.newPlot('plot', traces, layout, config);

    // Klikniecie na wykresie - uzyj natywnego click zamiast plotly_click,
    // bo plotly_click nie dziala na pustym wykresie ani na pustej przestrzeni
    const plotEl = document.getElementById('plot');

    // Obsluga klikniecia na istniejacy punkt (usuwanie)
    plotEl.on('plotly_click', function(data) {
        if (!data || !data.points || data.points.length === 0) return;
        var clickedPoint = data.points[0];
        // Jesli kliknieto punkt danych (trace 0), usun go
        if (clickedPoint.curveNumber === 0) {
            var idx = clickedPoint.pointIndex;
            if (idx >= 0 && idx < state.points.length) {
                state.points.splice(idx, 1);
                onPointsChanged();
            }
        }
    });

    // Obsluga klikniecia na pusta przestrzen (dodawanie punktow)
    plotEl.addEventListener('click', function(evt) {
        // Jesli klikniecie pochodzi z punktu danych, plotly_click juz je obsluzyl
        // Sprawdz czy kliknieto w obszar plotArea (nie przyciski, legendy itp.)
        var target = evt.target;
        var isPlotArea = false;
        var el = target;
        while (el && el !== plotEl) {
            if (el.classList && (el.classList.contains('nsewdrag') || el.classList.contains('drag'))) {
                isPlotArea = true;
                break;
            }
            el = el.parentElement;
        }
        if (!isPlotArea) return;

        var xaxis = plotEl._fullLayout.xaxis;
        var yaxis = plotEl._fullLayout.yaxis;
        var bb = plotEl.getBoundingClientRect();
        var x = xaxis.p2d(evt.clientX - bb.left - plotEl._fullLayout.margin.l);
        var y = yaxis.p2d(evt.clientY - bb.top - plotEl._fullLayout.margin.t);

        // Sprawdz czy klikniecie jest w zakresie osi
        var xRange = xaxis.range;
        var yRange = yaxis.range;
        var xMin = Math.min(xRange[0], xRange[1]);
        var xMax = Math.max(xRange[0], xRange[1]);
        var yMin = Math.min(yRange[0], yRange[1]);
        var yMax = Math.max(yRange[0], yRange[1]);

        if (x < xMin || x > xMax || y < yMin || y > yMax) return;
        if (isNaN(x) || isNaN(y)) return;

        // Sprawdz czy kliknieto blisko istniejacego punktu - jesli tak, nie dodawaj
        // (plotly_click obsluguje usuwanie)
        var clickThreshold = (xMax - xMin) * 0.02;
        for (var i = 0; i < state.points.length; i++) {
            var dx = state.points[i].x - x;
            var dy = state.points[i].y - y;
            if (Math.sqrt(dx * dx + dy * dy) < clickThreshold) return;
        }

        // Sprawdz limit punktow
        if (state.points.length >= 100) return;

        state.points.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        });
        onPointsChanged();
    });
}


function onPointsChanged() {
    updatePlotPoints();

    if (state.points.length >= 3) {
        scheduleComputation();
    } else {
        // Za malo punktow - wyczysc wyniki
        state.results = null;
        clearResults();
        clearRegressionLine();
        clearDeviationShapes();
        updateDataTable();
    }
}

function updatePlotPoints() {
    const xs = state.points.map(p => p.x);
    const ys = state.points.map(p => p.y);

    Plotly.restyle('plot', {
        x: [xs],
        y: [ys]
    }, [0]);

    // Dynamiczny zakres
    updatePlotRange();
}

function updatePlotRange() {
    if (state.points.length === 0) {
        Plotly.relayout('plot', {
            'xaxis.range': [...PLOT_RANGE.x],
            'yaxis.range': [...PLOT_RANGE.y]
        });
        return;
    }

    const xs = state.points.map(p => p.x);
    const ys = state.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padX = Math.max((maxX - minX) * 0.15, 2);
    const padY = Math.max((maxY - minY) * 0.15, 2);

    Plotly.relayout('plot', {
        'xaxis.range': [minX - padX, maxX + padX],
        'yaxis.range': [minY - padY, maxY + padY]
    });
}

function updateRegressionLine() {
    if (!state.results) {
        clearRegressionLine();
        return;
    }

    const xs = state.points.map(p => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const padX = (maxX - minX) * 0.2;

    const x1 = minX - padX;
    const x2 = maxX + padX;
    const slope = state.results.slope;
    const intercept = state.results.intercept;
    const y1 = slope * x1 + intercept;
    const y2 = slope * x2 + intercept;

    Plotly.restyle('plot', {
        x: [[x1, x2]],
        y: [[y1, y2]]
    }, [1]);
}

function clearRegressionLine() {
    Plotly.restyle('plot', {
        x: [[]],
        y: [[]]
    }, [1]);
}

function updateDeviationShapes() {
    if (!state.results || !state.showDeviations) {
        clearDeviationShapes();
        return;
    }

    const shapes = [];
    const meanX = state.results.mean_x;
    const meanY = state.results.mean_y;
    const details = state.results.point_details;

    // Linie srednich (x_bar i y_bar)
    shapes.push({
        type: 'line',
        x0: meanX, x1: meanX,
        y0: 0, y1: 1,
        yref: 'paper',
        line: { color: COLORS.meanLineX, width: 1.5, dash: 'dash' }
    });
    shapes.push({
        type: 'line',
        x0: 0, x1: 1,
        xref: 'paper',
        y0: meanY, y1: meanY,
        line: { color: COLORS.meanLineY, width: 1.5, dash: 'dash' }
    });

    // Prostokaty odchylen dla kazdego punktu
    for (let i = 0; i < details.length; i++) {
        const pt = details[i];
        if (pt.dx === null || pt.dy === null) continue;

        const product = pt.product;
        const fillColor = product >= 0 ? COLORS.deviationPos : COLORS.deviationNeg;

        // Prostokat od (mean_x, mean_y) do (xi, yi)
        shapes.push({
            type: 'rect',
            x0: meanX,
            y0: meanY,
            x1: pt.x,
            y1: pt.y,
            fillcolor: fillColor,
            line: { width: 0 },
            opacity: 0.4
        });
    }

    Plotly.relayout('plot', { shapes: shapes });
}

function clearDeviationShapes() {
    Plotly.relayout('plot', { shapes: [] });
}

// === PRESETY ===
function setupPresets() {
    document.querySelectorAll('.pc-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            if (type === 'clear') {
                state.points = [];
                state.results = null;
                clearResults();
                clearRegressionLine();
                clearDeviationShapes();
                updatePlotPoints();
                updateDataTable();
                return;
            }
            loadDataset(type);
        });
    });
}

async function loadDataset(type) {
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.points) {
            state.points = data.points;
            onPointsChanged();
        }
    } catch (error) {
        console.error('Blad ladowania danych:', error.message);
    }
}

// === TOGGLE ODCHYLEN ===
function setupDeviationToggle() {
    document.getElementById('show-deviations').addEventListener('change', function() {
        state.showDeviations = this.checked;
        if (state.results) {
            updateDeviationShapes();
        }
    });
}

// === OBLICZENIA ===
function scheduleComputation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => triggerComputation(), 200);
}

async function triggerComputation() {
    const loadingEl = document.getElementById('loading');

    if (state.points.length < 3) {
        state.results = null;
        clearResults();
        return;
    }

    try {
        loadingEl.classList.add('st-loading--active');

        const response = await fetch('/api/compute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: state.points })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            state.results = data;
            updateStats();
            updateRegressionLine();
            updateDeviationShapes();
            updateDataTable();
            updateFormula();
        } else {
            state.results = null;
            clearResults();
            clearRegressionLine();
            clearDeviationShapes();
        }

    } catch (error) {
        console.error('Blad obliczen:', error.message);
        state.results = null;
        clearResults();
        clearRegressionLine();
        clearDeviationShapes();
    } finally {
        loadingEl.classList.remove('st-loading--active');
    }
}

// === PANEL WYNIKOW ===
function updateStats() {
    const res = state.results;
    if (!res) {
        clearResults();
        return;
    }

    // r
    const rEl = document.getElementById('stat-r');
    rEl.textContent = res.r.toFixed(4);

    // Kolorowanie r
    const rDisplay = document.getElementById('r-display');
    rDisplay.classList.remove('pc-r-display--positive', 'pc-r-display--negative', 'pc-r-display--neutral');
    if (res.r > 0) {
        rDisplay.classList.add('pc-r-display--positive');
    } else if (res.r < 0) {
        rDisplay.classList.add('pc-r-display--negative');
    } else {
        rDisplay.classList.add('pc-r-display--neutral');
    }

    // r^2
    document.getElementById('stat-r2').textContent = res.r_squared.toFixed(4);

    // p-value
    const pEl = document.getElementById('stat-pvalue');
    if (res.p_value < 0.001) {
        pEl.textContent = '< 0.001';
    } else {
        pEl.textContent = res.p_value.toFixed(4);
    }

    // n
    document.getElementById('stat-n').textContent = res.n;

    // df
    document.getElementById('stat-df').textContent = res.df;

    // Interpretacja
    const interpEl = document.getElementById('stat-interpretation');
    const interpBox = document.getElementById('interpretation-box');
    interpBox.classList.remove('pc-interpretation--positive', 'pc-interpretation--negative', 'pc-interpretation--weak');

    let interpText = res.strength_label + ' korelacja';
    if (res.direction === 'dodatnia') {
        interpText += ' dodatnia';
        interpBox.classList.add('pc-interpretation--positive');
    } else if (res.direction === 'ujemna') {
        interpText += ' ujemna';
        interpBox.classList.add('pc-interpretation--negative');
    } else {
        interpBox.classList.add('pc-interpretation--weak');
    }

    if (res.p_value < 0.05) {
        interpText += ' (istotna statystycznie, p < 0.05)';
    } else {
        interpText += ' (nieistotna statystycznie, p \u2265 0.05)';
    }
    interpEl.textContent = interpText;

    // Srednie
    document.getElementById('stat-mean-x').textContent = res.mean_x.toFixed(4);
    document.getElementById('stat-mean-y').textContent = res.mean_y.toFixed(4);

    // Rownanie regresji
    const regEl = document.getElementById('stat-regression');
    const slopeStr = res.slope >= 0 ? res.slope.toFixed(4) : '(' + res.slope.toFixed(4) + ')';
    const interceptStr = res.intercept >= 0
        ? '+ ' + res.intercept.toFixed(4)
        : '- ' + Math.abs(res.intercept).toFixed(4);
    regEl.textContent = `y\u0302 = ${slopeStr}\u00B7x ${interceptStr}`;
}

function updateFormula() {
    const res = state.results;
    const container = document.getElementById('formula-values');
    if (!res) {
        container.textContent = '';
        return;
    }

    const sumProd = res.sum_products.toFixed(4);
    const sumDxSq = res.sum_dx_sq.toFixed(4);
    const sumDySq = res.sum_dy_sq.toFixed(4);
    const denominator = Math.sqrt(res.sum_dx_sq * res.sum_dy_sq);
    const denomStr = denominator.toFixed(4);

    container.textContent = '';
    var computed = document.createElement('div');
    computed.className = 'pc-formula__computed';

    computed.appendChild(document.createTextNode('r = '));

    var frac = document.createElement('span');
    frac.className = 'pc-formula__frac';

    var num = document.createElement('span');
    num.className = 'pc-formula__num';
    num.textContent = sumProd;
    frac.appendChild(num);

    var den = document.createElement('span');
    den.className = 'pc-formula__den';
    den.textContent = '\u221A(' + sumDxSq + ' \u00B7 ' + sumDySq + ') = ' + denomStr;
    frac.appendChild(den);

    computed.appendChild(frac);
    computed.appendChild(document.createTextNode(' = '));

    var strong = document.createElement('strong');
    strong.textContent = res.r.toFixed(4);
    computed.appendChild(strong);

    container.appendChild(computed);
}

function clearResults() {
    document.getElementById('stat-r').textContent = '-';
    document.getElementById('stat-r2').textContent = '-';
    document.getElementById('stat-pvalue').textContent = '-';
    document.getElementById('stat-n').textContent = state.points.length;
    document.getElementById('stat-df').textContent = '-';
    document.getElementById('stat-interpretation').textContent = 'Dodaj co najmniej 3 punkty';
    document.getElementById('stat-regression').textContent = '-';
    document.getElementById('stat-mean-x').textContent = '-';
    document.getElementById('stat-mean-y').textContent = '-';
    document.getElementById('formula-values').textContent = '';

    const rDisplay = document.getElementById('r-display');
    rDisplay.classList.remove('pc-r-display--positive', 'pc-r-display--negative', 'pc-r-display--neutral');

    const interpBox = document.getElementById('interpretation-box');
    interpBox.classList.remove('pc-interpretation--positive', 'pc-interpretation--negative', 'pc-interpretation--weak');
}

// === TABELA DANYCH ===
function updateDataTable() {
    const section = document.getElementById('data-section');
    const tbody = document.getElementById('data-tbody');
    const tfoot = document.getElementById('data-tfoot');

    if (state.points.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const res = state.results;
    const details = res ? res.point_details : null;

    let html = '';

    for (let i = 0; i < state.points.length; i++) {
        const pt = state.points[i];
        const d = details ? details[i] : null;

        const productClass = d && d.product !== null
            ? (d.product >= 0 ? 'pc-table__product--positive' : 'pc-table__product--negative')
            : '';

        html += '<tr>';
        html += `<td class="pc-table__idx">${i + 1}</td>`;
        html += `<td>${pt.x.toFixed(2)}</td>`;
        html += `<td>${pt.y.toFixed(2)}</td>`;

        if (d) {
            html += `<td>${d.dx !== null ? d.dx.toFixed(4) : '-'}</td>`;
            html += `<td>${d.dy !== null ? d.dy.toFixed(4) : '-'}</td>`;
            html += `<td class="${productClass}">${d.product !== null ? d.product.toFixed(4) : '-'}</td>`;
            html += `<td>${d.dx_sq !== null ? d.dx_sq.toFixed(4) : '-'}</td>`;
            html += `<td>${d.dy_sq !== null ? d.dy_sq.toFixed(4) : '-'}</td>`;
        } else {
            html += '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>';
        }

        html += '</tr>';
    }

    tbody.innerHTML = html;

    // Stopka z sumami
    if (res) {
        const sumProductClass = res.sum_products >= 0
            ? 'pc-table__product--positive' : 'pc-table__product--negative';

        tfoot.innerHTML =
            '<tr class="pc-table__sum-row">' +
            '<td colspan="3"><strong>\u03A3</strong></td>' +
            '<td>-</td>' +
            '<td>-</td>' +
            `<td class="${sumProductClass}"><strong>${res.sum_products.toFixed(4)}</strong></td>` +
            `<td><strong>${res.sum_dx_sq.toFixed(4)}</strong></td>` +
            `<td><strong>${res.sum_dy_sq.toFixed(4)}</strong></td>` +
            '</tr>';
    } else {
        tfoot.innerHTML = '';
    }
}
