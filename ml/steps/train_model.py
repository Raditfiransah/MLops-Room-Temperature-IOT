"""Step: Train model."""

from xgboost import XGBRegressor


def train_final_model(X_train, y_train, X_test, y_test, best_params):
    """Train final XGBoost model."""
    print("\n" + "=" * 70)
    print("🚂 STEP: TRAIN MODEL")
    print("=" * 70)

    model = XGBRegressor(**best_params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=False,
    )
    print(f"✓ Trained with {len(X_train.columns)} features, {len(X_train)} samples")
    return model
