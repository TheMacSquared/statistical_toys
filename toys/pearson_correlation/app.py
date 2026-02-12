"""
Korelacja Pearsona - interaktywna wizualizacja.

Backend Flask obliczajacy wspolczynnik korelacji Pearsona,
linie regresji i szczegolowy rozklad skladowych wzoru.
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


def _validate_points(points_raw):
    """
    Waliduje i zwraca tablice punktow.
    Rzuca ValueError jesli dane sa niepoprawne.

    Args:
        points_raw: lista slownikow [{x, y}, ...]

    Returns:
        tuple: (x_array, y_array) jako numpy arrays
    """
    if not isinstance(points_raw, list):
        raise ValueError("Punkty musza byc lista")

    if len(points_raw) < 3:
        raise ValueError("Potrzeba co najmniej 3 punktow do obliczenia korelacji")

    if len(points_raw) > 100:
        raise ValueError("Maksymalnie 100 punktow")

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

    # Sprawdz czy nie ma zerowej wariancji
    if np.all(x_arr == x_arr[0]):
        raise ValueError("Wszystkie wartosci x sa identyczne - korelacja niezdefiniowana")
    if np.all(y_arr == y_arr[0]):
        raise ValueError("Wszystkie wartosci y sa identyczne - korelacja niezdefiniowana")

    return x_arr, y_arr


def _compute_pearson(x_arr, y_arr):
    """
    Oblicza wspolczynnik korelacji Pearsona i powiazane statystyki.

    Args:
        x_arr: numpy array wspolrzednych x
        y_arr: numpy array wspolrzednych y

    Returns:
        dict z wynikami gotowymi do jsonify
    """
    n = len(x_arr)
    mean_x = float(np.mean(x_arr))
    mean_y = float(np.mean(y_arr))

    # Odchylenia od srednich
    dx = x_arr - mean_x  # (xi - x_bar)
    dy = y_arr - mean_y  # (yi - y_bar)

    # Skladowe wzoru Pearsona
    products = dx * dy           # (xi - x_bar)(yi - y_bar)
    dx_squared = dx ** 2         # (xi - x_bar)^2
    dy_squared = dy ** 2         # (yi - y_bar)^2

    sum_products = float(np.sum(products))
    sum_dx_sq = float(np.sum(dx_squared))
    sum_dy_sq = float(np.sum(dy_squared))

    # Pearson r via scipy (z p-value)
    r_value, p_value = stats.pearsonr(x_arr, y_arr)

    # r^2
    r_squared = r_value ** 2

    # Linia regresji: y = slope * x + intercept
    slope, intercept, _, _, std_err = stats.linregress(x_arr, y_arr)

    # Interpretacja sily korelacji
    abs_r = abs(r_value)
    if abs_r < 0.3:
        strength = "slaba"
        strength_label = "Slaba"
    elif abs_r < 0.7:
        strength = "umiarkowana"
        strength_label = "Umiarkowana"
    else:
        strength = "silna"
        strength_label = "Silna"

    # Kierunek
    if r_value > 0:
        direction = "dodatnia"
    elif r_value < 0:
        direction = "ujemna"
    else:
        direction = "brak"

    # Stopnie swobody
    df = n - 2

    # Bezpieczne wartosci
    r_safe = safe_float(r_value)
    r2_safe = safe_float(r_squared)
    p_safe = safe_float(p_value)
    slope_safe = safe_float(slope)
    intercept_safe = safe_float(intercept)
    stderr_safe = safe_float(std_err)

    # Dane per-punkt do tabeli
    point_details = []
    for i in range(n):
        point_details.append({
            'x': safe_float(x_arr[i]),
            'y': safe_float(y_arr[i]),
            'dx': safe_float(dx[i]),
            'dy': safe_float(dy[i]),
            'product': safe_float(products[i]),
            'dx_sq': safe_float(dx_squared[i]),
            'dy_sq': safe_float(dy_squared[i]),
        })

    return {
        'r': round(r_safe, 6) if r_safe is not None else 0,
        'r_squared': round(r2_safe, 6) if r2_safe is not None else 0,
        'p_value': p_safe if p_safe is not None else 1.0,
        'n': n,
        'df': df,
        'mean_x': round(safe_float(mean_x), 4) if safe_float(mean_x) is not None else 0,
        'mean_y': round(safe_float(mean_y), 4) if safe_float(mean_y) is not None else 0,
        'sum_products': round(safe_float(sum_products), 4) if safe_float(sum_products) is not None else 0,
        'sum_dx_sq': round(safe_float(sum_dx_sq), 4) if safe_float(sum_dx_sq) is not None else 0,
        'sum_dy_sq': round(safe_float(sum_dy_sq), 4) if safe_float(sum_dy_sq) is not None else 0,
        'slope': round(slope_safe, 6) if slope_safe is not None else 0,
        'intercept': round(intercept_safe, 6) if intercept_safe is not None else 0,
        'std_err': round(stderr_safe, 6) if stderr_safe is not None else 0,
        'strength': strength,
        'strength_label': strength_label,
        'direction': direction,
        'point_details': point_details,
    }


def _generate_dataset(dataset_type):
    """
    Generuje przykladowy zbior danych.

    Args:
        dataset_type: string - typ zbioru danych

    Returns:
        list of dicts [{x, y}, ...]
    """
    if dataset_type == 'perfect_positive':
        # Silna korelacja dodatnia z malym szumem
        n = 20
        x = np.linspace(1, 10, n)
        y = 2 * x + 1 + np.random.normal(0, 0.3, n)

    elif dataset_type == 'perfect_negative':
        # Silna korelacja ujemna z malym szumem
        n = 20
        x = np.linspace(1, 10, n)
        y = -1.5 * x + 15 + np.random.normal(0, 0.3, n)

    elif dataset_type == 'no_correlation':
        # Brak korelacji - chmura punktow
        n = 30
        x = np.random.uniform(1, 10, n)
        y = np.random.uniform(1, 10, n)

    elif dataset_type == 'nonlinear':
        # Zaleznosc nieliniowa (U-shape) - Pearson blisko 0 mimo silnej zaleznosci
        n = 30
        x = np.linspace(-5, 5, n)
        y = x ** 2 + np.random.normal(0, 1, n)

    elif dataset_type == 'outlier_effect':
        # Brak korelacji + jeden outlier ktory "tworzy" korelacje
        n = 20
        x = np.random.normal(5, 1, n)
        y = np.random.normal(5, 1, n)
        # Dodaj outlier daleko od reszty
        x = np.append(x, 15)
        y = np.append(y, 15)

    else:
        raise ValueError(f"Nieznany typ zbioru danych: {dataset_type}")

    # Zaokraglij do 2 miejsc po przecinku
    x = np.round(x, 2)
    y = np.round(y, 2)

    points = [{'x': float(xi), 'y': float(yi)} for xi, yi in zip(x, y)]
    return points


@app.route('/')
def index():
    """Strona glowna"""
    return render_template('index.html')


@app.route('/api/compute', methods=['POST'])
def compute():
    """
    Oblicza wspolczynnik korelacji Pearsona dla podanych punktow.

    Request JSON:
        points: [{x: float, y: float}, ...]

    Response JSON:
        r, r_squared, p_value, n, df, mean_x, mean_y,
        sum_products, sum_dx_sq, sum_dy_sq,
        slope, intercept, std_err,
        strength, strength_label, direction,
        point_details: [{x, y, dx, dy, product, dx_sq, dy_sq}, ...]
    """
    try:
        data = _validate_request_json()

        if 'points' not in data:
            raise ValueError("Brak wymaganego pola 'points'")

        x_arr, y_arr = _validate_points(data['points'])
        result = _compute_pearson(x_arr, y_arr)
        result['success'] = True
        return jsonify(result)

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany blad serwera'
        }), 500


@app.route('/api/generate', methods=['POST'])
def generate():
    """
    Generuje przykladowy zbior danych.

    Request JSON:
        type: string - typ zbioru danych
            'perfect_positive' | 'perfect_negative' | 'no_correlation'
            | 'nonlinear' | 'outlier_effect'

    Response JSON:
        points: [{x, y}, ...]
    """
    try:
        data = _validate_request_json()

        dataset_type = data.get('type', '')
        if not dataset_type or not isinstance(dataset_type, str):
            raise ValueError("Brak wymaganego pola 'type'")

        points = _generate_dataset(dataset_type)

        return jsonify({
            'success': True,
            'points': points
        })

    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Nieoczekiwany blad serwera'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5004)
