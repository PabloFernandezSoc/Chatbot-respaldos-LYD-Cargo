import React, { useState } from 'react';
import {
  X,
  Send,
  RotateCw,
  CheckCircle2,
  XCircle,
  FileText,
  Truck,
  User,
  Phone,
  Anchor,
  Clock,
  ExternalLink,
  UploadCloud,
  Check,
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  Layers,
  MousePointerClick
} from 'lucide-react';
import { ServicioBIT, BotSession, ChatMessage, DocRequirementMode } from '../types';

interface ServiceDetailDrawerProps {
  service: ServicioBIT | null;
  session: BotSession | null;
  onClose: () => void;
  onDispatch: (service: ServicioBIT, isRetry?: boolean, mode?: DocRequirementMode) => void;
  onUpdateMode: (servicioID: number, mode: DocRequirementMode) => void;
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
  onConfirmDoc: (servicioID: number, docType: 'GD' | 'EIR', confirmed: boolean) => void;
  onOpenDocPreview: (url: string, title: string) => void;
}

export const ServiceDetailDrawer: React.FC<ServiceDetailDrawerProps> = ({
  service,
  session,
  onClose,
  onDispatch,
  onUpdateMode,
  onSimulateReply,
  onConfirmDoc,
  onOpenDocPreview,
}) => {
  if (!service) return null;

  const [inputMessage, setInputMessage] = useState('');
  const currentMode: DocRequirementMode = session?.requiredMode || 'AMBAS';

  const hasGD = service.docGD === 1 || session?.docsReceived?.gd;
  const hasEIR = service.docEIR === 1 || session?.docsReceived?.eir;

  const isCompleted =
    currentMode === 'GD'
      ? hasGD
      : currentMode === 'EIR'
      ? hasEIR
      : hasGD && hasEIR;

  const sampleGDUrl = session?.docsReceived?.gdUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
  const sampleEIRUrl = session?.docsReceived?.eirUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    onSimulateReply(service.servicioID, {
      text: inputMessage,
      serviceData: service,
    });
    setInputMessage('');
  };

  const handleModeChange = (mode: DocRequirementMode) => {
    onUpdateMode(service.servicioID, mode);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 font-mono">
                Servicio #{service.servicioID}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {service.estado || 'PENDIENTE'}
              </span>
              {isCompleted && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Respaldo Listo en BIT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Contenedor: <span className="font-semibold text-slate-800">{service.contNro || 'S/N'}</span>
              {service.patente ? ` · Patente: ${service.patente}` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Service Data Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Cliente:</span>
              <span className="font-medium text-slate-800 truncate block">{service.cliente || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Mandante:</span>
              <span className="font-medium text-slate-800 truncate block">{service.mandante || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Proveedor / Transporte:</span>
              <span className="font-medium text-slate-800 truncate block">{service.proveedor || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Chofer / Celular:</span>
              <span className="font-medium text-slate-800 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                {service.choferCelular || session?.phone || '+56 9 8479 8659'}
              </span>
            </div>
          </div>

          {/* SELECTOR DE FLUJO DE MENSAJES (SOLICITADO POR EL USUARIO) */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Flujo de Respaldos para este Servicio:
              </span>
              <span className="text-[11px] text-blue-700 font-mono font-medium">
                Modo: <strong>{currentMode === 'AMBAS' ? 'Ambas (GD + EIR)' : currentMode === 'GD' ? 'Solo Guía' : 'Solo EIR'}</strong>
              </span>
            </div>

            <p className="text-[11px] text-blue-800/80">
              Selecciona qué documentos solicitará el chatbot al chofer/proveedor:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Option 1: AMBAS */}
              <button
                type="button"
                onClick={() => handleModeChange('AMBAS')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                  currentMode === 'AMBAS'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>Guía + EIR</span>
                <span className={`text-[10px] ${currentMode === 'AMBAS' ? 'text-blue-100' : 'text-slate-400'}`}>
                  (Flujo 2 Docs)
                </span>
              </button>

              {/* Option 2: SOLO GD */}
              <button
                type="button"
                onClick={() => handleModeChange('GD')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                  currentMode === 'GD'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>Solo Guía (GD)</span>
                <span className={`text-[10px] ${currentMode === 'GD' ? 'text-blue-100' : 'text-slate-400'}`}>
                  (Flujo 1 Doc)
                </span>
              </button>

              {/* Option 3: SOLO EIR */}
              <button
                type="button"
                onClick={() => handleModeChange('EIR')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                  currentMode === 'EIR'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>Solo EIR</span>
                <span className={`text-[10px] ${currentMode === 'EIR' ? 'text-blue-100' : 'text-slate-400'}`}>
                  (Flujo 1 Doc)
                </span>
              </button>
            </div>
          </div>

          {/* Document Status Cards (GD & EIR) */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Estado de Respaldos Requeridos en BIT ERP
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Guía de Despacho Card */}
              {(currentMode === 'AMBAS' || currentMode === 'GD') && (
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    hasGD
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-600" />
                      Guía de Despacho (GD)
                    </span>
                    {hasGD ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Recibido
                      </span>
                    ) : (
                      <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Pendiente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {hasGD ? (
                      <button
                        onClick={() => onOpenDocPreview(sampleGDUrl, `Guía de Despacho - Servicio #${service.servicioID}`)}
                        className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver documento
                      </button>
                    ) : (
                      <button
                        onClick={() => onConfirmDoc(service.servicioID, 'GD', true)}
                        className="text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-2 py-1 rounded shadow-2xs"
                      >
                        Validar manual
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* EIR Card */}
              {(currentMode === 'AMBAS' || currentMode === 'EIR') && (
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    hasEIR
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-600" />
                      EIR (Interchange Receipt)
                    </span>
                    {hasEIR ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Recibido
                      </span>
                    ) : (
                      <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Pendiente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {hasEIR ? (
                      <button
                        onClick={() => onOpenDocPreview(sampleEIRUrl, `EIR - Servicio #${service.servicioID}`)}
                        className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver documento
                      </button>
                    ) : (
                      <button
                        onClick={() => onConfirmDoc(service.servicioID, 'EIR', true)}
                        className="text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-2 py-1 rounded shadow-2xs"
                      >
                        Validar manual
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-lg">
            <span className="text-xs text-slate-600 font-medium">
              Reintentos enviados: <span className="font-mono font-bold text-slate-900">{session?.retryCount || 0}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onDispatch(service, false, currentMode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Iniciar Flujo ({currentMode})</span>
              </button>
              <button
                onClick={() => onDispatch(service, true, currentMode)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                title="Forzar recordatorio"
              >
                <RotateCw className="w-3 h-3" />
                <span>Recordatorio</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Conversation Thread */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-[400px]">
            {/* Chat header */}
            <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-semibold">Chatbot LYD Cargo (WhatsApp)</span>
                <span className="text-slate-400 font-mono">+{service.choferCelular || '56984798659'}</span>
              </div>
              <span className="text-slate-300 text-[10px] uppercase font-mono">
                Flujo: {currentMode}
              </span>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#e5ddd5]/30">
              {(!session?.messages || session.messages.length === 0) ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>Aún no se ha iniciado la conversación con este chofer.</p>
                  <p className="mt-1">Haz clic en "Iniciar Flujo" para enviar el mensaje inicial.</p>
                </div>
              ) : (
                session.messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-xs relative ${
                          isBot
                            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                            : 'bg-[#dcf8c6] text-slate-900 rounded-tr-none'
                        }`}
                      >
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded overflow-hidden border border-black/10">
                            <img
                              src={msg.mediaUrl}
                              alt="Documento adjunto"
                              className="w-full h-32 object-cover cursor-pointer hover:opacity-90"
                              onClick={() => onOpenDocPreview(msg.mediaUrl!, 'Documento adjunto por chofer')}
                            />
                            <div className="bg-black/5 px-2 py-1 text-[10px] text-slate-600 flex items-center justify-between">
                              <span className="flex items-center gap-1 font-medium">
                                <ImageIcon className="w-3 h-3" /> Foto enviada
                              </span>
                              <button
                                onClick={() => onOpenDocPreview(msg.mediaUrl!, 'Documento adjunto')}
                                className="underline hover:text-slate-900"
                              >
                                Ampliar
                              </button>
                            </div>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* BOTONES INTERACTIVOS CLIQUEABLES (SOLICITADO POR EL USUARIO) */}
                        {msg.interactiveButtons && msg.interactiveButtons.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                            <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
                              <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                              Respuestas interactivas disponibles:
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {msg.interactiveButtons.map((btn) => (
                                <button
                                  key={btn.id}
                                  onClick={() =>
                                    onSimulateReply(service.servicioID, {
                                      buttonId: btn.id,
                                      serviceData: service,
                                    })
                                  }
                                  className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded text-xs font-semibold transition-colors text-center shadow-2xs hover:border-blue-400 active:scale-98"
                                >
                                  👉 {btn.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isBot && (
                            <span className="text-blue-500 font-bold">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel de prueba rápida para simular chofer enviando foto */}
            <div className="p-2.5 bg-white border-t border-slate-200 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Simular que el chofer envía foto:
                  </span>
                  <span className="text-[10px] text-slate-400">Prueba interactiva</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {/* Botón 1: Foto Guía */}
                  <button
                    type="button"
                    onClick={() =>
                      onSimulateReply(service.servicioID, {
                        text: 'Adjunto foto de Guía de Despacho',
                        mediaUrl: sampleGDUrl,
                        docType: 'GD',
                        serviceData: service,
                      })
                    }
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-300 text-blue-800 font-semibold whitespace-nowrap shadow-2xs"
                    title="Simular foto de Guía de Despacho"
                  >
                    📸 Foto Guía
                  </button>

                  {/* Botón 2: Foto EIR */}
                  <button
                    type="button"
                    onClick={() =>
                      onSimulateReply(service.servicioID, {
                        text: 'Adjunto foto de EIR',
                        mediaUrl: sampleEIRUrl,
                        docType: 'EIR',
                        serviceData: service,
                      })
                    }
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 text-emerald-800 font-semibold whitespace-nowrap shadow-2xs"
                    title="Simular foto de EIR"
                  >
                    📸 Foto EIR
                  </button>

                  {/* Botón 3: Foto sin texto para activar botones interactivos de selección */}
                  {currentMode === 'AMBAS' && (
                    <button
                      type="button"
                      onClick={() =>
                        onSimulateReply(service.servicioID, {
                          text: 'Adjunto documento',
                          mediaUrl: sampleGDUrl,
                          serviceData: service,
                        })
                      }
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded border border-purple-300 text-purple-800 font-semibold whitespace-nowrap shadow-2xs"
                      title="Simular foto sin especificar para que el bot muestre los botones de selección"
                    >
                      ❓ Foto sin texto (Gatilla Botones)
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendManual} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribir mensaje manual al chofer..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>LYD Cargo ERP Connect</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
