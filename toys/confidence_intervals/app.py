from flask import Flask, render_template, jsonify, request
import json
import random
import os
import sys

# === Ładowanie danych z JSON ===

def get_bundle_dir():
    """Zwraca ścieżkę do katalogu z plikami (dev vs .exe)"""
    if getattr(sys, 'frozen', False):
        # W .exe - PyInstaller wypakował do _MEIPASS
        return sys._MEIPASS
    else:
        # Dev mode
        return os.path.dirname(__file__)

# Ustawienie ścieżek dla Flask (ważne dla PyInstaller)
bundle_dir = get_bundle_dir()
app = Flask(__name__,
            template_folder=os.path.join(bundle_dir, 'templates'),
            static_folder=os.path.join(bundle_dir, 'static'))

def load_json(filename):
    """Wczytuje plik JSON"""
    bundle_dir = get_bundle_dir()
    json_path = os.path.join(bundle_dir, filename)

    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Wczytaj konfigurację i pytania na starcie aplikacji (cache)
CI_CONFIG = load_json('ci_config.json')['modes']
QUESTIONS = {
    'single_interval': load_json('questions/single_interval.json')['questions'],
    'two_intervals': load_json('questions/two_intervals.json')['questions']
}

MAX_QUESTIONS = 10  # Liczba pytań w jednym podejściu

# === Sesja quizu (in-memory, globalna dla single-user desktop app) ===
quiz_session = {
    'mode_id': None,
    'remaining_questions': [],
    'shuffled': False
}

# === Routing ===

@app.route('/')
def index():
    """Strona główna - menu wyboru trybu"""
    return render_template('menu.html', modes=CI_CONFIG)

@app.route('/quiz/<mode_id>')
def quiz(mode_id):
    """Strona quizu dla danego trybu"""
    mode_config = next((m for m in CI_CONFIG if m['id'] == mode_id), None)

    if not mode_config:
        return "Tryb nie znaleziony", 404

    return render_template('quiz.html', mode=mode_config)

# === API Endpoints ===

@app.route('/api/quiz/<mode_id>/start', methods=['POST'])
def start_quiz(mode_id):
    """
    Inicjalizuje sesję quizu: tasuje pytania

    Returns:
        JSON: {success: bool, total_questions: int}
    """
    try:
        # Sprawdź czy tryb istnieje
        if mode_id not in QUESTIONS:
            raise ValueError(f"Nieznany tryb: {mode_id}")

        # Tasuj wszystkie pytania i wybierz MAX_QUESTIONS
        question_ids = [q['id'] for q in QUESTIONS[mode_id]]
        random.shuffle(question_ids)
        question_ids = question_ids[:MAX_QUESTIONS]

        # Zapisz w sesji
        quiz_session['mode_id'] = mode_id
        quiz_session['remaining_questions'] = question_ids
        quiz_session['shuffled'] = True

        return jsonify({
            'success': True,
            'total_questions': len(question_ids)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd inicjalizacji: {str(e)}'
        }), 500

@app.route('/api/quiz/<mode_id>/next', methods=['GET'])
def next_question(mode_id):
    """
    Zwraca kolejne pytanie (bez odpowiedzi correct)

    Returns:
        JSON: {
            success: bool,
            finished: bool,
            question: {...},  # BEZ pola 'correct' i 'explanation'
            remaining: int
        }
    """
    try:
        # Sprawdź czy sesja jest zainicjalizowana
        if not quiz_session['shuffled'] or quiz_session['mode_id'] != mode_id:
            return jsonify({
                'success': False,
                'error': 'Sesja nie została zainicjalizowana. Wywołaj /start najpierw.'
            }), 400

        # Sprawdź czy są pytania
        if not quiz_session['remaining_questions']:
            return jsonify({
                'success': True,
                'finished': True,
                'message': 'Gratulacje! Przeszedłeś przez wszystkie pytania.'
            })

        # Pobierz kolejne pytanie
        next_id = quiz_session['remaining_questions'][0]
        question = next((q for q in QUESTIONS[mode_id] if q['id'] == next_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {next_id} nie znalezione w trybie {mode_id}")

        # Usuń wrażliwe pola (correct, explanation)
        question_safe = {k: v for k, v in question.items() if k not in ['correct', 'explanation']}

        return jsonify({
            'success': True,
            'finished': False,
            'question': question_safe,
            'remaining': len(quiz_session['remaining_questions'])
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania pytania: {str(e)}'
        }), 500

@app.route('/api/quiz/<mode_id>/check', methods=['POST'])
def check_answer(mode_id):
    """
    Sprawdza odpowiedź użytkownika

    Body:
        {question_id: int, answer: str}

    Returns:
        JSON: {
            success: bool,
            correct: bool,
            explanation: str,
            correct_answer: str
        }
    """
    try:
        data = request.json
        question_id = int(data.get('question_id'))
        user_answer = data.get('answer')  # "tak", "nie", "nie_mozna_powiedziec"

        # Znajdź pytanie
        question = next((q for q in QUESTIONS[mode_id] if q['id'] == question_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {question_id} nie znalezione w trybie {mode_id}")

        # Sprawdź odpowiedź
        is_correct = (user_answer == question['correct'])

        # Usuń pytanie z remaining (użytkownik już na nie odpowiedział)
        if question_id in quiz_session['remaining_questions']:
            quiz_session['remaining_questions'].remove(question_id)

        return jsonify({
            'success': True,
            'correct': is_correct,
            'explanation': question['explanation'],
            'correct_answer': question['correct'],
            'question_data': question  # Dane do wizualizacji (przedziały CI)
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd sprawdzania odpowiedzi: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)  # Port 5002 (quiz_app używa 5001, histogram 5000)
