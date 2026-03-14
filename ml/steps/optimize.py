"""Step: Optuna HPO."""

import numpy as np
import optuna
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor

optuna.logging.set_verbosity(optuna.logging.WARNING)


def optimize_hyperparameters(X_train, y_train, config):
    """Optuna HPO with TimeSeriesSplit."""
    print("\n" + "=" * 70)
    print("🔍 STEP: OPTUNA HPO")
    print("=" * 70)

    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 800),
            "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
            "max_depth": trial.suggest_int("max_depth", 2, 8),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
            "gamma": trial.suggest_float("gamma", 0.0, 5.0),
            "random_state": config["random_state"],
            "n_jobs": -1,
            "verbosity": 0,
        }
        tscv = TimeSeriesSplit(n_splits=config["cv_folds"])
        scores = []
        for train_idx, val_idx in tscv.split(X_train):
            X_tr = X_train.iloc[train_idx]
            X_val = X_train.iloc[val_idx]
            y_tr = y_train.iloc[train_idx]
            y_val = y_train.iloc[val_idx]
            model = XGBRegressor(**params)
            model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
            scores.append(mean_absolute_error(y_val, model.predict(X_val)))
        return np.mean(scores)

    sampler = optuna.samplers.TPESampler(seed=config["random_state"])
    pruner = optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=1)
    study = optuna.create_study(direction="minimize", sampler=sampler, pruner=pruner)

    study.optimize(
        objective,
        n_trials=config["optuna_n_trials"],
        timeout=config["optuna_timeout"],
        show_progress_bar=False,
    )

    best_params = study.best_params
    best_params["random_state"] = config["random_state"]
    best_params["n_jobs"] = -1
    best_params["verbosity"] = 0

    print(f"✓ Best MAE: {study.best_value:.4f}")

    return best_params, {"hpo_best_mae": study.best_value, "hpo_n_trials": len(study.trials)}
