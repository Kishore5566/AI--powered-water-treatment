import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Table,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../api/client';

export const ReportsView: React.FC = () => {
  const [complianceData, setComplianceData] = useState<any>(null);
  const [selectedReportType, setSelectedReportType] = useState<'WATER_QUALITY' | 'COMPLIANCE' | 'CHEMICAL_USAGE'>('COMPLIANCE');
  const [dateRange, setDateRange] = useState('7d');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    api.getComplianceReport().then((res) => {
      setComplianceData(res);
    });
  }, []);

  const handleExportCsv = (type: 'water-quality' | 'audit-trail') => {
    setIsExporting(true);
    const link = document.createElement('a');
    link.href = `/api/reports/export-csv?type=${type}`;
    link.setAttribute('download', `aquapulse-${type}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            Regulatory Compliance & Water Quality Reporting
          </h1>
          <p className="text-xs text-slate-400">
            Automated monitoring reports, EPA surface water rule threshold adherence, chemical inventory, and CSV data exports.
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCsv('water-quality')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-cyan-950/40 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export Water Quality Telemetry (CSV)
          </button>
          <button
            onClick={() => handleExportCsv('audit-trail')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Verification Disclaimer */}
      <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-4 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-200">Regulatory Baseline Monitoring Guidelines</h4>
          <p className="text-slate-300 leading-relaxed">
            {complianceData?.disclaimer ||
              'Configurable monitoring thresholds adhere to primary EPA Surface Water Treatment Rules (SWTR) and Safe Drinking Water Act (SDWA) baselines. Official regulatory compliance status requires certified laboratory chain-of-custody documentation and approval by authorized municipal health authorities.'}
          </p>
        </div>
      </div>

      {/* Compliance Scorecards */}
      {complianceData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Turbidity Compliance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Surface Water Turbidity Rule</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                COMPLIANT
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display font-bold text-3xl text-emerald-400">
                {complianceData.metrics.turbidityCompliancePct}%
              </span>
              <span className="text-xs font-mono text-slate-400">Readings &le; 0.30 NTU</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              EPA Standard requires &ge;95% of monthly composite samples to remain &le;0.30 NTU.
            </p>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${complianceData.metrics.turbidityCompliancePct}%` }}
              ></div>
            </div>
          </div>

          {/* Card 2: Free Chlorine Residual Compliance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Distribution Disinfection Residual</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                COMPLIANT
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display font-bold text-3xl text-emerald-400">
                {complianceData.metrics.chlorineCompliancePct}%
              </span>
              <span className="text-xs font-mono text-slate-400">Within 0.2 - 4.0 mg/L</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Minimum 0.20 mg/L required at entry point; maximum 4.0 mg/L disinfectant residual limit.
            </p>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${complianceData.metrics.chlorineCompliancePct}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: pH Stability & Corrosion Control */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Finished Water pH Envelope</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                COMPLIANT
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display font-bold text-3xl text-emerald-400">
                {complianceData.metrics.phCompliancePct}%
              </span>
              <span className="text-xs font-mono text-slate-400">Within 6.5 - 8.5 pH</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Secondary drinking water standard for pipe passivation and disinfection byproduct mitigation.
            </p>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${complianceData.metrics.phCompliancePct}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Disinfection Log Inactivation & Chemical Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Basin CT Compliance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-semibold text-sm uppercase text-slate-200">
              Disinfection Contact Time (CT) Log Inactivation
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Regulatory Requirement:</span>
              <span className="text-slate-200 font-bold">3.0-Log Giardia / 4.0-Log Virus</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Actual CT Achieved Today:</span>
              <span className="text-emerald-400 font-bold">3.8-Log Giardia (133 mg·min/L)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Disinfection Basin Temperature:</span>
              <span className="text-slate-200 font-bold">16.8 °C</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">T10 Hydraulic Baffle Factor:</span>
              <span className="text-slate-200 font-bold">0.65 (Superior Serpentine)</span>
            </div>
          </div>
        </div>

        {/* Chemical Inventory & Consumption Run-Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Table className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-semibold text-sm uppercase text-slate-200">
              Chemical Feed & Inventory Daily Run-Rate
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Alum Coagulant (48% liq):</span>
              <span className="text-cyan-300 font-bold">28.5 mg/L (~5,750 lbs/day)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Sodium Hypochlorite (12.5%):</span>
              <span className="text-cyan-300 font-bold">2.4 mg/L (~480 gal/day)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Caustic Soda (50% NaOH):</span>
              <span className="text-cyan-300 font-bold">4.2 mg/L (~850 lbs/day)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Orthophosphate Corrosion Inhibitor:</span>
              <span className="text-cyan-300 font-bold">1.1 mg/L (~220 lbs/day)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
