#!/usr/bin/env python3
"""
Script utama untuk menjalankan training pipeline.

Menambah ml/ ke PYTHONPATH agar import steps/ dan pipelines/ berfungsi
dari mana pun script dijalankan.

Run:
    python runs/run_pipeline.py
    python run_pipeline.py   # jika dijalankan dari runs/
    cd ml && python runs/run_pipeline.py
"""

import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

# Pastikan ml/ (project root) ada di Python path
_ML_ROOT = Path(__file__).resolve().parent.parent
if str(_ML_ROOT) not in sys.path:
    sys.path.insert(0, str(_ML_ROOT))


def _default_config():
    """Config default jika YAML gagal di-load."""
    return {
        "data_path": _ML_ROOT / "data" / "raw" / "sensor_logs_suhu.csv",
        "output_dir": _ML_ROOT / "model",
        "target": "temperature",
        "exog_features": ["humidity", "heat_index"],
        "forecast_horizon": 3,
        "lag_steps": [1, 2, 3, 6, 12],
        "rolling_windows": [3, 6, 12],
        "test_size": 0.2,
        "cv_folds": 3,
        "random_state": 42,
        "optuna_n_trials": 50,
        "optuna_timeout": 300,
        "value_ranges": {
            "temperature": (-20, 60),
            "humidity": (0, 100),
            "heat_index": (-20, 80),
        },
    }


def load_config(config_path=None):
    """Load config dari YAML atau fallback ke default."""
    config_path = config_path or (_ML_ROOT / "configs" / "base_config.yaml")

    try:
        import yaml
        with open(config_path) as f:
            raw = yaml.safe_load(f)
    except Exception as e:
        print(f"⚠️  YAML config not loaded ({e}), using default config.")
        return _default_config()

    data_path = raw["data"]["data_path"]
    output_dir = raw["data"]["output_dir"]
    if not Path(data_path).is_absolute():
        data_path = _ML_ROOT / data_path
    if not Path(output_dir).is_absolute():
        output_dir = _ML_ROOT / output_dir

    return {
        "data_path": data_path,
        "output_dir": output_dir,
        "target": raw["model"]["target"],
        "exog_features": raw["model"]["exog_features"],
        "forecast_horizon": raw["model"]["forecast_horizon"],
        "lag_steps": raw["features"]["lag_steps"],
        "rolling_windows": raw["features"]["rolling_windows"],
        "test_size": raw["train"]["test_size"],
        "cv_folds": raw["train"]["cv_folds"],
        "random_state": raw["train"]["random_state"],
        "optuna_n_trials": raw["optuna"]["n_trials"],
        "optuna_timeout": raw["optuna"]["timeout"],
        "value_ranges": {k: tuple(v) for k, v in raw["value_ranges"].items()},
    }


def main():
    config = load_config()
    from pipelines.training_pipeline import run_training_pipeline
    run_training_pipeline(config)


if __name__ == "__main__":
    main()
