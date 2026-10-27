import {
  User,
  DashboardKPIs,
  TreatmentStage,
  Sensor,
  SensorReading,
  Equipment,
  MaintenanceTask,
  Alert,
  AiRecommendation,
  ProcessAdjustment,
  AuditLog,
} from '../types';

let currentUserId = 'usr-2'; // Default to Plant Operator Marcus Sterling

export function setActiveUserId(id: string) {
  currentUserId = id;
  localStorage.setItem('aquapulse_user_id', id);
}

export function getActiveUserId(): string {
  const saved = localStorage.getItem('aquapulse_user_id');
  if (saved) currentUserId = saved;
  return currentUserId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-id', getActiveUserId());

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  async getMe(): Promise<{ user: User }> {
    return request('/api/auth/me');
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request('/api/auth/users');
  },

  async switchUser(userId: string): Promise<{ user: User }> {
    const res = await request<{ user: User }>('/api/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    setActiveUserId(res.user.id);
    return res;
  },

  async login(email: string, password: string): Promise<{ user: User }> {
    const res = await request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setActiveUserId(res.user.id);
    return res;
  },

  // Dashboard Overview
  async getDashboardOverview(): Promise<{
    kpis: DashboardKPIs;
    keySensors: {
      turbidity?: Sensor;
      chlorine?: Sensor;
      ph?: Sensor;
      dissolvedOxygen?: Sensor;
      temperature?: Sensor;
      conductivity?: Sensor;
    };
    sparklines: {
      turbidity: SensorReading[];
      chlorine: SensorReading[];
      ph: SensorReading[];
      flow: SensorReading[];
    };
    stages: TreatmentStage[];
    alerts: Alert[];
  }> {
    return request('/api/dashboard/overview');
  },

  // Sensors
  async getSensors(filters: { stage_id?: string; type?: string; status?: string; search?: string } = {}): Promise<{ sensors: Sensor[] }> {
    const params = new URLSearchParams();
    if (filters.stage_id) params.set('stage_id', filters.stage_id);
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    return request(`/api/sensors?${params.toString()}`);
  },

  async createSensor(sensorData: Partial<Sensor>): Promise<{ success: boolean; id: string }> {
    return request('/api/sensors', {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  },

  async updateSensor(id: string, updates: Partial<Sensor>): Promise<{ success: boolean }> {
    return request(`/api/sensors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteSensor(id: string): Promise<{ success: boolean }> {
    return request(`/api/sensors/${id}`, { method: 'DELETE' });
  },

  async calibrateSensor(
    id: string,
    data: { standardValue: string; calibrationNotes: string; calibrationIntervalDays?: number }
  ): Promise<{ success: boolean; next_calibration_due: string }> {
    return request(`/api/sensors/${id}/calibrate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSensorReadings(id: string, range: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<{ readings: SensorReading[] }> {
    return request(`/api/sensors/${id}/readings?range=${range}`);
  },

  // Treatment Stages & Process
  async getStages(): Promise<{ stages: TreatmentStage[] }> {
    return request('/api/stages');
  },

  async adjustProcess(
    stageId: string,
    adjustment: { parameterName: string; previousValue: string; newValue: string; reason: string; aiRecommendationId?: string }
  ): Promise<{ success: boolean; message: string }> {
    return request(`/api/stages/${stageId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  },

  async getProcessAdjustments(): Promise<{ adjustments: ProcessAdjustment[] }> {
    return request('/api/process-adjustments');
  },

  // AI Insights
  async getAiRecommendations(status: string = 'ALL'): Promise<{ recommendations: AiRecommendation[] }> {
    return request(`/api/ai/insights?status=${status}`);
  },

  async triggerAiAnalysis(): Promise<{
    success: boolean;
    mode: 'LIVE_GEMINI' | 'SIMULATED_DEMO';
    overall_assessment: string;
    forecast_trend: string;
    generatedCount: number;
  }> {
    return request('/api/ai/analyze', { method: 'POST' });
  },

  async reviewAiRecommendation(
    id: string,
    action: 'APPROVE' | 'REJECT',
    reviewNotes?: string
  ): Promise<{ success: boolean; status: string }> {
    return request(`/api/ai/recommendations/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewNotes }),
    });
  },

  // Alerts
  async getAlerts(filters: { severity?: string; status?: string } = {}): Promise<{ alerts: Alert[] }> {
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    return request(`/api/alerts?${params.toString()}`);
  },

  async acknowledgeAlert(id: string): Promise<{ success: boolean }> {
    return request(`/api/alerts/${id}/ack`, { method: 'POST' });
  },

  async resolveAlert(id: string, resolution_notes: string): Promise<{ success: boolean }> {
    return request(`/api/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes }),
    });
  },

  async addAlertComment(id: string, comment: string): Promise<{ success: boolean }> {
    return request(`/api/alerts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Equipment & Maintenance
  async getEquipment(): Promise<{ equipment: Equipment[] }> {
    return request('/api/equipment');
  },

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<{ success: boolean }> {
    return request(`/api/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMaintenanceTasks(): Promise<{ tasks: MaintenanceTask[] }> {
    return request('/api/maintenance-tasks');
  },

  async createMaintenanceTask(task: Partial<MaintenanceTask>): Promise<{ success: boolean; id: string }> {
    return request('/api/maintenance-tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateMaintenanceTask(id: string, data: { status: string; completion_notes?: string }): Promise<{ success: boolean }> {
    return request(`/api/maintenance-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Reports
  async getComplianceReport(): Promise<{
    metrics: {
      turbidityCompliancePct: number;
      turbidityLimitNTU: number;
      turbidityTargetNTU: number;
      chlorineCompliancePct: number;
      chlorineMinLimit: number;
      chlorineMaxLimit: number;
      phCompliancePct: number;
      phMinLimit: number;
      phMaxLimit: number;
      ctLogInactivationTarget: string;
      ctStatus: string;
      leadCopperCorrosionProtection: string;
    };
    disclaimer: string;
  }> {
    return request('/api/reports/compliance');
  },

  // Simulation
  async tickSimulation(scenario: string = 'NORMAL'): Promise<{ success: boolean; scenario: string; timestamp: string }> {
    return request('/api/simulation/tick', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request('/api/audit-logs');
  },
};
