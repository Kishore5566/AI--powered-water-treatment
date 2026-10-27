import React, { useState, useEffect } from 'react';
import { History, Search, Download, ShieldCheck, Filter } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../api/client';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = () => {
    setIsLoading(true);
    api
      .getAuditLogs()
      .then((res) => setLogs(res.logs))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || log.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('AI')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">{action}</span>;
    }
    if (action.includes('ALERT')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold">{action}</span>;
    }
    if (action.includes('CALIBRATION')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 font-bold">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Immutable SCADA Operational Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Full compliance record of all operator setpoint changes, AI advisory approvals, sensor calibrations, and alarm clearances.
          </p>
        </div>

        <a
          href="/api/reports/export-csv?type=audit-trail"
          download="aquapulse-audit-trail.csv"
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-400" /> Download Audit Trail CSV
        </a>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by operator, action description, asset ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
        >
          <option value="ALL">All Action Types</option>
          <option value="PROCESS_ADJUST">Process Setpoint Adjustments</option>
          <option value="AI_APPROVE">AI Optimization Approvals</option>
          <option value="AI_REJECT">AI Optimization Rejections</option>
          <option value="ALERT_ACK">Alert Acknowledgements</option>
          <option value="ALERT_RESOLVE">Alert Clearances</option>
          <option value="CALIBRATION">Sensor Calibrations</option>
          <option value="MAINTENANCE_UPDATE">Work Orders</option>
          <option value="LOGIN">User Sign-Ins</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Operator Name & Role</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Target ID</th>
                <th className="px-4 py-3">Audit Details & Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-mono">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No audit records match query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{log.user_name}</div>
                      <span className="text-[10px] font-mono text-cyan-400">{log.user_role}</span>
                    </td>
                    <td className="px-4 py-3">{getActionBadge(log.action_type)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{log.entity_type}</td>
                    <td className="px-4 py-3 font-mono font-bold text-cyan-300">{log.entity_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-md">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
