from flask import Flask, render_template, jsonify, request
import math
import numpy as np
from scipy import stats
import os
import sys

from common.flask_app import register_common_static


def get_bundle_dir():
    """Zwraca ścieżkę do katalogu z plikami (dev vs .exe)"""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    else:
        return os.path.dirname(__file__)


bundle_dir = get_bundle_dir()
app = Flask(__name__,
            template_folder=os.path.join(bundle_dir, 'templates'),
            static_folder=os.path.join(bundle_dir, 'static'))

register_common_static(app, bundle_dir if getattr(sys, 'frozen', False) else None)


def _validate_request_json():
    """Waliduje że request zawiera poprawny JSON. Rzuca ValueError jeśli nie."""
    data = request.json
    if data is None:
        raise ValueError("Wymagane dane w formacie JSON")
    return data


def _validate_alpha(alpha_raw):
    """Waliduje i zwraca alpha. Rzuca ValueError jeśli niepoprawne."""
    alpha = float(alpha_raw)
    if not (0 < alpha < 1):
        raise ValueError("Poziom istotności (alpha) musi być między 0 a 1")
    if math.isnan(alpha) or math.isinf(alpha):
        raise ValueError("Poziom istotności (alpha) musi być liczbą skończoną")
    return alpha


def _validate_table(table):
    """Waliduje tabelę kontyngencji. Rzuca ValueError jeśli niepoprawna."""
    if table.ndim != 2:
        raise ValueError("Tabela musi być dwuwymiarowa")
    if table.shape[0] < 2 or table.shape[1] < 2:
        raise ValueError("Tabela musi mieć co najmniej 2 wiersze i 2 kolumny")
    if table.shape[0] > 10 or table.shape[1] > 10:
        raise ValueError("Tabela może mieć maksymalnie 10 wierszy i 10 kolumn")
    if np.any(np.isnan(table)) or np.any(np.isinf(table)):
        raise ValueError("Tabela nie może zawierać wartości NaN lub nieskończonych")
    if np.any(table < 0):
        raise ValueError("Wartości nie mogą być ujemne")
    if np.sum(table) == 0:
        raise ValueError("Tabela nie może być pusta")

    row_sums = table.sum(axis=1)
    col_sums = table.sum(axis=0)
    if np.any(row_sums == 0):
        raise ValueError("Suma wiersza nie może być zerowa")
    if np.any(col_sums == 0):
        raise ValueError("Suma kolumny nie może być zerowa")


def _compute_chi_square(table, alpha):
    """
    Oblicza test chi-kwadrat dla zwalidowanej tabeli.

    Returns:
        dict z wynikami gotowymi do jsonify
    """
    chi2_stat, p_value, dof, expected = stats.chi2_contingency(table)
    critical_value = float(stats.chi2.ppf(1 - alpha, dof))

    # V Craméra
    n = table.sum()
    min_dim = min(table.shape[0] - 1, table.shape[1] - 1)
    cramers_v = float(np.sqrt(chi2_stat / (n * min_dim))) if min_dim > 0 and n > 0 else 0

    # Wkłady komórek
    contributions = ((table - expected) ** 2) / expected

    # Zabezpieczenie przed NaN/Infinity w wynikach
    def safe_float(val):
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f

    chi2_safe = safe_float(chi2_stat)
    p_safe = safe_float(p_value)
    crit_safe = safe_float(critical_value)
    v_safe = safe_float(cramers_v)

    # Ostrzeżenia
    warnings = []
    if np.any(expected < 5):
        warnings.append(
            "Uwaga: niektóre wartości oczekiwane są mniejsze niż 5. "
            "Wynik testu może być niewiarygodny."
        )

    return {
        'chi_square': round(chi2_safe, 4) if chi2_safe is not None else 0,
        'df': int(dof),
        'p_value': p_safe if p_safe is not None else 1.0,
        'critical_value': round(crit_safe, 4) if crit_safe is not None else None,
        'significant': bool(p_safe is not None and p_safe < alpha),
        'cramers_v': round(v_safe, 4) if v_safe is not None else 0,
        'expected': np.round(expected, 2).tolist(),
        'contributions': np.round(contributions, 4).tolist(),
        'warnings': warnings
    }


@app.route('/')
def index():
    """Strona główna"""
    return render_template('index.html')


@app.route('/api/compute', methods=['POST'])
def compute():
    """
    Oblicza test chi-kwadrat dla tabeli kontyngencji.

    Request JSON:
        table: 2D tablica liczności obserwowanych
        alpha: poziom istotności (domyślnie 0.05)

    Response JSON:
        chi_square, df, p_value, critical_value, significant,
        cramers_v, expected, contributions, warnings
    """
    try:
        data = _validate_request_json()

        if 'table' not in data:
            raise ValueError("Brak wymaganego pola 'table'")

        table = np.array(data['table'], dtype=float)
        alpha = _validate_alpha(data.get('alpha', 0.05))

        _validate_table(table)

        result = _compute_chi_square(table, alpha)
        result['success'] = True
        return jsonify(result)

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany błąd serwera'
        }), 500


@app.route('/api/generate-from-percentages', methods=['POST'])
def generate_from_percentages():
    """
    Generuje tabelę liczności z procentów i oblicza test chi-kwadrat.

    Request JSON:
        row_percentages: [[40, 35, 25], [35, 35, 30]]
        n: całkowita liczebność próbki
        row_split: [0.6, 0.4] - udział każdego wiersza
        alpha: poziom istotności (domyślnie 0.05)

    Response JSON:
        Jak /api/compute + pole 'table' z wygenerowanymi liczebnościami
    """
    try:
        data = _validate_request_json()

        if 'row_percentages' not in data:
            raise ValueError("Brak wymaganego pola 'row_percentages'")

        row_percentages = np.array(data['row_percentages'], dtype=float)
        alpha = _validate_alpha(data.get('alpha', 0.05))

        # Walidacja n
        n_raw = data.get('n', 200)
        if n_raw is None:
            raise ValueError("Wielkość próby (n) nie może być pusta")
        n = int(n_raw)
        if n < 10 or n > 10000:
            raise ValueError("Liczebność próbki musi być między 10 a 10000")

        row_split = np.array(data.get('row_split', [0.5, 0.5]), dtype=float)

        # Walidacja
        if np.any(np.isnan(row_percentages)) or np.any(np.isinf(row_percentages)):
            raise ValueError("Procenty nie mogą zawierać NaN lub nieskończonych wartości")
        if row_percentages.ndim != 2:
            raise ValueError("row_percentages musi być tablicą 2D")
        if row_percentages.shape[0] < 2 or row_percentages.shape[1] < 2:
            raise ValueError("Tabela musi mieć co najmniej 2 wiersze i 2 kolumny")
        if len(row_split) != row_percentages.shape[0]:
            raise ValueError("row_split musi mieć tyle elementów ile wierszy")
        if np.any(np.isnan(row_split)) or np.any(np.isinf(row_split)):
            raise ValueError("row_split nie może zawierać NaN lub nieskończonych wartości")

        # Normalizuj row_split
        row_split = row_split / row_split.sum()

        # Oblicz liczności wierszy
        row_totals = np.round(n * row_split).astype(int)
        row_totals[-1] = n - row_totals[:-1].sum()

        # Generuj tabelę liczności
        table = np.zeros_like(row_percentages, dtype=int)
        for i in range(row_percentages.shape[0]):
            pcts = row_percentages[i] / row_percentages[i].sum() * 100
            counts = np.round(row_totals[i] * pcts / 100).astype(int)
            counts[-1] = row_totals[i] - counts[:-1].sum()
            table[i] = counts

        # Upewnij się że nie ma ujemnych wartości
        table = np.maximum(table, 0)

        _validate_table(table)

        result = _compute_chi_square(table, alpha)
        result['success'] = True
        result['table'] = table.tolist()
        return jsonify(result)

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany błąd serwera'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5003)
