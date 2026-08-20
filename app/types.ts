export interface EstimateMetrics {
  final_soc_estimated: number;
  final_voltage: number;
  final_current: number;
  final_temperature: number;
  mean_absolute_error: number;
  rmse: number;
  max_error: number;
  final_confidence: number;
  data_points: number;
  total_time: number;
}

export interface EstimateResults {
  soc_estimated: number[];
  soc_true: number[];
  voltage: number[];
  current: number[];
  temperature: number[];
  time: number[];
  confidence: number[];
  error: number[];
}

export interface FeatureSummary {
  mean: number;
  min: number;
  max: number;
  unit: string;
}

export interface MLCorrectionInfo {
  active: boolean;
  cv_mae: number | null;
  baseline_mae: number | null;
}

export interface EstimateResponse {
  metrics: EstimateMetrics;
  results: EstimateResults;
  input_features: Record<string, FeatureSummary>;
  ml_correction: MLCorrectionInfo;
  status: "success" | "error";
  message?: string;
}
