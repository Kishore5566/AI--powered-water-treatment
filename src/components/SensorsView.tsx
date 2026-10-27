import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Sliders,
  RotateCw,
} from 'lucide-react';
import { Sensor, SensorType, SensorStatus, StageId, SensorReading, UserRole } from '../types';
import { api } from '../api/client';

interface SensorsViewProps {
  sensors: Sensor[];
  currentUserRole: UserRole;
  onRefreshSensors: () => void;
}

export const SensorsView: React.FC<SensorsViewProps> = ({
  sensors,
  currentUserRole,
  onRefreshSensors,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [activeSensorForChart, setActiveSensorForChart] = useState<Sensor | null>(null);
  const [chartReadings, setChartReadings] = useState<SensorReading[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const [calibratingSensor, setCalibratingSensor] = useState<Sensor | null>(null);
  const [standardVal, setStandardVal] = useState('7.00');
  const [calNotes, setCalNotes] = useState('');
  const [calInterval, setCalInterval] = useState(30);

  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    min_threshold: 0,
    max_threshold: 100,
    warning_min: 10,
    warning_max: 90,
  });

  const [isCreatingSensor, setIsCreatingSensor] = useState(false);
  const [newSensorForm, setNewSensorForm] = useState({
    id: '',
    name: '',
    type: 'Turbidity' as SensorType,
    stage_id: 'intake' as StageId,
    location_tag: '',
    unit: 'NTU',
    current_value: 0.1,
    min_threshold: 0.0,
    max_threshold: 10.0,
    warning_min: 0.05,
    warning_max: 5.0,
  });

  // Filtered sensor list
  const filteredSensors = sensors.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location_tag.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'ALL' || s.stage_id === selectedStage;
    const matchesType = selectedType === 'ALL' || s.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    return matchesSearch && matchesStage && matchesType && matchesStatus;
  });

  // Load readings for chart drawer
  useEffect(() => {
    if (activeSensorForChart) {
      setIsLoadingChart(true);
      api
        .getSensorReadings(activeSensorForChart.id, chartTimeRange)
        .then((res) => {
          setChartReadings(res.readings);
        })
        .finally(() => setIsLoadingChart(false));
    }
  }, [activeSensorForChart, chartTimeRange]);

  const handleOpenEdit = (s: Sensor) => {
    setEditingSensor(s);
    setEditForm({
      name: s.name,
      min_threshold: s.min_threshold,
      max_threshold: s.max_threshold,
      warning_min: s.warning_min,
      warning_max: s.warning_max,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSensor) return;
    await api.updateSensor(editingSensor.id, editForm);
    setEditingSensor(null);
    onRefreshSensors();
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to deactivate sensor ${id}?`)) {
      await api.deleteSensor(id);
      onRefreshSensors();
    }
  };

  const handleSaveCalibration = async () => {
    if (!calibratingSensor) return;
    await api.calibrateSensor(calibratingSensor.id, {
      standardValue: standardVal,
      calibrationNotes: calNotes,
      calibrationIntervalDays: calInterval,
    });
    setCalibratingSensor(null);
    setCalNotes('');
    onRefreshSensors();
  };

  const handleCreateSensor = async () => {
    if (!newSensorForm.id || !newSensorForm.name) {
      alert('Please fill in sensor code and name');
      return;
    }
    await api.createSensor(newSensorForm);
    setIsCreatingSensor(false);
    onRefreshSensors();
  };

  // Calibration overdue calculation
  const isCalibrationDue = (dueDateStr: string) => {
    const dueDate = new Date(dueDateStr).getTime();
    const now = Date.now();
    const daysUntil = (dueDate - now) / (1000 * 3600 * 24);
    return daysUntil <= 7;
  };

  return (
    <div className="space-y-6">
      {/* View Header with Filters and Add Sensor */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Sensor & Water-Quality Telemetry Grid
          </h1>
          <p className="text-xs text-slate-400">
            Real-time multi-stage process instruments, historical charts, alarm thresholds, and calibration logs.
          </p>
        </div>

        {currentUserRole !== 'Read-Only Viewer' && (
          <button
            onClick={() => setIsCreatingSensor(true)}
            className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-md shadow-cyan-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Sensor Instrument
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sensor ID, instrument name, location tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Stage Filter */}
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Treatment Stages</option>
          <option value="intake">Intake Basin</option>
          <option value="coagulation">Coagulation & Rapid Mix</option>
          <option value="sedimentation">Clarification / Sedimentation</option>
          <option value="filtration">Dual-Media Filtration</option>
          <option value="disinfection">Disinfection Basin</option>
          <option value="distribution">High Service Distribution</option>
        </select>

        {/* Parameter Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Parameter Types</option>
          <option value="Turbidity">Turbidity (NTU)</option>
          <option value="pH">pH</option>
          <option value="Free Chlorine">Free Chlorine (mg/L)</option>
          <option value="Dissolved Oxygen">Dissolved Oxygen (mg/L)</option>
          <option value="Conductivity">Conductivity (µS/cm)</option>
          <option value="Temperature">Temperature (°C)</option>
          <option value="Flow Rate">Flow Rate (MGD)</option>
          <option value="Differential Pressure">Differential Pressure (psi)</option>
          <option value="Pressure">Pressure (psi)</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      {/* Sensor Inventory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Sensor Tag / ID</th>
                <th className="px-4 py-3">Instrument & Location</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Live Telemetry</th>
                <th className="px-4 py-3">Threshold Envelope</th>
                <th className="px-4 py-3">Calibration Status</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSensors.map((s) => {
                const calDue = isCalibrationDue(s.next_calibration_due);
                return (
                  <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* ID */}
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-300">
                      {s.id}
                    </td>

                    {/* Name & Location */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Compass className="w-3 h-3 text-slate-500" /> {s.location_tag}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3 uppercase font-mono text-[11px] text-slate-300">
                      {s.stage_id}
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3">
                      <div className="flex items-baseline gap-1 font-mono font-bold text-sm text-slate-100">
                        <span>{s.current_value.toFixed(2)}</span>
                        <span className="text-[11px] font-normal text-slate-400">{s.unit}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Live SCADA tick</span>
                    </td>

                    {/* Threshold Envelope */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      <div>
                        Normal: {s.warning_min} - {s.warning_max} {s.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Alarm: &lt;{s.min_threshold} | &gt;{s.max_threshold}
                      </div>
                    </td>

                    {/* Calibration */}
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono text-slate-300">
                        Due: {s.next_calibration_due}
                      </div>
                      {calDue && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono font-semibold mt-0.5">
                          <AlertCircle className="w-3 h-3" /> Calibration Due
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          s.status === 'ONLINE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : s.status === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60 animate-pulse'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/60 animate-pulse'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveSensorForChart(s)}
                          className="p-1.5 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-300"
                          title="View Historical Trend Chart"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        {currentUserRole !== 'Read-Only Viewer' && (
                          <>
                            <button
                              onClick={() => setCalibratingSensor(s)}
                              className="p-1.5 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300"
                              title="Calibrate Instrument"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                              title="Edit Thresholds"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {currentUserRole === 'Admin' && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400"
                            title="Deactivate Sensor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Historical Telemetry Chart Drawer */}
      {activeSensorForChart && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Historical Telemetry Chart: {activeSensorForChart.name} ({activeSensorForChart.id})
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Location: {activeSensorForChart.location_tag} • Stage: {activeSensorForChart.stage_id.toUpperCase()} • Unit: {activeSensorForChart.unit}
                </p>
              </div>
              <button
                onClick={() => setActiveSensorForChart(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Range Selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Trend Window</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                  {(['1h', '6h', '24h', '7d'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setChartTimeRange(r)}
                      className={`px-3 py-1 rounded transition-colors ${
                        chartTimeRange === r ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Canvas or Loading */}
              {isLoadingChart ? (
                <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-400">
                  <Activity className="w-5 h-5 animate-spin text-cyan-400 mr-2" /> Loading readings...
                </div>
              ) : chartReadings.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">
                  No readings recorded for this interval.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* High Quality Chart with Threshold Lines */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative h-64">
                    {/* SVG Graphic */}
                    {(() => {
                      const vals = chartReadings.map((r) => r.value);
                      const minV = Math.min(...vals, activeSensorForChart.warning_min);
                      const maxV = Math.max(...vals, activeSensorForChart.warning_max);
                      const range = maxV - minV || 1;
                      const w = 600;
                      const h = 200;

                      const pts = chartReadings
                        .map((r, idx) => {
                          const x = (idx / (chartReadings.length - 1)) * w;
                          const y = h - ((r.value - minV) / range) * (h - 20) - 10;
                          return `${x},${y}`;
                        })
                        .join(' ');

                      const warnMaxY = h - ((activeSensorForChart.warning_max - minV) / range) * (h - 20) - 10;
                      const warnMinY = h - ((activeSensorForChart.warning_min - minV) / range) * (h - 20) - 10;

                      return (
                        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
                          {/* Warning Threshold Bands */}
                          <line x1="0" y1={warnMaxY} x2={w} y2={warnMaxY} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1" />
                          <line x1="0" y1={warnMinY} x2={w} y2={warnMinY} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1" />

                          {/* Data Polyline */}
                          <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Threshold Legend */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-cyan-400"></span> Measured Telemetry
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400"></span> Warning Threshold Envelope ({activeSensorForChart.warning_min} - {activeSensorForChart.warning_max} {activeSensorForChart.unit})
                    </span>
                    <span>
                      Latest: <strong className="text-cyan-300">{chartReadings[chartReadings.length - 1]?.value} {activeSensorForChart.unit}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-right">
              <button
                onClick={() => setActiveSensorForChart(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Instrument Calibration Modal */}
      {calibratingSensor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-amber-400" />
                Calibrate Sensor: {calibratingSensor.id}
              </h3>
              <button onClick={() => setCalibratingSensor(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Reference Standard / Zero-Span Value</label>
                <input
                  type="text"
                  value={standardVal}
                  onChange={(e) => setStandardVal(e.target.value)}
                  placeholder="e.g. 7.00 pH Buffer, 20.0 NTU StablCal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Calibration Interval (Days)</label>
                <input
                  type="number"
                  value={calInterval}
                  onChange={(e) => setCalInterval(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Technician Notes & Verification</label>
                <textarea
                  rows={3}
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="Electrode cleaned with mild detergent, rinsed with deionized water, verified slope at 98.4%."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setCalibratingSensor(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCalibration}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-950/40"
              >
                Confirm & Record Calibration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Thresholds Modal */}
      {editingSensor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Configure Alarm Thresholds: {editingSensor.id}
              </h3>
              <button onClick={() => setEditingSensor(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Instrument Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-amber-400 mb-1 font-mono">Warning Min ({editingSensor.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.warning_min}
                    onChange={(e) => setEditForm({ ...editForm, warning_min: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 mb-1 font-mono">Warning Max ({editingSensor.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.warning_max}
                    onChange={(e) => setEditForm({ ...editForm, warning_max: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-rose-400 mb-1 font-mono">Critical Low Alarm ({editingSensor.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.min_threshold}
                    onChange={(e) => setEditForm({ ...editForm, min_threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-rose-400 mb-1 font-mono">Critical High Alarm ({editingSensor.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.max_threshold}
                    onChange={(e) => setEditForm({ ...editForm, max_threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingSensor(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/40"
              >
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Sensor Modal */}
      {isCreatingSensor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Register New Sensor Instrument
              </h3>
              <button onClick={() => setIsCreatingSensor(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Sensor ID / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. SNS-FLT-TB05"
                    value={newSensorForm.id}
                    onChange={(e) => setNewSensorForm({ ...newSensorForm, id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Parameter Type</label>
                  <select
                    value={newSensorForm.type}
                    onChange={(e) => {
                      const t = e.target.value as SensorType;
                      let unit = 'NTU';
                      if (t === 'pH') unit = 'pH';
                      else if (t === 'Free Chlorine' || t === 'Dissolved Oxygen') unit = 'mg/L';
                      else if (t === 'Conductivity') unit = 'µS/cm';
                      else if (t === 'Temperature') unit = '°C';
                      else if (t === 'Flow Rate') unit = 'MGD';
                      else if (t === 'Pressure' || t === 'Differential Pressure') unit = 'psi';
                      setNewSensorForm({ ...newSensorForm, type: t, unit });
                    }}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="Turbidity">Turbidity</option>
                    <option value="pH">pH</option>
                    <option value="Free Chlorine">Free Chlorine</option>
                    <option value="Dissolved Oxygen">Dissolved Oxygen</option>
                    <option value="Conductivity">Conductivity</option>
                    <option value="Temperature">Temperature</option>
                    <option value="Flow Rate">Flow Rate</option>
                    <option value="Differential Pressure">Differential Pressure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Instrument Name</label>
                <input
                  type="text"
                  placeholder="e.g. Filter Bed #5 Effluent Turbidimeter"
                  value={newSensorForm.name}
                  onChange={(e) => setNewSensorForm({ ...newSensorForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Treatment Stage</label>
                  <select
                    value={newSensorForm.stage_id}
                    onChange={(e) => setNewSensorForm({ ...newSensorForm, stage_id: e.target.value as StageId })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="intake">Intake</option>
                    <option value="coagulation">Coagulation</option>
                    <option value="sedimentation">Sedimentation</option>
                    <option value="filtration">Filtration</option>
                    <option value="disinfection">Disinfection</option>
                    <option value="distribution">Distribution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Location Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Gallery Cell 5 Discharge"
                    value={newSensorForm.location_tag}
                    onChange={(e) => setNewSensorForm({ ...newSensorForm, location_tag: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Warning Min / Max</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Min"
                      value={newSensorForm.warning_min}
                      onChange={(e) => setNewSensorForm({ ...newSensorForm, warning_min: parseFloat(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Max"
                      value={newSensorForm.warning_max}
                      onChange={(e) => setNewSensorForm({ ...newSensorForm, warning_max: parseFloat(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Critical Low / High Alarm</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Crit Low"
                      value={newSensorForm.min_threshold}
                      onChange={(e) => setNewSensorForm({ ...newSensorForm, min_threshold: parseFloat(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Crit High"
                      value={newSensorForm.max_threshold}
                      onChange={(e) => setNewSensorForm({ ...newSensorForm, max_threshold: parseFloat(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingSensor(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSensor}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/40"
              >
                Register Sensor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
