"""Step: Save plots."""

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


def save_plots(model, y_test, predictions, feature_cols, output_dir):
    """Generate forecast and feature importance plots."""
    print("\n" + "=" * 70)
    print("📈 STEP: SAVE PLOTS")
    print("=" * 70)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    plt.style.use("seaborn-v0_8-darkgrid")
    sns.set_palette("husl")

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.plot(y_test.index, y_test.values, label="Actual", linewidth=2, marker="o", markersize=4, alpha=0.7)
    ax.plot(y_test.index, predictions, label="Forecast", linewidth=2, marker="s", markersize=4, alpha=0.7)
    ax.set_title("Temperature Forecast vs Actual", fontsize=16, fontweight="bold")
    ax.set_xlabel("Time")
    ax.set_ylabel("Temperature (°C)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    forecast_path = output_dir / "forecast_plot.png"
    plt.savefig(forecast_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"✓ Saved: {forecast_path}")

    importance = model.feature_importances_
    imp_df = pd.DataFrame({"feature": feature_cols, "importance": importance}).sort_values("importance", ascending=False)
    top_n = min(15, len(imp_df))
    top = imp_df.head(top_n)
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(range(len(top)), top["importance"].values, color="steelblue", alpha=0.8)
    ax.set_yticks(range(len(top)))
    ax.set_yticklabels(top["feature"].values)
    ax.set_xlabel("Importance")
    ax.set_title(f"Top {top_n} Feature Importance", fontsize=16, fontweight="bold")
    ax.invert_yaxis()
    ax.grid(True, alpha=0.3, axis="x")
    plt.tight_layout()
    importance_path = output_dir / "feature_importance.png"
    plt.savefig(importance_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"✓ Saved: {importance_path}")

    return str(forecast_path), str(importance_path)
