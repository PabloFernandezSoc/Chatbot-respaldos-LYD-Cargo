import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from './services/api';
import { ServicioBIT, BotSession, BotConfig, YCloudStatus, DocRequirementMode } from './types';
import { TopNav } from './components/TopNav';
import { KPICards } from './components/KPICards';
import { ServiceTable } from './components/ServiceTable';
import { ServiceDetailDrawer } from './components/ServiceDetailDrawer';
import { BotConfigView } from './components/BotConfigView';
import { AuditLogsView } from './components/AuditLogsView';
import { InteractiveSimulatorView } from './components/InteractiveSimulatorView';
import { DocumentModal } from './components/DocumentModal';
import { CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'servicios' | 'reglas' | 'logs' | 'simulador'>('servicios');
  const [services, setServices] = useState<ServicioBIT[]>([]);
  const [sessions, setSessions] = useState<Record<number, BotSession>>({});
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [ycloudStatus, setYcloudStatus] = useState<YCloudStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active filters and modal states
  const [activeKpiFilter, setActiveKpiFilter] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<ServicioBIT | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [srvRes, sessRes, cfgRes, ycRes] = await Promise.all([
        api.getServices(),
        api.getSessions(),
        api.getConfig(),
        api.getYCloudStatus(),
      ]);

      if (srvRes.data && srvRes.data.length > 0) {
        setServices(srvRes.data);
      }
      setSessions(sessRes || {});
      if (cfgRes) setConfig(cfgRes);
      if (ycRes) setYcloudStatus(ycRes);

      showToast(
        srvRes.cached
          ? `Cargados ${srvRes.count} servicios desde BIT ERP (incluye Servicio de Prueba)`
          : `Sincronizados ${srvRes.count} servicios en vivo desde BIT ERP`,
        'success'
      );
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      showToast('Error al conectar con los servicios de BIT ERP', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Available unique statuses in BIT
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.estado) set.add(s.estado);
    });
    return Array.from(set);
  }, [services]);

  const activeTriggers = useMemo(() => {
    return (
      config?.triggerStatuses || [
        'CONTENEDOR ENTREGADO A STACKING',
        'EN RUTA A DEVOLVER CONTENEDOR VACIO',
      ]
    );
  }, [config]);

  // Compute KPI counts (only considering operational services)
  const kpiStats = useMemo(() => {
    let completed = 0;
    let waiting = 0;
    let retrying = 0;
    let uncontacted = 0;

    services.forEach((s) => {
      const sess = sessions[s.servicioID];
      const isDocDone =
        (s.docGD === 1 && s.docEIR === 1) ||
        sess?.status === 'COMPLETED' ||
        sess?.status === 'COMPLETADO';

      if (isDocDone) {
        completed++;
      } else if (
        sess?.status === 'ESPERANDO_RESPUESTA' ||
        sess?.status === 'CONFIRMANDO_DOCUMENTO'
      ) {
        waiting++;
        if (sess.retryCount > 1) {
          retrying++;
        }
      } else if (!sess || sess.status === 'NO_CONTACTADO') {
        uncontacted++;
      }
    });

    return {
      total: services.length,
      completed,
      waiting,
      uncontacted,
      retrying,
    };
  }, [services, sessions]);

  // Dispatch bot
  const handleDispatchBot = async (
    service: ServicioBIT,
    isRetry = false,
    mode: DocRequirementMode = 'AMBAS'
  ) => {
    try {
      const res = await api.dispatchBot(
        service.servicioID,
        service.choferCelular,
        service,
        isRetry,
        mode
      );
      if (res.success && res.session) {
        setSessions((prev) => ({
          ...prev,
          [service.servicioID]: res.session,
        }));
        showToast(
          isRetry
            ? `Recordatorio #${res.session.retryCount} enviado vía WhatsApp a ${service.chofer || 'Chofer'} (+${service.choferCelular})`
            : `Solicitud de respaldos (${mode}) enviada vía WhatsApp a +${service.choferCelular} para contenedor ${service.contNro || service.servicioID}`,
          'success'
        );
      }
    } catch (err) {
      showToast('Error al disparar el mensaje vía YCloud WhatsApp', 'error');
    }
  };

  // Update session requirement mode
  const handleUpdateMode = async (servicioID: number, mode: DocRequirementMode) => {
    try {
      const res = await api.updateServiceMode(servicioID, mode);
      if (res.success && res.session) {
        setSessions((prev) => ({
          ...prev,
          [servicioID]: res.session,
        }));
        showToast(`Flujo de respaldos actualizado a: ${mode === 'AMBAS' ? 'Guía + EIR' : mode === 'GD' ? 'Solo Guía' : 'Solo EIR'}`, 'info');
      }
    } catch (err) {
      showToast('Error al actualizar el flujo del servicio', 'error');
    }
  };

  // Change Test Service State & trigger verification
  const handleChangeTestState = async (nuevoEstado: string, mode: DocRequirementMode = 'AMBAS') => {
    try {
      const res = await api.changeTestServiceState(nuevoEstado, true);
      if (res.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.isTestService || s.servicioID === 99001
              ? { ...s, estado: nuevoEstado }
              : s
          )
        );
        if (res.session) {
          setSessions((prev) => ({
            ...prev,
            [res.testService.servicioID]: res.session,
          }));
        }

        if (res.triggered) {
          showToast(
            `🎯 ¡Trigger detectado! Estado "${nuevoEstado}" gatilló el bot. WhatsApp enviado a Pablo (+56 9 3956 8768).`,
            'success'
          );
        } else {
          showToast(
            `Estado del servicio de prueba cambiado a "${nuevoEstado}" (Sin trigger).`,
            'info'
          );
        }
      }
    } catch (err) {
      showToast('Error al cambiar estado del servicio de prueba', 'error');
    }
  };

  // Reset Test Service
  const handleResetTest = async () => {
    try {
      const res = await api.resetTestService();
      if (res.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.isTestService || s.servicioID === 99001 ? res.testService : s
          )
        );
        setSessions((prev) => ({
          ...prev,
          [res.testService.servicioID]: res.session,
        }));
        showToast('Servicio de prueba reiniciado para nuevas pruebas', 'info');
      }
    } catch (err) {
      showToast('Error al reiniciar servicio de prueba', 'error');
    }
  };

  // Simulate driver reply
  const handleSimulateReply = async (
    servicioID: number,
    payload: {
      text?: string;
      mediaUrl?: string;
      docType?: 'GD' | 'EIR';
      buttonId?: string;
      serviceData?: ServicioBIT;
    }
  ) => {
    try {
      const res = await api.simulateReply(servicioID, payload);
      if (res.success && res.session) {
        setSessions((prev) => ({
          ...prev,
          [servicioID]: res.session,
        }));

        if (res.session.status === 'COMPLETADO') {
          showToast(
            `¡Respaldos completos! Servicio #${servicioID} sincronizado con BIT ERP`,
            'success'
          );
        }
      }
    } catch (err) {
      showToast('Error al procesar la respuesta', 'error');
    }
  };

  // Manual document confirmation
  const handleConfirmDoc = async (
    servicioID: number,
    docType: 'GD' | 'EIR',
    confirmed: boolean
  ) => {
    try {
      const res = await api.confirmDoc(servicioID, docType, confirmed);
      if (res.success && res.session) {
        setSessions((prev) => ({
          ...prev,
          [servicioID]: res.session,
        }));
        showToast(
          `${docType === 'GD' ? 'Guía de Despacho' : 'EIR'} validada manualmente para el servicio #${servicioID}`,
          'success'
        );
      }
    } catch (err) {
      showToast('Error al validar el documento', 'error');
    }
  };

  // Save Bot Config
  const handleSaveConfig = async (updated: Partial<BotConfig>) => {
    try {
      const saved = await api.updateConfig(updated);
      if (saved) {
        setConfig(saved);
        showToast('Configuración y reglas del bot actualizadas', 'success');
      }
    } catch (err) {
      showToast('Error al guardar la configuración', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onRefresh={loadData}
        loading={loading}
        ycloudStatus={ycloudStatus}
        totalServices={services.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast alert banner */}
        {toastMessage && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              ) : toastMessage.type === 'info' ? (
                <Zap className="w-4 h-4 text-blue-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Routing */}
        {currentTab === 'servicios' && (
          <section className="space-y-4">
            {/* KPI Cards */}
            <KPICards
              total={kpiStats.total}
              completed={kpiStats.completed}
              waiting={kpiStats.waiting}
              uncontacted={kpiStats.uncontacted}
              retrying={kpiStats.retrying}
              activeFilter={activeKpiFilter}
              onFilterChange={setActiveKpiFilter}
            />

            {/* Service Table */}
            <ServiceTable
              services={services}
              sessions={sessions}
              triggerStatuses={activeTriggers}
              onSelectService={(s) => setSelectedService(s)}
              onDispatchBot={handleDispatchBot}
              onUpdateMode={handleUpdateMode}
              onChangeTestState={handleChangeTestState}
              onResetTest={handleResetTest}
              activeStatusFilter={activeKpiFilter}
              onStatusFilterChange={setActiveKpiFilter}
            />
          </section>
        )}

        {currentTab === 'reglas' && (
          <BotConfigView
            config={config}
            onSaveConfig={handleSaveConfig}
            availableStates={availableStates}
            ycloudStatus={ycloudStatus}
          />
        )}

        {currentTab === 'logs' && (
          <AuditLogsView
            sessions={sessions}
            services={services}
            onSelectService={(s) => {
              setSelectedService(s);
              setCurrentTab('servicios');
            }}
            onDispatchRetry={(s) => handleDispatchBot(s, true)}
          />
        )}

        {currentTab === 'simulador' && (
          <InteractiveSimulatorView
            services={services}
            sessions={sessions}
            onDispatch={handleDispatchBot}
            onUpdateMode={handleUpdateMode}
            onSimulateReply={handleSimulateReply}
            onOpenDrawer={(s) => setSelectedService(s)}
          />
        )}
      </main>

      {/* Drawer Lateral de Detalle y Chat en Vivo */}
      {selectedService && (
        <ServiceDetailDrawer
          service={selectedService}
          session={sessions[selectedService.servicioID] || null}
          onClose={() => setSelectedService(null)}
          onDispatch={handleDispatchBot}
          onUpdateMode={handleUpdateMode}
          onSimulateReply={handleSimulateReply}
          onConfirmDoc={handleConfirmDoc}
          onOpenDocPreview={(url, title) => setPreviewDoc({ url, title })}
        />
      )}

      {/* Visor de Documentos */}
      {previewDoc && (
        <DocumentModal
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
