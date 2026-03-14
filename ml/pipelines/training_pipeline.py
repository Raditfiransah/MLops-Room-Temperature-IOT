"""Training pipeline: orchestrates all steps."""

from datetime import datetime
from pathlib import Path

from steps import (
    load_data,
    validate_data,
    validate_feature_consistency,
    create_features,
    split_and_scale,
    optimize_hyperparameters,
    cross_validate_model,
    train_final_model,
    evaluate_model,
    save_plots,
    save_artifacts,
    log_to_mlflow,
)


def run_training_pipeline(config):
    """Run full training pipeline."""
    print("\n" + "=" * 70)
    print("🌡️  TEMPERATURE FORECASTING PIPELINE")
    print("=" * 70)
    print(f"Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    output_dir = _str_path(config["output_dir"])

    df = load_data(config)
    validate_data(df, config)

    feat, feature_cols = create_features(df, config)
    validate_feature_consistency(feature_cols, config["output_dir"])

    X_train, X_test, y_train, y_test, scaler = split_and_scale(feat, feature_cols, config)

    best_params, hpo_metrics = optimize_hyperparameters(X_train, y_train, config)
    cv_metrics = cross_validate_model(X_train, y_train, best_params, config)

    model = train_final_model(X_train, y_train, X_test, y_test, best_params)
    test_metrics, predictions = evaluate_model(model, X_test, y_test)

    all_metrics = {**hpo_metrics, **cv_metrics, **test_metrics}

    forecast_plot, importance_plot = save_plots(
        model, y_test, predictions, feature_cols, config["output_dir"]
    )

    artifact_paths = save_artifacts(
        model, scaler, feature_cols, all_metrics, best_params, config, config["output_dir"]
    )

    log_to_mlflow(
        model, scaler, all_metrics, best_params, feature_cols, config,
        forecast_plot, importance_plot, artifact_paths,
    )

    print("\n" + "=" * 70)
    print("✅ PIPELINE COMPLETED")
    print("=" * 70)
    print(f"End: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\nOutputs: {output_dir}")
    for k, v in artifact_paths.items():
        print(f"  • {k}: {v}")
    print(f"  • Plots: {forecast_plot}, {importance_plot}")
    print("=" * 70)


def _str_path(p):
    if hasattr(p, "as_posix"):
        return str(p)
    return p
