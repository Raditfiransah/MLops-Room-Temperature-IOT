"""Step: Save artifacts."""

import json
from datetime import datetime
from pathlib import Path

import joblib


def save_artifacts(model, scaler, feature_cols, metrics, best_params, config, output_dir):
    """Save model, scaler, metadata, report."""
    print("\n" + "=" * 70)
    print("💾 STEP: SAVE ARTIFACTS")
    print("=" * 70)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model_path = output_dir / "model.pkl"
    scaler_path = output_dir / "scaler.pkl"
    metadata_path = output_dir / "metadata.json"
    report_path = output_dir / "pipeline_report.txt"

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"✓ Saved: {model_path}, {scaler_path}")

    metadata = {
        "feature_cols": feature_cols,
        "forecast_horizon": config["forecast_horizon"],
        "forecast_horizon_minutes": config["forecast_horizon"] * 10,
        "best_params": best_params,
        "metrics": metrics,
        "trained_at": datetime.now().isoformat(),
    }
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Saved: {metadata_path}")

    with open(report_path, "w") as f:
        f.write("=" * 70 + "\nTEMPERATURE FORECASTING PIPELINE REPORT\n" + "=" * 70 + "\n\n")
        f.write(f"Trained at: {metadata['trained_at']}\n")
        f.write(f"Forecast horizon: {config['forecast_horizon']} steps\n\n")
        f.write("BEST HYPERPARAMETERS:\n" + "-" * 70 + "\n")
        for k, v in best_params.items():
            f.write(f"  {k}: {v}\n")
        f.write("\nTEST METRICS:\n" + "-" * 70 + "\n")
        f.write(f"  MAE: {metrics['test_mae']:.4f}, RMSE: {metrics['test_rmse']:.4f}, MAPE: {metrics['test_mape']:.2f} %\n")
        if "cv_mae_mean" in metrics:
            f.write("\nCV METRICS:\n" + "-" * 70 + "\n")
            f.write(f"  MAE: {metrics['cv_mae_mean']:.4f} ± {metrics['cv_mae_std']:.4f}\n")
        f.write("\nFEATURES:\n" + "-" * 70 + "\n")
        for i, feat in enumerate(feature_cols, 1):
            f.write(f"  {i}. {feat}\n")
    print(f"✓ Saved: {report_path}")

    return {"model_path": str(model_path), "scaler_path": str(scaler_path), "metadata_path": str(metadata_path), "report_path": str(report_path)}
