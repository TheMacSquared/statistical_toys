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


def load_profiled_configs():
    base_dir = get_bundle_dir()
    files = {
        'basic': 'tree_config.json',
        'full': 'tree_config_full.json'
    }
    configs = {}
    for profile, filename in files.items():
        path = os.path.join(base_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            configs[profile] = json.load(f)
    return configs


DEFAULT_PROFILE = 'basic'
TREE_CONFIGS = load_profiled_configs()
TREE_CONFIG = TREE_CONFIGS[DEFAULT_PROFILE]
QUESTION_MAPS = {
    profile: {q['id']: q for q in config['questions']}
    for profile, config in TREE_CONFIGS.items()
}
VALID_OPTIONS_BY_PROFILE = {
    profile: {q['id']: {opt['value'] for opt in q['options']}
              for q in config['questions']}
    for profile, config in TREE_CONFIGS.items()
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


def _active_questions(tree_config, answers):
    active = []
    for question in tree_config['questions']:
        if _question_is_active(question, answers):
            active.append(question)
    return active


def _validate_answers_shape(profile, answers):
    if not isinstance(answers, dict):
        return 'Pole "answers" musi byc obiektem JSON.'

    question_map = QUESTION_MAPS[profile]
    valid_options = VALID_OPTIONS_BY_PROFILE[profile]

    unknown = [qid for qid in answers.keys() if qid not in question_map]
    if unknown:
        return f'Nieznane pytania w answers: {", ".join(sorted(unknown))}'

    for qid, value in answers.items():
        if value not in valid_options[qid]:
            return f'Niepoprawna odpowiedz dla "{qid}": {value}'

    return None


def _find_matching_rule(tree_config, answers):
    for rule in tree_config['rules']:
        if _matches_constraints(answers, rule['conditions']):
            return rule
    return None


def _build_result_payload(tree_config, rule):
    result = deepcopy(rule['result'])
    template_id = result.get('hypothesis_template')
    result['hypotheses'] = deepcopy(tree_config['hypothesis_templates'].get(template_id, {}))
    result['rule_id'] = rule['rule_id']
    result['alpha_default'] = tree_config.get('default_alpha', 0.05)
    return result


def _select_profile(profile):
    if profile is None:
        return DEFAULT_PROFILE
    if profile not in TREE_CONFIGS:
        return None
    return profile


@app.route('/')
def index():
    return render_template('tree.html')


@app.route('/api/health')
def health():
    return jsonify({'success': True, 'status': 'ok'})


@app.route('/api/tree')
def tree():
    selected_profile = _select_profile(request.args.get('profile', DEFAULT_PROFILE))
    if selected_profile is None:
        return jsonify({'success': False, 'error': 'Nieznany profil drzewa.'}), 400
    tree_config = TREE_CONFIGS[selected_profile]
    return jsonify({
        'success': True,
        'profile': selected_profile,
        'default_profile': DEFAULT_PROFILE,
        'available_profiles': ['basic', 'full'],
        'version': tree_config.get('version', '1.0'),
        'tree': tree_config
    })


@app.route('/api/reset', methods=['POST'])
def reset():
    wizard_session['answers'] = {}
    return jsonify({'success': True, 'message': 'Sesja wyczyszczona.'})


@app.route('/api/resolve', methods=['POST'])
def resolve():
    payload = request.get_json(silent=True) or {}
    selected_profile = _select_profile(payload.get('profile', DEFAULT_PROFILE))
    if selected_profile is None:
        return jsonify({'success': False, 'error': 'Nieznany profil drzewa.'}), 400

    tree_config = TREE_CONFIGS[selected_profile]
    answers = payload.get('answers', wizard_session['answers'])

    shape_error = _validate_answers_shape(selected_profile, answers)
    if shape_error:
        return jsonify({'success': False, 'error': shape_error}), 400

    wizard_session['answers'] = dict(answers)

    active_questions = _active_questions(tree_config, answers)
    missing = [q['id'] for q in active_questions if q['id'] not in answers]
    if missing:
        return jsonify({
            'success': False,
            'error': 'Brakuje odpowiedzi do wyznaczenia testu.',
            'missing_questions': missing,
            'active_questions': [q['id'] for q in active_questions]
        }), 400

    rule = _find_matching_rule(tree_config, answers)
    if not rule:
        return jsonify({
            'success': False,
            'error': 'Nie znaleziono reguly dla podanych odpowiedzi.',
            'answers': answers
        }), 400

    return jsonify({
        'success': True,
        'profile': selected_profile,
        'result': _build_result_payload(tree_config, rule),
        'answers': answers
    })


if __name__ == '__main__':
    app.run(debug=True, port=15006)
