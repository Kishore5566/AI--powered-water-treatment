import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase, logAudit } from './server/db.ts';
import { analyzeWaterTreatmentTelemetry } from './server/ai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database, schema and seed data
initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Helper for user context from header or fallback
function getCurrentUser(req: express.Request) {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(userId);
    if (user) return user as any;
  }
  // Default to Operator for rapid testing
  return {
    id: 'usr-2',
    name: 'Marcus Sterling',
    email: 'operator@aquapulse.io',
    role: 'Plant Operator',
    avatar_color: 'cyan',
  };
}

// ----------------------------------------------------
// AUTH & USERS API
// ----------------------------------------------------
app.get('/api/auth/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

app.get('/api/auth/users', (_req, res) => {
  const users = db.prepare('SELECT id, name, email, role, avatar_color FROM users ORDER BY role, name').all();
  res.json({ users });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check demo match or bcrypt
  import('bcryptjs').then(({ default: bcrypt }) => {
    const matches = bcrypt.compareSync(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    logAudit(user.name, user.role, 'LOGIN', 'USER', user.id, `User signed in successfully from SCADA portal.`);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_color: user.avatar_color,
      },
    });
  });
});

app.post('/api/auth/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  logAudit(user.name, user.role, 'USER_SWITCH', 'USER', user.id, `Switched active control room user context.`);
  res.json({ user });
});

// ----------------------------------------------------
// DASHBOARD OVERVIEW API
// ----------------------------------------------------
app.get('/api/dashboard/overview', (_req, res) => {
  try {
    const stages = db.prepare('SELECT * FROM treatment_stages ORDER BY order_index').all() as any[];
    const sensors = db.prepare('SELECT * FROM sensors WHERE is_active = 1').all() as any[];
    const equipment = db.prepare('SELECT * FROM equipment').all() as any[];
    const alerts = db.prepare("SELECT * FROM alerts WHERE status != 'RESOLVED' ORDER BY created_at DESC").all() as any[];
    const pendingAiCount = (db.prepare("SELECT count(*) as count FROM ai_recommendations WHERE status = 'PENDING_REVIEW'").get() as any).count;

    // Calculate aggregated KPIs
    const totalFlow = stages.find((s) => s.id === 'distribution')?.current_flow_rate || 24.0;
    
    // Critical water quality parameters
    const phSensor = sensors.find((s) => s.id === 'SNS-DIS-PH01' || (s.stage_id === 'disinfection' && s.type === 'pH'));
    const tbSensor = sensors.find((s) => s.id === 'SNS-DST-TB01' || (s.stage_id === 'distribution' && s.type === 'Turbidity'));
    const clSensor = sensors.find((s) => s.id === 'SNS-DST-CL01' || (s.stage_id === 'distribution' && s.type === 'Free Chlorine'));
    const doSensor = sensors.find((s) => s.id === 'SNS-DST-DO01' || (s.stage_id === 'distribution' && s.type === 'Dissolved Oxygen'));
    const tmpSensor = sensors.find((s) => s.id === 'SNS-DIS-TMP1' || s.type === 'Temperature');
    const cdSensor = sensors.find((s) => s.id === 'SNS-DST-CD01' || s.type === 'Conductivity');

    // Calculate Water Quality Index (WQI) score (0-100) based on distance from optimum
    let wqi = 100;
    if (tbSensor && tbSensor.current_value > 0.15) wqi -= (tbSensor.current_value - 0.15) * 60;
    if (phSensor && (phSensor.current_value < 7.0 || phSensor.current_value > 8.0)) wqi -= Math.abs(phSensor.current_value - 7.5) * 15;
    if (clSensor && (clSensor.current_value < 1.0 || clSensor.current_value > 2.5)) wqi -= Math.abs(clSensor.current_value - 1.6) * 12;
    wqi = Math.max(72, Math.min(99.4, Number(wqi.toFixed(1))));

    // Equipment health summary
    const totalEq = equipment.length;
    const runningEq = equipment.filter((e) => e.status === 'RUNNING').length;
    const maintenanceRequiredEq = equipment.filter((e) => e.status === 'MAINTENANCE_REQUIRED').length;

    // Recent sparkline trends for key metrics (last 16 readings)
    const tbSparkline = db.prepare(`
      SELECT value, recorded_at FROM sensor_readings
      WHERE sensor_id = 'SNS-DST-TB01'
      ORDER BY recorded_at DESC LIMIT 16
    `).all().reverse();

    const clSparkline = db.prepare(`
      SELECT value, recorded_at FROM sensor_readings
      WHERE sensor_id = 'SNS-DST-CL01'
      ORDER BY recorded_at DESC LIMIT 16
    `).all().reverse();

    const phSparkline = db.prepare(`
      SELECT value, recorded_at FROM sensor_readings
      WHERE sensor_id = 'SNS-DIS-PH01'
      ORDER BY recorded_at DESC LIMIT 16
    `).all().reverse();

    const flowSparkline = db.prepare(`
      SELECT value, recorded_at FROM sensor_readings
      WHERE sensor_id = 'SNS-INT-FL01'
      ORDER BY recorded_at DESC LIMIT 16
    `).all().reverse();

    res.json({
      kpis: {
        totalFlowMGD: totalFlow,
        volumeTreatedTodayMG: Number((totalFlow * 0.72).toFixed(2)),
        wqiScore: wqi,
        wqiStatus: wqi >= 90 ? 'Optimal' : wqi >= 80 ? 'Good' : 'Caution',
        activeAlertsCount: alerts.length,
        criticalAlertsCount: alerts.filter((a) => a.severity === 'CRITICAL').length,
        warningAlertsCount: alerts.filter((a) => a.severity === 'WARNING').length,
        infoAlertsCount: alerts.filter((a) => a.severity === 'INFO').length,
        equipmentRunning: runningEq,
        equipmentTotal: totalEq,
        equipmentMaintenanceNeeded: maintenanceRequiredEq,
        pendingAiRecommendations: pendingAiCount,
      },
      keySensors: {
        turbidity: tbSensor,
        chlorine: clSensor,
        ph: phSensor,
        dissolvedOxygen: doSensor,
        temperature: tmpSensor,
        conductivity: cdSensor,
      },
      sparklines: {
        turbidity: tbSparkline,
        chlorine: clSparkline,
        ph: phSparkline,
        flow: flowSparkline,
      },
      stages,
      alerts: alerts.slice(0, 5),
    });
  } catch (err: any) {
    console.error('Error fetching dashboard overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SENSORS & TELEMETRY API
// ----------------------------------------------------
app.get('/api/sensors', (req, res) => {
  const { stage_id, type, status, search } = req.query;
  let query = 'SELECT * FROM sensors WHERE is_active = 1';
  const params: any[] = [];

  if (stage_id && stage_id !== 'ALL') {
    query += ' AND stage_id = ?';
    params.push(stage_id);
  }
  if (type && type !== 'ALL') {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (id LIKE ? OR name LIKE ? OR location_tag LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY stage_id, id';
  const sensors = db.prepare(query).all(...params);
  res.json({ sensors });
});

app.get('/api/sensors/:id', (req, res) => {
  const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(req.params.id);
  if (!sensor) return res.status(404).json({ error: 'Sensor not found' });
  res.json({ sensor });
});

app.post('/api/sensors', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role !== 'Admin' && user.role !== 'Plant Operator') {
    return res.status(403).json({ error: 'Unauthorized: Admin or Plant Operator required' });
  }

  const {
    id,
    name,
    type,
    stage_id,
    location_tag,
    unit,
    current_value,
    min_threshold,
    max_threshold,
    warning_min,
    warning_max,
    last_calibration_date,
    next_calibration_due,
  } = req.body;

  if (!id || !name || !type || !stage_id || !unit) {
    return res.status(400).json({ error: 'Missing required sensor attributes' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO sensors (
        id, name, type, stage_id, location_tag, unit, current_value, status,
        min_threshold, max_threshold, warning_min, warning_max,
        last_calibration_date, next_calibration_due, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      id,
      name,
      type,
      stage_id,
      location_tag || 'Primary Channel',
      unit,
      current_value || 0,
      min_threshold || 0,
      max_threshold || 100,
      warning_min || 10,
      warning_max || 90,
      last_calibration_date || new Date().toISOString().split('T')[0],
      next_calibration_due || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    );

    logAudit(user.name, user.role, 'SENSOR_CREATE', 'SENSOR', id, `Registered new sensor ${id} (${name}) at stage ${stage_id}.`);
    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/sensors/:id', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  const { name, min_threshold, max_threshold, warning_min, warning_max, status, is_active } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE sensors SET
        name = COALESCE(?, name),
        min_threshold = COALESCE(?, min_threshold),
        max_threshold = COALESCE(?, max_threshold),
        warning_min = COALESCE(?, warning_min),
        warning_max = COALESCE(?, warning_max),
        status = COALESCE(?, status),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, min_threshold, max_threshold, warning_min, warning_max, status, is_active, req.params.id);

    logAudit(user.name, user.role, 'SENSOR_UPDATE', 'SENSOR', req.params.id, `Updated thresholds or status for ${req.params.id}.`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sensors/:id', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role !== 'Admin') {
    return res.status(403).json({ error: 'Unauthorized: Only Admin can deactivate/delete sensors' });
  }

  db.prepare("UPDATE sensors SET is_active = 0, status = 'OFFLINE' WHERE id = ?").run(req.params.id);
  logAudit(user.name, user.role, 'SENSOR_DEACTIVATE', 'SENSOR', req.params.id, `Deactivated sensor ${req.params.id}.`);
  res.json({ success: true });
});

app.post('/api/sensors/:id/calibrate', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Technician, Operator, or Admin required' });
  }

  const { standardValue, calibrationNotes, calibrationIntervalDays = 30 } = req.body;
  const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(req.params.id) as any;
  if (!sensor) return res.status(404).json({ error: 'Sensor not found' });

  const today = new Date().toISOString().split('T')[0];
  const nextDue = new Date(Date.now() + calibrationIntervalDays * 86400000).toISOString().split('T')[0];

  db.prepare(`
    UPDATE sensors SET
      last_calibration_date = ?,
      next_calibration_due = ?,
      status = 'ONLINE',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(today, nextDue, sensor.id);

  logAudit(
    user.name,
    user.role,
    'CALIBRATION',
    'SENSOR',
    sensor.id,
    `Calibrated against standard buffer ${standardValue || 'N/A'}. Next due: ${nextDue}. Notes: ${calibrationNotes || 'Routine calibration completed.'}`
  );

  // If there was an active calibration alert, mark it resolved
  db.prepare(`
    UPDATE alerts SET
      status = 'RESOLVED',
      resolved_by = ?,
      resolved_at = CURRENT_TIMESTAMP,
      resolution_notes = 'Sensor calibrated by technician.'
    WHERE source_id = ? AND source_type = 'CALIBRATION' AND status != 'RESOLVED'
  `).run(user.name, sensor.id);

  res.json({ success: true, next_calibration_due: nextDue });
});

app.get('/api/sensors/:id/readings', (req, res) => {
  const { range = '24h' } = req.query;
  let hours = 24;
  if (range === '1h') hours = 1;
  else if (range === '6h') hours = 6;
  else if (range === '7d') hours = 24 * 7;

  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const readings = db.prepare(`
    SELECT value, status, recorded_at
    FROM sensor_readings
    WHERE sensor_id = ? AND recorded_at >= ?
    ORDER BY recorded_at ASC
  `).all(req.params.id, since);

  res.json({ readings });
});

// ----------------------------------------------------
// TREATMENT STAGES & PROCESS MANAGEMENT API
// ----------------------------------------------------
app.get('/api/stages', (_req, res) => {
  const stages = db.prepare('SELECT * FROM treatment_stages ORDER BY order_index').all() as any[];
  const sensors = db.prepare('SELECT * FROM sensors WHERE is_active = 1').all() as any[];
  const equipment = db.prepare('SELECT * FROM equipment').all() as any[];

  const detailedStages = stages.map((st) => ({
    ...st,
    chemical_dosing: JSON.parse(st.chemical_dosing || '{}'),
    sensors: sensors.filter((sn) => sn.stage_id === st.id),
    equipment: equipment.filter((eq) => eq.stage_id === st.id),
  }));

  res.json({ stages: detailedStages });
});

app.post('/api/stages/:id/adjust', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Operator or Admin credentials required for process adjustments' });
  }

  const { parameterName, previousValue, newValue, reason, aiRecommendationId } = req.body;
  if (!parameterName || newValue === undefined || !reason) {
    return res.status(400).json({ error: 'Parameter name, new value, and operational reason required' });
  }

  const stage = db.prepare('SELECT * FROM treatment_stages WHERE id = ?').get(req.params.id) as any;
  if (!stage) return res.status(404).json({ error: 'Treatment stage not found' });

  // Update chemical dosing JSON if parameter is chemical
  try {
    const chemicalObj = JSON.parse(stage.chemical_dosing || '{}');
    if (chemicalObj[parameterName] !== undefined || parameterName.includes('Alum') || parameterName.includes('Chlorine') || parameterName.includes('Caustic') || parameterName.includes('Polymer')) {
      chemicalObj[parameterName] = newValue;
      db.prepare('UPDATE treatment_stages SET chemical_dosing = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(chemicalObj), stage.id);
    } else if (parameterName.toLowerCase().includes('flow')) {
      const numericVal = parseFloat(newValue);
      if (!isNaN(numericVal)) {
        db.prepare('UPDATE treatment_stages SET current_flow_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(numericVal, stage.id);
      }
    }

    // Insert into process_adjustments immutable audit log
    const stmt = db.prepare(`
      INSERT INTO process_adjustments (stage_id, parameter_name, previous_value, new_value, reason, operator_name, operator_role, ai_recommendation_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(stage.id, parameterName, String(previousValue || 'N/A'), String(newValue), reason, user.name, user.role, aiRecommendationId || null);

    logAudit(
      user.name,
      user.role,
      'PROCESS_ADJUST',
      'TREATMENT_STAGE',
      stage.id,
      `Adjusted ${parameterName} from ${previousValue || 'N/A'} to ${newValue}. Reason: ${reason}`
    );

    res.json({ success: true, message: 'Process adjustment recorded in plant audit log.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/process-adjustments', (_req, res) => {
  const adjustments = db.prepare(`
    SELECT pa.*, ts.name as stage_name
    FROM process_adjustments pa
    JOIN treatment_stages ts ON pa.stage_id = ts.id
    ORDER BY pa.created_at DESC LIMIT 50
  `).all();
  res.json({ adjustments });
});

// ----------------------------------------------------
// AI INSIGHTS & OPTIMIZATION API
// ----------------------------------------------------
app.get('/api/ai/insights', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM ai_recommendations';
  const params: any[] = [];
  if (status && status !== 'ALL') {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  const recommendations = db.prepare(query).all(...params).map((rec: any) => ({
    ...rec,
    supporting_telemetry: JSON.parse(rec.supporting_telemetry || '{}'),
    applied_changes: JSON.parse(rec.applied_changes || '{}'),
  }));

  res.json({ recommendations });
});

app.post('/api/ai/analyze', async (req, res) => {
  const user = getCurrentUser(req);
  try {
    const stages = db.prepare('SELECT id, name, current_flow_rate, status, chemical_dosing FROM treatment_stages').all() as any[];
    const sensors = db.prepare('SELECT id, name, type, stage_id, unit, current_value, status, min_threshold, max_threshold, warning_min, warning_max FROM sensors WHERE is_active = 1').all() as any[];
    const equipment = db.prepare('SELECT id, name, type, stage_id, status, vibration_mm_s, temperature_c FROM equipment').all() as any[];
    const activeAlertsCount = (db.prepare("SELECT count(*) as count FROM alerts WHERE status != 'RESOLVED'").get() as any).count;

    const telemetry = {
      stages,
      sensors,
      equipment,
      activeAlertsCount,
    };

    const result = await analyzeWaterTreatmentTelemetry(telemetry);

    // Save insights into database with PENDING_REVIEW status (human-in-the-loop requirement)
    const insertAi = db.prepare(`
      INSERT OR REPLACE INTO ai_recommendations (
        id, title, summary, stage_id, confidence, urgency, supporting_telemetry,
        plain_language_explanation, recommended_action, estimated_impact, ai_source,
        status, applied_changes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, CURRENT_TIMESTAMP)
    `);

    for (const insight of result.insights) {
      const id = 'AI-REC-' + Math.floor(1000 + Math.random() * 9000);
      insertAi.run(
        id,
        insight.title,
        insight.summary,
        insight.stage_id,
        insight.confidence,
        insight.urgency,
        JSON.stringify(insight.supporting_telemetry),
        insight.plain_language_explanation,
        insight.recommended_action,
        insight.estimated_impact,
        insight.ai_source,
        JSON.stringify(insight.applied_changes)
      );
    }

    logAudit(
      user.name,
      user.role,
      'AI_ANALYZE_TRIGGER',
      'AI_SYSTEM',
      result.mode,
      `Executed plant telemetry analysis. Generated ${result.insights.length} optimization recommendations via ${result.mode}.`
    );

    res.json({
      success: true,
      mode: result.mode,
      overall_assessment: result.overall_assessment,
      forecast_trend: result.forecast_trend,
      generatedCount: result.insights.length,
    });
  } catch (err: any) {
    console.error('AI telemetry analysis failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/recommendations/:id/review', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Operator or Admin credentials required to approve/reject AI recommendations' });
  }

  const { action, reviewNotes } = req.body; // 'APPROVE' or 'REJECT'
  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
  }

  const rec = db.prepare('SELECT * FROM ai_recommendations WHERE id = ?').get(req.params.id) as any;
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

  const newStatus = action === 'APPROVE' ? 'APPROVED_APPLIED' : 'REJECTED';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE ai_recommendations SET
      status = ?,
      reviewed_by = ?,
      review_notes = ?,
      reviewed_at = ?
    WHERE id = ?
  `).run(newStatus, user.name, reviewNotes || (action === 'APPROVE' ? 'Approved by operator on duty.' : 'Declined by operator.'), now, rec.id);

  // If approved, apply the changes to the treatment stage and log process adjustment!
  if (action === 'APPROVE' && rec.applied_changes) {
    try {
      const changes = JSON.parse(rec.applied_changes);
      const stage = db.prepare('SELECT * FROM treatment_stages WHERE id = ?').get(rec.stage_id) as any;
      if (stage) {
        const chemicalObj = JSON.parse(stage.chemical_dosing || '{}');
        for (const [key, val] of Object.entries(changes)) {
          chemicalObj[key] = val;
          // Record process adjustment
          db.prepare(`
            INSERT INTO process_adjustments (stage_id, parameter_name, previous_value, new_value, reason, operator_name, operator_role, ai_recommendation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(stage.id, key, 'Previous Setting', String(val), `Applied AI recommendation: ${rec.title}. Notes: ${reviewNotes || 'Approved'}`, user.name, user.role, rec.id);
        }
        db.prepare('UPDATE treatment_stages SET chemical_dosing = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(chemicalObj), stage.id);
      }
    } catch (parseErr) {
      console.error('Error applying approved changes:', parseErr);
    }
  }

  logAudit(
    user.name,
    user.role,
    action === 'APPROVE' ? 'AI_APPROVE' : 'AI_REJECT',
    'AI_RECOMMENDATION',
    rec.id,
    `${action === 'APPROVE' ? 'Approved and applied' : 'Rejected'} recommendation: "${rec.title}". Operator Notes: ${reviewNotes || 'None'}`
  );

  res.json({ success: true, status: newStatus });
});

// ----------------------------------------------------
// ALERTS & INCIDENT MANAGEMENT API
// ----------------------------------------------------
app.get('/api/alerts', (req, res) => {
  const { severity, status } = req.query;
  let query = 'SELECT * FROM alerts';
  const conditions: string[] = [];
  const params: any[] = [];

  if (severity && severity !== 'ALL') {
    conditions.push('severity = ?');
    params.push(severity);
  }
  if (status && status !== 'ALL') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += " ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END, created_at DESC";

  const alerts = db.prepare(query).all(...params) as any[];
  const comments = db.prepare('SELECT * FROM alert_comments ORDER BY created_at ASC').all() as any[];

  const alertsWithComments = alerts.map((a) => ({
    ...a,
    comments: comments.filter((c) => c.alert_id === a.id),
  }));

  res.json({ alerts: alertsWithComments });
});

app.post('/api/alerts', (req, res) => {
  const user = getCurrentUser(req);
  const { title, description, severity, source_type, source_id, assigned_to } = req.body;
  if (!title || !severity) return res.status(400).json({ error: 'Title and severity required' });

  const id = 'ALT-' + Math.floor(1000 + Math.random() * 9000);
  db.prepare(`
    INSERT INTO alerts (id, title, description, severity, source_type, source_id, status, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).run(id, title, description || '', severity, source_type || 'MANUAL', source_id || null, assigned_to || null);

  logAudit(user.name, user.role, 'ALERT_CREATE', 'ALERT', id, `Logged manual alert: ${title} (${severity})`);
  res.status(201).json({ success: true, id });
});

app.post('/api/alerts/:id/ack', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  db.prepare(`
    UPDATE alerts SET
      status = 'ACKNOWLEDGED',
      acknowledged_by = ?,
      acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(user.name, req.params.id);

  logAudit(user.name, user.role, 'ALERT_ACK', 'ALERT', req.params.id, `Acknowledged alert ${req.params.id}.`);
  res.json({ success: true });
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  const { resolution_notes } = req.body;
  db.prepare(`
    UPDATE alerts SET
      status = 'RESOLVED',
      resolved_by = ?,
      resolved_at = CURRENT_TIMESTAMP,
      resolution_notes = ?
    WHERE id = ?
  `).run(user.name, resolution_notes || 'Resolved by operator', req.params.id);

  logAudit(user.name, user.role, 'ALERT_RESOLVE', 'ALERT', req.params.id, `Resolved alert with notes: ${resolution_notes || 'Resolved'}`);
  res.json({ success: true });
});

app.post('/api/alerts/:id/comments', (req, res) => {
  const user = getCurrentUser(req);
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comment text required' });

  db.prepare(`
    INSERT INTO alert_comments (alert_id, author_name, author_role, comment)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, user.name, user.role, comment);

  res.status(201).json({ success: true });
});

// ----------------------------------------------------
// EQUIPMENT & MAINTENANCE API
// ----------------------------------------------------
app.get('/api/equipment', (_req, res) => {
  const equipment = db.prepare(`
    SELECT eq.*, ts.name as stage_name
    FROM equipment eq
    JOIN treatment_stages ts ON eq.stage_id = ts.id
    ORDER BY eq.stage_id, eq.id
  `).all();
  res.json({ equipment });
});

app.put('/api/equipment/:id', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  const { status, health_score, vibration_mm_s, temperature_c, notes, next_service_due } = req.body;
  db.prepare(`
    UPDATE equipment SET
      status = COALESCE(?, status),
      health_score = COALESCE(?, health_score),
      vibration_mm_s = COALESCE(?, vibration_mm_s),
      temperature_c = COALESCE(?, temperature_c),
      notes = COALESCE(?, notes),
      next_service_due = COALESCE(?, next_service_due)
    WHERE id = ?
  `).run(status, health_score, vibration_mm_s, temperature_c, notes, next_service_due, req.params.id);

  logAudit(user.name, user.role, 'EQUIPMENT_UPDATE', 'EQUIPMENT', req.params.id, `Updated equipment ${req.params.id} telemetry / status.`);
  res.json({ success: true });
});

app.get('/api/maintenance-tasks', (_req, res) => {
  const tasks = db.prepare(`
    SELECT mt.*, eq.name as equipment_name, eq.stage_id
    FROM maintenance_tasks mt
    JOIN equipment eq ON mt.equipment_id = eq.id
    ORDER BY CASE mt.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, mt.created_at DESC
  `).all();
  res.json({ tasks });
});

app.post('/api/maintenance-tasks', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  const { equipment_id, title, description, priority, assigned_to, due_date } = req.body;
  if (!equipment_id || !title || !priority) {
    return res.status(400).json({ error: 'Equipment ID, title, and priority required' });
  }

  const id = 'TSK-2026-' + Math.floor(100 + Math.random() * 900);
  db.prepare(`
    INSERT INTO maintenance_tasks (id, equipment_id, title, description, priority, status, assigned_to, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
  `).run(id, equipment_id, title, description || '', priority, assigned_to || user.name, due_date || null, user.name);

  logAudit(user.name, user.role, 'MAINTENANCE_CREATE', 'MAINTENANCE_TASK', id, `Created task "${title}" for equipment ${equipment_id}.`);
  res.status(201).json({ success: true, id });
});

app.put('/api/maintenance-tasks/:id', (req, res) => {
  const user = getCurrentUser(req);
  if (user.role === 'Read-Only Viewer') {
    return res.status(403).json({ error: 'Unauthorized: Read-only access' });
  }

  const { status, completion_notes } = req.body;
  const isCompleted = status === 'COMPLETED';

  db.prepare(`
    UPDATE maintenance_tasks SET
      status = COALESCE(?, status),
      completion_notes = COALESCE(?, completion_notes),
      completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = ?
  `).run(status, completion_notes, isCompleted ? 1 : 0, req.params.id);

  logAudit(user.name, user.role, 'MAINTENANCE_UPDATE', 'MAINTENANCE_TASK', req.params.id, `Updated work order ${req.params.id} to ${status}. Notes: ${completion_notes || 'None'}`);
  res.json({ success: true });
});

// ----------------------------------------------------
// REPORTS & COMPLIANCE API
// ----------------------------------------------------
app.get('/api/reports/compliance', (_req, res) => {
  // Aggregate statistics for EPA / WHO compliance metrics
  const turbidityReadings = db.prepare(`
    SELECT value FROM sensor_readings
    WHERE sensor_id IN ('SNS-FLT-TB01', 'SNS-DST-TB01')
  `).all() as { value: number }[];

  const compliantTbCount = turbidityReadings.filter((r) => r.value <= 0.30).length;
  const tbCompliancePct = turbidityReadings.length > 0 ? ((compliantTbCount / turbidityReadings.length) * 100).toFixed(1) : '100.0';

  const chlorineReadings = db.prepare(`
    SELECT value FROM sensor_readings
    WHERE sensor_id = 'SNS-DST-CL01'
  `).all() as { value: number }[];

  const compliantClCount = chlorineReadings.filter((r) => r.value >= 0.2 && r.value <= 4.0).length;
  const clCompliancePct = chlorineReadings.length > 0 ? ((compliantClCount / chlorineReadings.length) * 100).toFixed(1) : '100.0';

  const phReadings = db.prepare(`
    SELECT value FROM sensor_readings
    WHERE sensor_id = 'SNS-DIS-PH01'
  `).all() as { value: number }[];

  const compliantPhCount = phReadings.filter((r) => r.value >= 6.5 && r.value <= 8.5).length;
  const phCompliancePct = phReadings.length > 0 ? ((compliantPhCount / phReadings.length) * 100).toFixed(1) : '100.0';

  res.json({
    metrics: {
      turbidityCompliancePct: parseFloat(tbCompliancePct),
      turbidityLimitNTU: 0.30,
      turbidityTargetNTU: 0.10,
      chlorineCompliancePct: parseFloat(clCompliancePct),
      chlorineMinLimit: 0.20,
      chlorineMaxLimit: 4.00,
      phCompliancePct: parseFloat(phCompliancePct),
      phMinLimit: 6.5,
      phMaxLimit: 8.5,
      ctLogInactivationTarget: '3.0-Log Giardia / 4.0-Log Virus',
      ctStatus: 'COMPLIANT (3.8 Logs achieved)',
      leadCopperCorrosionProtection: 'Active Orthophosphate dosing at 1.1 mg/L',
    },
    disclaimer: 'Note: Configurable regulatory threshold guidelines (e.g. EPA Surface Water Treatment Rules, Safe Drinking Water Act). Regulatory or legal compliance requires verified certified laboratory chain-of-custody testing and state DEP approval.',
  });
});

app.get('/api/reports/export-csv', (req, res) => {
  const { type = 'water-quality' } = req.query;

  if (type === 'water-quality') {
    const data = db.prepare(`
      SELECT sr.id, sn.name as sensor_name, sn.type, sn.stage_id, sr.value, sn.unit, sr.status, sr.is_simulated, sr.recorded_at
      FROM sensor_readings sr
      JOIN sensors sn ON sr.sensor_id = sn.id
      ORDER BY sr.recorded_at DESC LIMIT 500
    `).all() as any[];

    let csv = 'Reading ID,Sensor Name,Parameter Type,Stage,Value,Unit,Status,Is Simulated,Recorded At\n';
    for (const row of data) {
      csv += `"${row.id}","${row.sensor_name}","${row.type}","${row.stage_id}",${row.value},"${row.unit}","${row.status}",${row.is_simulated ? 'YES' : 'NO'},"${row.recorded_at}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aquapulse-water-quality-telemetry.csv"');
    return res.send(csv);
  } else if (type === 'audit-trail') {
    const data = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all() as any[];
    let csv = 'Log ID,User Name,User Role,Action,Entity Type,Entity ID,Details,Timestamp\n';
    for (const row of data) {
      csv += `"${row.id}","${row.user_name}","${row.user_role}","${row.action_type}","${row.entity_type}","${row.entity_id || ''}","${row.details.replace(/"/g, '""')}","${row.timestamp}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aquapulse-operational-audit-trail.csv"');
    return res.send(csv);
  }

  res.status(400).send('Invalid export type requested');
});

// ----------------------------------------------------
// SCADA SIMULATION & ANOMALY INJECTION API
// ----------------------------------------------------
app.post('/api/simulation/tick', (req, res) => {
  const { scenario } = req.body; // e.g. 'NORMAL', 'TURBIDITY_SPIKE', 'CHLORINE_DROP', 'FILTER_HEADLOSS'
  const now = new Date().toISOString();
  const sensors = db.prepare('SELECT * FROM sensors WHERE is_active = 1').all() as any[];

  db.transaction(() => {
    for (const sn of sensors) {
      let nextVal = sn.current_value;

      if (scenario === 'TURBIDITY_SPIKE' && sn.type === 'Turbidity' && sn.stage_id === 'intake') {
        nextVal = Math.min(42.0, nextVal + (Math.random() * 4.0 + 3.0));
      } else if (scenario === 'CHLORINE_DROP' && sn.type === 'Free Chlorine' && sn.stage_id === 'disinfection') {
        nextVal = Math.max(0.45, nextVal - (Math.random() * 0.3 + 0.2));
      } else if (scenario === 'FILTER_HEADLOSS' && sn.id === 'SNS-FLT-DP03') {
        nextVal = Math.min(8.8, nextVal + 0.4);
      } else {
        // Normal minor stochastic drift
        const delta = (Math.random() - 0.48) * 0.05 * sn.current_value;
        nextVal = Math.max(0.01, nextVal + delta);
      }

      nextVal = Number(nextVal.toFixed(2));
      let status = 'ONLINE';
      if (nextVal < sn.min_threshold || nextVal > sn.max_threshold) status = 'CRITICAL';
      else if (nextVal < sn.warning_min || nextVal > sn.warning_max) status = 'WARNING';

      db.prepare('UPDATE sensors SET current_value = ?, status = ?, updated_at = ? WHERE id = ?').run(nextVal, status, now, sn.id);
      db.prepare('INSERT INTO sensor_readings (sensor_id, value, status, is_simulated, recorded_at) VALUES (?, ?, ?, 1, ?)').run(sn.id, nextVal, status, now);
    }
  })();

  res.json({ success: true, scenario: scenario || 'NORMAL', timestamp: now });
});

// ----------------------------------------------------
// AUDIT LOGS API
// ----------------------------------------------------
app.get('/api/audit-logs', (_req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json({ logs });
});

// ----------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AquaPulse SCADA Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
