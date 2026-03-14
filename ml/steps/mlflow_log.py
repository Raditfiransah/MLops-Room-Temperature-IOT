"""Step: MLflow logging."""


def log_to_mlflow(model, scaler, metrics, best_params, feature_cols, config,
                  forecast_plot, importance_plot, artifact_paths):
    """Log run to MLflow."""
    print("\n" + "=" * 70)
    print("☁️  STEP: MLFLOW LOGGING")
    print("=" * 70)

    try:
        import mlflow
        import mlflow.xgboost
        mlflow.set_experiment("temperature_forecasting")
        with mlflow.start_run():
            mlflow.log_params(best_params)
            mlflow.log_param("forecast_horizon", config["forecast_horizon"])
            mlflow.log_param("n_features", len(feature_cols))
            mlflow.log_param("cv_folds", config["cv_folds"])
            mlflow.log_param("test_size", config["test_size"])
            mlflow.log_param("optuna_n_trials", config["optuna_n_trials"])
            mlflow.log_param("optuna_timeout", config["optuna_timeout"])
            mlflow.log_metrics(metrics)
            mlflow.xgboost.log_model(model, "model")
            if artifact_paths:
                for _, p in artifact_paths.items():
                    mlflow.log_artifact(p, artifact_path="artifacts")
            if forecast_plot:
                mlflow.log_artifact(forecast_plot, artifact_path="plots")
            if importance_plot:
                mlflow.log_artifact(importance_plot, artifact_path="plots")
            run_id = mlflow.active_run().info.run_id
            print(f"✓ MLflow run ID: {run_id}")
            return run_id
    except Exception as e:
        print(f"⚠️  MLflow not available: {e}")
        return None
