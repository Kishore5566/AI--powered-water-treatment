import React from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Gauge,
  HelpCircle,
  Layers,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { DashboardKPIs, TreatmentStage, Sensor, SensorReading, Alert } from '../types';
import { Sparkline } from './Sparkline';
import { NavTab } from './Navigation';

interface DashboardViewProps {
  kpis: DashboardKPIs | null;
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
  onSelectTab: (tab: NavTab) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onTriggerAiScan: () => void;
  isAiScanning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  kpis,
  keySensors,
  sparklines,
  stages,
  alerts,
  onSelectTab,
  onAcknowledgeAlert,
  onTriggerAiScan,
  isAiScanning,
}) => {
  if (!kpis) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Polling SCADA telemetry...</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">NORMAL</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold animate-pulse">WARNING</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60 font-semibold animate-pulse">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">STANDBY</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Advisory Banner (If pending recommendations exist) */}
      {kpis.pendingAiRecommendations > 0 && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/80 border border-cyan-500/40 rounded-xl p-4 shadow-lg shadow-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-100">
                  {kpis.pendingAiRecommendations} AI Optimization Recommendations Pending Human Review
                </h3>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">
                  Human-in-the-Loop Safeguard
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Gemini 3.8 Flash detected operational tuning opportunities in Coagulation pH trim & Filter Bed backwash. Operator authorization required before application.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectTab('ai')}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-900/40 transition-colors"
            >
              Review Recommendations <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Control Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Plant Hydraulic Flow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Plant Flow</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl lg:text-3xl text-slate-100">
              {kpis.totalFlowMGD.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-cyan-300">MGD</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Treated Today:</span>
            <span className="text-slate-200">{kpis.volumeTreatedTodayMG} MG</span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(kpis.totalFlowMGD / 35) * 100}%` }}></div>
          </div>
        </div>

        {/* Water Quality Index */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Water Quality Index (WQI)</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl lg:text-3xl text-emerald-400">
              {kpis.wqiScore}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="font-mono">Quality Status:</span>
            <span className="font-semibold text-emerald-300">{kpis.wqiStatus}</span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.wqiScore}%` }}></div>
          </div>
        </div>

        {/* Active SCADA Alarms */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Active SCADA Alarms</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.criticalAlertsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`font-display font-bold text-2xl lg:text-3xl ${kpis.criticalAlertsCount > 0 ? 'text-rose-400' : 'text-amber-300'}`}>
              {kpis.activeAlertsCount}
            </span>
            <span className="text-xs font-mono text-slate-400">Active</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
            <span className="text-rose-400 font-semibold">{kpis.criticalAlertsCount} Critical</span>
            <span>•</span>
            <span className="text-amber-300 font-semibold">{kpis.warningAlertsCount} Warning</span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${kpis.criticalAlertsCount > 0 ? 'bg-rose-500' : 'bg-amber-500'} rounded-full`}
              style={{ width: `${Math.min(100, kpis.activeAlertsCount * 25)}%` }}
            ></div>
          </div>
        </div>

        {/* Plant Equipment Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Equipment Availability</span>
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl lg:text-3xl text-cyan-300">
              {kpis.equipmentRunning}
            </span>
            <span className="text-xs font-mono text-slate-400">/ {kpis.equipmentTotal} Running</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Maintenance Needed:</span>
            <span className="text-amber-400 font-semibold">{kpis.equipmentMaintenanceNeeded} Units</span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${(kpis.equipmentRunning / kpis.equipmentTotal) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Key Water Quality Parameter Cards with Live Sparklines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-slate-200">
              Key Water Quality Indicators & Finished Telemetry
            </h2>
            <span className="text-xs text-slate-500 font-mono">(Real-Time SCADA Feed)</span>
          </div>
          <button
            onClick={() => onSelectTab('sensors')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            All 20 Sensors <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Turbidity */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">Finished Water Turbidity</span>
                <div className="text-[11px] text-slate-500 font-mono">Sensor SNS-DST-TB01</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                (keySensors.turbidity?.current_value || 0) <= 0.20 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}>
                {(keySensors.turbidity?.current_value || 0) <= 0.30 ? 'EPA Compliant' : 'Exceedance'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-bold text-3xl text-slate-100">
                {(keySensors.turbidity?.current_value || 0.08).toFixed(2)}
              </span>
              <span className="text-xs font-mono text-cyan-300">NTU</span>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">Target: &lt; 0.10 NTU (Limit: 0.30)</span>
            </div>
            <Sparkline data={sparklines.turbidity} color="#06b6d4" unit="NTU" />
          </div>

          {/* Card 2: Free Chlorine */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">Point-of-Entry Free Chlorine</span>
                <div className="text-[11px] text-slate-500 font-mono">Sensor SNS-DST-CL01</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                Disinfection Active
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-bold text-3xl text-slate-100">
                {(keySensors.chlorine?.current_value || 1.62).toFixed(2)}
              </span>
              <span className="text-xs font-mono text-cyan-300">mg/L</span>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">Target: 1.20 - 2.00 mg/L</span>
            </div>
            <Sparkline data={sparklines.chlorine} color="#10b981" unit="mg/L" />
          </div>

          {/* Card 3: pH */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">Disinfection Finished pH</span>
                <div className="text-[11px] text-slate-500 font-mono">Sensor SNS-DIS-PH01</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                Normal Balance
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-bold text-3xl text-slate-100">
                {(keySensors.ph?.current_value || 7.35).toFixed(2)}
              </span>
              <span className="text-xs font-mono text-cyan-300">pH</span>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">Target: 7.20 - 7.60 pH</span>
            </div>
            <Sparkline data={sparklines.ph} color="#8b5cf6" unit="pH" />
          </div>
        </div>

        {/* Secondary Parameters Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Dissolved Oxygen</span>
            <span className="text-xs font-mono font-semibold text-slate-200">
              {(keySensors.dissolvedOxygen?.current_value || 8.9).toFixed(1)} mg/L
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Raw Water Temp</span>
            <span className="text-xs font-mono font-semibold text-slate-200">
              {(keySensors.temperature?.current_value || 16.8).toFixed(1)} °C
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Conductivity</span>
            <span className="text-xs font-mono font-semibold text-slate-200">
              {(keySensors.conductivity?.current_value || 410.0).toFixed(0)} µS/cm
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">CT Log Inactivation</span>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              3.8 Logs (Giardia)
            </span>
          </div>
        </div>
      </div>

      {/* Treatment Process Flow Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-slate-200">
              Treatment Process Pipeline Flow & Stage Summary
            </h2>
          </div>
          <button
            onClick={() => onSelectTab('stages')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Manage Stages & Adjustments <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {stages.map((st, idx) => (
            <div
              key={st.id}
              onClick={() => onSelectTab('stages')}
              className="bg-slate-900/80 border border-slate-800 hover:border-cyan-700/60 rounded-xl p-3 cursor-pointer transition-all hover:bg-slate-850 relative group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  STEP 0{idx + 1}
                </span>
                {getStatusBadge(st.status)}
              </div>
              <h3 className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                {st.name}
              </h3>
              <div className="mt-2 text-[11px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Flow:</span>
                  <span className="text-cyan-200">{st.current_flow_rate.toFixed(1)} MGD</span>
                </div>
                <div className="flex justify-between">
                  <span>Retention:</span>
                  <span className="text-slate-300">{st.retention_time_mins} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts & Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-slate-200">
                Active Alarms & Operational Incidents
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('alerts')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Alarm Console ({alerts.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All plant parameters within normal operating envelopes.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {alerts.slice(0, 4).map((alt) => (
                <div key={alt.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                        alt.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {alt.severity}
                      </span>
                      <span className="font-semibold text-xs text-slate-200">{alt.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{alt.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>ID: {alt.id}</span>
                      <span>Source: {alt.source_type}</span>
                      <span>Status: {alt.status}</span>
                    </div>
                  </div>
                  {alt.status === 'ACTIVE' && (
                    <button
                      onClick={() => onAcknowledgeAlert(alt.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 shrink-0"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Optimization Scan & Quick Actions Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-slate-200">
                SCADA Intelligence Actions
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Trigger automated anomaly detection and 4-hour forward predictive analytics for chemical dosing optimization.
            </p>

            <button
              onClick={onTriggerAiScan}
              disabled={isAiScanning}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50"
            >
              <Brain className={`w-4 h-4 ${isAiScanning ? 'animate-spin' : ''}`} />
              {isAiScanning ? 'Executing Multi-Stage AI Analysis...' : 'Run Gemini 3.8 Flash Anomaly Scan'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Quick Operator Actions
            </span>
            <button
              onClick={() => onSelectTab('stages')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between border border-slate-700/60 transition-colors"
            >
              <span>Record Process Adjustment</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onSelectTab('equipment')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between border border-slate-700/60 transition-colors"
            >
              <span>Schedule Filter Backwash Work Order</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onSelectTab('reports')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between border border-slate-700/60 transition-colors"
            >
              <span>Export Regulatory Compliance CSV</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
