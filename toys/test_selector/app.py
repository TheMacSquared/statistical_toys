import os
import sys
import json
from copy import deepcopy
from flask import Flask, jsonify, render_template, request

# Ensure "toys/" is on sys.path so "common.*" imports work when
# running from toys/test_selector directly.
TOYS_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
if TOYS_DIR not in sys.path:
    sys.path.insert(0, TOYS_DIR)

from common.flask_app import register_common_static


def get_bundle_dir():
    """Return app directory path for dev and PyInstaller bundle."""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(__file__)


bundle_dir = get_bundle_dir()
app = Flask(
    __name__,
    template_folder=os.path.join(bundle_dir, 'templates'),
    static_folder=os.path.join(bundle_dir, 'static')
)
register_common_static(app, bundle_dir if getattr(sys, 'frozen', False) else None)


def load_tree_config():
    config_path = os.path.join(get_bundle_dir(), 'tree_config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


TREE_CONFIG = load_tree_config()
QUESTION_MAP = {q['id']: q for q in TREE_CONFIG['questions']}
VALID_OPTIONS = {
    q['id']: {opt['value'] for opt in q['options']}
    for q in TREE_CONFIG['questions']
}

wizard_session = {
    'answers': {}
}


def _matches_constraints(answers, constraints):
    for key, expected in constraints.items():
        if key not in answers:
            return False
        value = answers[key]
        if isinstance(expected, list):
            if value not in expected:
                return False
        else:
            if value != expected:
                return False
    return True


def _question_is_active(question, answers):
    when = question.get('when')
    if not when:
        return True
    return _matches_constraints(answers, when)


def _active_questions(answers):
    active = []
    for question in TREE_CONFIG['questions']:
        if _question_is_active(question, answers):
            active.append(question)
    return active


def _validate_answers_shape(answers):
    if not isinstance(answers, dict):
        return 'Pole "answers" musi byc obiektem JSON.'

    unknown = [qid for qid in answers.keys() if qid not in QUESTION_MAP]
    if unknown:
        return f'Nieznane pytania w answers: {", ".join(sorted(unknown))}'

    for qid, value in answers.items():
        if value not in VALID_OPTIONS[qid]:
            return f'Niepoprawna odpowiedz dla "{qid}": {value}'

    return None


def _find_matching_rule(answers):
    for rule in TREE_CONFIG['rules']:
        if _matches_constraints(answers, rule['conditions']):
            return rule
    return None


def _build_result_payload(rule):
    result = deepcopy(rule['result'])
    template_id = result.get('hypothesis_template')
    result['hypotheses'] = deepcopy(TREE_CONFIG['hypothesis_templates'].get(template_id, {}))
    result['rule_id'] = rule['rule_id']
    result['alpha_default'] = TREE_CONFIG.get('default_alpha', 0.05)
    return result


@app.route('/')
def index():
    return render_template('tree.html')


@app.route('/api/health')
def health():
    return jsonify({'success': True, 'status': 'ok'})


@app.route('/api/tree')
def tree():
    return jsonify({
        'success': True,
        'version': TREE_CONFIG.get('version', '1.0'),
        'tree': TREE_CONFIG
    })


@app.route('/api/reset', methods=['POST'])
def reset():
    wizard_session['answers'] = {}
    return jsonify({'success': True, 'message': 'Sesja wyczyszczona.'})


@app.route('/api/resolve', methods=['POST'])
def resolve():
    payload = request.get_json(silent=True) or {}
    answers = payload.get('answers', wizard_session['answers'])

    shape_error = _validate_answers_shape(answers)
    if shape_error:
        return jsonify({'success': False, 'error': shape_error}), 400

    wizard_session['answers'] = dict(answers)

    active_questions = _active_questions(answers)
    missing = [q['id'] for q in active_questions if q['id'] not in answers]
    if missing:
        return jsonify({
            'success': False,
            'error': 'Brakuje odpowiedzi do wyznaczenia testu.',
            'missing_questions': missing,
            'active_questions': [q['id'] for q in active_questions]
        }), 400

    rule = _find_matching_rule(answers)
    if not rule:
        return jsonify({
            'success': False,
            'error': 'Nie znaleziono reguly dla podanych odpowiedzi.',
            'answers': answers
        }), 400

    return jsonify({
        'success': True,
        'result': _build_result_payload(rule),
        'answers': answers
    })


if __name__ == '__main__':
    app.run(debug=True, port=15006)
