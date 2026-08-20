"""
Extended Kalman Filter for battery SOC + internal resistance estimation.

State vector:  x = [SOC, Rint]
  SOC  : state of charge, 0-1
  Rint : internal resistance, Ohms

Process model (discrete):
  SOC[k+1]  = SOC[k] - (I[k] * dt) / (Capacity * 3600)
  Rint[k+1] = Rint[k] * aging_factor

Measurement model:
  V[k] = OCV(SOC[k]) - Rint[k] * I[k]

This file intentionally has NO ML in it — it is the physics-based
baseline. The ML correction layer (train_residual_model.py /
residual_model.py) sits on top of this output.
"""

import numpy as np


# Default SOC -> OCV lookup table (typical Li-ion NMC/graphite cell).
# Replace with a cell-specific characterization curve for production use.
DEFAULT_SOC_OCV_TABLE = {
    0.00: 3.00,
    0.05: 3.35,
    0.10: 3.50,
    0.20: 3.63,
    0.30: 3.68,
    0.40: 3.72,
    0.50: 3.77,
    0.60: 3.82,
    0.70: 3.87,
    0.80: 3.94,
    0.90: 4.04,
    1.00: 4.20,
}


class BatteryEKF:
    def __init__(
        self,
        initial_soc=0.9,
        initial_rint=0.05,
        process_noise_soc=1e-6,
        process_noise_rint=1e-8,
        measurement_noise=1e-3,
        capacity=50.0,
        soc_ocv_table=None,
        aging_factor=0.9999,
    ):
        self.capacity = capacity
        self.aging_factor = aging_factor
        self.soc_ocv_table = soc_ocv_table or DEFAULT_SOC_OCV_TABLE
        self._soc_points = np.array(sorted(self.soc_ocv_table.keys()))
        self._ocv_points = np.array([self.soc_ocv_table[s] for s in self._soc_points])

        # State: [SOC, Rint]
        self.x = np.array([initial_soc, initial_rint], dtype=float)

        # State covariance
        self.P = np.diag([1e-3, 1e-4])

        # Process noise covariance
        self.Q = np.diag([process_noise_soc, process_noise_rint])

        # Measurement noise covariance (scalar, voltage)
        self.R = np.array([[measurement_noise]])

    def _ocv(self, soc):
        soc_clipped = np.clip(soc, 0.0, 1.0)
        return float(np.interp(soc_clipped, self._soc_points, self._ocv_points))

    def _docv_dsoc(self, soc, eps=1e-4):
        soc_clipped = np.clip(soc, eps, 1.0 - eps)
        return (self._ocv(soc_clipped + eps) - self._ocv(soc_clipped - eps)) / (2 * eps)

    def predict(self, current, dt):
        """
        current: instantaneous current in Amps. Convention: positive = discharge.
        dt: timestep in seconds.
        """
        soc, rint = self.x
        soc_next = soc - (current * dt) / (self.capacity * 3600.0)
        rint_next = rint * self.aging_factor
        self.x = np.array([soc_next, rint_next])

        # Jacobian of state transition is identity-ish (linear in this model)
        F = np.array([[1.0, 0.0],
                      [0.0, self.aging_factor]])
        self.P = F @ self.P @ F.T + self.Q
        return self.x.copy()

    def update(self, measured_voltage, current):
        soc, rint = self.x
        predicted_voltage = self._ocv(soc) - rint * current

        # Jacobian of measurement model H = dV/dx = [dOCV/dSOC, -I]
        H = np.array([[self._docv_dsoc(soc), -current]])

        residual = float(measured_voltage - predicted_voltage)
        S = H @ self.P @ H.T + self.R
        K = (self.P @ H.T) @ np.linalg.inv(S)

        self.x = self.x + (K.flatten() * residual)
        self.x[0] = np.clip(self.x[0], 0.0, 1.0)

        I_mat = np.eye(2)
        self.P = (I_mat - K @ H) @ self.P
        return self.x.copy(), residual

    def confidence(self):
        """Simple confidence score derived from SOC variance (0-1, higher = better)."""
        soc_var = self.P[0, 0]
        return float(np.clip(1.0 - soc_var * 50, 0.0, 1.0))

    def step(self, current, voltage, dt):
        """Convenience: predict + update in one call. Returns dict of outputs."""
        self.predict(current, dt)
        state, residual = self.update(voltage, current)
        return {
            "soc": float(state[0]),
            "rint": float(state[1]),
            "residual": float(residual),
            "confidence": self.confidence(),
        }


def run_ekf_on_dataframe(df, capacity=50.0, **ekf_kwargs):
    """
    Run the EKF over a dataframe with columns:
    temperature, c_rate, voltage, time  (current_soc_true optional, used only for eval)

    current is derived from c_rate: I = c_rate * capacity
    Returns the dataframe with added columns: ekf_soc, ekf_rint, ekf_confidence

    Defensive handling: rows are sorted by time and duplicate timestamps are
    dropped before filtering. An unsorted or duplicated time column is a
    common real-world data issue (unordered exports, merged logs, retries)
    and will otherwise destabilize the filter (bad dt) and corrupt any
    chart that plots against time.
    """
    df = df.reset_index(drop=True).copy()

    if df["time"].duplicated().any():
        df = df.drop_duplicates(subset="time", keep="first")

    if not df["time"].is_monotonic_increasing:
        df = df.sort_values("time")

    df = df.reset_index(drop=True)

    ekf = BatteryEKF(
        initial_soc=df["current_soc_true"].iloc[0] if "current_soc_true" in df else 0.9,
        capacity=capacity,
        **ekf_kwargs,
    )

    soc_out, rint_out, conf_out = [], [], []
    prev_time = df["time"].iloc[0]

    for i, row in df.iterrows():
        dt = max(row["time"] - prev_time, 1e-6) if i > 0 else 1.0
        prev_time = row["time"]
        current = row["c_rate"] * capacity  # Amps
        out = ekf.step(current=current, voltage=row["voltage"], dt=dt)
        soc_out.append(out["soc"])
        rint_out.append(out["rint"])
        conf_out.append(out["confidence"])

    df["ekf_soc"] = soc_out
    df["ekf_rint"] = rint_out
    df["ekf_confidence"] = conf_out
    return df
