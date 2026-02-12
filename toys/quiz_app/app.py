from flask import Flask, render_template, jsonify, request
import json
import random
import os
import sys

from common.flask_app import register_common_static

# === Ładowanie konfiguracji i pytań ===
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

# Wspólne pliki statyczne (shared.css)
register_common_static(app, bundle_dir if getattr(sys, 'frozen', False) else None)

def load_quiz_config():
    """Wczytuje konfigurację quizów z quiz_config.json"""
    bundle_dir = get_bundle_dir()
    config_path = os.path.join(bundle_dir, 'quiz_config.json')

    with open(config_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data['quizzes']

def load_questions_for_quiz(quiz_id):
    """Wczytuje pytania dla danego quizu"""
    bundle_dir = get_bundle_dir()

    # Znajdź konfigurację quizu
    quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

    if not quiz_config:
        raise ValueError(f"Quiz '{quiz_id}' nie znaleziony w konfiguracji")

    # Ścieżka do pliku pytań
    questions_path = os.path.join(bundle_dir, 'questions', quiz_config['file'])

    with open(questions_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data['questions']

# Wczytaj konfigurację quizów na starcie
QUIZ_CONFIG = load_quiz_config()

# Cache pytań dla każdego quizu
QUESTIONS_CACHE = {}

# Cache dla errors_info (quiz interpretacyjny)
ERRORS_INFO_CACHE = {}

def load_errors_info(errors_file):
    """Wczytuje informacje o błędach interpretacyjnych"""
    bundle_dir = get_bundle_dir()
    errors_path = os.path.join(bundle_dir, 'questions', errors_file)
    with open(errors_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def format_interpretation_results(question):
    """Formatuje wyniki testu do czytelnego wyświetlenia"""
    results = question['results']
    test_type = question['test_type']
    unit = question.get('unit', '')
    unit_str = f" {unit}" if unit else ""

    lines = []

    if test_type == 't_jednej_proby':
        lines.append(f"Średnia w próbie: {results['mean']}{unit_str}")
        lines.append(f"Odchylenie standardowe: {results['sd']}{unit_str}")
        lines.append(f"Liczebność próby: n = {results['n']}")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'proporcji':
        lines.append(f"Odsetek w próbie: {int(results['proportion'] * 100)}%")
        lines.append(f"Liczebność próby: n = {results['n']}")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 't_dwoch_prob':
        lines.append(f"Grupa '{results['label1']}': średnia = {results['mean1']}{unit_str} (odch. std. = {results['sd1']}), n = {results['n1']}")
        lines.append(f"Grupa '{results['label2']}': średnia = {results['mean2']}{unit_str} (odch. std. = {results['sd2']}), n = {results['n2']}")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'korelacja':
        lines.append(f"Współczynnik korelacji: r = {results['r']}")
        lines.append(f"Liczebność próby: n = {results['n']}")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'chi_kwadrat':
        lines.append(f"Liczebność próby: n = {results['n']}")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'anova':
        means = results.get('means', {})
        for group, mean in means.items():
            lines.append(f"Grupa '{group}': średnia = {mean}{unit_str}")
        if 'n_per_group' in results:
            lines.append(f"Liczebność grup: n = {results['n_per_group']} każda")
        lines.append(f"Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    return lines

# === Sesja quizu (in-memory, per-user) ===
# W uproszczeniu: jedna globalna sesja (wystarczy dla single-user desktop app)
MAX_QUESTIONS = 10  # Liczba pytań w jednym podejściu

quiz_session = {
    'current_quiz_id': None,
    'remaining_questions': [],  # ID pytań do wylosowania
    'shuffled': False,
    'questions': [],  # Aktualne pytania (cache dla bieżącego quizu)
    'total_in_round': 0  # Ile pytań w tym podejściu
}

# === ROUTING ===

@app.route('/')
def index():
    """Strona główna - menu wyboru quizu"""
    return render_template('menu.html', quizzes=QUIZ_CONFIG)

@app.route('/quiz/<quiz_id>')
def quiz(quiz_id):
    """Strona quizu dla danego ID"""
    # Znajdź konfigurację quizu
    quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

    if not quiz_config:
        return "Quiz not found", 404

    return render_template('quiz.html', quiz=quiz_config)

# === API ENDPOINTS ===

@app.route('/api/quiz/<quiz_id>/start', methods=['POST'])
def start_quiz(quiz_id):
    """
    Inicjalizuje sesję quizu: tasuje pytania

    Returns:
        JSON: {success: bool, total_questions: int}
    """
    try:
        # Wczytaj pytania dla quizu (z cache lub z pliku)
        if quiz_id not in QUESTIONS_CACHE:
            QUESTIONS_CACHE[quiz_id] = load_questions_for_quiz(quiz_id)

        questions = QUESTIONS_CACHE[quiz_id]

        # Tasuj wszystkie pytania i wybierz MAX_QUESTIONS
        question_ids = [q['id'] for q in questions]
        random.shuffle(question_ids)
        question_ids = question_ids[:MAX_QUESTIONS]

        # Zapisz w sesji
        quiz_session['current_quiz_id'] = quiz_id
        quiz_session['remaining_questions'] = question_ids
        quiz_session['shuffled'] = True
        quiz_session['questions'] = questions
        quiz_session['total_in_round'] = len(question_ids)

        return jsonify({
            'success': True,
            'total_questions': len(question_ids)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd inicjalizacji: {str(e)}'
        }), 500

@app.route('/api/quiz/<quiz_id>/next', methods=['GET'])
def next_question(quiz_id):
    """
    Zwraca kolejne pytanie (bez odpowiedzi)

    Returns:
        JSON: {
            success: bool,
            question: {id, question, ...},  # BEZ 'correct' i 'explanation'
            remaining: int,            # ile pytań zostało
            finished: bool             # czy koniec pytań
        }
    """
    try:
        # Sprawdź czy quiz jest zainicjalizowany
        if quiz_session['current_quiz_id'] != quiz_id or not quiz_session['shuffled']:
            # Auto-inicjalizacja
            start_quiz(quiz_id)

        # Sprawdź czy są pytania
        if not quiz_session['remaining_questions']:
            return jsonify({
                'success': True,
                'finished': True,
                'message': 'Gratulacje! Przeszedłeś przez wszystkie pytania.'
            })

        # Pobierz kolejne pytanie
        next_id = quiz_session['remaining_questions'][0]
        question = next((q for q in quiz_session['questions'] if q['id'] == next_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {next_id} nie znalezione")

        # Znajdź konfigurację quizu
        quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

        # Przygotuj odpowiedź w zależności od typu quizu
        if quiz_config and quiz_config.get('answer_type') == 'interpretation':
            # Quiz interpretacyjny - inny format
            answers = question['answers'].copy()
            random.shuffle(answers)

            sanitized_answers = []
            for i, ans in enumerate(answers):
                sanitized_answers.append({
                    'index': i,
                    'text': ans['text']
                })

            response_question = {
                'id': question['id'],
                'test_type': question['test_type'],
                'context': question['context'],
                'results': format_interpretation_results(question),
                'answers': sanitized_answers
            }
        else:
            # Standardowy quiz
            response_question = {
                'id': question['id'],
                'question': question['question']
            }

            # Dla quizów z losowaniem odpowiedzi (testy) - wybierz 3 losowe opcje
            # zawsze włączając poprawną odpowiedź
            if 'all_options' in question:
                correct_answer = question['correct']
                other_options = [opt for opt in question['all_options'] if opt != correct_answer]

                # Wylosuj niepoprawne opcje (3 dla 4-opcyjnych pytań, 2 dla reszty)
                random.shuffle(other_options)
                if len(question['all_options']) <= 4:
                    selected_wrong = other_options
                else:
                    selected_wrong = other_options[:2]

                # Połącz poprawną z nieprawiymi i wymieszaj
                selected_options = selected_wrong + [correct_answer]
                random.shuffle(selected_options)

                response_question['options'] = selected_options

        return jsonify({
            'success': True,
            'finished': False,
            'question': response_question,
            'remaining': len(quiz_session['remaining_questions'])
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd pobierania pytania: {str(e)}'
        }), 500

@app.route('/api/quiz/<quiz_id>/check', methods=['POST'])
def check_answer(quiz_id):
    """
    Sprawdza odpowiedź użytkownika

    Body:
        {question_id: int, answer: str} lub {question_id: int, answer_text: str}

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

        # Znajdź pytanie
        question = next((q for q in quiz_session['questions'] if q['id'] == question_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {question_id} nie znalezione")

        # Znajdź konfigurację quizu
        quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

        if quiz_config and quiz_config.get('answer_type') == 'interpretation':
            # Quiz interpretacyjny - odpowiedzi w formacie answers[]
            answer_text = data.get('answer_text', '')
            answers = question['answers']

            selected_answer = None
            correct_answer = None
            for ans in answers:
                if ans['text'] == answer_text:
                    selected_answer = ans
                if ans['correct']:
                    correct_answer = ans

            if not selected_answer:
                raise ValueError("Nie znaleziono wybranej odpowiedzi")

            is_correct = selected_answer['correct']

            # Usuń pytanie z remaining
            if question_id in quiz_session['remaining_questions']:
                quiz_session['remaining_questions'].remove(question_id)

            return jsonify({
                'success': True,
                'correct': is_correct,
                'explanation': selected_answer['feedback'],
                'correct_answer': correct_answer['text']
            })
        else:
            # Standardowy quiz
            user_answer = data.get('answer')

            # Sprawdź odpowiedź
            is_correct = (user_answer == question['correct'])

            # Usuń pytanie z remaining (użytkownik już na nie odpowiedział)
            if question_id in quiz_session['remaining_questions']:
                quiz_session['remaining_questions'].remove(question_id)

            return jsonify({
                'success': True,
                'correct': is_correct,
                'explanation': question['explanation'],
                'correct_answer': question['correct']
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

@app.route('/api/quiz-config')
def get_quiz_config():
    """Zwraca konfigurację aktualnego quizu"""
    quiz_id = quiz_session.get('current_quiz_id')

    if not quiz_id:
        return jsonify({'success': False, 'error': 'Brak aktywnego quizu'}), 400

    quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

    if not quiz_config:
        return jsonify({'success': False, 'error': 'Quiz nie znaleziony'}), 404

    return jsonify({
        'success': True,
        'quiz': quiz_config
    })

@app.route('/api/quiz/<quiz_id>/errors-info')
def get_errors_info(quiz_id):
    """Zwraca informacje o błędach interpretacyjnych dla quizu"""
    quiz_config = next((q for q in QUIZ_CONFIG if q['id'] == quiz_id), None)

    if not quiz_config:
        return jsonify({'success': False, 'error': 'Quiz nie znaleziony'}), 404

    errors_file = quiz_config.get('errors_file')
    if not errors_file:
        return jsonify({'success': False, 'error': 'Quiz nie ma informacji o błędach'}), 404

    if errors_file not in ERRORS_INFO_CACHE:
        ERRORS_INFO_CACHE[errors_file] = load_errors_info(errors_file)

    return jsonify({
        'success': True,
        'data': ERRORS_INFO_CACHE[errors_file]
    })

if __name__ == '__main__':
    # Uruchom serwer Flask (tylko dla testów - w produkcji używamy PyWebView)
    # Port 5001 (histogram używa 5000)
    app.run(debug=True, port=5001)
