import numpy as np
import pandas as pd
import os

os.makedirs("training_csvs", exist_ok=True)

soc_ocv = {0.0: 3.00, 0.1: 3.50, 0.3: 3.68, 0.5: 3.77, 0.7: 3.87, 0.9: 4.04, 1.0: 4.20}
soc_pts = np.array(sorted(soc_ocv.keys()))
ocv_pts = np.array([soc_ocv[s] for s in soc_pts])

rng = np.random.default_rng(0)
capacity = 50.0

configs = [
    dict(temp=25, c_rate=0.2, rint=0.05),
    dict(temp=10, c_rate=0.2, rint=0.07),
    dict(temp=40, c_rate=0.2, rint=0.04),
    dict(temp=25, c_rate=0.5, rint=0.05),
    dict(temp=25, c_rate=1.0, rint=0.05),
    dict(temp=0,  c_rate=0.3, rint=0.09),
    dict(temp=25, c_rate=0.1, rint=0.05),
]

for i, cfg in enumerate(configs):
    n = 200
    time = np.arange(n) * 10.0  # 10s steps
    soc_true = np.clip(1.0 - (cfg["c_rate"] * time) / (capacity * 3600 / capacity), 0.02, 1.0)
    # simpler: linear discharge
    soc_true = np.clip(np.linspace(0.98, 0.05, n), 0, 1)
    current = cfg["c_rate"] * capacity * np.ones(n)
    ocv = np.interp(soc_true, soc_pts, ocv_pts)
    # temperature increases resistance at extremes (nonlinear effect the EKF's
    # fixed OCV table can't capture -> gives the ML model something real to learn)
    temp_resistance_factor = 1.0 + 0.02 * abs(cfg["temp"] - 25)
    voltage = ocv - cfg["rint"] * temp_resistance_factor * current + rng.normal(0, 0.005, n)
    temperature = cfg["temp"] + rng.normal(0, 0.3, n)

    df = pd.DataFrame({
        "temperature": temperature,
        "c_rate": cfg["c_rate"] * np.ones(n),
        "voltage": voltage,
        "current_soc_true": soc_true,
        "time": time,
    })
    path = f"training_csvs/run_{i}_t{cfg['temp']}_c{cfg['c_rate']}.csv"
    df.to_csv(path, index=False)
    print(f"Wrote {path}")
