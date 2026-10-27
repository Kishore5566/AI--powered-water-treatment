import React, { useState } from 'react';
import {
  Wrench,
  Activity,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Gauge,
  Sliders,
  Calendar,
  User,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Equipment, MaintenanceTask, UserRole, User as UserType } from '../types';
import { api } from '../api/client';

interface EquipmentViewProps {
  equipment: Equipment[];
  tasks: MaintenanceTask[];
  users: UserType[];
  currentUserRole: UserRole;
  onRefreshEquipment: () => void;
  onRefreshTasks: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipment,
  tasks,
  users,
  currentUserRole,
  onRefreshEquipment,
  onRefreshTasks,
}) => {
  const [selectedTab, setSelectedTab] = useState<'ASSETS' | 'WORK_ORDERS'>('ASSETS');

  // Task creation modal
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    equipment_id: equipment[0]?.id || 'EQ-FLT-403',
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    assigned_to: 'Devon Cruz',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  // Task completion modal
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const handleCreateTask = async () => {
    if (!taskForm.title) {
      alert('Task title is required');
      return;
    }
    await api.createMaintenanceTask(taskForm);
    setIsCreatingTask(false);
    onRefreshTasks();
  };

  const handleExecuteCompletion = async () => {
    if (!completingTask) return;
    await api.updateMaintenanceTask(completingTask.id, {
      status: 'COMPLETED',
      completion_notes: completionNotes || 'Work order completed and verified by technician.',
    });
    setCompletingTask(null);
    onRefreshTasks();
    onRefreshEquipment();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">RUNNING</span>;
      case 'STANDBY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">STANDBY</span>;
      case 'MAINTENANCE_REQUIRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-semibold animate-pulse">MAINTENANCE REQ</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 font-semibold animate-pulse">FAULT / OFFLINE</span>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'Critical':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">WQ Impact: Critical</span>;
      case 'High':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">WQ Impact: High</span>;
      case 'Moderate':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">WQ Impact: Moderate</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">None</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            Equipment Health & Asset Maintenance Management
          </h1>
          <p className="text-xs text-slate-400">
            Pumps, clarifier drives, chemical metering skids, dual-media filter beds, vibration analysis, and work orders.
          </p>
        </div>

        {currentUserRole !== 'Read-Only Viewer' && (
          <button
            onClick={() => setIsCreatingTask(true)}
            className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-md shadow-cyan-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Work Order
          </button>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSelectedTab('ASSETS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            selectedTab === 'ASSETS'
              ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Mechanical Asset Telemetry ({equipment.length})
        </button>
        <button
          onClick={() => setSelectedTab('WORK_ORDERS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            selectedTab === 'WORK_ORDERS'
              ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Maintenance Work Orders ({tasks.length})
        </button>
      </div>

      {/* TAB 1: Assets Grid */}
      {selectedTab === 'ASSETS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => (
            <div
              key={eq.id}
              className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                eq.status === 'MAINTENANCE_REQUIRED' ? 'border-amber-700/80' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{eq.id}</span>
                    <h3 className="font-semibold text-sm text-slate-100">{eq.name}</h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Type: {eq.type} • Stage: {eq.stage_id.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(eq.status)}
                    {getImpactBadge(eq.water_quality_impact)}
                  </div>
                </div>

                {/* Health Score Gauge */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 my-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Health Index</span>
                    <span className={`font-bold ${eq.health_score < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {eq.health_score} / 100
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${eq.health_score < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${eq.health_score}%` }}
                    ></div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vibration</span>
                      <span className={`font-bold ${eq.vibration_mm_s > 2.5 ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        {eq.vibration_mm_s.toFixed(1)} mm/s
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <span className="text-slate-200 font-bold">{eq.temperature_c.toFixed(1)} °C</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Runtime</span>
                      <span className="text-slate-200 font-bold">{eq.runtime_hours.toLocaleString()} h</span>
                    </div>
                  </div>
                </div>

                {/* Service Schedule Info */}
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Last Service:</span>
                    <span className="text-slate-300">{eq.last_serviced_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Due:</span>
                    <span className="text-amber-300 font-semibold">{eq.next_service_due}</span>
                  </div>
                </div>

                {eq.notes && (
                  <div className="mt-2 text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded border border-slate-800">
                    "{eq.notes}"
                  </div>
                )}
              </div>

              {currentUserRole !== 'Read-Only Viewer' && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setTaskForm({ ...taskForm, equipment_id: eq.id });
                      setIsCreatingTask(true);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Dispatch Work Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Maintenance Tasks & Work Orders Board */}
      {selectedTab === 'WORK_ORDERS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Equipment Affected</th>
                  <th className="px-4 py-3">Work Order Details</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assigned Tech</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500 font-mono">
                      No maintenance work orders currently open.
                    </td>
                  </tr>
                ) : (
                  tasks.map((tsk) => (
                    <tr key={tsk.id} className="hover:bg-slate-850/60">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">{tsk.id}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        <div>{tsk.equipment_name || tsk.equipment_id}</div>
                        <span className="text-[10px] text-slate-500">{tsk.equipment_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">{tsk.title}</div>
                        <p className="text-[11px] text-slate-400 max-w-sm line-clamp-1">{tsk.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            tsk.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : tsk.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {tsk.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{tsk.assigned_to}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{tsk.due_date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            tsk.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : tsk.status === 'IN_PROGRESS'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {tsk.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {currentUserRole !== 'Read-Only Viewer' && tsk.status !== 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setCompletingTask(tsk);
                              setCompletionNotes('');
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                          >
                            Mark Completed
                          </button>
                        )}
                        {tsk.status === 'COMPLETED' && tsk.completion_notes && (
                          <span className="text-[11px] text-slate-400 italic" title={tsk.completion_notes}>
                            Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Work Order */}
      {isCreatingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" />
                Dispatch Maintenance Work Order
              </h3>
              <button onClick={() => setIsCreatingTask(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Affected Mechanical Asset</label>
                <select
                  value={taskForm.equipment_id}
                  onChange={(e) => setTaskForm({ ...taskForm, equipment_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.id}) - {eq.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Work Order Title</label>
                <input
                  type="text"
                  placeholder="e.g. Inspect Upper Shaft Bearing & Replace Polyurea Grease"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="CRITICAL">Critical Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Assign Technician</label>
                <select
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Detailed Scope of Work & Safety Guidelines</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Lockout/tagout instructions, replacement parts required, and verification procedure."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingTask(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/40"
              >
                Issue Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Complete Work Order */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Complete Work Order: {completingTask.id}
              </h3>
              <button onClick={() => setCompletingTask(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-200 font-semibold">{completingTask.title}</p>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Technician Completion Notes & Parts Replaced</label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Backwash completed with 12-minute fluidization. Air scour nozzles cleared. Vibration reduced to 1.1 mm/s."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setCompletingTask(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCompletion}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/40"
              >
                Sign Off & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
