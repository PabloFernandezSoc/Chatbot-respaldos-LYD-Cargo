import React, { useState } from 'react';
import { BotSession, ServicioBIT } from '../types';
import { Send, CheckCircle2, MessageSquare, AlertCircle, Phone, Search, RotateCw } from 'lucide-react';

interface AuditLogsViewProps {
  sessions: Record<number, BotSession>;
  services: ServicioBIT[];
  onSelectService: (service: ServicioBIT) => void;
  onDispatchRetry: (service: ServicioBIT) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  sessions,
  services,
  onSelectService,
  onDispatchRetry,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Extract all messages flattened with their parent service
  const serviceMap = new Map<number, ServicioBIT>();
  services.forEach((s) => serviceMap.set(s.servicioID, s));

  const allActivity = Object.values(sessions).flatMap((session) => {
    const srv = serviceMap.get(session.servicioID);
    return session.messages.map((msg) => ({
      ...msg,
      servicioID: session.servicioID,
      phone: session.phone,
      service: srv,
      sessionStatus: session.status,
      retryCount: session.retryCount,
    }));
  });

  // Sort descending by timestamp
  allActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredLogs = allActivity.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      String(item.servicioID).includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      (item.service?.contNro || '').toLowerCase().includes(q) ||
      (item.service?.cliente || '').toLowerCase().includes(q) ||
      item.text.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Auditoría de Mensajería WhatsApp (YCloud Gateway)
          </h2>
          <p className="text-xs text-slate-500">
            Registro cronológico de solicitudes, respuestas de choferes, fotos recibidas y confirmaciones.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por servicio, fono, texto..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">Fecha y Hora</th>
                <th className="py-2.5 px-4">Servicio / Contenedor</th>
                <th className="py-2.5 px-4">Destinatario</th>
                <th className="py-2.5 px-4">Emisor</th>
                <th className="py-2.5 px-4">Mensaje / Evento</th>
                <th className="py-2.5 px-4 text-center">Estado Entrega</th>
                <th className="py-2.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay registros de mensajes aún. Dispara el bot en la pestaña "Servicios BIT".
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isBot = log.sender === 'bot';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          #{log.servicioID}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {log.service?.contNro || 'S/N'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {log.phone || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-medium ${
                            isBot
                              ? 'bg-slate-900 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isBot ? 'Bot LYD' : 'Chofer'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <p className="line-clamp-2 text-slate-800">{log.text}</p>
                        {log.mediaUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-medium mt-0.5">
                            📎 Adjuntó imagen / archivo
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {log.deliveryStatus === 'read' ? (
                          <span className="text-blue-600 font-medium">Leído ✓✓</span>
                        ) : log.deliveryStatus === 'delivered' ? (
                          <span className="text-slate-600 font-medium">Entregado ✓✓</span>
                        ) : log.deliveryStatus === 'sent' ? (
                          <span className="text-slate-500 font-medium">Enviado ✓</span>
                        ) : log.deliveryStatus === 'failed' ? (
                          <span className="text-rose-600 font-bold">Falló ✗</span>
                        ) : (
                          <span className="text-slate-400">En cola</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {log.service && (
                          <button
                            onClick={() => onSelectService(log.service!)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            Ver Chat
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
