"""Step: Feature engineering."""

import numpy as np
import pandas as pd


def create_features(df, config):
    """Create lag, rolling, and time-based features."""
    print("\n" + "=" * 70)
    print("🛠️  STEP: CREATE FEATURES")
    print("=" * 70)

    feat = df.copy()
    target = config["target"]

    for lag in config["lag_steps"]:
        feat[f"{target}_lag{lag}"] = feat[target].shift(lag)
        for col in config["exog_features"]:
            feat[f"{col}_lag{lag}"] = feat[col].shift(lag)

    for window in config["rolling_windows"]:
        feat[f"{target}_roll_mean{window}"] = feat[target].shift(1).rolling(window).mean()
        feat[f"{target}_roll_std{window}"] = feat[target].shift(1).rolling(window).std()
        feat[f"{target}_roll_min{window}"] = feat[target].shift(1).rolling(window).min()
        feat[f"{target}_roll_max{window}"] = feat[target].shift(1).rolling(window).max()

    feat["hour"] = feat.index.hour
    feat["minute"] = feat.index.minute
    feat["hour_sin"] = np.sin(2 * np.pi * feat.index.hour / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat.index.hour / 24)
    feat["dayofweek"] = feat.index.dayofweek

    feat["target"] = feat[target].shift(-config["forecast_horizon"])
    feat = feat.dropna()

    feature_cols = [
        c for c in feat.columns
        if c not in [target] + config["exog_features"] + ["target"]
    ]

    print(f"✓ Created {len(feature_cols)} features, rows: {len(feat)}")
    return feat, feature_cols
