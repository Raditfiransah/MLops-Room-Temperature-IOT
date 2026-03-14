"""Step: Data validation."""

import json
from pathlib import Path

import pandas as pd


def validate_data(df, config):
    """Run data quality checks: schema, timestamps, gaps, missing values, ranges, outliers."""
    print("\n" + "=" * 70)
    print("🧪 DATA VALIDATION")
    print("=" * 70)

    issues = []
    required_cols = [config["target"]] + config["exog_features"]
    missing_cols = [c for c in required_cols if c not in df.columns]
    extra_cols = [c for c in df.columns if c not in required_cols]

    if missing_cols:
        issues.append(f"Missing required columns: {missing_cols}")
    if extra_cols:
        print(f"ℹ️ Extra columns present (ignored): {extra_cols}")

    non_numeric = [
        c for c in required_cols
        if c in df.columns and not pd.api.types.is_numeric_dtype(df[c])
    ]
    if non_numeric:
        issues.append(f"Non-numeric columns: {non_numeric}")

    if not isinstance(df.index, pd.DatetimeIndex):
        issues.append("Index is not DatetimeIndex.")
    else:
        if not df.index.is_monotonic_increasing:
            issues.append("Timestamp index is not monotonic increasing.")
        if df.index.has_duplicates:
            dup_count = df.index.duplicated().sum()
            issues.append(f"Duplicate timestamps: {dup_count}")
        try:
            inferred_freq = pd.infer_freq(df.index)
        except Exception:
            inferred_freq = None
        if inferred_freq is None or inferred_freq.lower() != "10t":
            print("⚠️  Could not infer 10-minute frequency; potential gaps.")
        expected_step = pd.Timedelta(minutes=10)
        gaps = (df.index.to_series().diff().dropna() > expected_step).sum()
        if gaps > 0:
            issues.append(f"Detected {gaps} gaps > 10 minutes.")

    missing_total = int(df.isna().sum().sum())
    if missing_total > 0:
        issues.append(f"Total missing values: {missing_total}")

    value_ranges = config.get("value_ranges", {}) or {}
    for col, rng in value_ranges.items():
        if col in df.columns:
            vmin, vmax = rng[0], rng[1]
            mask = (df[col] < vmin) | (df[col] > vmax)
            count = int(mask.sum())
            if count > 0:
                issues.append(f"Column '{col}': {count} values outside [{vmin}, {vmax}].")

    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    if numeric_cols:
        std = df[numeric_cols].std(ddof=0)
        if (std > 0).any():
            z_scores = (df[numeric_cols] - df[numeric_cols].mean()) / std.replace(0, 1e-9)
            outlier_mask = z_scores.abs() > 3
            total_outliers = int(outlier_mask.sum().sum())
            if total_outliers > 0:
                outlier_counts = outlier_mask.sum()
                print(f"⚠️  Potential outliers (|z|>3): {total_outliers}")
                for col in numeric_cols:
                    if outlier_counts[col] > 0:
                        print(f"    - {col}: {int(outlier_counts[col])}")

    if issues:
        print("⚠️  DATA VALIDATION ISSUES:")
        for msg in issues:
            print(f"   - {msg}")
        raise ValueError("Data validation failed. See messages above.")
    print("✓ Data validation passed.")


def validate_feature_consistency(feature_cols, output_dir):
    """Compare current features with metadata (train vs inference consistency)."""
    output_dir = Path(output_dir)
    metadata_path = output_dir / "metadata.json"

    if not metadata_path.exists():
        print("\nℹ️  No metadata.json for feature consistency check.")
        return

    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except Exception as e:
        print(f"\n⚠️  Failed to read metadata.json: {e}")
        return

    previous_features = metadata.get("feature_cols", [])
    if not previous_features:
        print("\nℹ️  metadata.json has no feature list.")
        return

    current_set = set(feature_cols)
    previous_set = set(previous_features)
    missing_in_current = sorted(previous_set - current_set)
    new_in_current = sorted(current_set - previous_set)

    print("\n" + "=" * 70)
    print("🔄 TRAIN vs INFERENCE FEATURE CONSISTENCY")
    print("=" * 70)

    if not missing_in_current and not new_in_current:
        print("✓ Features consistent with metadata.json")
        return

    if missing_in_current:
        print(f"⚠️  Features in previous metadata but missing now: {missing_in_current}")
    if new_in_current:
        print(f"⚠️  New features not in previous metadata: {new_in_current}")
