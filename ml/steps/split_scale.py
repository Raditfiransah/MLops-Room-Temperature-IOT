"""Step: Split & scale."""

import pandas as pd
from sklearn.preprocessing import MinMaxScaler


def split_and_scale(feat, feature_cols, config):
    """Chronological train/test split + MinMaxScaler."""
    print("\n" + "=" * 70)
    print("✂️  STEP: SPLIT & SCALE")
    print("=" * 70)

    split_idx = int(len(feat) * (1 - config["test_size"]))
    train = feat.iloc[:split_idx]
    test = feat.iloc[split_idx:]

    X_train = train[feature_cols]
    y_train = train["target"]
    X_test = test[feature_cols]
    y_test = test["target"]

    print(f"✓ Train: {len(X_train)}, Test: {len(X_test)}")

    scaler = MinMaxScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train),
        columns=X_train.columns,
        index=X_train.index,
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test),
        columns=X_test.columns,
        index=X_test.index,
    )
    print("✓ Features scaled to [0, 1]")
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler
