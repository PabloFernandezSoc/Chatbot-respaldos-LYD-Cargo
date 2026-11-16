import React, { useState } from 'react';
import { ServicioBIT, BotSession, DocRequirementMode } from '../types';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Send,
  MessageSquare,
  FileCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  Layers,
  MousePointerClick,
  Check,
  FileText
} from 'lucide-react';

interface InteractiveSimulatorViewProps {
  services: ServicioBIT[];
  sessions: Record<number, BotSession>;
  onDispatch: (service: ServicioBIT, isRetry?: boolean, mode?: DocRequirementMode) => void;
  onUpdateMode?: (servicioID: number, mode: DocRequirementMode) => void;
  onSimulateReply: (
    servicioID: number,
    payload: {
      text?: string;
      mediaUrl?: string;
      docType?: 'GD' | 'EIR';
      buttonId?: string;
      serviceData?: ServicioBIT;
    }
  ) => void;
  onOpenDrawer: (service: ServicioBIT) => void;
}

export const InteractiveSimulatorView: React.FC<InteractiveSimulatorViewProps> = ({
  services,
  sessions,
  onDispatch,
  onUpdateMode,
  onSimulateReply,
  onOpenDrawer,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<number>(
    services[0]?.servicioID || 0
  );

  const activeService = services.find((s) => s.servicioID === selectedServiceId) || services[0];
  const session = activeService ? sessions[activeService.servicioID] : null;

  const currentMode: DocRequirementMode = session?.requiredMode || 'AMBAS';

  const hasGD = activeService?.docGD === 1 || session?.docsReceived?.gd;
  const hasEIR = activeService?.docEIR === 1 || session?.docsReceived?.eir;
  
  const isCompleted =
    currentMode === 'AMBAS'
      ? hasGD && hasEIR
      : currentMode === 'GD'
      ? hasGD
      : hasEIR;

  const sampleGDUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
  const sampleEIRUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';

  if (!activeService) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-500">
        No hay servicios cargados para simular.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Service Selector & Flow Selector Card */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Simulador Interactivo de Secuencia Chatbot
          </h2>
          <p className="text-xs text-slate-500">
            Prueba los 3 flujos conversacionales (Solo Guía, Solo EIR, o Ambas) con respuestas interactivas por botón de WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Servicio:
          </label>
          <select
            value={activeService.servicioID}
            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {services.slice(0, 30).map((s) => (
              <option key={s.servicioID} value={s.servicioID}>
                #{s.servicioID} - {s.contNro || 'S/N'} ({s.estado})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Flow Modes Selector Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Configuración de Requerimiento para Servicio #{activeService.servicioID}
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Selecciona el Flujo a Probar:
            </h3>
          </div>

          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => onUpdateMode && onUpdateMode(activeService.servicioID, 'AMBAS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentMode === 'AMBAS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📄 + 📋 Ambas (GD + EIR)</span>
            </button>
            <button
              onClick={() => onUpdateMode && onUpdateMode(activeService.servicioID, 'GD')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentMode === 'GD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📄 Solo Guía (GD)</span>
            </button>
            <button
              onClick={() => onUpdateMode && onUpdateMode(activeService.servicioID, 'EIR')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentMode === 'EIR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋 Solo EIR</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 leading-relaxed">
          {currentMode === 'AMBAS' && (
            <span>
              <strong>Flujo 3 (Ambas):</strong> El bot inicia solicitando la Guía y el EIR identificando el contenedor <code className="text-blue-300">{activeService.contNro}</code>. Cuando el chofer envía una foto, el bot le envía botones interactivos <em>[Es Guía de Despacho]</em> / <em>[Es EIR]</em>. Luego le pide el restante y finaliza con el botón <em>[Documento enviado]</em>.
            </span>
          )}
          {currentMode === 'GD' && (
            <span>
              <strong>Flujo 1 (Solo Guía):</strong> El bot solicita únicamente la Guía de Despacho para el contenedor <code className="text-blue-300">{activeService.contNro}</code>. Al recibir la foto, envía botón interactivo <em>[Documento enviado]</em> para que el chofer lo confirme con un toque y quede listo en BIT ERP.
            </span>
          )}
          {currentMode === 'EIR' && (
            <span>
              <strong>Flujo 2 (Solo EIR):</strong> El bot solicita únicamente el EIR (Interchange Receipt) para el contenedor <code className="text-blue-300">{activeService.contNro}</code>. Al recibir la foto, envía botón interactivo <em>[Documento enviado]</em> para confirmación inmediata y archivo en BIT ERP.
            </span>
          )}
        </div>
      </div>

      {/* Visual Sequence Roadmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Secuencia Operativa Paso a Paso ({currentMode === 'AMBAS' ? 'Guía + EIR' : currentMode === 'GD' ? 'Solo Guía' : 'Solo EIR'})
          </h3>
          <span className="text-xs font-semibold text-slate-600">
            Estado Actual: <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{session?.status || 'NO_CONTACTADO'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Iniciar Disparo */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              session && session.messages.length > 0
                ? 'bg-blue-50/60 border-blue-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 mb-1">Paso 1</div>
            <div className="text-sm font-bold text-slate-900 mb-1">Solicitud Inicial</div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Mensaje WhatsApp identificando contenedor <strong>{activeService.contNro || 'S/N'}</strong> y servicio <strong>#{activeService.servicioID}</strong>.
            </p>
            <button
              onClick={() => onDispatch(activeService, false, currentMode)}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gatillar Bot</span>
            </button>
          </div>

          {/* Step 2: Chofer Envía Foto */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              session?.status === 'CONFIRMANDO_DOCUMENTO' || session?.status === 'CONFIRMANDO_FINAL'
                ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-400'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 mb-1">Paso 2</div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              {currentMode === 'AMBAS' ? 'Foto de Documento' : 'Foto de Respaldo'}
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {currentMode === 'AMBAS'
                ? 'Chofer envía foto. El bot consulta con botones interactivos si es GD o EIR.'
                : 'Chofer adjunta la foto solicitada por WhatsApp.'}
            </p>
            <button
              onClick={() =>
                onSimulateReply(activeService.servicioID, {
                  text: currentMode === 'AMBAS'
                    ? 'Te adjunto la foto del documento que tengo acá'
                    : currentMode === 'GD'
                    ? 'Adjunto foto de la Guía de Despacho'
                    : 'Adjunto foto del EIR del contenedor',
                  mediaUrl: sampleGDUrl,
                  serviceData: activeService,
                })
              }
              className="w-full py-2 px-3 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Simular Envío Foto</span>
            </button>
          </div>

          {/* Step 3: Respuesta Interactiva / Botón */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              session?.status === 'ESPERANDO_SEGUNDO_DOCUMENTO' || session?.status === 'CONFIRMANDO_FINAL'
                ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 mb-1">Paso 3</div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              {currentMode === 'AMBAS' ? 'Botones de Selección' : 'Confirmar Envío'}
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {currentMode === 'AMBAS'
                ? 'Chofer clickea [Es GD] o [Es EIR]. Bot registra y pide el faltante.'
                : 'Chofer clickea [Documento enviado] para confirmar.'}
            </p>

            {currentMode === 'AMBAS' ? (
              <div className="flex gap-1.5">
                <button
                  onClick={() =>
                    onSimulateReply(activeService.servicioID, {
                      buttonId: 'btn_gd',
                      serviceData: activeService,
                    })
                  }
                  className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors text-center"
                >
                  [Es GD]
                </button>
                <button
                  onClick={() =>
                    onSimulateReply(activeService.servicioID, {
                      buttonId: 'btn_eir',
                      serviceData: activeService,
                    })
                  }
                  className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors text-center"
                >
                  [Es EIR]
                </button>
              </div>
            ) : (
              <button
                onClick={() =>
                  onSimulateReply(activeService.servicioID, {
                    buttonId: 'btn_confirm_sent',
                    serviceData: activeService,
                  })
                }
                className="w-full py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>[Documento enviado]</span>
              </button>
            )}
          </div>

          {/* Step 4: Finalización y ERP */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isCompleted
                ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 mb-1">Paso 4</div>
            <div className="text-sm font-bold text-slate-900 mb-1">Alojamiento en BIT ERP</div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Respaldos validados y confirmados. Estado final sincronizado con ERP.
            </p>
            {currentMode === 'AMBAS' && !isCompleted ? (
              <button
                onClick={() =>
                  onSimulateReply(activeService.servicioID, {
                    buttonId: 'btn_confirm_sent',
                    serviceData: activeService,
                  })
                }
                className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>[Confirmar Todo]</span>
              </button>
            ) : (
              <div className="flex items-center justify-center py-2 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg">
                <Check className="w-4 h-4 mr-1 text-emerald-600" />
                <span>{isCompleted ? 'Completado' : 'Esperando pasos'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Service Status in Simulator */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Servicio Seleccionado:</span>
              <span className="font-bold text-slate-900 font-mono">#{activeService.servicioID}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                {activeService.contNro}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Modo: {currentMode}
              </span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-3">
              <span>GD: <strong>{hasGD ? '✓ Recibido' : 'Pendiente'}</strong></span>
              <span>·</span>
              <span>EIR: <strong>{hasEIR ? '✓ Recibido' : 'Pendiente'}</strong></span>
              <span>·</span>
              <span>Estado Bot: <strong>{session?.status || 'NO_CONTACTADO'}</strong></span>
            </div>
          </div>

          <button
            onClick={() => onOpenDrawer(activeService)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Abrir Drawer de Chat en Vivo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
