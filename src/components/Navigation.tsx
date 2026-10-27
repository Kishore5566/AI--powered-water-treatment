import React from 'react';
import {
  LayoutDashboard,
  Activity,
  GitFork,
  Brain,
  Bell,
  Wrench,
  FileCheck,
  History,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'sensors' | 'stages' | 'ai' | 'alerts' | 'equipment' | 'reports' | 'audit';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  pendingAiRecommendationsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeAlertsCount,
  criticalAlertsCount,
  pendingAiRecommendationsCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; badgeCritical?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Operations Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'sensors',
      label: 'Sensors & Water Quality',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'stages',
      label: 'Treatment Process',
      icon: <GitFork className="w-4 h-4" />,
    },
    {
      id: 'ai',
      label: 'AI Insights & Optimization',
      icon: <Brain className="w-4 h-4" />,
      badge: pendingAiRecommendationsCount,
    },
    {
      id: 'alerts',
      label: 'Alerts & Incidents',
      icon: <Bell className="w-4 h-4" />,
      badge: activeAlertsCount,
      badgeCritical: criticalAlertsCount > 0,
    },
    {
      id: 'equipment',
      label: 'Equipment & Maintenance',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports & Compliance',
      icon: <FileCheck className="w-4 h-4" />,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: <History className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 px-4 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 min-w-max py-1.5">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-800/80 shadow-sm shadow-cyan-950/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    tab.badgeCritical
                      ? 'bg-rose-500 text-white animate-pulse'
                      : tab.id === 'ai'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
