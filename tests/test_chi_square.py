"""Tests for the chi_square Flask backend."""


def test_index_returns_200(chi_client):
    resp = chi_client.get('/')
    assert resp.status_code == 200


def test_compute_happy_path_2x2(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[10, 20], [30, 40]],
        'alpha': 0.05,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'chi_square' in data
    assert data['df'] == 1
    assert 'p_value' in data
    assert 'expected' in data
    assert 'cramers_v' in data


def test_compute_happy_path_3x3(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[10, 20, 30], [40, 50, 60], [70, 80, 90]],
        'alpha': 0.05,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['df'] == 4


def test_compute_missing_json_body(chi_client):
    """Empty body with JSON content type: request.json raises before
    _validate_request_json can check, caught by generic Exception handler."""
    resp = chi_client.post('/api/compute',
                           data=b'',
                           content_type='application/json')
    assert resp.status_code in (400, 500)
    assert resp.get_json()['success'] is False


def test_compute_missing_table_field(chi_client):
    resp = chi_client.post('/api/compute', json={})
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_table_too_few_rows(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[5, 10]],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_negative_values(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[-1, 5], [3, 4]],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_zero_row_sum(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[0, 0], [5, 5]],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_alpha_out_of_range(chi_client):
    resp = chi_client.post('/api/compute', json={
        'table': [[10, 20], [30, 40]],
        'alpha': 1.5,
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_from_percentages_happy_path(chi_client):
    resp = chi_client.post('/api/generate-from-percentages', json={
        'row_percentages': [[40, 35, 25], [35, 35, 30]],
        'n': 200,
        'row_split': [0.6, 0.4],
        'alpha': 0.05,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'table' in data
    assert 'chi_square' in data
