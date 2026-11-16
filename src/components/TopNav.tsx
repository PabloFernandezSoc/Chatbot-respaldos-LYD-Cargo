import React from 'react';
import { RefreshCw, Bot, SlidersHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';
import { YCloudStatus } from '../types';

interface TopNavProps {
  currentTab: 'servicios' | 'reglas' | 'logs' | 'simulador';
  onSelectTab: (tab: 'servicios' | 'reglas' | 'logs' | 'simulador') => void;
  onRefresh: () => void;
  loading: boolean;
  ycloudStatus: YCloudStatus | null;
  totalServices: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  onRefresh,
  loading,
  ycloudStatus,
  totalServices,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              LYD
            </div>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('servicios');
              }}
              className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
            >
              LYD Cargo Logistics
            </a>
          </div>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('servicios')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentTab === 'servicios'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Servicios BIT ({totalServices})
            </button>
            <button
              onClick={() => onSelectTab('reglas')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentTab === 'reglas'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Reglas del Bot
            </button>
            <button
              onClick={() => onSelectTab('logs')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentTab === 'logs'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Auditoría WhatsApp
            </button>
            <button
              onClick={() => onSelectTab('simulador')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentTab === 'simulador'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Simulador Flujo
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              title="Sincronizar datos con BIT ERP"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Sincronizando...' : 'Sincronizar BIT'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
