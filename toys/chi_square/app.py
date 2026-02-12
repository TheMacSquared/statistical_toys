from flask import Flask, render_template, jsonify, request
import numpy as np
from scipy import stats
import os
import sys

from common.flask_app import register_common_static


def get_bundle_dir():
    """Zwraca sciezke do katalogu z plikami (dev vs .exe)"""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    else:
        return os.path.dirname(__file__)


bundle_dir = get_bundle_dir()
app = Flask(__name__,
            template_folder=os.path.join(bundle_dir, 'templates'),
            static_folder=os.path.join(bundle_dir, 'static'))

register_common_static(app, bundle_dir if getattr(sys, 'frozen', False) else None)


@app.route('/')
def index():
    """Strona glowna"""
    return render_template('index.html')


@app.route('/api/compute', methods=['POST'])
def compute():
    """
    Oblicza test chi-kwadrat dla tabeli kontyngencji.

    Request JSON:
        table: 2D tablica licznosci obserwowanych
        alpha: poziom istotnosci (domyslnie 0.05)

    Response JSON:
        chi_square, df, p_value, critical_value, significant,
        cramers_v, expected, contributions, warnings
    """
    try:
        data = request.json
        table = np.array(data['table'], dtype=float)
        alpha = float(data.get('alpha', 0.05))

        # Walidacja
        if table.ndim != 2:
            raise ValueError("Tabela musi byc dwuwymiarowa")
        if table.shape[0] < 2 or table.shape[1] < 2:
            raise ValueError("Tabela musi miec co najmniej 2 wiersze i 2 kolumny")
        if np.any(table < 0):
            raise ValueError("Wartosci nie moga byc ujemne")
        if np.sum(table) == 0:
            raise ValueError("Tabela nie moze byc pusta")

        row_sums = table.sum(axis=1)
        col_sums = table.sum(axis=0)
        if np.any(row_sums == 0):
            raise ValueError("Suma wiersza nie moze byc zerowa")
        if np.any(col_sums == 0):
            raise ValueError("Suma kolumny nie moze byc zerowa")

        # Test chi-kwadrat (scipy)
        chi2_stat, p_value, dof, expected = stats.chi2_contingency(table)

        # Wartosc krytyczna
        critical_value = float(stats.chi2.ppf(1 - alpha, dof))

        # V Cramera
        n = table.sum()
        min_dim = min(table.shape[0] - 1, table.shape[1] - 1)
        cramers_v = float(np.sqrt(chi2_stat / (n * min_dim))) if min_dim > 0 and n > 0 else 0

        # Wklady komorek
        contributions = ((table - expected) ** 2) / expected

        # Ostrzezenia
        warnings = []
        if np.any(expected < 5):
            warnings.append(
                "Uwaga: niektore wartosci oczekiwane sa mniejsze niz 5. "
                "Wynik testu moze byc niewiarygodny."
            )

        return jsonify({
            'success': True,
            'chi_square': round(float(chi2_stat), 4),
            'df': int(dof),
            'p_value': float(p_value),
            'critical_value': round(critical_value, 4),
            'significant': bool(p_value < alpha),
            'cramers_v': round(cramers_v, 4),
            'expected': np.round(expected, 2).tolist(),
            'contributions': np.round(contributions, 4).tolist(),
            'warnings': warnings
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Nieoczekiwany blad: {str(e)}'
        }), 500


@app.route('/api/generate-from-percentages', methods=['POST'])
def generate_from_percentages():
    """
    Generuje tabele licznosci z procentow i oblicza test chi-kwadrat.

    Request JSON:
        row_percentages: [[40, 35, 25], [35, 35, 30]]
        n: calkowita liczebnosc probki
        row_split: [0.6, 0.4] - udzial kazdego wiersza
        alpha: poziom istotnosci (domyslnie 0.05)

    Response JSON:
        Jak /api/compute + pole 'table' z wygenerowanymi liczebnosciami
    """
    try:
        data = request.json
        row_percentages = np.array(data['row_percentages'], dtype=float)
        n = int(data.get('n', 200))
        row_split = np.array(data.get('row_split', [0.5, 0.5]), dtype=float)
        alpha = float(data.get('alpha', 0.05))

        # Walidacja
        if n < 10 or n > 10000:
            raise ValueError("Liczebnosc probki musi byc miedzy 10 a 10000")
        if row_percentages.ndim != 2:
            raise ValueError("row_percentages musi byc tablica 2D")
        if len(row_split) != row_percentages.shape[0]:
            raise ValueError("row_split musi miec tyle elementow ile wierszy")

        # Normalizuj row_split
        row_split = row_split / row_split.sum()

        # Oblicz licznosci wierszy
        row_totals = np.round(n * row_split).astype(int)
        # Korekta zaokraglen - dostosuj ostatni wiersz
        row_totals[-1] = n - row_totals[:-1].sum()

        # Generuj tabele licznosci
        table = np.zeros_like(row_percentages, dtype=int)
        for i in range(row_percentages.shape[0]):
            pcts = row_percentages[i] / row_percentages[i].sum() * 100
            counts = np.round(row_totals[i] * pcts / 100).astype(int)
            # Korekta zaokraglen - dostosuj ostatnia kolumne
            counts[-1] = row_totals[i] - counts[:-1].sum()
            table[i] = counts

        # Upewnij sie ze nie ma ujemnych wartosci
        table = np.maximum(table, 0)

        # Oblicz test chi-kwadrat (reuse logic)
        if np.sum(table) == 0:
            raise ValueError("Wygenerowana tabela jest pusta")

        row_sums = table.sum(axis=1)
        col_sums = table.sum(axis=0)
        if np.any(row_sums == 0) or np.any(col_sums == 0):
            raise ValueError("Wygenerowana tabela ma zerowe sumy wierszy/kolumn")

        chi2_stat, p_value, dof, expected = stats.chi2_contingency(table)
        critical_value = float(stats.chi2.ppf(1 - alpha, dof))

        n_total = table.sum()
        min_dim = min(table.shape[0] - 1, table.shape[1] - 1)
        cramers_v = float(np.sqrt(chi2_stat / (n_total * min_dim))) if min_dim > 0 and n_total > 0 else 0

        contributions = ((table - expected) ** 2) / expected

        warnings = []
        if np.any(expected < 5):
            warnings.append(
                "Uwaga: niektore wartosci oczekiwane sa mniejsze niz 5. "
                "Wynik testu moze byc niewiarygodny."
            )

        return jsonify({
            'success': True,
            'table': table.tolist(),
            'chi_square': round(float(chi2_stat), 4),
            'df': int(dof),
            'p_value': float(p_value),
            'critical_value': round(critical_value, 4),
            'significant': bool(p_value < alpha),
            'cramers_v': round(cramers_v, 4),
            'expected': np.round(expected, 2).tolist(),
            'contributions': np.round(contributions, 4).tolist(),
            'warnings': warnings
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Nieoczekiwany blad: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5003)
