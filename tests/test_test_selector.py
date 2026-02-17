"""Tests for test_selector Flask backend."""


def test_index_returns_200(test_selector_client):
    resp = test_selector_client.get('/')
    assert resp.status_code == 200


def test_tree_ui_returns_200(test_selector_client):
    resp = test_selector_client.get('/tree-ui')
    assert resp.status_code == 200


def test_tree_endpoint_contract(test_selector_client):
    resp = test_selector_client.get('/api/tree')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['version'] == '1.0'
    assert 'tree' in data
    assert 'questions' in data['tree']
    assert 'rules' in data['tree']


def test_health_ok(test_selector_client):
    resp = test_selector_client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['status'] == 'ok'


def test_resolve_missing_answers_returns_400(test_selector_client):
    payload = {
        'answers': {
            'scope': 'one_variable'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data['success'] is False
    assert 'missing_questions' in data


def test_resolve_invalid_answer_returns_400(test_selector_client):
    payload = {
        'answers': {
            'scope': 'one_variable',
            'one_data_type': 'invalid_value'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data['success'] is False
    assert 'Niepoprawna odpowiedz' in data['error']


def test_resolve_one_variable_quantitative_normal(test_selector_client):
    payload = {
        'answers': {
            'scope': 'one_variable',
            'one_data_type': 'quantitative',
            'one_quant_normality': 'ok'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['result']['test_primary'] == 'Test t dla jednej próby'


def test_resolve_one_variable_proportion_small_sample(test_selector_client):
    payload = {
        'answers': {
            'scope': 'one_variable',
            'one_data_type': 'categorical_proportion',
            'one_prop_approx': 'violated'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['success'] is True
    assert data['result']['test_primary'] == 'Dokładny test dwumianowy'


def test_resolve_two_nominal_low_counts(test_selector_client):
    payload = {
        'answers': {
            'scope': 'two_variables',
            'two_data_pattern': 'two_nominal',
            'two_nominal_expected': 'low'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['result']['test_primary'] == 'Dokładny test Fishera'


def test_resolve_two_continuous_normal(test_selector_client):
    payload = {
        'answers': {
            'scope': 'two_variables',
            'two_data_pattern': 'two_continuous',
            'two_continuous_normality': 'ok'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['result']['test_primary'] == 'Współczynnik korelacji Pearsona'


def test_resolve_two_groups_independent_unequal_variance(test_selector_client):
    payload = {
        'answers': {
            'scope': 'two_variables',
            'two_data_pattern': 'nominal_continuous',
            'two_nomcont_groups': 'two',
            'two_nomcont_dependency': 'independent',
            'two_nomcont_normality': 'ok',
            'two_nomcont_variance': 'violated'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['result']['test_primary'] == 'Test t Welcha'


def test_resolve_more_than_two_groups_non_normal(test_selector_client):
    payload = {
        'answers': {
            'scope': 'two_variables',
            'two_data_pattern': 'nominal_continuous',
            'two_nomcont_groups': 'more_than_two',
            'two_nomcont_normality': 'violated'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['result']['test_primary'] == 'Test Kruskala-Wallisa'


def test_resolve_two_groups_paired_non_normal(test_selector_client):
    payload = {
        'answers': {
            'scope': 'two_variables',
            'two_data_pattern': 'nominal_continuous',
            'two_nomcont_groups': 'two',
            'two_nomcont_dependency': 'paired',
            'two_nomcont_normality': 'violated'
        }
    }
    resp = test_selector_client.post('/api/resolve', json=payload)
    data = resp.get_json()
    assert resp.status_code == 200
    assert data['result']['test_primary'] == 'Wilcoxon signed-rank'


def test_reset_clears_session(test_selector_client, test_selector_module):
    test_selector_module.wizard_session['answers'] = {'scope': 'one_variable'}
    resp = test_selector_client.post('/api/reset')
    assert resp.status_code == 200
    assert test_selector_module.wizard_session['answers'] == {}
