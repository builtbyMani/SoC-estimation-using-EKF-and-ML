"""
Trains a LightGBM model that predicts the EKF's residual error:

    residual = current_soc_true - ekf_soc

The residual model is added back to the EKF estimate at inference time:

    final_soc = clip(ekf_soc + predicted_residual, 0, 1)

WHY RESIDUAL LEARNING (not predicting SOC directly):
- The EKF already encodes physics (coulomb counting, OCV curve). Asking the
  ML model to learn the *leftover* error is a much easier, smaller-magnitude
  target than re-learning SOC from scratch, so it needs less data and
  overfits less.
- If the ML model is fed out-of-distribution inputs and predicts garbage,
  clipping keeps the correction bounded and the EKF baseline still holds.

USAGE:
    python train_residual_model.py --data_dir ./training_csvs --out residual_model.joblib

Expects one or more CSVs in --data_dir, each with columns:
    temperature, c_rate, voltage, current_soc_true, time

More CSVs (ideally covering different temperatures, C-rates, and aging
states) = a residual model that generalizes better. A single short CSV
is enough to smoke-test the pipeline but not enough to trust in production.
"""

import argparse
import glob
import os
import sys

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

from ekf_model import run_ekf_on_dataframe

FEATURE_COLUMNS = [
    "temperature",
    "c_rate",
    "voltage",
    "ekf_soc",
    "ekf_rint",
    "voltage_delta",
    "time_since_start",
]


def engineer_features(df):
    df = df.sort_values("time").reset_index(drop=True)
    df["voltage_delta"] = df["voltage"].diff().fillna(0.0)
    df["time_since_start"] = df["time"] - df["time"].iloc[0]
    return df


def build_training_table(csv_paths, capacity=50.0):
    """Runs the EKF on each CSV and assembles a combined feature/target table.
    'group' column tracks which file each row came from, for cross-validation
    that doesn't leak time-adjacent rows from the same run across folds.
    """
    frames = []
    for group_id, path in enumerate(csv_paths):
        df = pd.read_csv(path)
        required = {"temperature", "c_rate", "voltage", "current_soc_true", "time"}
        missing = required - set(df.columns)
        if missing:
            print(f"  Skipping {path}: missing columns {missing}")
            continue

        df = run_ekf_on_dataframe(df, capacity=capacity)
        df = engineer_features(df)
        df["residual_target"] = df["current_soc_true"] - df["ekf_soc"]
        df["group"] = group_id
        df["source_file"] = os.path.basename(path)
        frames.append(df)
        print(f"  Loaded {path}: {len(df)} rows, "
              f"EKF MAE={np.abs(df['residual_target']).mean():.4f}")

    if not frames:
        raise ValueError("No valid training CSVs found.")
    return pd.concat(frames, ignore_index=True)


def train(data_dir, out_path, capacity=50.0, n_splits=5):
    csv_paths = sorted(glob.glob(os.path.join(data_dir, "*.csv")))
    if not csv_paths:
        print(f"No CSVs found in {data_dir}")
        sys.exit(1)

    print(f"Found {len(csv_paths)} CSV file(s). Running EKF + feature engineering...")
    table = build_training_table(csv_paths, capacity=capacity)

    X = table[FEATURE_COLUMNS]
    y = table["residual_target"]
    groups = table["group"]

    n_groups = groups.nunique()
    if n_groups < 3:
        print(f"\nWARNING: only {n_groups} distinct CSV file(s) provided. "
              "Residual model may overfit to these specific runs. "
              "Recommend >= 5 files spanning different temperatures/C-rates.\n")

    # Baseline (EKF alone) metrics before any correction
    baseline_mae = mean_absolute_error(table["current_soc_true"], table["ekf_soc"])
    baseline_rmse = np.sqrt(mean_squared_error(table["current_soc_true"], table["ekf_soc"]))
    print(f"\nEKF baseline (no ML):  MAE={baseline_mae:.4f}  RMSE={baseline_rmse:.4f}")

    # Cross-validated evaluation, grouped by source file so we don't leak
    # adjacent timesteps from the same run into both train and val
    n_splits_eff = min(n_splits, n_groups) if n_groups >= 2 else 2
    gkf = GroupKFold(n_splits=n_splits_eff)
    cv_maes = []

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups)):
        model = lgb.LGBMRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=4,
            num_leaves=15,
            min_child_samples=10,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=0.1,
            random_state=42,
            verbosity=-1,
        )
        model.fit(X.iloc[train_idx], y.iloc[train_idx])
        pred_residual = model.predict(X.iloc[val_idx])
        corrected_soc = np.clip(
            table["ekf_soc"].iloc[val_idx].values + pred_residual, 0, 1
        )
        fold_mae = mean_absolute_error(
            table["current_soc_true"].iloc[val_idx], corrected_soc
        )
        cv_maes.append(fold_mae)
        print(f"  Fold {fold}: corrected MAE={fold_mae:.4f}")

    print(f"\nCross-val corrected MAE: {np.mean(cv_maes):.4f} (+/- {np.std(cv_maes):.4f})")
    improvement = (baseline_mae - np.mean(cv_maes)) / baseline_mae * 100
    print(f"Improvement over EKF baseline: {improvement:.1f}%")

    # Final model trained on all data
    final_model = lgb.LGBMRegressor(
        n_estimators=300,
        learning_rate=0.03,
        max_depth=4,
        num_leaves=15,
        min_child_samples=10,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        verbosity=-1,
    )
    final_model.fit(X, y)

    joblib.dump(
        {
            "model": final_model,
            "feature_columns": FEATURE_COLUMNS,
            "capacity": capacity,
            "cv_mae": float(np.mean(cv_maes)),
            "baseline_mae": float(baseline_mae),
        },
        out_path,
    )
    print(f"\nSaved residual model to {out_path}")

    # Feature importance for sanity-checking
    importances = sorted(
        zip(FEATURE_COLUMNS, final_model.feature_importances_),
        key=lambda t: -t[1],
    )
    print("\nFeature importances:")
    for name, imp in importances:
        print(f"  {name}: {imp}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Directory of training CSVs")
    parser.add_argument("--out", default="residual_model.joblib")
    parser.add_argument("--capacity", type=float, default=50.0)
    args = parser.parse_args()
    train(args.data_dir, args.out, capacity=args.capacity)
