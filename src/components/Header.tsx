import React, { useState } from 'react';
import {
  Droplets,
  Activity,
  Cpu,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  UserCheck,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  onOpenLoginModal: () => void;
  onTickSimulation: (scenario: string) => void;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  flowRateMGD: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenLoginModal,
  onTickSimulation,
  activeAlertsCount,
  criticalAlertsCount,
  flowRateMGD,
}) => {
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimScenario = async (scenario: string) => {
    setShowSimMenu(false);
    setIsSimulating(true);
    await onTickSimulation(scenario);
    setTimeout(() => setIsSimulating(false), 600);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-950 text-purple-300 border-purple-700/60';
      case 'Plant Operator':
        return 'bg-cyan-950 text-cyan-300 border-cyan-700/60';
      case 'Technician':
        return 'bg-amber-950 text-amber-300 border-amber-700/60';
      case 'Read-Only Viewer':
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Plant Brand & SCADA Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
            <Droplets className="w-6 h-6 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
                AQUAPULSE <span className="text-cyan-400">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                FACILITY SCADA 01
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              Municipal Water Treatment & AI Optimization Control Room
            </p>
          </div>
        </div>

        {/* Center: Live Plant Telemetry Ribbon */}
        <div className="hidden xl:flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-1.5 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">PLANT FLOW:</span>
            <span className="font-semibold text-cyan-200">{flowRateMGD.toFixed(1)} MGD</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">AI ADVISORY:</span>
            <span className="text-emerald-300 font-medium">READY (GEMINI 3.8 FLASH)</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalAlertsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-400">ACTIVE ALARMS:</span>
            <span className={`font-semibold ${criticalAlertsCount > 0 ? 'text-rose-400' : 'text-amber-300'}`}>
              {activeAlertsCount}
            </span>
          </div>
        </div>

        {/* Right: Simulation Controls & User Switcher */}
        <div className="flex items-center gap-3">
          {/* Simulation Injector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSimMenu(!showSimMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-mono text-slate-200 transition-colors shadow-sm"
              title="Trigger simulated SCADA telemetry readings or inject anomaly scenarios"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSimulating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Simulate Telemetry</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSimMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  SCADA Simulation Engine
                </div>
                <button
                  onClick={() => handleSimScenario('NORMAL')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-cyan-400" /> Normal Steady-State Drift
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">1 Tick</span>
                </button>
                <button
                  onClick={() => handleSimScenario('TURBIDITY_SPIKE')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-amber-300 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Inject Intake Turbidity Spike
                  </span>
                  <span className="text-[10px] text-amber-500 font-mono">&gt;35 NTU</span>
                </button>
                <button
                  onClick={() => handleSimScenario('FILTER_HEADLOSS')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-rose-300 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-rose-400" /> Inject Filter Bed #3 Headloss
                  </span>
                  <span className="text-[10px] text-rose-500 font-mono">&gt;7.8 psi</span>
                </button>
                <button
                  onClick={() => handleSimScenario('CHLORINE_DROP')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-purple-300 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" /> Inject Chlorine Feed Decay
                  </span>
                  <span className="text-[10px] text-purple-500 font-mono">&lt;0.8 mg/L</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Operator Pill & Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-700 flex items-center justify-center text-[11px] font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-medium text-slate-100 flex items-center gap-1.5">
                  {currentUser.name}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-2 z-50 text-xs">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Switch Operator Profile</span>
                  <span className="text-[10px] text-cyan-400">RBAC Enabled</span>
                </div>
                <div className="py-1 space-y-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                        u.id === currentUser.id ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-800/60' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-200">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenLoginModal();
                    }}
                    className="w-full text-center px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
                  >
                    View Access Matrix / Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
