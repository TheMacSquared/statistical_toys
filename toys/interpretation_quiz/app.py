from flask import Flask, render_template, jsonify, request
import json
import random
import os
import sys

# === Ładowanie konfiguracji i pytań ===
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

def load_errors_info():
    """Wczytuje informacje o błędach interpretacyjnych"""
    errors_path = os.path.join(bundle_dir, 'data', 'errors_info.json')
    with open(errors_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_questions():
    """Wczytuje pytania quizowe"""
    questions_path = os.path.join(bundle_dir, 'data', 'questions.json')
    with open(questions_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['questions']

# Wczytaj dane na starcie
ERRORS_INFO = load_errors_info()
QUESTIONS = load_questions()

# Sesja quizu (in-memory)
quiz_session = {
    'remaining_questions': [],
    'shuffled': False,
    'seen_errors_screen': False
}

# === ROUTING ===

@app.route('/')
def index():
    """Strona główna"""
    return render_template('menu.html')

@app.route('/quiz')
def quiz():
    """Strona quizu"""
    return render_template('quiz.html')

# === API ENDPOINTS ===

@app.route('/api/errors-info')
def get_errors_info():
    """Zwraca informacje o błędach interpretacyjnych"""
    return jsonify({
        'success': True,
        'data': ERRORS_INFO
    })

@app.route('/api/quiz/start', methods=['POST'])
def start_quiz():
    """
    Inicjalizuje sesję quizu: tasuje pytania
    """
    try:
        question_ids = [q['id'] for q in QUESTIONS]
        random.shuffle(question_ids)

        quiz_session['remaining_questions'] = question_ids
        quiz_session['shuffled'] = True
        quiz_session['seen_errors_screen'] = True

        return jsonify({
            'success': True,
            'total_questions': len(question_ids)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Błąd inicjalizacji: {str(e)}'
        }), 500

@app.route('/api/quiz/next', methods=['GET'])
def next_question():
    """
    Zwraca kolejne pytanie (bez informacji o poprawnej odpowiedzi)
    """
    try:
        if not quiz_session['shuffled']:
            start_quiz()

        if not quiz_session['remaining_questions']:
            return jsonify({
                'success': True,
                'finished': True,
                'message': 'Gratulacje! Ukończyłeś quiz.'
            })

        next_id = quiz_session['remaining_questions'][0]
        question = next((q for q in QUESTIONS if q['id'] == next_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {next_id} nie znalezione")

        # Przygotuj odpowiedzi (pomieszane, bez info o poprawności)
        answers = question['answers'].copy()
        random.shuffle(answers)

        # Przygotuj odpowiedź bez ujawniania poprawnej odpowiedzi
        sanitized_answers = []
        for i, ans in enumerate(answers):
            sanitized_answers.append({
                'index': i,
                'text': ans['text']
            })

        # Formatuj wyniki do wyświetlenia
        results_display = format_results(question)

        response_question = {
            'id': question['id'],
            'test_type': question['test_type'],
            'context': question['context'],
            'results': results_display,
            'answers': sanitized_answers
        }

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

def format_results(question):
    """Formatuje wyniki testu do czytelnego wyświetlenia"""
    results = question['results']
    test_type = question['test_type']
    unit = question.get('unit', '')
    unit_str = f" {unit}" if unit else ""

    lines = []

    if test_type == 't_jednej_proby':
        lines.append(f"• Średnia w próbie: {results['mean']}{unit_str}")
        lines.append(f"• Odchylenie standardowe: {results['sd']}{unit_str}")
        lines.append(f"• Liczebność próby: n = {results['n']}")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'proporcji':
        lines.append(f"• Odsetek w próbie: {int(results['proportion'] * 100)}%")
        lines.append(f"• Liczebność próby: n = {results['n']}")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 't_dwoch_prob':
        lines.append(f"• Grupa '{results['label1']}': średnia = {results['mean1']}{unit_str} (odch. std. = {results['sd1']}), n = {results['n1']}")
        lines.append(f"• Grupa '{results['label2']}': średnia = {results['mean2']}{unit_str} (odch. std. = {results['sd2']}), n = {results['n2']}")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'korelacja':
        lines.append(f"• Współczynnik korelacji: r = {results['r']}")
        lines.append(f"• Liczebność próby: n = {results['n']}")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'chi_kwadrat':
        lines.append(f"• Liczebność próby: n = {results['n']}")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    elif test_type == 'anova':
        means = results.get('means', {})
        for group, mean in means.items():
            lines.append(f"• Grupa '{group}': średnia = {mean}{unit_str}")
        if 'n_per_group' in results:
            lines.append(f"• Liczebność grup: n = {results['n_per_group']} każda")
        lines.append(f"• Wynik testu: {results['test_stat']}, p = {results['p_value']}")

    return lines

@app.route('/api/quiz/check', methods=['POST'])
def check_answer():
    """
    Sprawdza odpowiedź użytkownika
    """
    try:
        data = request.json
        question_id = int(data.get('question_id'))
        answer_index = int(data.get('answer_index'))

        question = next((q for q in QUESTIONS if q['id'] == question_id), None)

        if not question:
            raise ValueError(f"Pytanie ID {question_id} nie znalezione")

        # Znajdź aktualną kolejność odpowiedzi (musimy ją odtworzyć)
        # Używamy tego samego seeda co przy generowaniu pytania
        answers = question['answers'].copy()

        # Pobierz odpowiedź użytkownika
        # answer_index odnosi się do pomieszanej kolejności, więc musimy znaleźć
        # która to była odpowiedź

        # Ponieważ odpowiedzi są tasowane przy każdym pobraniu pytania,
        # musimy porównać tekst odpowiedzi
        selected_text = data.get('answer_text', '')

        # Znajdź wybraną odpowiedź po tekście
        selected_answer = None
        correct_answer = None
        for ans in answers:
            if ans['text'] == selected_text:
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
            'feedback': selected_answer['feedback'],
            'correct_answer_text': correct_answer['text'],
            'error_type': selected_answer.get('error_type')
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

@app.route('/api/quiz/reset', methods=['POST'])
def reset_quiz():
    """Resetuje sesję quizu"""
    quiz_session['remaining_questions'] = []
    quiz_session['shuffled'] = False
    quiz_session['seen_errors_screen'] = False
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
