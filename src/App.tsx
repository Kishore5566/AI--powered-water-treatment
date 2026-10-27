import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  DashboardKPIs,
  TreatmentStage,
  Sensor,
  SensorReading,
  Alert,
  Equipment,
  MaintenanceTask,
  AiRecommendation,
  ProcessAdjustment,
} from './types';
import { api, getActiveUserId, setActiveUserId } from './api/client';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { SensorsView } from './components/SensorsView';
import { ProcessStagesView } from './components/ProcessStagesView';
import { AiOptimizationView } from './components/AiOptimizationView';
import { AlertsView } from './components/AlertsView';
import { EquipmentView } from './components/EquipmentView';
import { ReportsView } from './components/ReportsView';
import { AuditTrailView } from './components/AuditTrailView';
import { UserAuthModal } from './components/UserAuthModal';
import { Brain, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-2',
    name: 'Marcus Sterling',
    email: 'operator@aquapulse.io',
    role: 'Plant Operator',
    avatar_color: 'cyan',
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Core Data
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [keySensors, setKeySensors] = useState<{
    turbidity?: Sensor;
    chlorine?: Sensor;
    ph?: Sensor;
    dissolvedOxygen?: Sensor;
    temperature?: Sensor;
    conductivity?: Sensor;
  }>({});
  const [sparklines, setSparklines] = useState<{
    turbidity: SensorReading[];
    chlorine: SensorReading[];
    ph: SensorReading[];
    flow: SensorReading[];
  }>({
    turbidity: [],
    chlorine: [],
    ph: [],
    flow: [],
  });
  const [stages, setStages] = useState<TreatmentStage[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[]>([]);
  const [processAdjustments, setProcessAdjustments] = useState<ProcessAdjustment[]>([]);

  // Action states
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'alert' | 'ai' } | null>(null);

  const showToast = (title: string, text: string, type: 'success' | 'alert' | 'ai' = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 1. Initial Load of Users and Active Profile
  useEffect(() => {
    api.getUsers().then((res) => setAllUsers(res.users)).catch(console.error);
    api.getMe().then((res) => setCurrentUser(res.user)).catch(console.error);
  }, []);

  // 2. Fetch Dashboard Overview
  const refreshDashboard = useCallback(() => {
    api
      .getDashboardOverview()
      .then((res) => {
        setKpis(res.kpis);
        setKeySensors(res.keySensors);
        setSparklines(res.sparklines);
        setStages(res.stages);
        setAlerts(res.alerts);
      })
      .catch(console.error);
  }, []);

  // 3. Fetch Sensors
  const refreshSensors = useCallback(() => {
    api.getSensors().then((res) => setSensors(res.sensors)).catch(console.error);
  }, []);

  // 4. Fetch Stages and Adjustments
  const refreshStages = useCallback(() => {
    api.getStages().then((res) => setStages(res.stages)).catch(console.error);
  }, []);

  const refreshAdjustments = useCallback(() => {
    api.getProcessAdjustments().then((res) => setProcessAdjustments(res.adjustments)).catch(console.error);
  }, []);

  // 5. Fetch AI Recommendations
  const refreshAi = useCallback(() => {
    api.getAiRecommendations().then((res) => setAiRecommendations(res.recommendations)).catch(console.error);
  }, []);

  // 6. Fetch Alerts
  const refreshAlerts = useCallback(() => {
    api.getAlerts().then((res) => setAlerts(res.alerts)).catch(console.error);
  }, []);

  // 7. Fetch Equipment & Tasks
  const refreshEquipment = useCallback(() => {
    api.getEquipment().then((res) => setEquipment(res.equipment)).catch(console.error);
  }, []);

  const refreshTasks = useCallback(() => {
    api.getMaintenanceTasks().then((res) => setMaintenanceTasks(res.tasks)).catch(console.error);
  }, []);

  // Master Refresh
  const refreshAll = useCallback(() => {
    refreshDashboard();
    refreshSensors();
    refreshStages();
    refreshAdjustments();
    refreshAi();
    refreshAlerts();
    refreshEquipment();
    refreshTasks();
  }, [
    refreshDashboard,
    refreshSensors,
    refreshStages,
    refreshAdjustments,
    refreshAi,
    refreshAlerts,
    refreshEquipment,
    refreshTasks,
  ]);

  useEffect(() => {
    refreshAll();
    // Poll telemetry every 15 seconds to simulate SCADA connection
    const interval = setInterval(refreshDashboard, 15000);
    return () => clearInterval(interval);
  }, [refreshAll, refreshDashboard]);

  // Simulation Tick Handler
  const handleTickSimulation = async (scenario: string) => {
    try {
      const res = await api.tickSimulation(scenario);
      refreshAll();
      showToast(
        'SCADA Telemetry Updated',
        scenario === 'NORMAL'
          ? 'Advanced 1 simulation tick across all 20 sensors.'
          : `Injected anomaly scenario: ${scenario}. Sensors updated.`,
        scenario === 'NORMAL' ? 'success' : 'alert'
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  // AI Scan Handler
  const handleTriggerAiScan = async () => {
    setIsAiScanning(true);
    try {
      const res = await api.triggerAiAnalysis();
      refreshAi();
      refreshDashboard();
      showToast(
        res.mode === 'LIVE_GEMINI' ? 'Gemini 3.8 Flash Analysis Complete' : 'Offline Physics Simulation Scan Complete',
        `Generated ${res.generatedCount} optimization recommendations. Human review required.`,
        'ai'
      );
      // Switch tab to AI if user wants to see results
      setCurrentTab('ai');
    } catch (err: any) {
      alert(err.message || 'AI Scan failed');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await api.acknowledgeAlert(alertId);
    refreshAlerts();
    refreshDashboard();
    showToast('Alert Acknowledged', `Alarm ${alertId} acknowledged by ${currentUser.name}.`, 'success');
  };

  const handleSwitchUser = async (userId: string) => {
    const res = await api.switchUser(userId);
    setCurrentUser(res.user);
    refreshAll();
    showToast('User Switched', `Active operator changed to ${res.user.name} (${res.user.role}).`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* SCADA Control Room Header */}
      <Header
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        onOpenLoginModal={() => setIsAuthModalOpen(true)}
        onTickSimulation={handleTickSimulation}
        activeAlertsCount={kpis?.activeAlertsCount || 0}
        criticalAlertsCount={kpis?.criticalAlertsCount || 0}
        flowRateMGD={kpis?.totalFlowMGD || 24.2}
      />

      {/* Navigation Ribbon */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeAlertsCount={kpis?.activeAlertsCount || 0}
        criticalAlertsCount={kpis?.criticalAlertsCount || 0}
        pendingAiRecommendationsCount={kpis?.pendingAiRecommendations || 0}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`p-4 rounded-xl border shadow-2xl flex items-start gap-3 max-w-md ${
              toastMessage.type === 'ai'
                ? 'bg-indigo-950/95 border-indigo-500 text-indigo-200 shadow-indigo-950/50'
                : toastMessage.type === 'alert'
                ? 'bg-amber-950/95 border-amber-500 text-amber-200 shadow-amber-950/50'
                : 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            {toastMessage.type === 'ai' ? (
              <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            ) : toastMessage.type === 'alert' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h5 className="font-semibold text-xs text-white">{toastMessage.title}</h5>
              <p className="text-xs opacity-90 mt-0.5">{toastMessage.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main SCADA Workspace Container */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
        {currentTab === 'dashboard' && (
          <DashboardView
            kpis={kpis}
            keySensors={keySensors}
            sparklines={sparklines}
            stages={stages}
            alerts={alerts}
            onSelectTab={setCurrentTab}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onTriggerAiScan={handleTriggerAiScan}
            isAiScanning={isAiScanning}
          />
        )}

        {currentTab === 'sensors' && (
          <SensorsView
            sensors={sensors}
            currentUserRole={currentUser.role}
            onRefreshSensors={refreshSensors}
          />
        )}

        {currentTab === 'stages' && (
          <ProcessStagesView
            stages={stages}
            adjustments={processAdjustments}
            currentUserRole={currentUser.role}
            onRefreshStages={refreshStages}
            onRefreshAdjustments={refreshAdjustments}
          />
        )}

        {currentTab === 'ai' && (
          <AiOptimizationView
            recommendations={aiRecommendations}
            currentUserRole={currentUser.role}
            onRefreshRecommendations={refreshAi}
            onTriggerScan={handleTriggerAiScan}
            isScanning={isAiScanning}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            users={allUsers}
            currentUserRole={currentUser.role}
            onRefreshAlerts={refreshAlerts}
          />
        )}

        {currentTab === 'equipment' && (
          <EquipmentView
            equipment={equipment}
            tasks={maintenanceTasks}
            users={allUsers}
            currentUserRole={currentUser.role}
            onRefreshEquipment={refreshEquipment}
            onRefreshTasks={refreshTasks}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'audit' && <AuditTrailView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-3 text-center text-xs font-mono text-slate-500">
        AquaPulse AI Control Room &bull; SCADA System v3.8.4 &bull; EPA Drinking Water Baseline Standards Active &bull; Human Operator Review Enforced
      </footer>

      {/* User Auth & RBAC Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        onUserChanged={(u) => {
          setCurrentUser(u);
          refreshAll();
        }}
      />
    </div>
  );
}
