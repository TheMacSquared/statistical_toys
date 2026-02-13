"""Tests for the quiz_app Flask backend."""


QUIZ_ID = 'typy_zmiennych'


def test_index_returns_200(quiz_client):
    resp = quiz_client.get('/')
    assert resp.status_code == 200


def test_quiz_page_valid_id(quiz_client):
    resp = quiz_client.get(f'/quiz/{QUIZ_ID}')
    assert resp.status_code == 200


def test_quiz_page_invalid_id(quiz_client):
    resp = quiz_client.get('/quiz/nonexistent')
    assert resp.status_code == 404


def test_start_quiz_happy_path(quiz_client):
    resp = quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 1 <= data['total_questions'] <= 10


def test_next_auto_inits_if_not_started(quiz_client):
    """quiz_app auto-initializes in /next if session is not started."""
    resp = quiz_client.get(f'/api/quiz/{QUIZ_ID}/next')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['finished'] is False
    assert 'question' in data


def test_next_returns_question_structure(quiz_client):
    quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    resp = quiz_client.get(f'/api/quiz/{QUIZ_ID}/next')
    data = resp.get_json()
    assert data['success'] is True
    q = data['question']
    assert 'id' in q
    assert 'question' in q
    # Server must NOT leak the correct answer or explanation
    assert 'correct' not in q
    assert 'explanation' not in q


def test_check_answer_correct(quiz_client, quiz_app_module):
    quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    next_resp = quiz_client.get(f'/api/quiz/{QUIZ_ID}/next')
    q = next_resp.get_json()['question']
    qid = q['id']

    # Look up the real correct answer from module data
    full_question = next(
        fq for fq in quiz_app_module.QUESTIONS_CACHE[QUIZ_ID]
        if fq['id'] == qid
    )
    correct_answer = full_question['correct']

    resp = quiz_client.post(f'/api/quiz/{QUIZ_ID}/check', json={
        'question_id': qid,
        'answer': correct_answer,
    })
    data = resp.get_json()
    assert data['success'] is True
    assert data['correct'] is True


def test_check_answer_wrong(quiz_client, quiz_app_module):
    quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    next_resp = quiz_client.get(f'/api/quiz/{QUIZ_ID}/next')
    q = next_resp.get_json()['question']
    qid = q['id']

    # Find an incorrect answer
    full_question = next(
        fq for fq in quiz_app_module.QUESTIONS_CACHE[QUIZ_ID]
        if fq['id'] == qid
    )
    wrong_answer = 'definitely_wrong_answer'

    resp = quiz_client.post(f'/api/quiz/{QUIZ_ID}/check', json={
        'question_id': qid,
        'answer': wrong_answer,
    })
    data = resp.get_json()
    assert data['success'] is True
    assert data['correct'] is False
    assert 'explanation' in data
    assert 'correct_answer' in data


def test_check_answer_invalid_question_id(quiz_client):
    quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    resp = quiz_client.post(f'/api/quiz/{QUIZ_ID}/check', json={
        'question_id': 99999,
        'answer': 'x',
    })
    assert resp.status_code in (400, 500)
    assert resp.get_json()['success'] is False


def test_summary_no_active_session(quiz_client):
    resp = quiz_client.get(f'/api/quiz/{QUIZ_ID}/summary')
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_quiz_config_returns_config(quiz_client):
    # First start a quiz so there's an active session
    quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    resp = quiz_client.get('/api/quiz-config')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'quiz' in data


def test_e2e_full_quiz_flow(quiz_client):
    """End-to-end: start -> answer all questions -> summary."""
    start = quiz_client.post(f'/api/quiz/{QUIZ_ID}/start')
    total = start.get_json()['total_questions']

    answered = 0
    for _ in range(total + 1):  # +1 safety margin
        nxt = quiz_client.get(f'/api/quiz/{QUIZ_ID}/next')
        nxt_data = nxt.get_json()
        if nxt_data.get('finished'):
            break
        qid = nxt_data['question']['id']
        quiz_client.post(f'/api/quiz/{QUIZ_ID}/check', json={
            'question_id': qid,
            'answer': 'any_answer',
        })
        answered += 1

    assert answered == total

    summary = quiz_client.get(f'/api/quiz/{QUIZ_ID}/summary')
    s = summary.get_json()['summary']
    assert s['answered'] == total
    assert s['correct'] + s['wrong'] == total
