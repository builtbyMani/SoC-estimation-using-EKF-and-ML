"""
Flask backend for the Battery SOC Estimation Dashboard.

Endpoints:
    GET  /health    -> server status
    POST /estimate   -> runs EKF (+ ML correction if a trained model is present)
                        on an uploaded CSV and returns metrics + full time series.
"""

import io
import os
import time as time_module

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

from residual_model import EKFWithMLCorrection

app = Flask(__name__)
CORS(app)

REQUIRED_COLUMNS = ["temperature", "c_rate", "voltage", "current_soc_true", "time"]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "residual_model.joblib")

# Loaded once at startup. If no .joblib is present, this runs EKF-only
# and app.py keeps working — see residual_model.py for the fallback logic.
_default_estimator = EKFWithMLCorrection(model_path=MODEL_PATH, capacity=50.0)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "ml_model_loaded": _default_estimator.is_ml_active,
    })


@app.route("/estimate", methods=["POST"])
def estimate():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded. Expected form field 'file'."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"status": "error", "message": "Empty filename."}), 400

    try:
        capacity = float(request.form.get("capacity", 50.0))
    except ValueError:
        return jsonify({"status": "error", "message": "'capacity' must be numeric."}), 400

    try:
        raw_bytes = file.read()
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as e:
        return jsonify({"status": "error", "message": f"Could not parse CSV: {e}"}), 400

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        return jsonify({
            "status": "error",
            "message": f"CSV missing required columns: {missing}. "
                       f"Required columns are: {REQUIRED_COLUMNS}",
        }), 400

    if df.empty:
        return jsonify({"status": "error", "message": "CSV has no data rows."}), 400

    # Use a capacity-specific estimator only if it differs from the default,
    # to avoid re-loading the joblib model on every request.
    estimator = (
        _default_estimator
        if capacity == _default_estimator.capacity
        else EKFWithMLCorrection(model_path=MODEL_PATH, capacity=capacity)
    )

    try:
        result_df = estimator.run(df)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Estimation failed: {e}"}), 500

    soc_estimated = result_df["final_soc"].tolist()
    soc_true = result_df["current_soc_true"].tolist()
    error = [abs(a - b) * 100 for a, b in zip(soc_estimated, soc_true)]  # percentage points

    mae = float(np.mean(np.abs(np.array(soc_estimated) - np.array(soc_true))) * 100)
    rmse = float(np.sqrt(np.mean((np.array(soc_estimated) - np.array(soc_true)) ** 2)) * 100)
    max_error = float(np.max(error)) if error else 0.0

    metrics = {
        "final_soc_estimated": float(soc_estimated[-1]),
        "final_voltage": float(result_df["voltage"].iloc[-1]),
        "final_current": float(result_df["c_rate"].iloc[-1] * capacity),
        "final_temperature": float(result_df["temperature"].iloc[-1]),
        "mean_absolute_error": mae,
        "rmse": rmse,
        "max_error": max_error,
        "final_confidence": float(result_df["ekf_confidence"].iloc[-1]),
        "data_points": int(len(result_df)),
        "total_time": float(result_df["time"].iloc[-1] - result_df["time"].iloc[0]),
    }

    results = {
        "soc_estimated": soc_estimated,
        "soc_true": soc_true,
        "voltage": result_df["voltage"].tolist(),
        "current": (result_df["c_rate"] * capacity).tolist(),
        "temperature": result_df["temperature"].tolist(),
        "time": result_df["time"].tolist(),
        "confidence": result_df["ekf_confidence"].tolist(),
        "error": error,
    }

    def feature_summary(series, unit=""):
        return {
            "mean": float(series.mean()),
            "min": float(series.min()),
            "max": float(series.max()),
            "unit": unit,
        }

    input_features = {
        "cell_temperature": feature_summary(result_df["temperature"], "°C"),
        "current_c_rate": feature_summary(result_df["c_rate"], "C"),
        "terminal_voltage": feature_summary(result_df["voltage"], "V"),
        "internal_resistance": feature_summary(result_df["ekf_rint"], "Ω"),
        "ekf_soc_raw": feature_summary(result_df["ekf_soc"], ""),
        "ml_residual_correction": feature_summary(result_df["residual_pred"], ""),
        "final_soc": feature_summary(result_df["final_soc"], ""),
        "confidence": feature_summary(result_df["ekf_confidence"], ""),
    }

    response = {
        "metrics": metrics,
        "results": results,
        "input_features": input_features,
        "ml_correction": {
            "active": estimator.is_ml_active,
            "cv_mae": estimator.model_metadata.get("cv_mae"),
            "baseline_mae": estimator.model_metadata.get("baseline_mae"),
        },
        "status": "success",
    }
    return jsonify(response)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
