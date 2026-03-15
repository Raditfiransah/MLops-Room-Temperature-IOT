"""Step: Load data (ingest)."""

import pandas as pd

try:
    # Integrasi dengan Supabase fetcher
    from script.fetch_supabase import fetch_data as fetch_from_supabase
except Exception:
    fetch_from_supabase = None


def load_data(config):
    """Fetch from Supabase (if possible), then load CSV and preprocess."""
    print("\n" + "=" * 70)
    print("📥 STEP: INGEST DATA")
    print("=" * 70)

    data_path = config["data_path"]
    if hasattr(data_path, "as_posix"):
        data_path = str(data_path)

    # 1) Coba ambil data terbaru dari Supabase dan simpan ke CSV
    if fetch_from_supabase is not None:
        try:
            print("→ Fetching latest data from Supabase...")
            fetch_from_supabase()
            print("✓ Supabase fetch completed.")
        except Exception as e:
            print(f"⚠️  Failed to fetch from Supabase, falling back to existing CSV: {e}")
    else:
        print("ℹ️ Supabase fetcher not available, using existing CSV.")

    # 2) Load dari CSV lokal
    df = pd.read_csv(data_path)
    print(f"✓ Loaded {len(df)} rows from CSV: {data_path}")

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
