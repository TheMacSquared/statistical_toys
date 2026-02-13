"""Tests for the biased_sampling Flask backend."""


# --- Index ---

def test_index_returns_200(biased_sampling_client):
    resp = biased_sampling_client.get('/')
    assert resp.status_code == 200


# --- /api/scenarios ---

def test_scenarios_returns_list(biased_sampling_client):
    resp = biased_sampling_client.get('/api/scenarios')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert len(data['scenarios']) == 3
    ids = [s['id'] for s in data['scenarios']]
    assert 'restriction_of_range' in ids
    assert 'truncation_bias' in ids
    assert 'simpsons_paradox' in ids


def test_scenarios_have_required_fields(biased_sampling_client):
    resp = biased_sampling_client.get('/api/scenarios')
    data = resp.get_json()
    for sc in data['scenarios']:
        assert 'id' in sc
        assert 'name' in sc
        assert 'description' in sc
        assert 'x_label' in sc
        assert 'y_label' in sc


# --- /api/generate: happy paths ---

def test_generate_restriction_of_range(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'restriction_of_range',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'population' in data
    assert 'sample' in data
    assert len(data['population']['points']) >= 250
    assert len(data['sample']['points']) < len(data['population']['points'])
    assert data['population']['stats']['r'] is not None
    assert data['sample']['stats']['r'] is not None
    assert data['population']['groups'] is None


def test_generate_truncation_bias(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'truncation_bias',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert len(data['population']['points']) >= 250
    assert len(data['sample']['points']) < len(data['population']['points'])


def test_generate_simpsons_paradox(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'simpsons_paradox',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['population']['groups'] is not None
    assert len(data['population']['groups']) == len(data['population']['points'])
    groups = set(data['population']['groups'])
    assert 'young' in groups
    assert 'old' in groups


def test_generate_with_seed_reproducible(biased_sampling_client):
    """Same seed should produce identical data."""
    resp1 = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'restriction_of_range', 'seed': 42,
    })
    resp2 = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'restriction_of_range', 'seed': 42,
    })
    data1 = resp1.get_json()
    data2 = resp2.get_json()
    assert data1['population']['points'] == data2['population']['points']
    assert data1['sample']['points'] == data2['sample']['points']


def test_generate_returns_scenario_metadata(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'truncation_bias',
    })
    data = resp.get_json()
    assert 'scenario' in data
    assert data['scenario']['id'] == 'truncation_bias'
    assert 'name' in data['scenario']
    assert 'description' in data['scenario']


def test_generate_returns_bias_description(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'restriction_of_range',
    })
    data = resp.get_json()
    assert 'bias_description' in data['sample']
    assert len(data['sample']['bias_description']) > 0


# --- /api/generate: error cases ---

def test_generate_invalid_scenario(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'nonexistent',
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_missing_scenario_id(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate', json={})
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_missing_json_body(biased_sampling_client):
    resp = biased_sampling_client.post('/api/generate',
                                       data=b'not json',
                                       content_type='application/json')
    assert resp.status_code in (400, 500)
    assert resp.get_json()['success'] is False


# --- /api/compute: happy path ---

def test_compute_valid_points(biased_sampling_client):
    resp = biased_sampling_client.post('/api/compute', json={
        'points': [{'x': 1, 'y': 2}, {'x': 2, 'y': 4}, {'x': 3, 'y': 6}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['r'] > 0.99
    assert 'p_value' in data
    assert 'slope' in data
    assert 'intercept' in data
    assert data['n'] == 3


# --- /api/compute: error cases ---

def test_compute_too_few_points(biased_sampling_client):
    resp = biased_sampling_client.post('/api/compute', json={
        'points': [{'x': 1, 'y': 1}],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_missing_points(biased_sampling_client):
    resp = biased_sampling_client.post('/api/compute', json={})
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


# --- Statistical property checks ---

def test_restriction_of_range_weakens_correlation(biased_sampling_client):
    """Population r should be stronger than sample r for restriction of range."""
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'restriction_of_range', 'seed': 123,
    })
    data = resp.get_json()
    pop_r = abs(data['population']['stats']['r'])
    sample_r = abs(data['sample']['stats']['r'])
    assert pop_r > sample_r


def test_truncation_weakens_correlation(biased_sampling_client):
    """Population r should be stronger than sample r for truncation."""
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'truncation_bias', 'seed': 123,
    })
    data = resp.get_json()
    pop_r = abs(data['population']['stats']['r'])
    sample_r = abs(data['sample']['stats']['r'])
    assert pop_r > sample_r


def test_simpsons_paradox_reverses_direction(biased_sampling_client):
    """Population and sample should have opposite correlation signs."""
    resp = biased_sampling_client.post('/api/generate', json={
        'scenario_id': 'simpsons_paradox', 'seed': 42,
    })
    data = resp.get_json()
    pop_r = data['population']['stats']['r']
    sample_r = data['sample']['stats']['r']
    # Population should be negative overall, sample positive within elderly
    assert pop_r < 0, f"Population r should be negative, got {pop_r}"
    assert sample_r > 0, f"Sample r should be positive, got {sample_r}"
