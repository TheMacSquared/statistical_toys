// === STAN APLIKACJI ===
const state = {
    currentScenario: null,
    population: null,
    sample: null,
    scenarioMeta: null,
    revealMode: false,
    populationRevealed: false,
    customSelecting: false,
    customStats: null,
};

// Kolory
const COLORS = {
    popPoint: 'rgba(148, 163, 184, 0.35)',
    popPointVisible: 'rgba(148, 163, 184, 0.5)',
    samplePoint: '#6366f1',
    popRegression: 'rgba(148, 163, 184, 0.6)',
    sampleRegression: '#ef4444',
    customRegression: '#22c55e',
    youngGroup: '#22c55e',
    oldGroup: '#f59e0b',
};

// === INICJALIZACJA ===
document.addEventListener('DOMContentLoaded', function() {
    loadScenarios();
    setupControls();
});


// === LADOWANIE SCENARIUSZY ===
async function loadScenarios() {
    try {
        const resp = await fetch('/api/scenarios');
        const data = await resp.json();
        if (!data.success) return;

        const container = document.getElementById('scenario-buttons');
        container.innerHTML = '';

        data.scenarios.forEach(sc => {
            const btn = document.createElement('button');
            btn.className = 'st-btn st-btn--secondary';
            btn.textContent = sc.name;
            btn.dataset.scenarioId = sc.id;
            btn.addEventListener('click', () => selectScenario(sc.id));
            container.appendChild(btn);
        });
    } catch (e) {
        console.error('Blad ladowania scenariuszy:', e);
    }
}


// === KONTROLKI ===
function setupControls() {
    document.getElementById('reveal-toggle').addEventListener('change', function() {
        state.revealMode = this.checked;
        if (state.population) {
            if (state.revealMode) {
                state.populationRevealed = false;
                document.getElementById('reveal-btn').style.display = '';
            } else {
                state.populationRevealed = true;
                document.getElementById('reveal-btn').style.display = 'none';
            }
            renderPlot();
            updateStatsPanel();
        }
    });

    document.getElementById('reveal-btn').addEventListener('click', function() {
        state.populationRevealed = true;
        this.style.display = 'none';
        renderPlot();
        updateStatsPanel();
    });

    document.getElementById('custom-toggle').addEventListener('change', function() {
        state.customSelecting = this.checked;
        state.customStats = null;
        document.getElementById('custom-stats').style.display = 'none';

        if (state.population) {
            const plotEl = document.getElementById('plot');
            Plotly.relayout(plotEl, {
                dragmode: state.customSelecting ? 'select' : 'zoom'
            });
        }
    });

    document.getElementById('new-data-btn').addEventListener('click', function() {
        if (state.currentScenario) {
            selectScenario(state.currentScenario);
        }
    });
}


// === WYBOR SCENARIUSZA ===
async function selectScenario(scenarioId) {
    // Aktualizuj przyciski
    document.querySelectorAll('#scenario-buttons .st-btn').forEach(btn => {
        btn.classList.toggle('bs-scenario-btn--active',
                             btn.dataset.scenarioId === scenarioId);
    });

    try {
        const resp = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario_id: scenarioId }),
        });
        const data = await resp.json();
        if (!data.success) {
            console.error('Blad generowania:', data.error);
            return;
        }

        state.currentScenario = scenarioId;
        state.population = data.population;
        state.sample = data.sample;
        state.scenarioMeta = data.scenario;
        state.populationRevealed = !state.revealMode;
        state.customStats = null;

        // Pokaz UI
        document.getElementById('story-box').style.display = '';
        document.getElementById('controls').style.display = '';
        document.getElementById('plot-area').style.display = '';
        document.getElementById('stats-panel').style.display = '';
        document.getElementById('edu-description').style.display = '';
        document.getElementById('custom-stats').style.display = 'none';

        // Reveal button
        if (state.revealMode) {
            document.getElementById('reveal-btn').style.display = '';
        } else {
            document.getElementById('reveal-btn').style.display = 'none';
        }

        updateStory(data.scenario, data.sample.bias_description);
        renderPlot();
        updateStatsPanel();

    } catch (e) {
        console.error('Blad sieci:', e);
    }
}


// === HISTORIA ===
function updateStory(scenario, biasDesc) {
    document.getElementById('story-title').textContent = scenario.name;
    document.getElementById('story-text').textContent = scenario.description;
    document.getElementById('story-bias').textContent = 'Bias: ' + biasDesc;
}


// === WYKRES ===
function renderPlot() {
    const traces = [];
    const pop = state.population;
    const sample = state.sample;
    const meta = state.scenarioMeta;
    const showPop = !state.revealMode || state.populationRevealed;
    const isSimpsons = state.currentScenario === 'simpsons_paradox';

    // Populacja
    if (showPop && pop) {
        if (isSimpsons && pop.groups) {
            // Simpson's: dwa kolory grup
            const youngX = [], youngY = [], oldX = [], oldY = [];
            pop.points.forEach((pt, i) => {
                if (pop.groups[i] === 'young') {
                    youngX.push(pt.x); youngY.push(pt.y);
                } else {
                    oldX.push(pt.x); oldY.push(pt.y);
                }
            });
            traces.push({
                x: youngX, y: youngY,
                mode: 'markers', type: 'scatter',
                name: 'Populacja (mlodzi)',
                marker: { color: COLORS.youngGroup, size: 6, opacity: 0.4 },
                hovertemplate: '<b>Mlodzi</b><br>(%{x:.1f}, %{y:.1f})<extra></extra>',
            });
            traces.push({
                x: oldX, y: oldY,
                mode: 'markers', type: 'scatter',
                name: 'Populacja (starsi)',
                marker: { color: COLORS.oldGroup, size: 6, opacity: 0.4 },
                hovertemplate: '<b>Starsi</b><br>(%{x:.1f}, %{y:.1f})<extra></extra>',
            });
        } else {
            traces.push({
                x: pop.points.map(p => p.x),
                y: pop.points.map(p => p.y),
                mode: 'markers', type: 'scatter',
                name: 'Populacja',
                marker: { color: COLORS.popPoint, size: 6 },
                hovertemplate: '<b>Populacja</b><br>(%{x:.1f}, %{y:.1f})<extra></extra>',
            });
        }
    }

    // Proba
    if (sample) {
        traces.push({
            x: sample.points.map(p => p.x),
            y: sample.points.map(p => p.y),
            mode: 'markers', type: 'scatter',
            name: 'Proba',
            marker: {
                color: COLORS.samplePoint,
                size: 10,
                line: { color: 'white', width: 1.5 },
                opacity: 0.9,
            },
            hovertemplate: '<b>Proba</b><br>(%{x:.1f}, %{y:.1f})<extra></extra>',
        });
    }

    // Linie regresji
    if (showPop && pop && pop.stats.slope !== null) {
        const regLine = getRegressionLine(pop.points, pop.stats);
        traces.push({
            x: regLine.x, y: regLine.y,
            mode: 'lines', type: 'scatter',
            name: 'Regresja (populacja)',
            line: { color: COLORS.popRegression, width: 2, dash: 'dash' },
            hoverinfo: 'skip',
        });
    }

    if (sample && sample.stats.slope !== null) {
        const regLine = getRegressionLine(sample.points, sample.stats);
        traces.push({
            x: regLine.x, y: regLine.y,
            mode: 'lines', type: 'scatter',
            name: 'Regresja (proba)',
            line: { color: COLORS.sampleRegression, width: 2.5, dash: 'solid' },
            hoverinfo: 'skip',
        });
    }

    const layout = {
        title: '',
        xaxis: {
            title: meta ? meta.x_label : 'X',
            gridcolor: '#e2e8f0',
            zeroline: true,
            zerolinecolor: '#cbd5e1',
        },
        yaxis: {
            title: meta ? meta.y_label : 'Y',
            gridcolor: '#e2e8f0',
            zeroline: true,
            zerolinecolor: '#cbd5e1',
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'transparent',
        margin: { t: 20, r: 20, b: 50, l: 60 },
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1,
        },
        dragmode: state.customSelecting ? 'select' : 'zoom',
        hovermode: 'closest',
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'autoScale2d'],
    };

    const plotEl = document.getElementById('plot');
    Plotly.newPlot(plotEl, traces, layout, config);

    // Event: zaznaczenie punktow
    plotEl.on('plotly_selected', function(eventData) {
        if (!state.customSelecting || !eventData || !eventData.points) return;
        handleCustomSelection(eventData.points);
    });
}


function getRegressionLine(points, stats) {
    const xs = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const margin = (xMax - xMin) * 0.05;
    const x0 = xMin - margin;
    const x1 = xMax + margin;
    return {
        x: [x0, x1],
        y: [stats.slope * x0 + stats.intercept, stats.slope * x1 + stats.intercept],
    };
}


// === CUSTOM SELECTION ===
async function handleCustomSelection(selectedPoints) {
    // Zbierz unikalne punkty z populacji (selectedPoints moga miec duplikaty z roznych traces)
    const pointSet = new Map();
    selectedPoints.forEach(pt => {
        const key = `${pt.x.toFixed(4)}_${pt.y.toFixed(4)}`;
        if (!pointSet.has(key)) {
            pointSet.set(key, { x: pt.x, y: pt.y });
        }
    });

    const customPoints = Array.from(pointSet.values());
    if (customPoints.length < 3) {
        document.getElementById('custom-stats').style.display = 'none';
        return;
    }

    try {
        const resp = await fetch('/api/compute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: customPoints }),
        });
        const data = await resp.json();
        if (!data.success) return;

        state.customStats = data;

        const customEl = document.getElementById('custom-stats');
        customEl.style.display = '';

        document.getElementById('custom-r').textContent = formatR(data.r);
        document.getElementById('custom-p').textContent = formatP(data.p_value);
        document.getElementById('custom-n').textContent = data.n;
        document.getElementById('custom-eq').textContent = formatEq(data.slope, data.intercept);
    } catch (e) {
        console.error('Blad obliczania custom selection:', e);
    }
}


// === PANEL STATYSTYK ===
function updateStatsPanel() {
    const pop = state.population;
    const sample = state.sample;
    const showPop = !state.revealMode || state.populationRevealed;

    // Populacja
    if (showPop && pop) {
        document.getElementById('pop-r').textContent = formatR(pop.stats.r);
        document.getElementById('pop-p').textContent = formatP(pop.stats.p_value);
        document.getElementById('pop-n').textContent = pop.stats.n;
        document.getElementById('pop-eq').textContent = formatEq(pop.stats.slope, pop.stats.intercept);
    } else {
        document.getElementById('pop-r').textContent = '???';
        document.getElementById('pop-p').textContent = '???';
        document.getElementById('pop-n').textContent = '???';
        document.getElementById('pop-eq').textContent = '???';
    }

    // Proba
    if (sample) {
        document.getElementById('sample-r').textContent = formatR(sample.stats.r);
        document.getElementById('sample-p').textContent = formatP(sample.stats.p_value);
        document.getElementById('sample-n').textContent = sample.stats.n;
        document.getElementById('sample-eq').textContent = formatEq(sample.stats.slope, sample.stats.intercept);
    }
}


// === FORMATOWANIE ===
function formatR(r) {
    if (r === null || r === undefined) return '-';
    return r.toFixed(4);
}

function formatP(p) {
    if (p === null || p === undefined) return '-';
    if (p < 0.0001) return '< 0.0001';
    return p.toFixed(4);
}

function formatEq(slope, intercept) {
    if (slope === null || intercept === null) return '-';
    const sign = intercept >= 0 ? '+' : '';
    return `y = ${slope.toFixed(2)}x ${sign}${intercept.toFixed(2)}`;
}
