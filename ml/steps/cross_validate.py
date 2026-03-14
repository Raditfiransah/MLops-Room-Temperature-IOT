"""Step: Cross validation."""

import numpy as np
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor


def cross_validate_model(X_train, y_train, best_params, config):
    """TimeSeriesSplit CV with best params."""
    print("\n" + "=" * 70)
    print("🔄 STEP: CROSS VALIDATION")
    print("=" * 70)

    tscv = TimeSeriesSplit(n_splits=config["cv_folds"])
    cv_mae, cv_rmse = [], []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X_train)):
        X_tr = X_train.iloc[train_idx]
        X_val = X_train.iloc[val_idx]
        y_tr = y_train.iloc[train_idx]
        y_val = y_train.iloc[val_idx]

        model = XGBRegressor(**best_params)
        model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
        pred = model.predict(X_val)
        mae = mean_absolute_error(y_val, pred)
        rmse = np.sqrt(mean_squared_error(y_val, pred))
        cv_mae.append(mae)
        cv_rmse.append(rmse)
        print(f"  Fold {fold + 1}: MAE={mae:.4f}, RMSE={rmse:.4f}")

    cv_metrics = {
        "cv_mae_mean": np.mean(cv_mae),
        "cv_mae_std": np.std(cv_mae),
        "cv_rmse_mean": np.mean(cv_rmse),
        "cv_rmse_std": np.std(cv_rmse),
    }
    print(f"✓ CV MAE: {cv_metrics['cv_mae_mean']:.4f} ± {cv_metrics['cv_mae_std']:.4f}")
    return cv_metrics
