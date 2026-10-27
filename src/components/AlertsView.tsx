import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  UserCheck,
  Send,
  Plus,
  Filter,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Alert, UserRole, User } from '../types';
import { api } from '../api/client';

interface AlertsViewProps {
  alerts: Alert[];
  users: User[];
  currentUserRole: UserRole;
  onRefreshAlerts: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  users,
  currentUserRole,
  onRefreshAlerts,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal / drawer states
  const [activeAlertForTimeline, setActiveAlertForTimeline] = useState<Alert | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    title: '',
    description: '',
    severity: 'WARNING' as 'INFO' | 'WARNING' | 'CRITICAL',
    source_type: 'PROCESS' as any,
    source_id: '',
    assigned_to: '',
  });

  const filteredAlerts = alerts.filter((a) => {
    const matchSev = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchStat = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSev && matchStat;
  });

  const handleAcknowledge = async (id: string) => {
    await api.acknowledgeAlert(id);
    onRefreshAlerts();
    if (activeAlertForTimeline?.id === id) {
      setActiveAlertForTimeline({
        ...activeAlertForTimeline,
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
      });
    }
  };

  const handleOpenResolve = (a: Alert) => {
    setResolvingAlert(a);
    setResolutionNotes('');
  };

  const handleExecuteResolve = async () => {
    if (!resolvingAlert) return;
    await api.resolveAlert(resolvingAlert.id, resolutionNotes || 'Resolved by operator on shift.');
    setResolvingAlert(null);
    onRefreshAlerts();
    if (activeAlertForTimeline?.id === resolvingAlert.id) {
      setActiveAlertForTimeline(null);
    }
  };

  const handleAddComment = async () => {
    if (!activeAlertForTimeline || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.addAlertComment(activeAlertForTimeline.id, commentText);
      setCommentText('');
      onRefreshAlerts();
      // Optimistically update
      const updatedComments = activeAlertForTimeline.comments || [];
      setActiveAlertForTimeline({
        ...activeAlertForTimeline,
        comments: [
          ...updatedComments,
          {
            id: Date.now(),
            alert_id: activeAlertForTimeline.id,
            author_name: 'Current Operator',
            author_role: currentUserRole,
            comment: commentText,
            created_at: new Date().toISOString(),
          },
        ],
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlertForm.title) {
      alert('Title is required');
      return;
    }
    await api.getAlerts(); // test
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-2' },
      body: JSON.stringify(newAlertForm),
    });
    setIsCreatingAlert(false);
    onRefreshAlerts();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 font-bold animate-pulse">CRITICAL</span>;
      case 'WARNING':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold">WARNING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            SCADA Alarm Console & Incident Management
          </h1>
          <p className="text-xs text-slate-400">
            Real-time threshold violation alarms, sensor communication faults, calibration deadlines, and incident timelines.
          </p>
        </div>

        {currentUserRole !== 'Read-Only Viewer' && (
          <button
            onClick={() => setIsCreatingAlert(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Manual Incident Alert
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded transition-colors ${
                  statusFilter === st ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Total Incidents: {filteredAlerts.length}
        </span>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
            No alarms match the selected filter criteria.
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`bg-slate-900/95 border rounded-xl p-4 transition-all ${
                alt.severity === 'CRITICAL' && alt.status === 'ACTIVE'
                  ? 'border-rose-700/80 shadow-md shadow-rose-950/20'
                  : alt.severity === 'WARNING' && alt.status === 'ACTIVE'
                  ? 'border-amber-700/60'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{alt.id}</span>
                    <span className="text-slate-600">•</span>
                    {getSeverityBadge(alt.severity)}
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-mono text-slate-400">Source: {alt.source_type} ({alt.source_id || 'System'})</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] font-mono text-slate-500">{new Date(alt.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">{alt.title}</h3>
                  <p className="text-xs text-slate-300">{alt.description}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      alt.status === 'ACTIVE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : alt.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {alt.status}
                  </span>
                </div>
              </div>

              {/* Resolution or Acknowledgement status strip */}
              {(alt.acknowledged_by || alt.resolved_by || alt.assigned_to) && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
                  {alt.acknowledged_by && (
                    <span>
                      Ack by: <strong className="text-slate-300">{alt.acknowledged_by}</strong> ({new Date(alt.acknowledged_at || '').toLocaleTimeString()})
                    </span>
                  )}
                  {alt.assigned_to && (
                    <span>
                      Assigned to: <strong className="text-cyan-300">{alt.assigned_to}</strong>
                    </span>
                  )}
                  {alt.resolved_by && (
                    <span className="text-emerald-300">
                      Resolved by: <strong>{alt.resolved_by}</strong> ({alt.resolution_notes})
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons & Timeline Drawer Link */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveAlertForTimeline(alt)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Incident Timeline & Comments ({alt.comments?.length || 0})
                </button>

                {currentUserRole !== 'Read-Only Viewer' && (
                  <div className="flex items-center gap-2">
                    {alt.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAcknowledge(alt.id)}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alt.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleOpenResolve(alt)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                      >
                        Resolve Alert
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: Incident Timeline & Threaded Comments Drawer */}
      {activeAlertForTimeline && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Incident Timeline: {activeAlertForTimeline.id}
                </h3>
                <p className="text-xs text-slate-400">{activeAlertForTimeline.title}</p>
              </div>
              <button onClick={() => setActiveAlertForTimeline(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Event 1: Created */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-300 shrink-0">
                  <Bell className="w-3 h-3" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-200">Alarm Triggered by SCADA</span>
                    <span className="text-[10px] text-slate-500">{new Date(activeAlertForTimeline.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5">{activeAlertForTimeline.description}</p>
                </div>
              </div>

              {/* Event 2: Acknowledged */}
              {activeAlertForTimeline.acknowledged_by && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-300 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-200">Acknowledged by {activeAlertForTimeline.acknowledged_by}</span>
                      <span className="text-[10px] text-slate-500">{new Date(activeAlertForTimeline.acknowledged_at || '').toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Thread */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <span className="font-mono text-slate-400 font-bold block uppercase text-[10px]">
                  Investigation Notes & Staff Activity
                </span>
                {(!activeAlertForTimeline.comments || activeAlertForTimeline.comments.length === 0) ? (
                  <div className="text-slate-500 italic">No notes recorded yet.</div>
                ) : (
                  activeAlertForTimeline.comments.map((c) => (
                    <div key={c.id} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-cyan-300">{c.author_name} ({c.author_role})</span>
                        <span className="text-slate-500">{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comment Input */}
            {currentUserRole !== 'Read-Only Viewer' && (
              <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Add inspection notes or field measurement..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve Alert Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Resolve Alert: {resolvingAlert.id}
              </h3>
              <button onClick={() => setResolvingAlert(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-300 font-medium">{resolvingAlert.title}</p>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Resolution Action / Root Cause Summary</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Conducted backwash cycle; clean bed headloss restored to 1.1 psi. Verified zero turbidity breakthrough."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setResolvingAlert(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteResolve}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/40"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Manual Alert Modal */}
      {isCreatingAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Log Manual Operational Alert
              </h3>
              <button onClick={() => setIsCreatingAlert(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Alert Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical feed pump 2 erratic stroke noise"
                  value={newAlertForm.title}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Severity</label>
                  <select
                    value={newAlertForm.severity}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="WARNING">Warning</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Source Category</label>
                  <select
                    value={newAlertForm.source_type}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, source_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="PROCESS">Process / Water Quality</option>
                    <option value="EQUIPMENT">Mechanical Equipment</option>
                    <option value="SENSOR">Instrument Fault</option>
                    <option value="MANUAL">Manual Field Inspection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Detailed Description</label>
                <textarea
                  rows={3}
                  value={newAlertForm.description}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, description: e.target.value })}
                  placeholder="Record observations, sensor readings, or mechanical sounds."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Assign Technician</label>
                <select
                  value={newAlertForm.assigned_to}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingAlert(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlert}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-950/40"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
