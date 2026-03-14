# 🌡️ ML Project – Temperature Forecasting

## Struktur Folder

```
ml/
├── data/                  # Data lokal (CSV, gambar, dll.)
│   └── raw/
│       └── sensor_logs_suhu.csv
├── steps/                 # Langkah-langkah modular
│   ├── __init__.py
│   ├── ingest_data.py     # Load data
│   ├── validate_data.py   # Data validation
│   ├── create_features.py # Feature engineering
│   ├── split_scale.py     # Split & scaling
│   ├── optimize.py        # Optuna HPO
│   ├── cross_validate.py  # Cross validation
│   ├── train_model.py     # Training
│   ├── evaluate_model.py  # Evaluasi
│   ├── save_plots.py      # Plot forecast & importance
│   ├── save_artifacts.py  # Simpan model, scaler, metadata
│   └── mlflow_log.py      # MLflow logging
├── pipelines/             # Definisi alur kerja
│   ├── __init__.py
│   └── training_pipeline.py
├── runs/                  # Script utama eksekusi
│   └── run_pipeline.py
├── configs/               # Konfigurasi YAML
│   ├── __init__.py
│   └── base_config.yaml
├── model/                 # Output (model, scaler, plots)
├── requirements.txt
└── run_pipeline.sh
```

## Cara Menjalankan

```bash
cd ml
pip install -r requirements.txt
python runs/run_pipeline.py
```

Atau:
```bash
./ml/run_pipeline.sh
```

Script `run_pipeline.py` otomatis menambah folder `ml/` ke PYTHONPATH, sehingga bisa dijalankan dari mana pun tanpa error `ModuleNotFoundError`.
