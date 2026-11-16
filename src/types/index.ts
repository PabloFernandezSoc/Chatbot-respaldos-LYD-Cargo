export interface ServicioBIT {
  servicioID: number;
  extraCostoID?: number;
  productoID?: number;
  producto: string;
  fechaPresen?: string;
  fechaRetiro?: string;
  fechaCutOff?: string;
  folio?: string;
  venta?: number;
  costo?: number;
  clienteID: number;
  cliente: string;
  proveedorID?: number;
  proveedor: string;
  mandanteID?: number;
  mandante: string;
  patenteID?: number;
  patente: string;
  semana?: number;
  periodo?: number;
  unegocioID?: number;
  unegocio?: string;
  estadoCod?: number;
  estadoSgteCod?: number;
  estado: string;
  estadoSgte?: string;
  servicioTipo?: string;
  inPlanta?: string;
  outPlanta?: string;
  planta?: string;
  modalidad?: string;
  comentario?: string;
  contTipo?: string;
  contNro: string;
  contPeso?: string;
  contSello?: string;
  contTara?: string;
  chofer: string;
  choferCelular: string;
  choferRut?: string;
  nave?: string;
  puerto?: string;
  devVacio?: string;
  referencia?: string;
  docGD: number;
  docEIR: number;
  docST?: number;
  docOC?: number;
  docOtro?: number;
  eta?: string;
  tieneLink?: number;
  linkGPS?: string;
  familia?: string;
  isTestService?: boolean;
}

export type DocRequirementMode = 'AMBAS' | 'GD' | 'EIR';

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'driver' | 'system';
  text: string;
  timestamp: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  mediaType?: 'image' | 'pdf';
  docType?: 'GD' | 'EIR';
  requiresClarification?: boolean;
  interactiveButtons?: InteractiveButton[];
  actionType?: 'SELECT_DOC_TYPE' | 'CONFIRM_SENT' | 'REQUEST_REMAINING';
}

export type BotStatusType = 
  | 'NO_CONTACTADO' 
  | 'ENVIADO' 
  | 'ESPERANDO_RESPUESTA' 
  | 'CONFIRMANDO_DOCUMENTO' 
  | 'ESPERANDO_SEGUNDO_DOCUMENTO'
  | 'CONFIRMANDO_FINAL'
  | 'COMPLETADO' 
  | 'COMPLETED'
  | 'ERROR';

export interface BotSession {
  servicioID: number;
  phone: string;
  status: BotStatusType;
  requiredMode: DocRequirementMode;
  retryCount: number;
  lastMessageAt: string;
  nextRetryAt?: string;
  docsReceived: {
    gd: boolean;
    gdUrl?: string;
    gdConfirmedAt?: string;
    eir: boolean;
    eirUrl?: string;
    eirConfirmedAt?: string;
  };
  messages: ChatMessage[];
  lastError?: string;
}

export interface BotConfig {
  active: boolean;
  defaultMode: DocRequirementMode;
  triggerStatuses: string[];
  retryIntervalHours: number;
  maxRetries: number;
  initialTemplate: string;
  reminderTemplate: string;
  confirmationTemplate: string;
}

export interface YCloudStatus {
  phoneNumber?: string;
  verifiedName?: string;
  status?: string;
  qualityRating?: string;
  displayPhoneNumber?: string;
}

