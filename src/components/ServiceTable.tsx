import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  RotateCw,
  ExternalLink,
  Phone,
  User,
  Truck,
  FileText,
  Zap,
  RotateCcw,
  ShieldCheck,
  Check,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { ServicioBIT, BotSession, BotStatusType, DocRequirementMode } from '../types';

interface ServiceTableProps {
  services: ServicioBIT[];
  sessions: Record<number, BotSession>;
  triggerStatuses: string[];
  onSelectService: (service: ServicioBIT) => void;
  onDispatchBot: (service: ServicioBIT, isRetry?: boolean, mode?: DocRequirementMode) => void;
  onUpdateMode?: (servicioID: number, mode: DocRequirementMode) => void;
  onChangeTestState?: (nuevoEstado: string, mode?: DocRequirementMode) => void;
  onResetTest?: () => void;
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

// Estados excluidos explícitamente según instrucción del usuario
const EXCLUDED_BY_RULE = [
  'PROYECCION DE CARGA',
  'ALMACENADO',
  'EN COORDINACION',
  'ANULADO',
  ''
];

export const ServiceTable: React.FC<ServiceTableProps> = ({
  services,
  sessions,
  triggerStatuses,
  onSelectService,
  onDispatchBot,
  onUpdateMode,
  onChangeTestState,
  onResetTest,
  activeStatusFilter,
  onStatusFilterChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedServiceState, setSelectedServiceState] = useState<string>('ALL');
  const [excludeNonOperational, setExcludeNonOperational] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Find the test service if present
  const testService = useMemo(() => {
    return services.find((s) => s.isTestService || s.servicioID === 99001);
  }, [services]);

  const testSession = testService ? sessions[testService.servicioID] : null;

  // Extract unique ERP service states
  const serviceStates = useMemo(() => {
    const states = new Set<string>();
    services.forEach((s) => {
      if (s.estado) states.add(s.estado);
    });
    return Array.from(states);
  }, [services]);

  // Check if a state is one of the valid trigger states
  const isTriggerState = (estado: string) => {
    if (!estado) return false;
    return triggerStatuses.some(
      (ts) => ts.trim().toUpperCase() === estado.trim().toUpperCase()
    );
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Always keep the test service visible
      if (s.isTestService) return true;

      // 1. Exclude non-operational if toggle is active
      if (excludeNonOperational) {
        const normalized = (s.estado || '').trim().toUpperCase();
        if (EXCLUDED_BY_RULE.includes(normalized)) {
          return false;
        }
      }

      const session = sessions[s.servicioID];
      const botStatus: BotStatusType = session ? session.status : 'NO_CONTACTADO';

      // 2. Filter by KPI card selection
      if (activeStatusFilter === 'COMPLETED') {
        const isCompleted =
          (s.docGD === 1 && s.docEIR === 1) ||
          botStatus === 'COMPLETED' ||
          botStatus === 'COMPLETADO';
        if (!isCompleted) return false;
      } else if (activeStatusFilter === 'WAITING') {
        if (
          botStatus !== 'ESPERANDO_RESPUESTA' &&
          botStatus !== 'CONFIRMANDO_DOCUMENTO'
        )
          return false;
      } else if (activeStatusFilter === 'RETRYING') {
        if (!session || session.retryCount <= 1) return false;
      } else if (activeStatusFilter === 'UNCONTACTED') {
        if (botStatus !== 'NO_CONTACTADO') return false;
      }

      // 3. Filter by ERP state dropdown
      if (selectedServiceState !== 'ALL' && s.estado !== selectedServiceState) {
        return false;
      }

      // 4. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchID = String(s.servicioID).includes(q);
        const matchCont = (s.contNro || '').toLowerCase().includes(q);
        const matchCliente = (s.cliente || '').toLowerCase().includes(q);
        const matchMandante = (s.mandante || '').toLowerCase().includes(q);
        const matchProveedor = (s.proveedor || '').toLowerCase().includes(q);
        const matchChofer = (s.chofer || '').toLowerCase().includes(q);
        const matchPatente = (s.patente || '').toLowerCase().includes(q);
        return (
          matchID ||
          matchCont ||
          matchCliente ||
          matchMandante ||
          matchProveedor ||
          matchChofer ||
          matchPatente
        );
      }

      return true;
    });
  }, [
    services,
    sessions,
    excludeNonOperational,
    activeStatusFilter,
    selectedServiceState,
    search,
  ]);

  const totalPages = Math.ceil(filteredServices.length / pageSize) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  const renderBotStatus = (status: BotStatusType, retryCount = 0) => {
    switch (status) {
      case 'COMPLETED':
      case 'COMPLETADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Respaldos Completos
          </span>
        );
      case 'ESPERANDO_RESPUESTA':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Esperando Chofer {retryCount > 1 ? `(Intento ${retryCount})` : ''}
          </span>
        );
      case 'CONFIRMANDO_DOCUMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            Confirmando GD / EIR
          </span>
        );
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Mensaje Enviado
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Error en Envío
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            No Contactado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* BANNER DEL SERVICIO DE PRUEBA (SOLICITADO POR EL USUARIO) */}
      {testService && (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-blue-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-300" /> SERVICIO DE PRUEBA EN VIVO
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  #{testService.servicioID}
                </span>
                <span className="font-mono text-xs text-blue-200 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                  {testService.contNro}
                </span>
              </div>

              <div className="text-xs text-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong>Cliente:</strong> {testService.cliente}
                </span>
                <span>·</span>
                <span>
                  <strong>Mandante:</strong> {testService.mandante}
                </span>
                <span>·</span>
                <span>
                  <strong>Chofer:</strong> {testService.chofer}
                </span>
                <span>·</span>
                <span className="text-emerald-300 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <strong>+{testService.choferCelular}</strong> (WhatsApp Real)
                </span>
              </div>
            </div>

            {/* Selector de Estado, Selector de Flujo y Botón de Disparo Inmediato */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Selector de Flujo (AMBAS / GD / EIR) */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-lg border border-slate-700 text-xs">
                <span className="text-slate-300 text-[11px] pl-1 font-medium">Flujo:</span>
                <select
                  value={testSession?.requiredMode || 'AMBAS'}
                  onChange={(e) => onUpdateMode && onUpdateMode(testService.servicioID, e.target.value as DocRequirementMode)}
                  className="bg-slate-900 text-blue-200 text-xs rounded px-2 py-1 font-semibold border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="AMBAS">Guía + EIR (2 Docs)</option>
                  <option value="GD">Solo Guía (1 Doc)</option>
                  <option value="EIR">Solo EIR (1 Doc)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-lg border border-slate-700 text-xs">
                <span className="text-slate-300 text-[11px] pl-1 font-medium">Estado:</span>
                <select
                  value={testService.estado}
                  onChange={(e) => onChangeTestState && onChangeTestState(e.target.value, testSession?.requiredMode || 'AMBAS')}
                  className="bg-slate-900 text-white text-xs rounded px-2.5 py-1 font-semibold border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="EN RUTA A DEVOLVER CONTENEDOR VACIO">
                    🎯 EN RUTA A DEVOLVER CONTENEDOR VACIO (Trigger)
                  </option>
                  <option value="CONTENEDOR ENTREGADO A STACKING">
                    🎯 CONTENEDOR ENTREGADO A STACKING (Trigger)
                  </option>
                  <option value="ATENCION PLANTA">ATENCION PLANTA (No trigger)</option>
                  <option value="PRESENTACION EN PLANTA">PRESENTACION EN PLANTA (No trigger)</option>
                  <option value="RUTA A CLIENTE">RUTA A CLIENTE (No trigger)</option>
                </select>
              </div>

              <button
                onClick={() => onSelectService(testService)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ver Chat / Detalle</span>
              </button>

              {onResetTest && (
                <button
                  onClick={onResetTest}
                  title="Reiniciar servicio de prueba a estado inicial"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Estado del trigger para el servicio de prueba */}
          <div className="mt-3 pt-2.5 border-t border-blue-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Condición de Trigger:</span>
              {isTriggerState(testService.estado) ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Estado Válido para Gatillar Chatbot
                </span>
              ) : (
                <span className="text-slate-400">
                  Estado en espera (selecciona un estado trigger para disparar automáticamente)
                </span>
              )}
            </div>

            <div className="text-[11px] text-blue-200">
              Estado Mensaje:{' '}
              <strong className="text-white font-mono">
                {testSession?.status || 'NO_CONTACTADO'}
              </strong>{' '}
              ({testSession?.messages.length || 0} msgs)
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Search, Filter Bar and Exclusion Toggle */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, contenedor, cliente, chofer o patente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle de Exclusión Solicitado por el Usuario */}
            <button
              onClick={() => {
                setExcludeNonOperational(!excludeNonOperational);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                excludeNonOperational
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Oculta servicios en Proyección de Carga, Almacenados, En Coordinación y Anulados"
            >
              {excludeNonOperational ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {excludeNonOperational
                  ? 'Ocultando Proyección/Almacenados'
                  : 'Mostrando Todos los Servicios'}
              </span>
            </button>

            {/* Dropdown Estado BIT */}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedServiceState}
                onChange={(e) => {
                  setSelectedServiceState(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="ALL">Todos los Estados ({services.length})</option>
                {serviceStates.map((st) => (
                  <option key={st} value={st}>
                    {st || '(Sin Estado)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informative Sub-header on Active Triggers */}
        <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Triggers Válidos Configurados:
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px] font-semibold text-blue-800">
              CONTENEDOR ENTREGADO A STACKING
            </span>
            <span>o</span>
            <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px] font-semibold text-blue-800">
              EN RUTA A DEVOLVER CONTENEDOR VACIO
            </span>
          </div>

          <span className="text-[11px] text-blue-700">
            {filteredServices.length} servicios en lista operativa
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">ID Servicio</th>
                <th className="py-3 px-4">Contenedor</th>
                <th className="py-3 px-4">Cliente / Mandante</th>
                <th className="py-3 px-4">Proveedor / Chofer</th>
                <th className="py-3 px-4">Estado Servicio BIT</th>
                <th className="py-3 px-4">Estado Mensaje Bot</th>
                <th className="py-3 px-4 text-center">Respaldos (GD / EIR)</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-slate-600">No se encontraron servicios</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {excludeNonOperational
                        ? 'Los servicios en Proyección de Carga, Almacenados y En Coordinación están ocultos. Pulsa "Mostrando Todos los Servicios" para verlos.'
                        : 'Intenta con otros términos de búsqueda o filtros.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service) => {
                  const session = sessions[service.servicioID];
                  const botStatus: BotStatusType = session ? session.status : 'NO_CONTACTADO';
                  const hasGD = service.docGD === 1 || session?.docsReceived?.gd;
                  const hasEIR = service.docEIR === 1 || session?.docsReceived?.eir;
                  const isTrigger = isTriggerState(service.estado);
                  const isTest = service.isTestService;

                  return (
                    <tr
                      key={service.servicioID}
                      className={`transition-colors group cursor-pointer ${
                        isTest
                          ? 'bg-blue-50/50 hover:bg-blue-100/50 font-medium'
                          : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => onSelectService(service)}
                    >
                      {/* ID */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          #{service.servicioID}
                          {isTest && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[10px] font-sans font-bold">
                              PRUEBA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contenedor */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900">
                          {service.contNro || <span className="text-slate-400">S/N</span>}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span>{service.contTipo ? `${service.contTipo}'` : 'STD'}</span>
                          {service.patente && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{service.patente}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Cliente / Mandante */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div
                          className="font-medium text-slate-800 truncate"
                          title={service.cliente}
                        >
                          {service.cliente || 'Sin Cliente'}
                        </div>
                        <div
                          className="text-xs text-slate-400 truncate"
                          title={service.mandante}
                        >
                          Mandante: {service.mandante || '-'}
                        </div>
                      </td>

                      {/* Proveedor / Chofer */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div
                          className="text-slate-800 truncate flex items-center gap-1"
                          title={service.proveedor}
                        >
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {service.proveedor || 'Sin Proveedor Asignado'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{service.chofer || 'Sin chofer'}</span>
                          {service.choferCelular && (
                            <span className="font-mono text-slate-500 ml-1 font-medium">
                              ({service.choferCelular})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado ERP + Badge de Trigger */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${
                              isTrigger
                                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold ring-1 ring-amber-300/50'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isTrigger ? `🎯 ${service.estado}` : service.estado || 'PENDIENTE'}
                          </span>
                          {isTrigger && (
                            <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                              Trigger Válido
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado Bot */}
                      <td className="py-3 px-4">
                        {renderBotStatus(botStatus, session?.retryCount)}
                        {session?.messages && session.messages.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {session.messages.length} mensaje(s) intercambiados
                          </div>
                        )}
                      </td>

                      {/* Respaldos (GD / EIR) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono font-medium ${
                              hasGD
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                            title={
                              hasGD
                                ? 'Guía de Despacho confirmada'
                                : 'Guía de Despacho pendiente'
                            }
                          >
                            {hasGD ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            GD
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono font-medium ${
                              hasEIR
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                            title={hasEIR ? 'EIR confirmado' : 'EIR pendiente'}
                          >
                            {hasEIR ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            EIR
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {botStatus === 'NO_CONTACTADO' ? (
                            <button
                              onClick={() => onDispatchBot(service, false, session?.requiredMode || 'AMBAS')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors shadow-2xs ${
                                isTrigger
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={
                                isTrigger
                                  ? 'Gatillar bot para servicio en estado trigger'
                                  : 'Disparar solicitud de respaldos por WhatsApp'
                              }
                            >
                              <Send className="w-3 h-3" />
                              <span>{isTrigger ? 'Gatillar' : 'Solicitar'}</span>
                            </button>
                          ) : botStatus === 'ESPERANDO_RESPUESTA' ? (
                            <button
                              onClick={() => onDispatchBot(service, true, session?.requiredMode || 'AMBAS')}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                              title="Enviar recordatorio manual"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>Reintentar</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => onSelectService(service)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Abrir chat y detalle del servicio"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-slate-700">
              {filteredServices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, filteredServices.length)}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-slate-700 font-mono">
              {filteredServices.length}
            </span>{' '}
            servicios
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Anterior
            </button>
            <span className="font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
