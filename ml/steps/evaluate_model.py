"""Step: Evaluate model."""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def evaluate_model(model, X_test, y_test):
    """Calculate test metrics (MAE, RMSE, MAPE)."""
    print("\n" + "=" * 70)
    print("📊 STEP: EVALUATE MODEL")
    print("=" * 70)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    denom = np.abs(y_test.values) + 1e-9
    mape = np.mean(np.abs((y_test.values - predictions) / denom)) * 100

    metrics = {"test_mae": float(mae), "test_rmse": float(rmse), "test_mape": float(mape)}
    print(f"✓ MAE: {mae:.4f} °C, RMSE: {rmse:.4f} °C, MAPE: {mape:.2f} %")
    return metrics, predictions
