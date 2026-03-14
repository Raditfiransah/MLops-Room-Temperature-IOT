"""Step: Load data (ingest)."""

import pandas as pd


def load_data(config):
    """Load CSV, parse datetime, set index, resample to 10min."""
    print("\n" + "=" * 70)
    print("📥 STEP: INGEST DATA")
    print("=" * 70)

    data_path = config["data_path"]
    if hasattr(data_path, "as_posix"):
        data_path = str(data_path)

    df = pd.read_csv(data_path)
    print(f"✓ Loaded {len(df)} rows from CSV")

    df["recorded_at"] = pd.to_datetime(df["recorded_at"])
    df = df.set_index("recorded_at")
    df = df.sort_index()

    df = df.resample("10min").mean().ffill()
    print(f"✓ Resampled to 10-min intervals: {len(df)} rows")

    cols = [config["target"]] + config["exog_features"]
    df = df[cols]

    print(f"✓ Columns: {list(df.columns)}")
    print(f"✓ Date range: {df.index.min()} to {df.index.max()}")
    print(f"✓ Missing values: {df.isnull().sum().sum()}")

    return df
