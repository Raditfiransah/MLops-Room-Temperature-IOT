"""Training pipeline: orchestrates all steps."""

from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Tuple, Optional

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


def _run_step(
    name: str,
    fn: Callable[..., Any],
    *args: Any,
    retries: int = 2,
    critical: bool = True,
    default: Optional[Any] = None,
    **kwargs: Any,
) -> Any:
    """
    Run a single pipeline step with retry & error handling.

    - critical=True  -> raise after retries exhausted (abort pipeline)
    - critical=False -> return default after retries exhausted (graceful degradation)
    """
    attempt = 0
    while True:
        attempt += 1
        try:
            print(f"\n➡️  STEP: {name} (attempt {attempt})")
            return fn(*args, **kwargs)
        except Exception as e:
            print(f"⚠️  Step '{name}' failed on attempt {attempt}: {e}")
            if attempt > retries:
                if critical:
                    print(f"❌ Step '{name}' is critical. Aborting pipeline after {attempt} attempts.")
                    raise
                print(f"⚠️  Step '{name}' failed after {attempt} attempts, continuing with graceful degradation.")
                return default
            else:
                print(f"🔁 Retrying step '{name}' (remaining retries: {retries - attempt + 1})")


def run_training_pipeline(config):
    """Run full training pipeline."""
    print("\n" + "=" * 70)
    print("🌡️  TEMPERATURE FORECASTING PIPELINE")
    print("=" * 70)
    start_time = datetime.now()
    print(f"Start: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    base_output_dir = Path(config["output_dir"])
    run_suffix = start_time.strftime("%Y%m%d_%H%M%S")
    run_output_dir = base_output_dir / f"run_{run_suffix}"

    try:
        # --- Data loading & validation (critical) ---
        df = _run_step("LOAD_DATA", load_data, config, critical=True)
        _run_step("VALIDATE_DATA", validate_data, df, config, critical=True)

        # --- Feature engineering (critical) ---
        feat, feature_cols = _run_step("CREATE_FEATURES", create_features, df, config, critical=True)
        _run_step(
            "VALIDATE_FEATURE_CONSISTENCY",
            validate_feature_consistency,
            feature_cols,
            base_output_dir,
            critical=False,  # boleh gagal, hanya warning konsistensi
        )

        # --- Split & scale (critical) ---
        X_train, X_test, y_train, y_test, scaler = _run_step(
            "SPLIT_AND_SCALE",
            split_and_scale,
            feat,
            feature_cols,
            config,
            critical=True,
        )

        # --- Hyperparameter optimization & CV (critical) ---
        best_params, hpo_metrics = _run_step(
            "OPTIMIZE_HYPERPARAMETERS",
            optimize_hyperparameters,
            X_train,
            y_train,
            config,
            critical=True,
        )
        cv_metrics = _run_step(
            "CROSS_VALIDATE_MODEL",
            cross_validate_model,
            X_train,
            y_train,
            best_params,
            config,
            critical=False,
            default={},
        )

        # --- Final training & evaluation (critical) ---
        model = _run_step(
            "TRAIN_FINAL_MODEL",
            train_final_model,
            X_train,
            y_train,
            X_test,
            y_test,
            best_params,
            critical=True,
        )
        test_metrics, predictions = _run_step(
            "EVALUATE_MODEL",
            evaluate_model,
            model,
            X_test,
            y_test,
            critical=True,
        )

        all_metrics = {**(hpo_metrics or {}), **(cv_metrics or {}), **(test_metrics or {})}

        # --- Plots (non-critical: jika gagal, pipeline tetap jalan) ---
        forecast_plot, importance_plot = _run_step(
            "SAVE_PLOTS",
            save_plots,
            model,
            y_test,
            predictions,
            feature_cols,
            run_output_dir,
            critical=False,
            default=(None, None),
        )

        # --- Artifacts (critical: tanpa ini, run dianggap gagal) ---
        artifact_paths = _run_step(
            "SAVE_ARTIFACTS",
            save_artifacts,
            model,
            scaler,
            feature_cols,
            all_metrics,
            best_params,
            config,
            run_output_dir,
            critical=True,
        )

        # --- MLflow logging (non-critical) ---
        _run_step(
            "LOG_TO_MLFLOW",
            log_to_mlflow,
            model,
            scaler,
            all_metrics,
            best_params,
            feature_cols,
            config,
            forecast_plot,
            importance_plot,
            artifact_paths,
            critical=False,
            default=None,
        )

        print("\n" + "=" * 70)
        print("✅ PIPELINE COMPLETED")
        print("=" * 70)
        end_time = datetime.now()
        print(f"End: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\nOutputs (this run): {run_output_dir}")
        for k, v in (artifact_paths or {}).items():
            print(f"  • {k}: {v}")
        print(f"  • Plots: {forecast_plot}, {importance_plot}")
        print("=" * 70)

    except Exception as e:
        # Global alert jika pipeline benar-benar gagal
        print("\n" + "=" * 70)
        print("🚨 PIPELINE FAILED")
        print("=" * 70)
        print(f"Reason: {e}")
        print(f"Run output directory (may be partial): {run_output_dir}")
        print("=" * 70)
        raise


def _str_path(p):
    if hasattr(p, "as_posix"):
        return str(p)
    return p
