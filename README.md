# Battery SOC Estimation Dashboard — EKF + ML

Full-stack app for battery State of Charge (SOC) estimation, combining a
physics-based Extended Kalman Filter with an optional ML residual-correction
layer trained on your data.

## What's real here vs. the earlier README

The original spec called this "EKF + ML" but had no actual ML component —
just the EKF. This build makes the ML half real: a LightGBM model learns the
*residual error* the EKF leaves behind (from things like temperature-
dependent resistance the EKF's fixed OCV table can't capture), and that
correction is added on top of the EKF's estimate. If no trained model is
present, the app runs EKF-only and says so — it never silently fails.

```
CSV → EKF (per-timestep) → ekf_soc, ekf_rint
                                  │
                        ML residual model (if trained)
                                  │
                     final_soc = clip(ekf_soc + correction, 0, 1)
```

## Project structure

```
.
├── app/                        # Next.js app router
│   ├── page.tsx                # Upload page
│   ├── layout.tsx
│   ├── globals.css
│   └── types.ts                # Shared API response types
├── components/
│   ├── Dashboard.tsx            # Results view
│   ├── SOCGauge.tsx             # Circular SOC gauge
│   ├── MetricsGrid.tsx          # MAE/RMSE/etc. stat cards
│   ├── InputFeatures.tsx        # Feature summary cards
│   └── SOCTrendChart.tsx        # Estimated vs true SOC line chart
├── backend/
│   ├── app.py                   # Flask server (/health, /estimate)
│   ├── ekf_model.py             # Extended Kalman Filter (physics-only)
│   ├── residual_model.py        # EKF + ML correction wrapper (used by app.py)
│   ├── train_residual_model.py  # Offline training script for the ML layer
│   ├── make_synthetic_data.py   # Generates synthetic training CSVs
│   ├── residual_model.joblib    # Pre-trained model (from synthetic data — see caveat below)
│   ├── training_csvs/           # Synthetic training data used to produce the .joblib above
│   └── requirements.txt
├── sample_battery_data.csv      # Sample file for the upload UI
├── package.json
└── .env.local
```

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
Runs on `http://localhost:5000`. On startup it looks for `residual_model.joblib`
in the same folder — one is included (trained on the synthetic data in
`training_csvs/`), so ML correction is active out of the box. Delete or rename
it to test EKF-only mode.

### Frontend

```bash
npm install
npm run dev
```
Runs on `http://localhost:3000`. Upload `sample_battery_data.csv` to see the
full pipeline, or drag in your own CSV with the required columns.

## Required CSV columns

`temperature`, `c_rate`, `voltage`, `current_soc_true`, `time` — same as the
original spec.

## Retraining the ML layer on your own data

The included `residual_model.joblib` was trained on **synthetic data** (see
`backend/make_synthetic_data.py`) — it encodes made-up OCV and
temperature-resistance assumptions, not a real cell. Treat it as a pipeline
demo, not a production model.

To retrain on real data:
1. Edit `soc_ocv_table` in `backend/ekf_model.py` to match your actual cell's
   OCV-vs-SOC curve (from a datasheet or your own characterization).
2. Collect several CSVs from real cycling runs — ideally spanning different
   temperatures, C-rates, and aging states — into a folder.
3. Run:
   ```bash
   cd backend
   python train_residual_model.py --data_dir /path/to/your/csvs --out residual_model.joblib --capacity <Ah>
   ```
   This prints EKF-only baseline MAE vs. cross-validated corrected MAE, so
   you can see whether the ML layer is actually earning its keep before
   deploying it. It's entirely possible that with a well-characterized OCV
   table, the EKF alone is already accurate enough that ML adds little —
   that's a valid outcome, not a bug.
4. Restart the Flask server to pick up the new `.joblib`.

## API

### `GET /health`
```json
{ "status": "ok", "ml_model_loaded": true }
```

### `POST /estimate`
`multipart/form-data` with `file` (CSV) and optional `capacity` (Ah, default 50.0).

Returns `metrics`, `results` (full time series), `input_features`, and
`ml_correction` (whether the ML layer was applied and its cross-validated MAE).

## Known items / not yet done

- `next` is pinned to `14.2.32` (latest patched 14.x). `npm audit` flags
  remaining advisories that are only fixed by upgrading to Next 16, which is
  a breaking-change migration not done here.
- The bundled `.joblib` model is synthetic-trained — see retraining section
  above before relying on it for anything real.
- No auth, rate limiting, or production hardening on the Flask server —
  add a WSGI server (gunicorn, included in requirements.txt) and a reverse
  proxy before deploying publicly.
