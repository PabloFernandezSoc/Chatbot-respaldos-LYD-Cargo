import React from 'react';
import { FileCheck, Clock, Send, AlertTriangle, Layers } from 'lucide-react';

interface KPICardsProps {
  total: number;
  completed: number;
  waiting: number;
  uncontacted: number;
  retrying: number;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  total,
  completed,
  waiting,
  uncontacted,
  retrying,
  activeFilter,
  onFilterChange,
}) => {
  const cards = [
    {
      id: 'ALL',
      label: 'Total de Servicios BIT',
      value: total,
      subtext: 'Servicios en plataforma',
      icon: Layers,
      color: 'text-slate-900',
    },
    {
      id: 'COMPLETED',
      label: 'Respaldos Completos',
      value: completed,
      subtext: `${total > 0 ? Math.round((completed / total) * 100) : 0}% con GD + EIR`,
      icon: FileCheck,
      color: 'text-emerald-600',
    },
    {
      id: 'WAITING',
      label: 'Esperando Respaldos',
      value: waiting,
      subtext: 'Bot envió solicitud a chofer',
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      id: 'RETRYING',
      label: 'Reintentos en Curso',
      value: retrying,
      subtext: 'Recordatorios enviados',
      icon: Send,
      color: 'text-blue-600',
    },
    {
      id: 'UNCONTACTED',
      label: 'Pendientes de Disparo',
      value: uncontacted,
      subtext: 'Aún no contactados por el bot',
      icon: AlertTriangle,
      color: 'text-slate-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => {
        const isSelected = activeFilter === c.id;
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            onClick={() => onFilterChange(isSelected ? 'ALL' : c.id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              isSelected
                ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {c.label}
              </span>
              <Icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${c.color}`}>
              {c.value}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {c.subtext}
            </div>
          </button>
        );
      })}
    </div>
  );
};
