import React, { useState } from 'react';
import { Shield, Lock, UserCheck, X, Check, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onUserChanged: (user: User) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onUserChanged,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await api.login(email, password);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to switch user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-100">
                SCADA Access Control & Role-Based Permissions
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Active User: <strong className="text-cyan-300">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 1-Click Demo Profiles */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-slate-300 mb-2">
              Instant Profile Switcher (Pre-Seeded Accounts)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allUsers.map((u) => {
                const isActive = u.id === currentUser.id;
                let roleColor = 'text-cyan-400';
                let roleDesc = 'Full operational adjustments, AI approvals, alarms';
                if (u.role === 'Admin') {
                  roleColor = 'text-purple-400';
                  roleDesc = 'Full plant oversight, sensor CRUD, system config';
                } else if (u.role === 'Technician') {
                  roleColor = 'text-amber-400';
                  roleDesc = 'Calibration, mechanical work orders, inspections';
                } else if (u.role === 'Read-Only Viewer') {
                  roleColor = 'text-slate-400';
                  roleDesc = 'Inspect dashboards, download compliance CSVs';
                }

                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickSwitch(u.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-200">{u.name}</span>
                      <span className={`text-[10px] font-mono font-bold ${roleColor}`}>{u.role}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mb-1">{u.email}</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{roleDesc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Password Login Form */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-300 mb-3 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Standard Authentication
            </h4>

            {errorMsg && (
              <div className="p-3 mb-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@aquapulse.io"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. admin123"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  Default Demo Passwords: <code>admin123</code>, <code>operator123</code>, <code>tech123</code>, <code>viewer123</code>
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/40 disabled:opacity-50"
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
