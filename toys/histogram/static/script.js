// Globalne parametry
let params = {
    n: 100,
    mean: 0,
    sd: 1,
    binwidth: null  // null = auto (Sturges)
};

// Debouncing timer (opóźnienie dla input fields)
let debounceTimer = null;

// Inicjalizacja przy załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    console.log('Histogram App - inicjalizacja');

    // Podpięcie event listenerów do pól input
    setupInputs();

    // Podpięcie przycisku regeneracji
    document.getElementById('btn-regenerate').addEventListener('click', function() {
        updatePlot();
    });

    // Wygeneruj pierwszy wykres
    updatePlot();
});

/**
 * Konfiguracja pól input - podpięcie event listenerów
 */
function setupInputs() {
    const inputs = [
        { id: 'param-n', param: 'n', type: 'int' },
        { id: 'param-mean', param: 'mean', type: 'float' },
        { id: 'param-sd', param: 'sd', type: 'float' },
        { id: 'param-binwidth', param: 'binwidth', type: 'float', optional: true }
    ];

    inputs.forEach(input => {
        const element = document.getElementById(input.id);

        element.addEventListener('input', function() {
            let value;

            // Jeśli pole jest puste i opcjonalne, ustaw null (auto)
            if (input.optional && this.value.trim() === '') {
                value = null;
            } else {
                // Parsuj wartość
                value = input.type === 'int'
                    ? parseInt(this.value)
                    : parseFloat(this.value);

                // Walidacja - jeśli NaN, pomiń update
                if (isNaN(value)) {
                    return;
                }
            }

            // Aktualizuj parametry
            params[input.param] = value;

            // Auto-update z debouncing (czekaj 300ms po ostatniej zmianie)
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updatePlot();
            }, 300);
        });
    });
}

/**
 * Główna funkcja - wywołuje backend i aktualizuje wykres
 */
async function updatePlot() {
    const loadingEl = document.getElementById('loading');

    try {
        // Pokaż loading indicator
        loadingEl.classList.add('active');

        // Wyślij request do Flask backend
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            // Narysuj wykres
            plotHistogram(data.histogram, data.params);

            // Zaktualizuj statystyki
            updateStats(data.stats);
        } else {
            console.error('Backend error:', data.error);
            alert('Błąd: ' + data.error);
        }

    } catch (error) {
        console.error('Network error:', error);
        alert('Błąd połączenia z serwerem: ' + error.message);
    } finally {
        // Ukryj loading indicator
        loadingEl.classList.remove('active');
    }
}

/**
 * Rysowanie histogramu używając Plotly.js
 */
function plotHistogram(histData, params) {
    // Oblicz szerokość binu
    const binWidth = histData.bin_edges[1] - histData.bin_edges[0];

    // Trace dla histogramu (słupki)
    const histTrace = {
        x: histData.bin_centers,
        y: histData.counts,
        type: 'bar',
        name: 'Histogram',
        width: binWidth * 0.98,  // 98% szerokości binu (praktycznie bez przerw)
        marker: {
            color: '#667eea',
            line: {
                color: '#5568d3',
                width: 0  // Bez ramek między słupkami
            }
        },
        hovertemplate:
            '<b>Przedział:</b> %{x:.2f}<br>' +
            '<b>Częstość:</b> %{y}<br>' +
            '<extra></extra>'
    };

    // Krzywa teoretyczna (gęstość rozkładu normalnego)
    const theoreticalTrace = generateNormalCurve(
        params.mean,
        params.sd,
        params.n,
        binWidth
    );

    const layout = {
        title: {
            text: `Rozkład Normalny N(${params.mean}, ${params.sd}²)`,
            font: {
                size: 20,
                family: 'Arial, sans-serif'
            }
        },
        xaxis: {
            title: 'Wartość',
            range: [-10, 10],  // STAŁY ZAKRES [-10, 10]
            gridcolor: '#e0e0e0',
            zeroline: true,
            zerolinecolor: '#999'
        },
        yaxis: {
            title: 'Częstość',
            gridcolor: '#e0e0e0'
        },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fafafa',
        margin: { t: 60, b: 60, l: 70, r: 40 },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            bordercolor: '#ddd',
            borderwidth: 1
        },
        hovermode: 'closest'
    };

    const config = {
        responsive: true,
        displayModeBar: false,  // Ukryj toolbar Plotly
        displaylogo: false
    };

    Plotly.newPlot('plot', [histTrace, theoreticalTrace], layout, config);
}

/**
 * Generuje krzywą teoretyczną rozkładu normalnego
 * Dla stałego zakresu [-10, 10]
 */
function generateNormalCurve(mean, sd, n, binWidth) {
    const xmin = -10;  // STAŁY ZAKRES
    const xmax = 10;   // STAŁY ZAKRES
    const points = 200;
    const x = [];
    const y = [];
    const step = (xmax - xmin) / points;

    for (let i = 0; i <= points; i++) {
        const xi = xmin + i * step;
        x.push(xi);

        // Gęstość rozkładu normalnego (PDF)
        const exponent = -0.5 * Math.pow((xi - mean) / sd, 2);
        const pdf = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);

        // Przeskaluj do częstości (pomnóż przez n i szerokość binu)
        y.push(pdf * n * binWidth);
    }

    return {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: 'Krzywa teoretyczna',
        line: {
            color: '#764ba2',
            width: 3,
            shape: 'spline'
        },
        hovertemplate:
            '<b>x:</b> %{x:.2f}<br>' +
            '<b>Gęstość:</b> %{y:.2f}<br>' +
            '<extra></extra>'
    };
}

/**
 * Aktualizacja statystyk opisowych
 */
function updateStats(stats) {
    document.getElementById('stat-mean').textContent = stats.mean.toFixed(3);
    document.getElementById('stat-sd').textContent = stats.sd.toFixed(3);
    document.getElementById('stat-median').textContent = stats.median.toFixed(3);
    document.getElementById('stat-min').textContent = stats.min.toFixed(2);
    document.getElementById('stat-q25').textContent = stats.q25.toFixed(2);
    document.getElementById('stat-q75').textContent = stats.q75.toFixed(2);
    document.getElementById('stat-max').textContent = stats.max.toFixed(2);
}
