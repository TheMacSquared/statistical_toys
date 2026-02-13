"""Tests for the pearson_correlation Flask backend."""
import math


def test_index_returns_200(pearson_client):
    resp = pearson_client.get('/')
    assert resp.status_code == 200


def test_compute_positive_correlation(pearson_client):
    resp = pearson_client.post('/api/compute', json={
        'points': [{'x': 1, 'y': 2}, {'x': 2, 'y': 4}, {'x': 3, 'y': 6}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['r'] > 0.99
    assert 'p_value' in data
    assert 'slope' in data
    assert 'intercept' in data
    assert 'point_details' in data
    assert len(data['point_details']) == 3


def test_compute_negative_correlation(pearson_client):
    resp = pearson_client.post('/api/compute', json={
        'points': [{'x': 1, 'y': 6}, {'x': 2, 'y': 4}, {'x': 3, 'y': 2}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['r'] < -0.99


def test_compute_missing_json_body(pearson_client):
    """Empty body with JSON content type: request.json raises before
    _validate_request_json can check, caught by generic Exception handler."""
    resp = pearson_client.post('/api/compute',
                               data=b'',
                               content_type='application/json')
    assert resp.status_code in (400, 500)
    assert resp.get_json()['success'] is False


def test_compute_missing_points_field(pearson_client):
    resp = pearson_client.post('/api/compute', json={})
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_too_few_points(pearson_client):
    resp = pearson_client.post('/api/compute', json={
        'points': [{'x': 1, 'y': 1}, {'x': 2, 'y': 2}],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_too_many_points(pearson_client):
    points = [{'x': i, 'y': i * 2} for i in range(101)]
    resp = pearson_client.post('/api/compute', json={'points': points})
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_compute_zero_variance_x(pearson_client):
    resp = pearson_client.post('/api/compute', json={
        'points': [{'x': 5, 'y': 1}, {'x': 5, 'y': 2}, {'x': 5, 'y': 3}],
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_happy_path(pearson_client):
    resp = pearson_client.post('/api/generate', json={
        'type': 'perfect_positive',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'points' in data
    assert len(data['points']) > 0
    assert 'x' in data['points'][0]
    assert 'y' in data['points'][0]


def test_generate_invalid_type(pearson_client):
    resp = pearson_client.post('/api/generate', json={
        'type': 'unknown_type',
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False
