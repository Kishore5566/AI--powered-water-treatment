import React, { useState } from 'react';
import {
  GitFork,
  Droplets,
  Sliders,
  Clock,
  FlaskConical,
  Activity,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  FileText,
  X,
  Layers,
} from 'lucide-react';
import { TreatmentStage, ProcessAdjustment, UserRole } from '../types';
import { api } from '../api/client';

interface ProcessStagesViewProps {
  stages: TreatmentStage[];
  adjustments: ProcessAdjustment[];
  currentUserRole: UserRole;
  onRefreshStages: () => void;
  onRefreshAdjustments: () => void;
}

export const ProcessStagesView: React.FC<ProcessStagesViewProps> = ({
  stages,
  adjustments,
  currentUserRole,
  onRefreshStages,
  onRefreshAdjustments,
}) => {
  const [selectedStageForAdjust, setSelectedStageForAdjust] = useState<TreatmentStage | null>(null);
  const [paramName, setParamName] = useState('');
  const [currentVal, setCurrentVal] = useState('');
  const [newVal, setNewVal] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdjust = (stage: TreatmentStage, initialParam?: string, initialVal?: string) => {
    setSelectedStageForAdjust(stage);
    if (initialParam && initialVal) {
      setParamName(initialParam);
      setCurrentVal(initialVal);
      setNewVal(initialVal);
    } else {
      const firstChem = Object.keys(stage.chemical_dosing)[0];
      if (firstChem) {
        setParamName(firstChem);
        setCurrentVal(stage.chemical_dosing[firstChem]);
        setNewVal(stage.chemical_dosing[firstChem]);
      } else {
        setParamName('Target Flow Rate');
        setCurrentVal(`${stage.target_flow_rate} MGD`);
        setNewVal(`${stage.target_flow_rate} MGD`);
      }
    }
    setAdjustReason('');
  };

  const handleSaveAdjustment = async () => {
    if (!selectedStageForAdjust || !paramName || !newVal || !adjustReason) {
      alert('Please complete all fields including operational engineering reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.adjustProcess(selectedStageForAdjust.id, {
        parameterName: paramName,
        previousValue: currentVal,
        newValue: newVal,
        reason: adjustReason,
      });
      setSelectedStageForAdjust(null);
      onRefreshStages();
      onRefreshAdjustments();
    } catch (err: any) {
      alert(err.message || 'Failed to record adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">NORMAL</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-semibold animate-pulse">WARNING</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 font-semibold animate-pulse">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">STANDBY</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-cyan-400" />
            Treatment Process & Hydraulic Flow Line
          </h1>
          <p className="text-xs text-slate-400">
            Monitor multistage chemical dosing, basin retention times, hydraulic flow rates, and record operator process adjustments.
          </p>
        </div>
      </div>

      {/* Visual SCADA Process Pipeline Ribbon */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[780px] gap-2">
          {stages.map((st, idx) => (
            <React.Fragment key={st.id}>
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 relative group hover:border-cyan-500/60 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    STAGE 0{idx + 1}
                  </span>
                  {getStatusPill(st.status)}
                </div>
                <h3 className="font-semibold text-xs text-slate-100 line-clamp-1">{st.name}</h3>
                <div className="mt-2 text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div className="text-cyan-300 font-bold">{st.current_flow_rate.toFixed(1)} MGD</div>
                  <div className="text-[10px] text-slate-500">{st.retention_time_mins} min retention</div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className="flex items-center text-slate-600 px-1">
                  <ArrowRight className="w-4 h-4 text-cyan-600/70" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Deep-Dive Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((st, idx) => (
          <div key={st.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-xs font-mono font-bold text-cyan-300">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-sm text-slate-100">{st.name}</h3>
                </div>
                {getStatusPill(st.status)}
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{st.description}</p>

              {/* Hydraulic & Retention Specs */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 mb-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Hydraulic Flow</span>
                  <span className="text-cyan-300 font-bold">{st.current_flow_rate.toFixed(1)} MGD</span>
                  <span className="text-[10px] text-slate-500 ml-1">/ {st.target_flow_rate} target</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Retention Time</span>
                  <span className="text-slate-200 font-bold">{st.retention_time_mins} Minutes</span>
                </div>
              </div>

              {/* Chemical Dosing Feed */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-400" /> Active Chemical Feed & Dosage
                  </span>
                </div>
                <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                  {Object.keys(st.chemical_dosing).length === 0 ? (
                    <div className="text-[11px] text-slate-500 font-mono italic">No chemical feed applied at this step.</div>
                  ) : (
                    Object.entries(st.chemical_dosing).map(([chem, dose]) => (
                      <div key={chem} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 truncate max-w-[160px]">{chem}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold">{dose}</span>
                          {currentUserRole !== 'Read-Only Viewer' && (
                            <button
                              onClick={() => handleOpenAdjust(st, chem, dose)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 px-1 py-0.5 rounded hover:bg-slate-800"
                              title="Quick Adjust Dosage"
                            >
                              Trim
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Connected Instruments & Equipment summary */}
              <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span>{st.sensors?.length || 0} Sensors Linked</span>
                <span>{st.equipment?.length || 0} Mechanical Assets</span>
              </div>
            </div>

            {/* Action Button */}
            {currentUserRole !== 'Read-Only Viewer' && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenAdjust(st)}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Record Process Adjustment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Operational Adjustments Audit History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-slate-200">
              Process Adjustments & Chemical Feed Change Audit Log
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Immutable Compliance Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Treatment Stage</th>
                <th className="px-4 py-2.5">Parameter Changed</th>
                <th className="px-4 py-2.5">Previous Value</th>
                <th className="px-4 py-2.5">New Value</th>
                <th className="px-4 py-2.5">Reason / Justification</th>
                <th className="px-4 py-2.5">Authorized Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500 font-mono">
                    No process adjustments recorded.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-850/60">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                      {new Date(adj.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-cyan-300">
                      {adj.stage_name || adj.stage_id.toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-200">{adj.parameter_name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{adj.previous_value}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">{adj.new_value}</td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-xs">{adj.reason}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">
                      <div>{adj.operator_name}</div>
                      <span className="text-[10px] text-slate-500">{adj.operator_role}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Process Adjustment */}
      {selectedStageForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Record Process Adjustment: {selectedStageForAdjust.name}
              </h3>
              <button onClick={() => setSelectedStageForAdjust(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Parameter / Chemical Feed</label>
                <input
                  type="text"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  placeholder="e.g. Alum (Al2(SO4)3), Caustic Soda, Flow Rate"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Previous Setpoint</label>
                  <input
                    type="text"
                    value={currentVal}
                    onChange={(e) => setCurrentVal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 mb-1 font-mono">New Setpoint</label>
                  <input
                    type="text"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    placeholder="e.g. 29.5 mg/L"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Engineering Reason & Field Observations</label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Raw water turbidity increased by 8 NTU following heavy rainfall runoff; raising alum dose to preserve pin-floc formation."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600"
                ></textarea>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Regulatory Compliance Notice:</span> All setpoint changes are permanently written to the SCADA compliance audit trail and attributed to the signed-in operator.
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedStageForAdjust(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/40 disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Authorize & Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
