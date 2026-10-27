export type UserRole = 'Admin' | 'Plant Operator' | 'Technician' | 'Read-Only Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_color?: string;
}

export type StageId = 'intake' | 'coagulation' | 'sedimentation' | 'filtration' | 'disinfection' | 'distribution';

export interface TreatmentStage {
  id: StageId;
  order_index: number;
  name: string;
  description: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
  target_flow_rate: number;
  current_flow_rate: number;
  chemical_dosing: Record<string, string>;
  retention_time_mins: number;
  updated_at?: string;
  sensors?: Sensor[];
  equipment?: Equipment[];
}

export type SensorType =
  | 'Turbidity'
  | 'pH'
  | 'Free Chlorine'
  | 'Dissolved Oxygen'
  | 'Conductivity'
  | 'Temperature'
  | 'Flow Rate'
  | 'Differential Pressure'
  | 'Pressure';

export type SensorStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'STALE' | 'CRITICAL';

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  stage_id: StageId;
  location_tag: string;
  unit: string;
  current_value: number;
  status: SensorStatus;
  min_threshold: number;
  max_threshold: number;
  warning_min: number;
  warning_max: number;
  last_calibration_date: string;
  next_calibration_due: string;
  is_active: number;
  updated_at?: string;
}

export interface SensorReading {
  value: number;
  status: string;
  recorded_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  stage_id: StageId;
  stage_name?: string;
  status: 'RUNNING' | 'STANDBY' | 'MAINTENANCE_REQUIRED' | 'FAULT' | 'OFFLINE';
  health_score: number;
  runtime_hours: number;
  vibration_mm_s: number;
  temperature_c: number;
  last_serviced_date: string;
  next_service_due: string;
  water_quality_impact: 'None' | 'Moderate' | 'High' | 'Critical';
  notes?: string;
}

export interface MaintenanceTask {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  stage_id?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_to: string;
  due_date: string;
  completed_at?: string;
  completion_notes?: string;
  created_by: string;
  created_at: string;
}

export interface AlertComment {
  id: number;
  alert_id: string;
  author_name: string;
  author_role: string;
  comment: string;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source_type: 'SENSOR' | 'EQUIPMENT' | 'PROCESS' | 'CALIBRATION' | 'AI_ANOMALY' | 'MANUAL';
  source_id?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by?: string;
  acknowledged_at?: string;
  assigned_to?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  comments?: AlertComment[];
}

export interface AiRecommendation {
  id: string;
  title: string;
  summary: string;
  stage_id: StageId;
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supporting_telemetry: Record<string, string>;
  plain_language_explanation: string;
  recommended_action: string;
  estimated_impact: string;
  ai_source: 'GEMINI_3_8_FLASH' | 'SIMULATED_DEMO_AI';
  status: 'PENDING_REVIEW' | 'APPROVED_APPLIED' | 'REJECTED';
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  applied_changes?: Record<string, string>;
  created_at: string;
}

export interface ProcessAdjustment {
  id: number;
  stage_id: StageId;
  stage_name?: string;
  parameter_name: string;
  previous_value: string;
  new_value: string;
  reason: string;
  operator_name: string;
  operator_role: string;
  ai_recommendation_id?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_name: string;
  user_role: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  timestamp: string;
}

export interface DashboardKPIs {
  totalFlowMGD: number;
  volumeTreatedTodayMG: number;
  wqiScore: number;
  wqiStatus: 'Optimal' | 'Good' | 'Caution';
  activeAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  infoAlertsCount: number;
  equipmentRunning: number;
  equipmentTotal: number;
  equipmentMaintenanceNeeded: number;
  pendingAiRecommendations: number;
}
