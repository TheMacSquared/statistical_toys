"""Tests for the histogram Flask backend."""
import json


def test_index_returns_200(histogram_client):
    resp = histogram_client.get('/')
    assert resp.status_code == 200


def test_generate_happy_path(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 100, 'mean': 0, 'sd': 1,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'histogram' in data
    assert 'counts' in data['histogram']
    assert 'bin_centers' in data['histogram']
    assert 'stats' in data
    assert 'mean' in data['stats']
    assert data['params']['n'] == 100


def test_generate_with_binwidth(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 500, 'mean': 5, 'sd': 2, 'binwidth': 0.5,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['params']['binwidth'] is not None


def test_generate_n_too_small(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 5, 'mean': 0, 'sd': 1,
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert data['success'] is False


def test_generate_n_too_large(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 20000, 'mean': 0, 'sd': 1,
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_sd_zero(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 100, 'mean': 0, 'sd': 0,
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_sd_negative(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 100, 'mean': 0, 'sd': -1,
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_binwidth_zero(histogram_client):
    resp = histogram_client.post('/api/generate', json={
        'n': 100, 'mean': 0, 'sd': 1, 'binwidth': 0,
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_generate_no_json_body(histogram_client):
    """Histogram has no _validate_request_json — missing body causes 500."""
    resp = histogram_client.post('/api/generate',
                                 data='not json',
                                 content_type='text/plain')
    assert resp.status_code == 500


def test_export_csv_no_data(histogram_client):
    resp = histogram_client.get('/api/export-csv')
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_export_csv_after_generate(histogram_client):
    histogram_client.post('/api/generate', json={
        'n': 50, 'mean': 0, 'sd': 1,
    })
    resp = histogram_client.get('/api/export-csv')
    assert resp.status_code == 200
    assert resp.content_type == 'text/csv; charset=utf-8'
    text = resp.data.decode('utf-8')
    assert 'index,value' in text
    lines = text.strip().split('\n')
    assert len(lines) == 51  # header + 50 data rows
