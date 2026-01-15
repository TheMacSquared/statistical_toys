from flask import Flask, render_template, jsonify, request
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    """Strona główna - renderuje interfejs użytkownika"""
    return render_template('index.html')

@app.route('/api/generate', methods=['POST'])
def generate_histogram():
    """
    Generuje dane dla histogramu z rozkładu normalnego.

    Przyjmuje parametry:
    - n: liczba próbek (int)
    - mean: średnia rozkładu (float)
    - sd: odchylenie standardowe (float)
    - binwidth: szerokość binu (float, optional - None = auto)

    Zwraca:
    - histogram: dane do wykresu (counts, bins)
    - stats: statystyki opisowe próbki
    """
    try:
        # Odbierz parametry z JSON
        data = request.json
        n = int(data.get('n', 100))
        mean = float(data.get('mean', 0))
        sd = float(data.get('sd', 1))
        binwidth = data.get('binwidth', None)  # None = auto

        # Walidacja parametrów
        if n < 10 or n > 10000:
            raise ValueError("Liczba próbek musi być między 10 a 10000")
        if sd <= 0:
            raise ValueError("Odchylenie standardowe musi być większe od 0")

        # Generuj próbkę z rozkładu normalnego
        np.random.seed()  # Zapewnij różne wyniki przy każdym wywołaniu
        samples = np.random.normal(mean, sd, n)

        # Oblicz histogram
        if binwidth is not None:
            # Manual binwidth
            binwidth = float(binwidth)
            if binwidth <= 0:
                raise ValueError("Binwidth musi być > 0")

            # Oblicz liczbę binów na podstawie szerokości
            # Dla stałego zakresu [-10, 10]
            fixed_range = (-10, 10)
            range_width = fixed_range[1] - fixed_range[0]
            n_bins = int(np.ceil(range_width / binwidth))
            n_bins = min(max(n_bins, 5), 200)  # limit 5-200 binów

            hist, bin_edges = np.histogram(samples, bins=n_bins, range=fixed_range)
        else:
            # Auto (Sturges) - jak poprzednio, ale z fixed range
            n_bins = int(np.ceil(np.log2(n) + 1))
            n_bins = min(max(n_bins, 10), 50)  # między 10 a 50 binów

            hist, bin_edges = np.histogram(samples, bins=n_bins, range=(-10, 10))

        # Przygotuj dane do wysłania
        # Plotly potrzebuje środków binów dla bar plot
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        # Oblicz statystyki opisowe
        stats = {
            'mean': float(np.mean(samples)),
            'sd': float(np.std(samples, ddof=1)),  # ddof=1 dla próbki
            'min': float(np.min(samples)),
            'max': float(np.max(samples)),
            'median': float(np.median(samples)),
            'q25': float(np.percentile(samples, 25)),
            'q75': float(np.percentile(samples, 75))
        }

        # Oblicz rzeczywistą szerokość binu (dla zwrotu do frontendu)
        actual_binwidth = bin_edges[1] - bin_edges[0]

        result = {
            'success': True,
            'histogram': {
                'counts': hist.tolist(),
                'bin_centers': bin_centers.tolist(),
                'bin_edges': bin_edges.tolist()
            },
            'stats': stats,
            'params': {
                'n': n,
                'mean': mean,
                'sd': sd,
                'binwidth': actual_binwidth  # rzeczywista szerokość
            }
        }

        return jsonify(result)

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Nieoczekiwany błąd: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Uruchom serwer Flask (tylko dla testów - w produkcji używamy PyWebView)
    app.run(debug=True, port=5000)
