"""Smoke tests: verify all 5 app modules load and expose a Flask app."""
from flask import Flask


def test_histogram_module_loads(histogram_module):
    assert hasattr(histogram_module, 'app')
    assert isinstance(histogram_module.app, Flask)
    rules = [r.rule for r in histogram_module.app.url_map.iter_rules()]
    assert '/' in rules
    assert '/api/generate' in rules
    assert '/api/export-csv' in rules


def test_quiz_app_module_loads(quiz_app_module):
    assert hasattr(quiz_app_module, 'app')
    assert isinstance(quiz_app_module.app, Flask)
    assert hasattr(quiz_app_module, 'QUIZ_CONFIG')
    assert hasattr(quiz_app_module, 'quiz_session')
    rules = [r.rule for r in quiz_app_module.app.url_map.iter_rules()]
    assert '/api/quiz/<quiz_id>/start' in rules


def test_confidence_intervals_module_loads(confidence_intervals_module):
    assert hasattr(confidence_intervals_module, 'app')
    assert isinstance(confidence_intervals_module.app, Flask)
    assert hasattr(confidence_intervals_module, 'CI_CONFIG')
    assert hasattr(confidence_intervals_module, 'QUESTIONS')
    assert hasattr(confidence_intervals_module, 'quiz_session')
    rules = [r.rule for r in confidence_intervals_module.app.url_map.iter_rules()]
    assert '/api/quiz/<mode_id>/hint' in rules


def test_chi_square_module_loads(chi_square_module):
    assert hasattr(chi_square_module, 'app')
    assert isinstance(chi_square_module.app, Flask)
    rules = [r.rule for r in chi_square_module.app.url_map.iter_rules()]
    assert '/api/compute' in rules
    assert '/api/generate-from-percentages' in rules


def test_pearson_correlation_module_loads(pearson_correlation_module):
    assert hasattr(pearson_correlation_module, 'app')
    assert isinstance(pearson_correlation_module.app, Flask)
    rules = [r.rule for r in pearson_correlation_module.app.url_map.iter_rules()]
    assert '/api/compute' in rules
    assert '/api/generate' in rules


def test_biased_sampling_module_loads(biased_sampling_module):
    assert hasattr(biased_sampling_module, 'app')
    assert isinstance(biased_sampling_module.app, Flask)
    rules = [r.rule for r in biased_sampling_module.app.url_map.iter_rules()]
    assert '/' in rules
    assert '/api/scenarios' in rules
    assert '/api/generate' in rules
    assert '/api/compute' in rules


def test_test_selector_module_loads(test_selector_module):
    assert hasattr(test_selector_module, 'app')
    assert isinstance(test_selector_module.app, Flask)
    assert hasattr(test_selector_module, 'TREE_CONFIG')
    assert hasattr(test_selector_module, 'wizard_session')
    rules = [r.rule for r in test_selector_module.app.url_map.iter_rules()]
    assert '/api/tree' in rules
    assert '/api/resolve' in rules
    assert '/api/reset' in rules
