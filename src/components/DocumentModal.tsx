import React from 'react';
import { X, ExternalLink, Download, CheckCircle } from 'lucide-react';

interface DocumentModalProps {
  url: string | null;
  title: string;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ url, title, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">Respaldo operativo validado en BIT ERP</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[300px]">
          <img
            src={url}
            alt={title}
            className="max-h-[65vh] object-contain rounded-lg shadow-sm border border-slate-300"
          />
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Documento legible y validado
          </span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir original
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 font-medium"
            >
              Cerrar visor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
