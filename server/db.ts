import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'aquapulse.db');
export const db = new Database(dbPath);

// Enable WAL mode for concurrent performance & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log('[Database] Initializing schema and tables in', dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS treatment_stages (
      id TEXT PRIMARY KEY,
      order_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      target_flow_rate REAL NOT NULL,
      current_flow_rate REAL NOT NULL,
      chemical_dosing TEXT NOT NULL,
      retention_time_mins INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      location_tag TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_value REAL NOT NULL,
      status TEXT NOT NULL,
      min_threshold REAL NOT NULL,
      max_threshold REAL NOT NULL,
      warning_min REAL NOT NULL,
      warning_max REAL NOT NULL,
      last_calibration_date TEXT NOT NULL,
      next_calibration_due TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stage_id) REFERENCES treatment_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      value REAL NOT NULL,
      status TEXT NOT NULL,
      is_simulated INTEGER DEFAULT 1,
      recorded_at DATETIME NOT NULL,
      FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, recorded_at);

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      status TEXT NOT NULL,
      health_score INTEGER DEFAULT 95,
      runtime_hours REAL DEFAULT 0,
      vibration_mm_s REAL DEFAULT 1.2,
      temperature_c REAL DEFAULT 42.0,
      last_serviced_date TEXT,
      next_service_due TEXT,
      water_quality_impact TEXT DEFAULT 'None',
      notes TEXT,
      FOREIGN KEY (stage_id) REFERENCES treatment_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_to TEXT,
      due_date TEXT,
      completed_at TEXT,
      completion_notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      status TEXT NOT NULL,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      assigned_to TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alert_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      urgency TEXT NOT NULL,
      supporting_telemetry TEXT NOT NULL,
      plain_language_explanation TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      estimated_impact TEXT NOT NULL,
      ai_source TEXT NOT NULL,
      status TEXT NOT NULL,
      reviewed_by TEXT,
      review_notes TEXT,
      reviewed_at TEXT,
      applied_changes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS process_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage_id TEXT NOT NULL,
      parameter_name TEXT NOT NULL,
      previous_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      reason TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      operator_role TEXT NOT NULL,
      ai_recommendation_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plant_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedDefaultData();
}

export function logAudit(userName: string, userRole: string, actionType: string, entityType: string, entityId: string | null, details: string) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_name, user_role, action_type, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userName, userRole, actionType, entityType, entityId, details);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

function seedDefaultData() {
  const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('[Database] Seeding realistic industrial water treatment plant data...');

  // 1. Seed Users
  const salt = bcrypt.genSaltSync(10);
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('usr-1', 'Eleanor Vance', 'admin@aquapulse.io', bcrypt.hashSync('admin123', salt), 'Admin', 'emerald');
  insertUser.run('usr-2', 'Marcus Sterling', 'operator@aquapulse.io', bcrypt.hashSync('operator123', salt), 'Plant Operator', 'cyan');
  insertUser.run('usr-3', 'Devon Cruz', 'tech@aquapulse.io', bcrypt.hashSync('tech123', salt), 'Technician', 'amber');
  insertUser.run('usr-4', 'Sarah Chen', 'auditor@aquapulse.io', bcrypt.hashSync('viewer123', salt), 'Read-Only Viewer', 'purple');

  // 2. Seed Treatment Stages
  const stages = [
    {
      id: 'intake',
      order_index: 1,
      name: 'Intake & Raw Screening',
      description: 'River intake basin with coarse bar screens, traveling water screens, and raw water low-lift pumping.',
      status: 'NORMAL',
      target_flow_rate: 24.5,
      current_flow_rate: 24.2,
      chemical_dosing: JSON.stringify({ 'Potassium Permanganate': '0.8 mg/L', 'Pre-Chlorine': '0.0 mg/L' }),
      retention_time_mins: 15,
    },
    {
      id: 'coagulation',
      order_index: 2,
      name: 'Coagulation & Rapid Mix',
      description: 'Chemical dosing chamber with high-speed turbine mixers to destabilize colloidal suspended particles.',
      status: 'WARNING',
      target_flow_rate: 24.5,
      current_flow_rate: 24.2,
      chemical_dosing: JSON.stringify({ 'Alum (Al2(SO4)3)': '28.5 mg/L', 'Cationic Polymer': '1.4 mg/L', 'Caustic Soda (pH trim)': '4.2 mg/L' }),
      retention_time_mins: 2,
    },
    {
      id: 'sedimentation',
      order_index: 3,
      name: 'Flocculation & Clarification',
      description: 'Slow paddle flocculation basins transitioning into lamella plate clarifiers for gravity solids settling.',
      status: 'NORMAL',
      target_flow_rate: 24.5,
      current_flow_rate: 24.1,
      chemical_dosing: JSON.stringify({ 'Polymer Aid': '0.3 mg/L' }),
      retention_time_mins: 120,
    },
    {
      id: 'filtration',
      order_index: 4,
      name: 'Dual-Media Gravity Filtration',
      description: '8 deep-bed granular activated carbon (GAC) and anthracite/silica sand filter cells with air-scour backwash.',
      status: 'WARNING',
      target_flow_rate: 24.5,
      current_flow_rate: 23.9,
      chemical_dosing: JSON.stringify({ 'Filter Aid Coagulant': '0.05 mg/L' }),
      retention_time_mins: 45,
    },
    {
      id: 'disinfection',
      order_index: 5,
      name: 'Disinfection & Contact Chamber',
      description: 'Primary sodium hypochlorite contact basin with serpentine baffle walls ensuring compliant CT log-inactivation.',
      status: 'NORMAL',
      target_flow_rate: 24.5,
      current_flow_rate: 23.9,
      chemical_dosing: JSON.stringify({ 'Sodium Hypochlorite (12.5%)': '2.6 mg/L', 'Orthophosphate (Corrosion)': '1.1 mg/L', 'Fluorosilicic Acid': '0.7 mg/L' }),
      retention_time_mins: 60,
    },
    {
      id: 'distribution',
      order_index: 6,
      name: 'Clearwell & High-Service Pumping',
      description: '10-million gallon finished water reservoir delivering pressurized potable water to municipal zones A & B.',
      status: 'NORMAL',
      target_flow_rate: 24.5,
      current_flow_rate: 24.0,
      chemical_dosing: JSON.stringify({ 'Residual Chlorine Trim': '0.4 mg/L' }),
      retention_time_mins: 240,
    },
  ];

  const insertStage = db.prepare(`
    INSERT INTO treatment_stages (id, order_index, name, description, status, target_flow_rate, current_flow_rate, chemical_dosing, retention_time_mins)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of stages) {
    insertStage.run(s.id, s.order_index, s.name, s.description, s.status, s.target_flow_rate, s.current_flow_rate, s.chemical_dosing, s.retention_time_mins);
  }

  // 3. Seed Sensors
  const sensors = [
    // Intake
    { id: 'SNS-INT-TB01', name: 'Raw Water Turbidimeter', type: 'Turbidity', stage_id: 'intake', location_tag: 'Intake Wet Well #1', unit: 'NTU', current_value: 18.4, status: 'ONLINE', min_threshold: 1.0, max_threshold: 45.0, warning_min: 3.0, warning_max: 25.0, last_cal: '2026-09-15', next_cal: '2026-11-15' },
    { id: 'SNS-INT-PH01', name: 'Raw Water pH Probe', type: 'pH', stage_id: 'intake', location_tag: 'Intake Wet Well #1', unit: 'pH', current_value: 7.82, status: 'ONLINE', min_threshold: 6.0, max_threshold: 9.0, warning_min: 6.8, warning_max: 8.4, last_cal: '2026-10-01', next_cal: '2026-11-01' },
    { id: 'SNS-INT-TMP1', name: 'Raw Water Temperature Sensor', type: 'Temperature', stage_id: 'intake', location_tag: 'Screening Channel #2', unit: '°C', current_value: 16.8, status: 'ONLINE', min_threshold: 2.0, max_threshold: 30.0, warning_min: 5.0, warning_max: 25.0, last_cal: '2026-08-10', next_cal: '2026-11-10' },
    { id: 'SNS-INT-FL01', name: 'Intake Ultrasonic Flowmeter', type: 'Flow Rate', stage_id: 'intake', location_tag: 'Raw Water Header 48"', unit: 'MGD', current_value: 24.2, status: 'ONLINE', min_threshold: 10.0, max_threshold: 35.0, warning_min: 15.0, warning_max: 30.0, last_cal: '2026-07-20', next_cal: '2026-11-20' },
    { id: 'SNS-INT-CD01', name: 'Raw Conductivity Analyzer', type: 'Conductivity', stage_id: 'intake', location_tag: 'Intake Well Channel', unit: 'µS/cm', current_value: 385.0, status: 'ONLINE', min_threshold: 100.0, max_threshold: 1200.0, warning_min: 200.0, warning_max: 850.0, last_cal: '2026-09-18', next_cal: '2026-11-18' },

    // Coagulation
    { id: 'SNS-COA-PH01', name: 'Rapid Mix pH Sensor', type: 'pH', stage_id: 'coagulation', location_tag: 'Flash Chamber Outlet', unit: 'pH', current_value: 6.42, status: 'WARNING', min_threshold: 5.8, max_threshold: 7.6, warning_min: 6.2, warning_max: 7.2, last_cal: '2026-10-05', next_cal: '2026-11-05' },
    { id: 'SNS-COA-TB01', name: 'Floc In-line Streaming Current Monitor', type: 'Turbidity', stage_id: 'coagulation', location_tag: 'Coagulation Basin B', unit: 'SCU', current_value: -12.4, status: 'ONLINE', min_threshold: -30.0, max_threshold: 10.0, warning_min: -20.0, warning_max: 5.0, last_cal: '2026-09-22', next_cal: '2026-10-22' },

    // Sedimentation
    { id: 'SNS-SED-TB01', name: 'Clarifier Effluent Turbidimeter', type: 'Turbidity', stage_id: 'sedimentation', location_tag: 'Clarifier #2 Launder', unit: 'NTU', current_value: 1.85, status: 'ONLINE', min_threshold: 0.1, max_threshold: 5.0, warning_min: 0.2, warning_max: 2.5, last_cal: '2026-09-28', next_cal: '2026-11-28' },
    { id: 'SNS-SED-DO01', name: 'Sedimentation Basin DO Probe', type: 'Dissolved Oxygen', stage_id: 'sedimentation', location_tag: 'Clarifier Zone C', unit: 'mg/L', current_value: 7.4, status: 'ONLINE', min_threshold: 4.0, max_threshold: 14.0, warning_min: 5.5, warning_max: 12.0, last_cal: '2026-09-10', next_cal: '2026-11-10' },

    // Filtration
    { id: 'SNS-FLT-TB01', name: 'Filter Effluent Combined Turbidity', type: 'Turbidity', stage_id: 'filtration', location_tag: 'Filter Gallery Common Pipe', unit: 'NTU', current_value: 0.28, status: 'WARNING', min_threshold: 0.02, max_threshold: 0.50, warning_min: 0.05, warning_max: 0.25, last_cal: '2026-10-12', next_cal: '2026-11-12' },
    { id: 'SNS-FLT-DP03', name: 'Filter Bed #3 Differential Pressure', type: 'Differential Pressure', stage_id: 'filtration', location_tag: 'Filter Cell 3 Underdrain', unit: 'psi', current_value: 7.6, status: 'WARNING', min_threshold: 0.5, max_threshold: 9.0, warning_min: 1.0, warning_max: 6.5, last_cal: '2026-08-30', next_cal: '2026-10-30' },
    { id: 'SNS-FLT-TB04', name: 'Filter Cell 4 Turbidimeter', type: 'Turbidity', stage_id: 'filtration', location_tag: 'Filter Bed 4 Effluent', unit: 'NTU', current_value: 0.12, status: 'ONLINE', min_threshold: 0.02, max_threshold: 0.30, warning_min: 0.04, warning_max: 0.20, last_cal: '2026-09-04', next_cal: '2026-11-04' },

    // Disinfection
    { id: 'SNS-DIS-CL01', name: 'Contact Basin Chlorine Residual', type: 'Free Chlorine', stage_id: 'disinfection', location_tag: 'Contact Chamber Effluent', unit: 'mg/L', current_value: 2.15, status: 'ONLINE', min_threshold: 0.5, max_threshold: 4.0, warning_min: 1.2, warning_max: 3.2, last_cal: '2026-10-14', next_cal: '2026-11-14' },
    { id: 'SNS-DIS-PH01', name: 'Disinfection Finished pH', type: 'pH', stage_id: 'disinfection', location_tag: 'Baffle Wall 4 Sampling Point', unit: 'pH', current_value: 7.35, status: 'ONLINE', min_threshold: 6.5, max_threshold: 8.5, warning_min: 7.0, warning_max: 8.0, last_cal: '2026-10-08', next_cal: '2026-11-08' },
    { id: 'SNS-DIS-TMP1', name: 'Disinfection Basin Temperature', type: 'Temperature', stage_id: 'disinfection', location_tag: 'Basin Outlet', unit: '°C', current_value: 17.2, status: 'ONLINE', min_threshold: 4.0, max_threshold: 30.0, warning_min: 8.0, warning_max: 26.0, last_cal: '2026-09-01', next_cal: '2026-12-01' },

    // Distribution
    { id: 'SNS-DST-CL01', name: 'Point-of-Entry Free Chlorine', type: 'Free Chlorine', stage_id: 'distribution', location_tag: 'Clearwell Outlet Discharge 42"', unit: 'mg/L', current_value: 1.62, status: 'ONLINE', min_threshold: 0.2, max_threshold: 4.0, warning_min: 0.8, warning_max: 2.5, last_cal: '2026-10-18', next_cal: '2026-11-18' },
    { id: 'SNS-DST-TB01', name: 'Distribution Water Turbidity', type: 'Turbidity', stage_id: 'distribution', location_tag: 'Distribution Header', unit: 'NTU', current_value: 0.08, status: 'ONLINE', min_threshold: 0.01, max_threshold: 0.30, warning_min: 0.02, warning_max: 0.20, last_cal: '2026-10-10', next_cal: '2026-11-10' },
    { id: 'SNS-DST-PR01', name: 'High Service Discharge Pressure', type: 'Pressure', stage_id: 'distribution', location_tag: 'High Service Pump Room Main', unit: 'psi', current_value: 84.5, status: 'ONLINE', min_threshold: 50.0, max_threshold: 120.0, warning_min: 65.0, warning_max: 105.0, last_cal: '2026-08-15', next_cal: '2026-11-15' },
    { id: 'SNS-DST-CD01', name: 'Finished Water Conductivity', type: 'Conductivity', stage_id: 'distribution', location_tag: 'Finished Water Header', unit: 'µS/cm', current_value: 410.0, status: 'ONLINE', min_threshold: 100.0, max_threshold: 1000.0, warning_min: 250.0, warning_max: 750.0, last_cal: '2026-09-20', next_cal: '2026-11-20' },
    { id: 'SNS-DST-DO01', name: 'Finished Water Dissolved Oxygen', type: 'Dissolved Oxygen', stage_id: 'distribution', location_tag: 'Clearwell Flume', unit: 'mg/L', current_value: 8.9, status: 'ONLINE', min_threshold: 5.0, max_threshold: 14.0, warning_min: 6.5, warning_max: 12.0, last_cal: '2026-09-15', next_cal: '2026-11-15' },
  ];

  const insertSensor = db.prepare(`
    INSERT INTO sensors (id, name, type, stage_id, location_tag, unit, current_value, status, min_threshold, max_threshold, warning_min, warning_max, last_calibration_date, next_calibration_due, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const sn of sensors) {
    insertSensor.run(sn.id, sn.name, sn.type, sn.stage_id, sn.location_tag, sn.unit, sn.current_value, sn.status, sn.min_threshold, sn.max_threshold, sn.warning_min, sn.warning_max, sn.last_cal, sn.next_cal);
  }

  // 4. Seed Sensor Readings (24 hours of realistic data at 30 min intervals)
  const insertReading = db.prepare(`
    INSERT INTO sensor_readings (sensor_id, value, status, is_simulated, recorded_at)
    VALUES (?, ?, ?, 1, ?)
  `);

  const now = Date.now();
  for (let i = 48; i >= 0; i--) {
    const timestamp = new Date(now - i * 30 * 60 * 1000).toISOString();
    for (const sn of sensors) {
      // Generate realistic fluctuation with slight drift
      const base = sn.current_value;
      const noise = (Math.sin(i * 0.3 + sn.id.length) * 0.08 + (Math.random() - 0.5) * 0.04) * base;
      const val = Math.max(0.01, Number((base + noise).toFixed(2)));
      let status = 'NORMAL';
      if (val < sn.min_threshold || val > sn.max_threshold) status = 'CRITICAL';
      else if (val < sn.warning_min || val > sn.warning_max) status = 'WARNING';

      insertReading.run(sn.id, val, status, timestamp);
    }
  }

  // 5. Seed Equipment
  const equipmentList = [
    { id: 'EQ-PMP-101', name: 'Raw Water Low-Lift Pump #1', type: 'Intake Pump', stage_id: 'intake', status: 'RUNNING', health_score: 92, runtime: 4320, vibration: 1.4, temp: 46.2, last_svc: '2026-08-14', next_svc: '2026-11-14', impact: 'High', notes: 'Primary raw water intake intake motor 250HP.' },
    { id: 'EQ-PMP-102', name: 'Raw Water Low-Lift Pump #2', type: 'Intake Pump', stage_id: 'intake', status: 'STANDBY', health_score: 98, runtime: 2110, vibration: 0.9, temp: 24.0, last_svc: '2026-09-02', next_svc: '2026-12-02', impact: 'Moderate', notes: 'Standby pump; automatic transfer active.' },
    { id: 'EQ-MIX-201', name: 'Rapid Coagulant Flash Mixer A', type: 'Flash Mixer', stage_id: 'coagulation', status: 'MAINTENANCE_REQUIRED', health_score: 68, runtime: 6140, vibration: 3.8, temp: 62.5, last_svc: '2026-06-10', next_svc: '2026-09-10', impact: 'Critical', notes: 'Bearing vibration warning detected on upper shaft housing.' },
    { id: 'EQ-DOS-202', name: 'Alum Chemical Metering Skid #1', type: 'Chemical Dosing Pump', stage_id: 'coagulation', status: 'RUNNING', health_score: 89, runtime: 3400, vibration: 1.1, temp: 36.0, last_svc: '2026-09-18', next_svc: '2026-11-18', impact: 'Critical', notes: 'Duty dosing pump diaphragm inspected.' },
    { id: 'EQ-SCR-301', name: 'Clarifier Circular Scraper Drive #2', type: 'Flocculator Drive', stage_id: 'sedimentation', status: 'RUNNING', health_score: 94, runtime: 7890, vibration: 0.7, temp: 32.1, last_svc: '2026-07-22', next_svc: '2026-11-22', impact: 'Moderate', notes: 'Torque limit switches tested normal.' },
    { id: 'EQ-FLT-403', name: 'Filter Bed #3 Media & Valves', type: 'Dual-Media Filter Bed', stage_id: 'filtration', status: 'MAINTENANCE_REQUIRED', health_score: 74, runtime: 2840, vibration: 1.6, temp: 28.0, last_svc: '2026-08-01', next_svc: '2026-10-25', impact: 'High', notes: 'Differential pressure rising rapidly; air scour backwash cycle needed.' },
    { id: 'EQ-FLT-404', name: 'Filter Bed #4 Media & Valves', type: 'Dual-Media Filter Bed', stage_id: 'filtration', status: 'RUNNING', health_score: 96, runtime: 1200, vibration: 0.8, temp: 27.5, last_svc: '2026-09-29', next_svc: '2026-12-29', impact: 'High', notes: 'Recent media replenishment performed.' },
    { id: 'EQ-DOS-501', name: 'Sodium Hypochlorite Metering Pump A', type: 'Chemical Dosing Pump', stage_id: 'disinfection', status: 'RUNNING', health_score: 91, runtime: 3100, vibration: 0.9, temp: 34.2, last_svc: '2026-09-12', next_svc: '2026-11-12', impact: 'Critical', notes: 'Dual peristaltic tube head in good condition.' },
    { id: 'EQ-HSP-601', name: 'High-Service Distribution Pump #1', type: 'High-Lift Distribution Pump', stage_id: 'distribution', status: 'RUNNING', health_score: 88, runtime: 8400, vibration: 2.1, temp: 51.0, last_svc: '2026-07-15', next_svc: '2026-11-15', impact: 'Critical', notes: '500HP variable frequency drive pump supplying Zone A.' },
    { id: 'EQ-HSP-602', name: 'High-Service Distribution Pump #2', type: 'High-Lift Distribution Pump', stage_id: 'distribution', status: 'STANDBY', health_score: 97, runtime: 4100, vibration: 1.0, temp: 22.0, last_svc: '2026-08-20', next_svc: '2026-11-20', impact: 'Critical', notes: 'Standby for peak demand hours.' },
  ];

  const insertEquipment = db.prepare(`
    INSERT INTO equipment (id, name, type, stage_id, status, health_score, runtime_hours, vibration_mm_s, temperature_c, last_serviced_date, next_service_due, water_quality_impact, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const eq of equipmentList) {
    insertEquipment.run(eq.id, eq.name, eq.type, eq.stage_id, eq.status, eq.health_score, eq.runtime, eq.vibration, eq.temp, eq.last_svc, eq.next_svc, eq.impact, eq.notes);
  }

  // 6. Seed Maintenance Tasks
  const tasks = [
    {
      id: 'TSK-2026-089',
      equipment_id: 'EQ-FLT-403',
      title: 'Initiate Manual Backwash & Media Fluidization Check',
      description: 'Filter Bed #3 differential pressure reached 7.6 psi (warning threshold 6.5 psi). Run backwash cycle with air scouring and check surface wash spray nozzles.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigned_to: 'Devon Cruz',
      due_date: '2026-10-28',
      created_by: 'Marcus Sterling',
    },
    {
      id: 'TSK-2026-090',
      equipment_id: 'EQ-MIX-201',
      title: 'Vibration Analysis & Bearing Lubrication on Flash Mixer A',
      description: 'Vibration reached 3.8 mm/s. Inspect mechanical seal, grease upper bearing housing, and evaluate drive gearbox coupling alignment.',
      priority: 'CRITICAL',
      status: 'PENDING',
      assigned_to: 'Devon Cruz',
      due_date: '2026-10-27',
      created_by: 'Eleanor Vance',
    },
    {
      id: 'TSK-2026-091',
      equipment_id: 'EQ-DOS-202',
      title: 'Alum Metering Calibration & Tube Replacement',
      description: 'Quarterly stroke verification and pump head elastomer inspection to preserve dosing accuracy.',
      priority: 'MEDIUM',
      status: 'PENDING',
      assigned_to: 'Devon Cruz',
      due_date: '2026-11-04',
      created_by: 'Marcus Sterling',
    },
  ];

  const insertTask = db.prepare(`
    INSERT INTO maintenance_tasks (id, equipment_id, title, description, priority, status, assigned_to, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of tasks) {
    insertTask.run(t.id, t.equipment_id, t.title, t.description, t.priority, t.status, t.assigned_to, t.due_date, t.created_by);
  }

  // 7. Seed Alerts
  const alertsList = [
    {
      id: 'ALT-1092',
      title: 'Filter Bed #3 High Differential Pressure & Turbidity Creep',
      description: 'Differential pressure at 7.6 psi exceeds 6.5 psi warning mark; effluent turbidity approaching 0.28 NTU threshold.',
      severity: 'WARNING',
      source_type: 'EQUIPMENT',
      source_id: 'EQ-FLT-403',
      status: 'ACKNOWLEDGED',
      acknowledged_by: 'Marcus Sterling',
      acknowledged_at: new Date(now - 45 * 60 * 1000).toISOString(),
      assigned_to: 'Devon Cruz',
      created_at: new Date(now - 75 * 60 * 1000).toISOString(),
    },
    {
      id: 'ALT-1093',
      title: 'Flash Mixer A Elevated Vibration Warning',
      description: 'Drive shaft vibration reached 3.8 mm/s (acceptable < 2.5 mm/s). Mechanical wear risking coagulant dispersion efficiency.',
      severity: 'CRITICAL',
      source_type: 'EQUIPMENT',
      source_id: 'EQ-MIX-201',
      status: 'ACTIVE',
      assigned_to: 'Devon Cruz',
      created_at: new Date(now - 120 * 60 * 1000).toISOString(),
    },
    {
      id: 'ALT-1094',
      title: 'Rapid Mix pH Drop Below Optimal Coagulation Window',
      description: 'Rapid mix pH recorded 6.42 pH. Optimum alum sweep flocculation window is 6.50 - 7.00 pH. Caustic soda trim dosing may need upward adjustment.',
      severity: 'WARNING',
      source_type: 'SENSOR',
      source_id: 'SNS-COA-PH01',
      status: 'ACTIVE',
      assigned_to: 'Marcus Sterling',
      created_at: new Date(now - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'ALT-1090',
      title: 'Coagulation Basin Streaming Current Sensor Calibration Due',
      description: 'Streaming Current Monitor SNS-COA-TB01 reached scheduled monthly calibration due date (2026-10-22).',
      severity: 'INFO',
      source_type: 'CALIBRATION',
      source_id: 'SNS-COA-TB01',
      status: 'ACTIVE',
      assigned_to: 'Devon Cruz',
      created_at: new Date(now - 24 * 3600 * 1000).toISOString(),
    },
  ];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, title, description, severity, source_type, source_id, status, acknowledged_by, acknowledged_at, assigned_to, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of alertsList) {
    insertAlert.run(a.id, a.title, a.description, a.severity, a.source_type, a.source_id, a.status, a.acknowledged_by || null, a.acknowledged_at || null, a.assigned_to || null, a.created_at);
  }

  // 8. Seed Alert Comments
  const insertComment = db.prepare(`
    INSERT INTO alert_comments (alert_id, author_name, author_role, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertComment.run('ALT-1092', 'Marcus Sterling', 'Plant Operator', 'Noticed headloss accumulation during shift handover. Maintenance task TSK-2026-089 scheduled for backwash cycle.', new Date(now - 40 * 60 * 1000).toISOString());
  insertComment.run('ALT-1093', 'Eleanor Vance', 'Admin', 'Please expedite inspection. If vibration exceeds 4.5 mm/s, transfer raw feed to Coagulation Basin B immediately.', new Date(now - 90 * 60 * 1000).toISOString());

  // 9. Seed AI Recommendations (Human-in-the-loop review required)
  const aiRecs = [
    {
      id: 'AI-REC-401',
      title: 'Trim Caustic Soda Dosing (+0.6 mg/L) to Restore pH 6.65 in Coagulation',
      summary: 'Raw water alkalinity shift caused rapid mix pH to drift to 6.42, reducing alum hydrolyzing efficiency by approximately 14%.',
      stage_id: 'coagulation',
      confidence: 94,
      urgency: 'HIGH',
      supporting_telemetry: JSON.stringify({
        'Current Coagulation pH': '6.42 (Optimal: 6.50 - 7.00)',
        'Raw Water Turbidity': '18.4 NTU',
        'Raw Water Alkalinity Est.': '42 mg/L as CaCO3',
        'Alum Feed Rate': '28.5 mg/L',
      }),
      plain_language_explanation: 'The current rapid mix pH of 6.42 is slightly below the ideal sweep flocculation window. When pH is too low with alum, pin-point floc forms instead of dense flocs, which allows micro-turbidity to escape clarifiers and load the filter beds. Increasing caustic soda feed by 0.6 mg/L will re-establish optimal floc density without overdosing.',
      recommended_action: 'Increase Caustic Soda metering pump output from 4.2 mg/L to 4.8 mg/L.',
      estimated_impact: 'Prevents 18% turbidity carryover to sedimentation; restores settling velocity in under 20 minutes.',
      ai_source: 'GEMINI_3_8_FLASH',
      status: 'PENDING_REVIEW',
      applied_changes: JSON.stringify({ 'Caustic Soda (pH trim)': '4.8 mg/L' }),
      created_at: new Date(now - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'AI-REC-402',
      title: 'Execute Automated Backwash Protocol on Filter Bed #3',
      summary: 'Differential pressure gradient has reached 7.6 psi with turbidity breakthrough risk within the next 90 minutes.',
      stage_id: 'filtration',
      confidence: 96,
      urgency: 'HIGH',
      supporting_telemetry: JSON.stringify({
        'Filter #3 Headloss': '7.6 psi (Warning: 6.5 psi, Terminal: 8.5 psi)',
        'Filter #3 Turbidity': '0.28 NTU',
        'Current Runtime Since Backwash': '48.5 hours',
        'Headloss Rate of Change': '+0.45 psi/hr',
      }),
      plain_language_explanation: 'Predictive trend extrapolation indicates Filter Bed #3 will breach the EPA surface water treatment rule turbidity ceiling (0.30 NTU) in approximately 85 minutes if operated continuously. Taking the cell offline for a 12-minute air-scour and fluidization backwash will restore clean bed headloss to 1.1 psi.',
      recommended_action: 'Place Filter Bed #3 into automated backwash sequence and redistribute flow to Cells 1, 2, and 4.',
      estimated_impact: 'Eliminates compliance risk; reduces effluent turbidity across gallery from 0.28 NTU to 0.08 NTU.',
      ai_source: 'GEMINI_3_8_FLASH',
      status: 'PENDING_REVIEW',
      applied_changes: JSON.stringify({ 'Filter Bed #3 Status': 'BACKWASH_CYCLE' }),
      created_at: new Date(now - 50 * 60 * 1000).toISOString(),
    },
    {
      id: 'AI-REC-403',
      title: 'Optimize Disinfection Chlorine Feed Rate (-0.2 mg/L) for Temperature Compensation',
      summary: 'Water temperature decreased from 19.5°C to 16.8°C over 48 hours, reducing free chlorine decay rate in distribution piping.',
      stage_id: 'disinfection',
      confidence: 88,
      urgency: 'LOW',
      supporting_telemetry: JSON.stringify({
        'Finished Chlorine Residual': '2.15 mg/L',
        'Point-of-Entry Residual': '1.62 mg/L (Target: 1.2 - 1.5 mg/L)',
        'Current Temp': '16.8°C',
        'Contact Basin Retention': '62 mins (CT value: 133 mg·min/L, required: 90 mg·min/L)',
      }),
      plain_language_explanation: 'With colder autumn river inflow, chlorine residual decays 15% slower through the contact basin and primary transmission lines. Trimming hypochlorite feed by 0.2 mg/L maintains safe pathogen inactivation (well above required Giardia/Virus CT thresholds) while preventing taste/odor complaints and saving chemical expenditure.',
      recommended_action: 'Trim Sodium Hypochlorite feed from 2.6 mg/L to 2.4 mg/L.',
      estimated_impact: 'Saves ~$180/day in chemical costs while keeping Point-of-Entry residual comfortably at 1.45 mg/L.',
      ai_source: 'SIMULATED_DEMO_AI',
      status: 'APPROVED_APPLIED',
      reviewed_by: 'Marcus Sterling',
      review_notes: 'Verified CT calculation meets EPA drinking water regulations. Approved adjustment.',
      reviewed_at: new Date(now - 180 * 60 * 1000).toISOString(),
      applied_changes: JSON.stringify({ 'Sodium Hypochlorite': '2.4 mg/L' }),
      created_at: new Date(now - 240 * 60 * 1000).toISOString(),
    },
  ];

  const insertAiRec = db.prepare(`
    INSERT INTO ai_recommendations (id, title, summary, stage_id, confidence, urgency, supporting_telemetry, plain_language_explanation, recommended_action, estimated_impact, ai_source, status, reviewed_by, review_notes, reviewed_at, applied_changes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of aiRecs) {
    insertAiRec.run(r.id, r.title, r.summary, r.stage_id, r.confidence, r.urgency, r.supporting_telemetry, r.plain_language_explanation, r.recommended_action, r.estimated_impact, r.ai_source, r.status, r.reviewed_by || null, r.review_notes || null, r.reviewed_at || null, r.applied_changes, r.created_at);
  }

  // 10. Seed Process Adjustments
  const insertAdjustment = db.prepare(`
    INSERT INTO process_adjustments (stage_id, parameter_name, previous_value, new_value, reason, operator_name, operator_role, ai_recommendation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAdjustment.run('disinfection', 'Sodium Hypochlorite Feed Rate', '2.6 mg/L', '2.4 mg/L', 'Approved AI optimization recommendation AI-REC-403 for seasonal temperature compensation.', 'Marcus Sterling', 'Plant Operator', 'AI-REC-403', new Date(now - 175 * 60 * 1000).toISOString());
  insertAdjustment.run('coagulation', 'Alum Dosing Rate', '26.0 mg/L', '28.5 mg/L', 'Increased dosing in response to rainfall runoff turbidity spike at intake.', 'Marcus Sterling', 'Plant Operator', null, new Date(now - 360 * 60 * 1000).toISOString());

  // 11. Seed Audit Logs
  logAudit('System Boot', 'System', 'SYSTEM_INITIALIZE', 'PLANT', 'FACILITY-01', 'AquaPulse SCADA database schema initialized and loaded 20 sensors, 6 treatment stages, 10 equipment assets.');
  logAudit('Marcus Sterling', 'Plant Operator', 'AI_APPROVE', 'AI_RECOMMENDATION', 'AI-REC-403', 'Approved Sodium Hypochlorite dosage adjustment to 2.4 mg/L.');
  logAudit('Marcus Sterling', 'Plant Operator', 'PROCESS_ADJUST', 'TREATMENT_STAGE', 'coagulation', 'Alum Dosing Rate adjusted from 26.0 to 28.5 mg/L.');
  logAudit('Devon Cruz', 'Technician', 'CALIBRATION', 'SENSOR', 'SNS-DIS-CL01', 'Free Chlorine sensor secondary DPD photometer zero/span verification completed.');

  console.log('[Database] Seed completed successfully.');
}
