"""
Obciazenie probkowania - interaktywna wizualizacja.

Backend Flask generujacy populacje i obciazone proby,
pokazujacy jak niereprezentatywne losowanie prowadzi
do blednych wnioskow statystycznych.
"""

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


# ── Definicje scenariuszy ─────────────────────────────────────────

SCENARIOS = {
    'restriction_of_range': {
        'id': 'restriction_of_range',
        'name': 'Ograniczenie zakresu',
        'description': (
            'Badaczka chce zbadac zwiazek miedzy dochodem a poczuciem szczescia. '
            'Zamiast wylosowac losowa probe z calej populacji, przeprowadza ankiete '
            'wsrod gosci luksusowego hotelu. Proba obejmuje wylacznie osoby '
            'o wysokich dochodach, co drastycznie ogranicza zakres zmiennej "dochod".'
        ),
        'x_label': 'Dochod (tys. zl)',
        'y_label': 'Poczucie szczescia (1-10)',
        'bias_description': 'Tylko goscie luksusowego hotelu (wysokie dochody)',
    },
    'truncation_bias': {
        'id': 'truncation_bias',
        'name': 'Obcinanie proby',
        'description': (
            'Uczelnia analizuje zwiazek miedzy liczba godzin nauki tygodniowo '
            'a wynikiem egzaminu koncowego. Jednak w analizie uwzgledniono tylko '
            'studentow, ktorzy zdali egzamin (wynik > 50%). Studenci, ktorzy '
            'nie zdali, zostali calkowicie pominieci.'
        ),
        'x_label': 'Godziny nauki / tydzien',
        'y_label': 'Wynik egzaminu (0-100)',
        'bias_description': 'Tylko studenci, ktorzy zdali egzamin (wynik > 50)',
    },
    'simpsons_paradox': {
        'id': 'simpsons_paradox',
        'name': 'Paradoks Simpsona',
        'description': (
            'Badacz analizuje zwiazek miedzy czasem poswieconym na cwiczenia '
            'a masa ciala. Zamiast zbadac losowa probe populacji, przeprowadza '
            'badanie wylacznie wsrod pensjonariuszy domu seniora. Wsrod seniorow, '
            'ci ktorzy wiecej cwicza maja wieksza mase miesniowa. Ale w ogolnej '
            'populacji (mlodzi + starsi), osoby cwiczace regularnie (zazwyczaj '
            'mlodsze) waza mniej.'
        ),
        'x_label': 'Czas cwiczen (h / tydzien)',
        'y_label': 'Masa ciala (kg)',
        'bias_description': 'Tylko seniorzy z domu opieki',
    },
}


# ── Pomocnicze ────────────────────────────────────────────────────

def safe_float(val):
    """Bezpieczna konwersja na float - zwraca None dla NaN/Inf/blednych wartosci."""
    try:
        f = float(val)
    except (ValueError, TypeError):
        return None
    if np.isnan(f) or np.isinf(f):
        return None
    return f


def _validate_request_json():
    """Waliduje ze request zawiera poprawny JSON. Rzuca ValueError jesli nie."""
    data = request.json
    if data is None:
        raise ValueError("Wymagane dane w formacie JSON")
    return data


def _validate_points(points_raw, max_points=500):
    """
    Waliduje i zwraca tablice punktow.

    Args:
        points_raw: lista slownikow [{x, y}, ...]
        max_points: maksymalna liczba punktow

    Returns:
        tuple: (x_array, y_array) jako numpy arrays
    """
    if not isinstance(points_raw, list):
        raise ValueError("Punkty musza byc lista")

    if len(points_raw) < 3:
        raise ValueError("Potrzeba co najmniej 3 punktow do obliczenia korelacji")

    if len(points_raw) > max_points:
        raise ValueError(f"Maksymalnie {max_points} punktow")

    xs = []
    ys = []
    for i, pt in enumerate(points_raw):
        if not isinstance(pt, dict) or 'x' not in pt or 'y' not in pt:
            raise ValueError(f"Punkt {i+1}: wymagane pola 'x' i 'y'")

        try:
            x = float(pt['x'])
            y = float(pt['y'])
        except (ValueError, TypeError):
            raise ValueError(f"Punkt {i+1}: wspolrzedne musza byc liczbami")

        if np.isnan(x) or np.isinf(x):
            raise ValueError(f"Punkt {i+1}: wspolrzedna x musi byc liczba skonczona")
        if np.isnan(y) or np.isinf(y):
            raise ValueError(f"Punkt {i+1}: wspolrzedna y musi byc liczba skonczona")

        xs.append(x)
        ys.append(y)

    x_arr = np.array(xs)
    y_arr = np.array(ys)

    if np.all(x_arr == x_arr[0]):
        raise ValueError("Wszystkie wartosci x sa identyczne - korelacja niezdefiniowana")
    if np.all(y_arr == y_arr[0]):
        raise ValueError("Wszystkie wartosci y sa identyczne - korelacja niezdefiniowana")

    return x_arr, y_arr


def _compute_stats(x, y):
    """
    Oblicza statystyki korelacji Pearsona.

    Args:
        x, y: numpy arrays

    Returns:
        dict z r, p_value, slope, intercept, n
    """
    n = len(x)
    if n < 3:
        return {
            'r': None, 'p_value': None,
            'slope': None, 'intercept': None,
            'n': n,
        }

    r_val, p_val = stats.pearsonr(x, y)
    slope, intercept, _, _, _ = stats.linregress(x, y)

    return {
        'r': round(safe_float(r_val), 4) if safe_float(r_val) is not None else 0,
        'p_value': safe_float(p_val),
        'slope': round(safe_float(slope), 4) if safe_float(slope) is not None else 0,
        'intercept': round(safe_float(intercept), 4) if safe_float(intercept) is not None else 0,
        'n': n,
    }


def _points_to_list(x, y):
    """Konwertuje numpy arrays na liste slownikow [{x, y}, ...]."""
    return [
        {'x': round(float(xi), 2), 'y': round(float(yi), 2)}
        for xi, yi in zip(x, y)
    ]


# ── Generatory scenariuszy ────────────────────────────────────────

def _generate_restriction_of_range(seed=None):
    """
    Scenariusz: ograniczenie zakresu.
    Populacja: dochod vs szczescie, r~0.65.
    Bias: tylko osoby o wysokich dochodach (x > 75. percentyl).
    """
    rng = np.random.default_rng(seed)
    n = 300

    # Populacja: dochod (20-120 tys) vs szczescie (1-10)
    # Target r ~ 0.65: sd_x=20, sd_y=1.5, cov = 0.65*20*1.5 = 19.5
    mean = [60, 5.5]
    cov = [[400, 19.5], [19.5, 2.25]]
    data = rng.multivariate_normal(mean, cov, size=n)

    x_pop = np.clip(data[:, 0], 15, 130)
    y_pop = np.clip(data[:, 1], 1, 10)

    # Bias: tylko wysokie dochody (top 25%)
    threshold = np.percentile(x_pop, 75)
    mask = x_pop >= threshold

    if np.sum(mask) < 3:
        mask[:10] = True

    x_sample = x_pop[mask]
    y_sample = y_pop[mask]

    scenario = SCENARIOS['restriction_of_range']
    return {
        'scenario': {k: v for k, v in scenario.items() if k != 'bias_description'},
        'population': {
            'points': _points_to_list(x_pop, y_pop),
            'stats': _compute_stats(x_pop, y_pop),
            'groups': None,
        },
        'sample': {
            'points': _points_to_list(x_sample, y_sample),
            'stats': _compute_stats(x_sample, y_sample),
            'bias_description': scenario['bias_description'],
        },
    }


def _generate_truncation_bias(seed=None):
    """
    Scenariusz: obcinanie proby.
    Populacja: godziny nauki vs wynik egzaminu, r~0.7.
    Bias: tylko studenci z wynikiem > 50 (zdali).
    """
    rng = np.random.default_rng(seed)
    n = 300

    # Target r ~ 0.7: sd_x=5, sd_y=15, cov = 0.7*5*15 = 52.5
    mean = [15, 55]
    cov = [[25, 52.5], [52.5, 225]]
    data = rng.multivariate_normal(mean, cov, size=n)

    x_pop = np.clip(data[:, 0], 0, 40)
    y_pop = np.clip(data[:, 1], 0, 100)

    # Bias: tylko zdani (y > 50)
    passing_threshold = 50
    mask = y_pop > passing_threshold

    if np.sum(mask) < 3:
        mask[:10] = True

    x_sample = x_pop[mask]
    y_sample = y_pop[mask]

    scenario = SCENARIOS['truncation_bias']
    return {
        'scenario': {k: v for k, v in scenario.items() if k != 'bias_description'},
        'population': {
            'points': _points_to_list(x_pop, y_pop),
            'stats': _compute_stats(x_pop, y_pop),
            'groups': None,
        },
        'sample': {
            'points': _points_to_list(x_sample, y_sample),
            'stats': _compute_stats(x_sample, y_sample),
            'bias_description': scenario['bias_description'],
        },
    }


def _generate_simpsons_paradox(seed=None):
    """
    Scenariusz: paradoks Simpsona.
    Populacja: 2 grupy (mlodzi + starsi).
    - Mlodzi: wiecej cwiczen, mniejsza waga, wewnetrzna r ~ +0.3
    - Starsi: mniej cwiczen, wieksza waga, wewnetrzna r ~ +0.3
    - Ogolna korelacja: ujemna (wiecej cwiczen = mlodsi = mniejsza waga)
    Bias: tylko starsi → korelacja dodatnia.
    """
    rng = np.random.default_rng(seed)

    # Mlodzi: srednia cwiczen=8h, waga=68kg
    n_young = 150
    # r=0.3: sd_x=2, sd_y=7, cov = 0.3*2*7 = 4.2
    mean_young = [8, 68]
    cov_young = [[4, 4.2], [4.2, 49]]
    data_young = rng.multivariate_normal(mean_young, cov_young, size=n_young)

    # Starsi: srednia cwiczen=3h, waga=82kg
    n_old = 150
    # r=0.3: sd_x=1.5, sd_y=6, cov = 0.3*1.5*6 = 2.7
    mean_old = [3, 82]
    cov_old = [[2.25, 2.7], [2.7, 36]]
    data_old = rng.multivariate_normal(mean_old, cov_old, size=n_old)

    # Polacz w populacje
    x_pop = np.clip(
        np.concatenate([data_young[:, 0], data_old[:, 0]]),
        0, 20
    )
    y_pop = np.clip(
        np.concatenate([data_young[:, 1], data_old[:, 1]]),
        40, 120
    )

    # Etykiety grup
    groups = ['young'] * n_young + ['old'] * n_old

    # Bias: tylko starsi
    x_sample = np.clip(data_old[:, 0], 0, 20)
    y_sample = np.clip(data_old[:, 1], 40, 120)

    scenario = SCENARIOS['simpsons_paradox']
    return {
        'scenario': {k: v for k, v in scenario.items() if k != 'bias_description'},
        'population': {
            'points': _points_to_list(x_pop, y_pop),
            'stats': _compute_stats(x_pop, y_pop),
            'groups': groups,
        },
        'sample': {
            'points': _points_to_list(x_sample, y_sample),
            'stats': _compute_stats(x_sample, y_sample),
            'bias_description': scenario['bias_description'],
        },
    }


_GENERATORS = {
    'restriction_of_range': _generate_restriction_of_range,
    'truncation_bias': _generate_truncation_bias,
    'simpsons_paradox': _generate_simpsons_paradox,
}


# ── Endpointy ─────────────────────────────────────────────────────

@app.route('/')
def index():
    """Strona glowna"""
    return render_template('index.html')


@app.route('/api/scenarios')
def scenarios():
    """Zwraca liste dostepnych scenariuszy."""
    result = []
    for sc in SCENARIOS.values():
        result.append({
            'id': sc['id'],
            'name': sc['name'],
            'description': sc['description'],
            'x_label': sc['x_label'],
            'y_label': sc['y_label'],
        })
    return jsonify({'success': True, 'scenarios': result})


@app.route('/api/generate', methods=['POST'])
def generate():
    """
    Generuje populacje i obciazona probe dla wybranego scenariusza.

    Request JSON:
        scenario_id: string - identyfikator scenariusza
        seed: int (opcjonalny) - ziarno generatora dla powtarzalnosci

    Response JSON:
        scenario, population, sample
    """
    try:
        data = _validate_request_json()

        scenario_id = data.get('scenario_id', '')
        if not scenario_id or scenario_id not in SCENARIOS:
            raise ValueError(f"Nieznany scenariusz: '{scenario_id}'")

        seed = data.get('seed', None)
        if seed is not None:
            seed = int(seed)

        generator = _GENERATORS[scenario_id]
        result = generator(seed)
        result['success'] = True
        return jsonify(result)

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany blad serwera'
        }), 500


@app.route('/api/compute', methods=['POST'])
def compute():
    """
    Oblicza statystyki korelacji dla podanych punktow.
    Uzywane przez tryb recznego zaznaczania regionu.

    Request JSON:
        points: [{x: float, y: float}, ...]

    Response JSON:
        r, p_value, slope, intercept, n
    """
    try:
        data = _validate_request_json()

        if 'points' not in data:
            raise ValueError("Brak wymaganego pola 'points'")

        x_arr, y_arr = _validate_points(data['points'])
        result = _compute_stats(x_arr, y_arr)
        result['success'] = True
        return jsonify(result)

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany blad serwera'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5005)
