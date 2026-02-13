"""Tests for the confidence_intervals Flask backend."""


MODE = 'single_interval'


def test_index_returns_200(ci_client):
    resp = ci_client.get('/')
    assert resp.status_code == 200


def test_quiz_page_valid_mode(ci_client):
    resp = ci_client.get(f'/quiz/{MODE}')
    assert resp.status_code == 200


def test_quiz_page_invalid_mode(ci_client):
    resp = ci_client.get('/quiz/nonexistent')
    assert resp.status_code == 404


def test_start_quiz_happy_path(ci_client):
    resp = ci_client.post(f'/api/quiz/{MODE}/start')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 1 <= data['total_questions'] <= 10


def test_start_quiz_invalid_mode(ci_client):
    resp = ci_client.post('/api/quiz/invalid_mode/start')
    assert resp.status_code == 500
    assert resp.get_json()['success'] is False


def test_next_without_start_returns_400(ci_client):
    """confidence_intervals does NOT auto-init — returns 400 without /start."""
    resp = ci_client.get(f'/api/quiz/{MODE}/next')
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_next_returns_question_without_correct(ci_client):
    ci_client.post(f'/api/quiz/{MODE}/start')
    resp = ci_client.get(f'/api/quiz/{MODE}/next')
    data = resp.get_json()
    assert data['success'] is True
    assert data['finished'] is False
    q = data['question']
    assert 'id' in q
    # Server must strip 'correct' and 'explanation'
    assert 'correct' not in q
    assert 'explanation' not in q


def test_check_answer_correct(ci_client, confidence_intervals_module):
    ci_client.post(f'/api/quiz/{MODE}/start')
    next_resp = ci_client.get(f'/api/quiz/{MODE}/next')
    q = next_resp.get_json()['question']
    qid = q['id']

    # Look up the real correct answer
    full_question = next(
        fq for fq in confidence_intervals_module.QUESTIONS[MODE]
        if fq['id'] == qid
    )
    correct_answer = full_question['correct']

    resp = ci_client.post(f'/api/quiz/{MODE}/check', json={
        'question_id': qid,
        'answer': correct_answer,
    })
    data = resp.get_json()
    assert data['success'] is True
    assert data['correct'] is True


def test_hint_returns_hint_text(ci_client):
    ci_client.post(f'/api/quiz/{MODE}/start')
    resp = ci_client.get(f'/api/quiz/{MODE}/hint')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'hint' in data
    assert isinstance(data['hint'], str)
    assert data['hints_used'] == 1


def test_hint_without_start_returns_400(ci_client):
    resp = ci_client.get(f'/api/quiz/{MODE}/hint')
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_e2e_full_quiz_flow(ci_client):
    """End-to-end: start -> answer all questions."""
    start = ci_client.post(f'/api/quiz/{MODE}/start')
    total = start.get_json()['total_questions']

    answered = 0
    for _ in range(total + 1):
        nxt = ci_client.get(f'/api/quiz/{MODE}/next')
        nxt_data = nxt.get_json()
        if nxt_data.get('finished'):
            break
        qid = nxt_data['question']['id']
        ci_client.post(f'/api/quiz/{MODE}/check', json={
            'question_id': qid,
            'answer': 'any_answer',
        })
        answered += 1

    assert answered == total

    # After all questions answered, /next should return finished=True
    final = ci_client.get(f'/api/quiz/{MODE}/next')
    assert final.get_json()['finished'] is True
