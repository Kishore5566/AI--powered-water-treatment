import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
  X,
  FileCheck,
} from 'lucide-react';
import { AiRecommendation, UserRole } from '../types';
import { api } from '../api/client';

interface AiOptimizationViewProps {
  recommendations: AiRecommendation[];
  currentUserRole: UserRole;
  onRefreshRecommendations: () => void;
  onTriggerScan: () => void;
  isScanning: boolean;
}

export const AiOptimizationView: React.FC<AiOptimizationViewProps> = ({
  recommendations,
  currentUserRole,
  onRefreshRecommendations,
  onTriggerScan,
  isScanning,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [reviewingRec, setReviewingRec] = useState<AiRecommendation | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const filteredRecs = recommendations.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleOpenReview = (rec: AiRecommendation, action: 'APPROVE' | 'REJECT') => {
    setReviewingRec(rec);
    setReviewAction(action);
    setReviewNotes(action === 'APPROVE' ? 'Approved by operator on duty after cross-checking SCADA telemetry.' : 'Rejected by operator.');
  };

  const handleExecuteReview = async () => {
    if (!reviewingRec) return;
    setIsSubmittingReview(true);
    try {
      await api.reviewAiRecommendation(reviewingRec.id, reviewAction, reviewNotes);
      setReviewingRec(null);
      onRefreshRecommendations();
    } catch (err: any) {
      alert(err.message || 'Review failed');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 font-bold animate-pulse">CRITICAL URGENCY</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold">HIGH URGENCY</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold">PENDING OPERATOR REVIEW</span>;
      case 'APPROVED_APPLIED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> APPROVED & APPLIED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-400" /> REJECTED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Scan Trigger */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Brain className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="font-display font-bold text-xl text-slate-100">
              AI Process Optimization & Anomaly Forecasting
            </h1>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Continuous multivariate telemetry evaluation using Gemini 3.8 Flash with physics-grounded water quality modeling.
            <strong className="text-cyan-300 ml-1">Human-in-the-loop:</strong> Autonomous plant parameter changes are strictly blocked until authorized by a human operator.
          </p>
        </div>

        <button
          onClick={onTriggerScan}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50 shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Running Multistage Scan...' : 'Trigger AI Anomaly & Optimization Scan'}
        </button>
      </div>

      {/* Model Mode Status Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>AI ENGINE: GEMINI 3.8 FLASH</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Offline Demo Mode Fallback: Active (Clearly Labeled)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Operator Approval Guardrail Enforced</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 text-xs font-mono">
          {(['ALL', 'PENDING_REVIEW', 'APPROVED_APPLIED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === tab
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-slate-400">
          Showing {filteredRecs.length} recommendations
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-4">
        {filteredRecs.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
            No recommendations match the selected filter.
          </div>
        ) : (
          filteredRecs.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{rec.id}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-mono uppercase text-slate-300 font-semibold">{rec.stage_id}</span>
                    <span className="text-slate-600">•</span>
                    {getUrgencyBadge(rec.urgency)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                      {rec.confidence}% Confidence
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      rec.ai_source === 'GEMINI_3_8_FLASH' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {rec.ai_source === 'GEMINI_3_8_FLASH' ? 'Gemini 3.8 Flash' : 'Simulated Demo AI'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base text-slate-100">{rec.title}</h3>
                  <p className="text-xs text-slate-300 font-medium">{rec.summary}</p>
                </div>
                <div>{getStatusBadge(rec.status)}</div>
              </div>

              {/* Supporting Telemetry Badges */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 my-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-2">
                  Corroborating SCADA Sensor Telemetry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(rec.supporting_telemetry).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 block truncate">{key}</span>
                      <span className="text-cyan-200 font-bold truncate block">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plain-Language Chemical & Physics Explanation */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Process Engineering Rationale:</span>
                  <p className="text-slate-300 leading-relaxed mt-0.5">{rec.plain_language_explanation}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-cyan-400 block mb-0.5">Recommended Action:</span>
                    <p className="text-slate-300">{rec.recommended_action}</p>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-emerald-400 block mb-0.5">Estimated Plant Impact:</span>
                    <p className="text-slate-300">{rec.estimated_impact}</p>
                  </div>
                </div>
              </div>

              {/* Proposed Parameter Changes Preview */}
              {rec.applied_changes && Object.keys(rec.applied_changes).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Settings to update on approval:</span>
                  {Object.entries(rec.applied_changes).map(([param, val]) => (
                    <span key={param} className="px-2 py-0.5 bg-cyan-950/70 border border-cyan-800/60 rounded text-cyan-300 font-bold">
                      {param} &rarr; {val}
                    </span>
                  ))}
                </div>
              )}

              {/* Operator Review Outcome (If already reviewed) */}
              {rec.status !== 'PENDING_REVIEW' && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>
                      Reviewed by: <strong className="text-slate-200">{rec.reviewed_by}</strong>
                    </span>
                    <span>{new Date(rec.reviewed_at || rec.created_at).toLocaleString()}</span>
                  </div>
                  {rec.review_notes && (
                    <div className="mt-1 text-slate-300 italic">"{rec.review_notes}"</div>
                  )}
                </div>
              )}

              {/* Review Action Buttons (If PENDING_REVIEW and operator is authorized) */}
              {rec.status === 'PENDING_REVIEW' && currentUserRole !== 'Read-Only Viewer' && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleOpenReview(rec, 'REJECT')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" /> Reject Recommendation
                  </button>
                  <button
                    onClick={() => handleOpenReview(rec, 'APPROVE')}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Apply Optimization
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Operator Review Confirmation Modal */}
      {reviewingRec && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
                {reviewAction === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                {reviewAction === 'APPROVE' ? 'Authorize AI Process Adjustment' : 'Reject AI Recommendation'}
              </h3>
              <button onClick={() => setReviewingRec(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">{reviewingRec.title}</span>
                <p className="text-slate-400">{reviewingRec.recommended_action}</p>
              </div>

              {reviewAction === 'APPROVE' && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-lg text-emerald-300">
                  <span className="font-bold block mb-1">Human-in-the-Loop Safeguard:</span>
                  Approving this recommendation will automatically adjust the chemical dosing or stage settings in the SCADA system and record an immutable process adjustment log attributed to your account.
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Operator Review Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide operational context or justification for audit compliance."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setReviewingRec(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReview}
                disabled={isSubmittingReview}
                className={`px-4 py-1.5 rounded-lg text-white font-semibold text-xs shadow-md ${
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                }`}
              >
                {isSubmittingReview ? 'Executing...' : reviewAction === 'APPROVE' ? 'Confirm & Apply Adjustment' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
