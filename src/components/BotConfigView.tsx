import React, { useState } from 'react';
import {
  Save,
  CheckCircle2,
  Clock,
  MessageSquare,
  Zap,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Phone
} from 'lucide-react';
import { BotConfig, YCloudStatus } from '../types';

interface BotConfigViewProps {
  config: BotConfig | null;
  onSaveConfig: (updated: Partial<BotConfig>) => void;
  availableStates: string[];
  ycloudStatus: YCloudStatus | null;
}

const REQUIRED_TRIGGERS = [
  'CONTENEDOR ENTREGADO A STACKING',
  'EN RUTA A DEVOLVER CONTENEDOR VACIO',
];

const EXCLUDED_BY_RULE = [
  'PROYECCION DE CARGA',
  'ALMACENADO',
  'EN COORDINACION',
  'ANULADO',
];

export const BotConfigView: React.FC<BotConfigViewProps> = ({
  config,
  onSaveConfig,
  availableStates,
  ycloudStatus,
}) => {
  const [active, setActive] = useState(config?.active ?? true);
  const [triggerStatuses, setTriggerStatuses] = useState<string[]>(
    config?.triggerStatuses || REQUIRED_TRIGGERS
  );
  const [retryIntervalHours, setRetryIntervalHours] = useState(
    config?.retryIntervalHours || 2
  );
  const [maxRetries, setMaxRetries] = useState(config?.maxRetries || 3);
  const [initialTemplate, setInitialTemplate] = useState(
    config?.initialTemplate ||
      'Estimado chofer/proveedor de LYD Cargo (Servicio #{servicioID}, Contenedor {contNro}): Por favor adjunte los respaldos de la operación (Guía de Despacho firmada y EIR). Responda a este mensaje con las fotos o documentos.'
  );
  const [reminderTemplate, setReminderTemplate] = useState(
    config?.reminderTemplate ||
      'Recordatorio #{retryCount} de LYD Cargo (Servicio #{servicioID}): Aún no hemos recibido los respaldos (Guía de Despacho y EIR). Favor adjuntarlos a la brevedad para liquidar el servicio.'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleStatus = (st: string) => {
    if (triggerStatuses.includes(st)) {
      setTriggerStatuses(triggerStatuses.filter((s) => s !== st));
    } else {
      setTriggerStatuses([...triggerStatuses, st]);
    }
  };

  const applyDefaultLydTriggers = () => {
    setTriggerStatuses(REQUIRED_TRIGGERS);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      active,
      triggerStatuses,
      retryIntervalHours: Number(retryIntervalHours),
      maxRetries: Number(maxRetries),
      initialTemplate,
      reminderTemplate,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner de estado de APIs y Servicio de Prueba */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BIT ERP Status */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Conexión BIT ERP</div>
              <div className="text-xs text-slate-500 font-mono">biterp.cl:451 (Reporte General)</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            Conectado
          </span>
        </div>

        {/* YCloud WhatsApp Status */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Línea WhatsApp YCloud</div>
              <div className="text-xs text-slate-500 font-mono">
                {ycloudStatus?.displayPhoneNumber || '+56 9 8479 8659'} · {ycloudStatus?.verifiedName || 'LYD Cargo'}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            {ycloudStatus?.status || 'CONNECTED'}
          </span>
        </div>
      </div>

      {/* Tarjeta de Servicio de Prueba */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-950">
              Número de Prueba Configurado: +56 9 3956 8768
            </div>
            <div className="text-xs text-blue-700">
              Asociado a "Chofer prueba" en "Cliente prueba" / "Mandante prueba".
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-blue-900 bg-white px-2.5 py-1 rounded border border-blue-300 font-mono">
          Listo para Pruebas
        </span>
      </div>

      {/* Formulario de Configuración del Bot */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Reglas de Disparo y Políticas de Reintento
            </h2>
            <p className="text-xs text-slate-500">
              Define los estados que gatillan el bot para solicitar la Guía de Despacho y EIR.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={applyDefaultLydTriggers}
              className="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md font-semibold transition-colors"
            >
              Restablecer Triggers LYD
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-slate-700">
                {active ? 'Bot Activado' : 'Bot En Pausa'}
              </span>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5 accent-slate-900 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* 1. Triggers Válidos Requeridos por LYD Cargo */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            1. Triggers Válidos para Gatillar el Chatbot (Solicitados por LYD Cargo)
          </label>
          <p className="text-xs text-slate-500">
            Apenas un servicio pase a cualquiera de estos 2 estados, el bot enviará el mensaje de solicitud de Guía de Despacho y EIR:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REQUIRED_TRIGGERS.map((reqTrigger) => {
              const isSelected = triggerStatuses.includes(reqTrigger);
              return (
                <div
                  key={reqTrigger}
                  onClick={() => toggleStatus(reqTrigger)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      🎯 {reqTrigger}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Trigger Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {reqTrigger.includes('STACKING')
                      ? 'Para exportaciones (EXPOD / EXPOR) al ingresar contenedor full a stacking.'
                      : 'Para importaciones (IMPOD / IMPOR) al salir de planta a devolver vacío.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Estados Excluidos Explícitamente */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            2. Estados Excluidos de Consideración Operativa
          </label>
          <p className="text-xs text-slate-500">
            Los siguientes estados no gatillan el bot y son ocultados de la vista principal por defecto:
          </p>

          <div className="flex flex-wrap gap-2">
            {EXCLUDED_BY_RULE.map((ex) => (
              <span
                key={ex}
                className="px-2.5 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono"
              >
                ✕ {ex}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Tiempos y Frecuencia de Reintentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Intervalo de Recordatorio
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Tiempo de espera antes de volver a solicitar los respaldos si no hay respuesta:
            </p>
            <select
              value={retryIntervalHours}
              onChange={(e) => setRetryIntervalHours(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
            >
              <option value={1}>Cada 1 hora</option>
              <option value={2}>Cada 2 horas (Recomendado)</option>
              <option value={4}>Cada 4 horas</option>
              <option value={8}>Cada 8 horas</option>
              <option value={24}>Cada 24 horas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Límite de Reintentos Máximos
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Número máximo de recordatorios automáticos por servicio:
            </p>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
            >
              <option value={1}>1 intento</option>
              <option value={2}>2 intentos</option>
              <option value={3}>3 intentos (Recomendado)</option>
              <option value={5}>5 intentos</option>
            </select>
          </div>
        </div>

        {/* 4. Plantillas de Mensajes */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              Plantilla Mensaje Inicial (Solicitud de GD y EIR)
            </label>
            <p className="text-xs text-slate-500 mb-1">
              Variables disponibles:{' '}
              <code className="text-blue-600 font-mono">{"{servicioID}"}</code>,{' '}
              <code className="text-blue-600 font-mono">{"{contNro}"}</code>
            </p>
            <textarea
              rows={3}
              value={initialTemplate}
              onChange={(e) => setInitialTemplate(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              Plantilla Recordatorio de Seguimiento
            </label>
            <p className="text-xs text-slate-500 mb-1">
              Variables disponibles:{' '}
              <code className="text-blue-600 font-mono">{"{servicioID}"}</code>,{' '}
              <code className="text-blue-600 font-mono">{"{retryCount}"}</code>
            </p>
            <textarea
              rows={3}
              value={reminderTemplate}
              onChange={(e) => setReminderTemplate(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ¡Configuración
              guardada exitosamente!
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Los cambios se aplican de inmediato en los nuevos disparos.
            </span>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
