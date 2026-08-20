"""
Inference-time wrapper: EKF baseline + optional ML residual correction.

Usage in app.py:

    from residual_model import EKFWithMLCorrection

    estimator = EKFWithMLCorrection(model_path="residual_model.joblib", capacity=capacity)
    df_result = estimator.run(df)   # df has temperature, c_rate, voltage, time[, current_soc_true]

    df_result now has columns:
        ekf_soc          -> raw EKF estimate (physics-only baseline)
        residual_pred     -> ML-predicted correction (0 if no model loaded)
        final_soc         -> clip(ekf_soc + residual_pred, 0, 1)  <-- use this downstream
        ekf_confidence    -> filter covariance-based confidence

If model_path is missing or fails to load, this degrades gracefully to
EKF-only (final_soc == ekf_soc), so the app never hard-fails for lack of
a trained model.
"""

import os
import numpy as np
import joblib

from ekf_model import run_ekf_on_dataframe
from train_residual_model import engineer_features, FEATURE_COLUMNS


class EKFWithMLCorrection:
    def __init__(self, model_path=None, capacity=50.0):
        self.capacity = capacity
        self.model = None
        self.feature_columns = FEATURE_COLUMNS
        self.model_metadata = {}

        if model_path and os.path.exists(model_path):
            try:
                bundle = joblib.load(model_path)
                self.model = bundle["model"]
                self.feature_columns = bundle.get("feature_columns", FEATURE_COLUMNS)
                self.model_metadata = {
                    "cv_mae": bundle.get("cv_mae"),
                    "baseline_mae": bundle.get("baseline_mae"),
                }
                print(f"[residual_model] Loaded ML correction model from {model_path} "
                      f"(cv_mae={self.model_metadata.get('cv_mae')})")
            except Exception as e:
                print(f"[residual_model] Failed to load model at {model_path}: {e}. "
                      "Falling back to EKF-only.")
                self.model = None
        else:
            print("[residual_model] No ML model found — running EKF-only mode.")

    def run(self, df, **ekf_kwargs):
        df = run_ekf_on_dataframe(df, capacity=self.capacity, **ekf_kwargs)
        df = engineer_features(df)

        if self.model is not None:
            X = df[self.feature_columns]
            residual_pred = self.model.predict(X)
        else:
            residual_pred = np.zeros(len(df))

        df["residual_pred"] = residual_pred
        df["final_soc"] = np.clip(df["ekf_soc"] + df["residual_pred"], 0.0, 1.0)
        return df

    @property
    def is_ml_active(self):
        return self.model is not None
