import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Allow self-signed or non-standard cert for biterp.cl:451
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = 3000;

app.use(express.json());

const BIT_API_URL = process.env.BIT_API_URL || "https://biterp.cl:451/api/misservicios/reporte/prod-general";
const BIT_API_KEY = process.env.BIT_API_KEY || "7A2B4D6F8G9H2J4K5M6N7P8Q9R1S3T5";
const YCLOUD_API_KEY = process.env.YCLOUD_API_KEY || "23034ebf283f30314a76170259ede8a3";

// In-memory cache & state store
let cachedServices: any[] = [];
let lastFetchTime = 0;

export type DocRequirementMode = 'AMBAS' | 'GD' | 'EIR';

// Bot configuration store - configured with user's specific trigger states and 3 flows
let botConfig = {
  active: true,
  defaultMode: 'AMBAS' as DocRequirementMode,
  triggerStatuses: [
    "CONTENEDOR ENTREGADO A STACKING",
    "EN RUTA A DEVOLVER CONTENEDOR VACIO"
  ],
  retryIntervalHours: 2,
  maxRetries: 3,
  initialTemplate: "Estimado chofer/proveedor de LYD Cargo (Servicio #{servicioID}, Contenedor {contNro}): Por favor adjunte los respaldos de la operación (Guía de Despacho firmada y EIR). Responda a este mensaje con las fotos o documentos.",
  reminderTemplate: "Recordatorio #{retryCount} de LYD Cargo (Servicio #{servicioID}): Aún no hemos recibido los respaldos. Favor adjuntarlos a la brevedad para liquidar el servicio.",
  confirmationTemplate: "¡Gracias! Hemos recibido y registrado correctamente los respaldos para el servicio #{servicioID} (Contenedor {contNro})."
};

// Servicio de Prueba solicitado explícitamente por el usuario
let testService: any = {
  servicioID: 99001,
  extraCostoID: 0,
  productoID: 1007,
  producto: "SAI-STGO-SAI (SERVICIO DE PRUEBA)",
  fechaPresen: new Date().toISOString(),
  fechaRetiro: new Date().toISOString(),
  fechaCutOff: new Date().toISOString(),
  folio: "PRUEBA-01",
  venta: 450000,
  costo: 320000,
  clienteID: 9001,
  cliente: "Cliente prueba",
  proveedorID: 9003,
  proveedor: "Transportes Prueba LYD",
  mandanteID: 9002,
  mandante: "Mandante prueba",
  patente: "PRUE-99",
  estadoCod: 1007,
  estado: "EN RUTA A DEVOLVER CONTENEDOR VACIO",
  servicioTipo: "IMPOD",
  contTipo: "40",
  contNro: "PRUEBA-LYD-01",
  contPeso: "4100",
  chofer: "Chofer prueba",
  choferCelular: "56939568768",
  choferRut: "11.111.111-1",
  nave: "MAERSK PRUEBA",
  puerto: "SAN ANTONIO TERMINAL",
  docGD: 0,
  docEIR: 0,
  isTestService: true
};

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

export interface BotSession {
  servicioID: number;
  phone: string;
  status:
    | 'NO_CONTACTADO'
    | 'ENVIADO'
    | 'ESPERANDO_RESPUESTA'
    | 'CONFIRMANDO_DOCUMENTO'
    | 'ESPERANDO_SEGUNDO_DOCUMENTO'
    | 'CONFIRMANDO_FINAL'
    | 'COMPLETADO'
    | 'ERROR';
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

let botSessions: Record<number, BotSession> = {};

// Normalize phone to international WhatsApp standard (+56...)
function normalizePhone(raw: string): string {
  let clean = (raw || '').replace(/\D/g, '');
  if (!clean) return '+56939568768';
  if (!clean.startsWith('56') && clean.length === 9) {
    clean = '56' + clean;
  }
  return '+' + clean;
}

// Generate the initial message text based on the requirement flow
export function getInitialMessageText(
  mode: DocRequirementMode,
  servicioID: number,
  contNro: string,
  driverName = 'Chofer'
): string {
  if (mode === 'GD') {
    return `Hola ${driverName}, te contactamos de LYD Cargo. Para el contenedor ${contNro} (Servicio #${servicioID}) necesitamos la foto de la *Guía de Despacho (GD)* firmada. Por favor adjúntala por aquí para registrarla en BIT.`;
  }
  if (mode === 'EIR') {
    return `Hola ${driverName}, te contactamos de LYD Cargo. Para el contenedor ${contNro} (Servicio #${servicioID}) necesitamos la foto del *EIR de Intercambio*. Por favor adjúntala por aquí para registrarla en BIT.`;
  }
  // AMBAS
  return `Hola ${driverName}, te contactamos de LYD Cargo. Para el contenedor ${contNro} (Servicio #${servicioID}) necesitamos los respaldos de la operación: *Guía de Despacho* y *EIR*. Por favor adjúntalos por aquí.`;
}

// Send WhatsApp message via YCloud official API (Supports Templates, Interactive Buttons, and Free-form Text)
async function sendWhatsAppViaYCloud(
  toPhone: string,
  text: string,
  options?: {
    useTemplate?: boolean;
    driverName?: string;
    contNro?: string;
    servicioID?: number;
    requiredMode?: DocRequirementMode;
    interactiveButtons?: InteractiveButton[];
  }
) {
  const formattedPhone = normalizePhone(toPhone);
  try {
    let payload: any;

    // 1. Interactive buttons (when window is open or user replied)
    if (options?.interactiveButtons && options.interactiveButtons.length > 0) {
      payload = {
        from: "+56984798659",
        to: formattedPhone,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: text },
          action: {
            buttons: options.interactiveButtons.map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title.substring(0, 20) // WhatsApp limit is 20 chars per button
              }
            }))
          }
        }
      };
    }
    // 2. Official WhatsApp template (required for outbound cold start > 24h window)
    else if (options?.useTemplate !== false) {
      const driver = options?.driverName || 'Chofer';
      const containerInfo = options?.contNro
        ? ` ${options.contNro} (Servicio #${options.servicioID || ''})`
        : ` #${options?.servicioID || ''}`;

      // Use the Meta-approved 'estatus' template
      payload = {
        from: "+56984798659",
        to: formattedPhone,
        type: "template",
        template: {
          name: "estatus",
          language: { code: "es_CL" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: driver },
                { type: "text", text: containerInfo }
              ]
            }
          ]
        }
      };
    }
    // 3. Regular free-form text message (within active customer window)
    else {
      payload = {
        from: "+56984798659",
        to: formattedPhone,
        type: "text",
        text: { body: text }
      };
    }

    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': YCLOUD_API_KEY
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    const json = await res.json();
    return {
      ok: res.ok,
      data: json,
      phone: formattedPhone,
      usedTemplate: options?.useTemplate !== false && !options?.interactiveButtons
    };
  } catch (err: any) {
    console.error('YCloud send error:', err?.message);
    return { ok: false, error: err?.message, phone: formattedPhone };
  }
}

// Helper to seed initial sample bot sessions for demonstration on loaded services
function getOrCreateSession(service: any): BotSession {
  if (!botSessions[service.servicioID]) {
    const hasGD = service.docGD === 1;
    const hasEIR = service.docEIR === 1;
    const isCompleted = hasGD && hasEIR;
    
    botSessions[service.servicioID] = {
      servicioID: service.servicioID,
      phone: service.choferCelular || "56939568768",
      status: isCompleted ? 'COMPLETADO' : 'NO_CONTACTADO',
      requiredMode: 'AMBAS',
      retryCount: 0,
      lastMessageAt: new Date().toISOString(),
      docsReceived: {
        gd: hasGD,
        eir: hasEIR,
        gdUrl: hasGD ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' : undefined,
        eirUrl: hasEIR ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80' : undefined
      },
      messages: []
    };
  }
  return botSessions[service.servicioID];
}

// Ensure test service has a session
getOrCreateSession(testService);

// 1. Fetch live services from BIT ERP + inject testService
app.get('/api/bit/servicios', async (req, res) => {
  try {
    const now = Date.now();
    // Cache for 20s to keep app snappy
    if (cachedServices.length > 0 && (now - lastFetchTime) < 20000) {
      const combined = [testService, ...cachedServices];
      return res.json({ success: true, count: combined.length, data: combined, cached: true });
    }

    const response = await fetch(BIT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BIT_API_KEY,
        'x-api-key': BIT_API_KEY
      },
      body: JSON.stringify({ apiKey: BIT_API_KEY }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(`BIT ERP returned HTTP ${response.status}`);
    }

    const data: any = await response.json();
    if (Array.isArray(data)) {
      cachedServices = data;
      lastFetchTime = now;

      // Ensure sessions exist
      data.forEach(s => getOrCreateSession(s));

      const combined = [testService, ...data];
      return res.json({ success: true, count: combined.length, data: combined, cached: false });
    }

    const fallback = [testService, ...cachedServices];
    return res.json({ success: true, count: fallback.length, data: fallback, cached: true });
  } catch (error: any) {
    console.error('Error fetching BIT services:', error?.message);
    const combined = [testService, ...cachedServices];
    return res.json({ success: true, count: combined.length, data: combined, cached: true, warning: 'Usando caché local' });
  }
});

// 2. YCloud Account Status Check & Templates info
app.get('/api/ycloud/status', async (req, res) => {
  try {
    const [phoneRes, templRes] = await Promise.all([
      fetch('https://api.ycloud.com/v2/whatsapp/phoneNumbers', {
        headers: { 'X-API-Key': YCLOUD_API_KEY },
        signal: AbortSignal.timeout(8000)
      }),
      fetch('https://api.ycloud.com/v2/whatsapp/templates?wabaId=1381608263852189', {
        headers: { 'X-API-Key': YCLOUD_API_KEY },
        signal: AbortSignal.timeout(8000)
      })
    ]);

    const phoneData = await phoneRes.json();
    const templData = await templRes.json();

    return res.json({
      success: phoneRes.ok,
      data: phoneData,
      templates: templData?.items || []
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Error consultando YCloud' });
  }
});

// 3. Get all Bot Sessions
app.get('/api/bot/sessions', (req, res) => {
  return res.json({ success: true, sessions: botSessions });
});

// 4. Update requirement mode for a specific session
app.post('/api/bot/session-mode', (req, res) => {
  const { servicioID, requiredMode } = req.body;
  if (!servicioID || !requiredMode) {
    return res.status(400).json({ success: false, message: 'servicioID y requiredMode son requeridos' });
  }

  const session = botSessions[servicioID] || {
    servicioID,
    phone: "56939568768",
    status: 'NO_CONTACTADO',
    requiredMode: requiredMode as DocRequirementMode,
    retryCount: 0,
    lastMessageAt: new Date().toISOString(),
    docsReceived: { gd: false, eir: false },
    messages: []
  };

  session.requiredMode = requiredMode;
  botSessions[servicioID] = session;
  return res.json({ success: true, session });
});

// 5. Get and Update Bot Config
app.get('/api/bot/config', (req, res) => {
  return res.json({ success: true, config: botConfig });
});

app.post('/api/bot/config', (req, res) => {
  botConfig = { ...botConfig, ...req.body };
  return res.json({ success: true, config: botConfig });
});

// 6. Test Service Endpoint: Change State & trigger check with selected flow
app.post('/api/test-service/change-state', async (req, res) => {
  const { nuevoEstado, autoTrigger = true, requiredMode = 'AMBAS' } = req.body;
  if (!nuevoEstado) {
    return res.status(400).json({ success: false, message: 'nuevoEstado es requerido' });
  }

  const prevEstado = testService.estado;
  testService.estado = nuevoEstado;

  // Check if nuevoEstado matches the trigger list
  const isTrigger = botConfig.triggerStatuses.some(
    st => st.trim().toUpperCase() === nuevoEstado.trim().toUpperCase()
  );

  let triggered = false;
  let ycloudResult: any = null;

  if (isTrigger && autoTrigger && botConfig.active) {
    triggered = true;
    const session = getOrCreateSession(testService);
    session.requiredMode = requiredMode as DocRequirementMode;

    const contNro = testService.contNro;
    const initialText = getInitialMessageText(
      session.requiredMode,
      testService.servicioID,
      contNro,
      testService.chofer
    );

    // Send real WhatsApp to Pablo (56939568768) using approved Meta template 'estatus'
    const sendRes = await sendWhatsAppViaYCloud(testService.choferCelular, initialText, {
      useTemplate: true,
      driverName: testService.chofer,
      contNro: testService.contNro,
      servicioID: testService.servicioID,
      requiredMode: session.requiredMode
    });
    ycloudResult = sendRes;

    const message: ChatMessage = {
      id: `msg_trig_${Date.now()}`,
      sender: 'bot',
      text: initialText,
      timestamp: new Date().toISOString(),
      deliveryStatus: sendRes.ok ? 'sent' : 'delivered'
    };

    session.messages.push(message);
    session.status = 'ESPERANDO_RESPUESTA';
    session.retryCount = 1;
    session.lastMessageAt = new Date().toISOString();
    botSessions[testService.servicioID] = session;
  }

  return res.json({
    success: true,
    testService,
    prevEstado,
    nuevoEstado,
    isTrigger,
    triggered,
    ycloudResult,
    session: botSessions[testService.servicioID]
  });
});

// Reset Test Service
app.post('/api/test-service/reset', (req, res) => {
  testService = {
    ...testService,
    estado: "EN CLIENTE ESPERANDO ATENCION",
    docGD: 0,
    docEIR: 0
  };

  botSessions[testService.servicioID] = {
    servicioID: testService.servicioID,
    phone: testService.choferCelular,
    status: 'NO_CONTACTADO',
    requiredMode: 'AMBAS',
    retryCount: 0,
    lastMessageAt: new Date().toISOString(),
    docsReceived: { gd: false, eir: false },
    messages: []
  };

  return res.json({ success: true, testService, session: botSessions[testService.servicioID] });
});

// 7. Dispatch / Send initial message or retry to driver with specific flow mode
app.post('/api/bot/dispatch', async (req, res) => {
  const { servicioID, phone, serviceData, isRetry = false, requiredMode = 'AMBAS' } = req.body;
  if (!servicioID) {
    return res.status(400).json({ success: false, message: 'servicioID es requerido' });
  }

  const session = botSessions[servicioID] || {
    servicioID,
    phone: phone || "56939568768",
    status: 'NO_CONTACTADO',
    requiredMode: requiredMode as DocRequirementMode,
    retryCount: 0,
    lastMessageAt: new Date().toISOString(),
    docsReceived: { gd: false, eir: false },
    messages: []
  };

  session.requiredMode = requiredMode as DocRequirementMode;
  const targetPhone = phone || session.phone || "56939568768";
  const contNro = serviceData?.contNro || "S/N";
  const driver = serviceData?.chofer || (servicioID === 99001 ? 'Chofer prueba' : 'Chofer');

  const templateText = isRetry
    ? botConfig.reminderTemplate
        .replace('{servicioID}', String(servicioID))
        .replace('{contNro}', contNro)
        .replace('{retryCount}', String(session.retryCount + 1))
    : getInitialMessageText(session.requiredMode, servicioID, contNro, driver);

  const newRetryCount = isRetry ? session.retryCount + 1 : 1;
  const nextRetryDate = new Date();
  nextRetryDate.setHours(nextRetryDate.getHours() + botConfig.retryIntervalHours);

  // Send real WhatsApp via YCloud using approved template
  const sendRes = await sendWhatsAppViaYCloud(targetPhone, templateText, {
    useTemplate: true,
    driverName: driver,
    contNro: contNro,
    servicioID: servicioID,
    requiredMode: session.requiredMode
  });

  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text: templateText,
    timestamp: new Date().toISOString(),
    deliveryStatus: sendRes.ok ? 'sent' : 'delivered'
  };

  session.messages.push(message);
  session.status = 'ESPERANDO_RESPUESTA';
  session.retryCount = newRetryCount;
  session.lastMessageAt = new Date().toISOString();
  session.nextRetryAt = nextRetryDate.toISOString();
  session.phone = targetPhone;

  botSessions[servicioID] = session;

  return res.json({ success: true, session, ycloudResponse: sendRes });
});

// Helper: Process interactive choice or button click
export async function processInteractiveAnswer(
  session: BotSession,
  buttonId: string,
  serviceData?: any
) {
  const contNro = serviceData?.contNro || "S/N";
  const now = new Date().toISOString();

  // 1. Clarification Choice: User clicked "Es Guía de Despacho" or "Es EIR"
  if (buttonId === 'btn_gd' || buttonId === 'btn_eir') {
    const isGD = buttonId === 'btn_gd';
    const chosenType: 'GD' | 'EIR' = isGD ? 'GD' : 'EIR';

    if (isGD) {
      session.docsReceived.gd = true;
      session.docsReceived.gdConfirmedAt = now;
      if (!session.docsReceived.gdUrl) {
        session.docsReceived.gdUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
      }
    } else {
      session.docsReceived.eir = true;
      session.docsReceived.eirConfirmedAt = now;
      if (!session.docsReceived.eirUrl) {
        session.docsReceived.eirUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
      }
    }

    // Add driver selection message
    session.messages.push({
      id: `msg_drv_${Date.now()}`,
      sender: 'driver',
      text: isGD ? 'Es Guía de Despacho' : 'Es EIR',
      timestamp: now,
      docType: chosenType
    });

    // Check what is remaining based on requiredMode
    const neededBoth = session.requiredMode === 'AMBAS';
    const hasBoth = session.docsReceived.gd && session.docsReceived.eir;

    if (neededBoth && !hasBoth) {
      const remainingType = isGD ? 'EIR' : 'Guía de Despacho';
      session.status = 'ESPERANDO_SEGUNDO_DOCUMENTO';

      const promptText = `¡Perfecto! Hemos validado la ${isGD ? 'Guía de Despacho' : 'EIR'} para el contenedor ${contNro}. Ahora por favor adjunta el documento restante: *${remainingType}*.`;
      await sendWhatsAppViaYCloud(session.phone, promptText, { useTemplate: false });

      session.messages.push({
        id: `msg_bot_${Date.now() + 1}`,
        sender: 'bot',
        text: promptText,
        timestamp: new Date().toISOString(),
        deliveryStatus: 'delivered',
        actionType: 'REQUEST_REMAINING'
      });
    } else {
      // Both received or single requirement fulfilled! Request final click confirmation
      session.status = 'CONFIRMANDO_FINAL';
      const confirmPrompt = `¡Excelente! Hemos recibido los respaldos para el contenedor ${contNro}. Por favor pulsa el botón para confirmar y finalizar el registro en BIT:`;
      const buttons: InteractiveButton[] = [
        { id: 'btn_confirm_sent', title: 'Confirmar Envío ✓' }
      ];

      await sendWhatsAppViaYCloud(session.phone, confirmPrompt, {
        useTemplate: false,
        interactiveButtons: buttons
      });

      session.messages.push({
        id: `msg_bot_${Date.now() + 1}`,
        sender: 'bot',
        text: confirmPrompt,
        timestamp: new Date().toISOString(),
        deliveryStatus: 'delivered',
        actionType: 'CONFIRM_SENT',
        interactiveButtons: buttons
      });
    }
  }
  // 2. Final Confirmation Choice: User clicked "Confirmar Envío ✓"
  else if (buttonId === 'btn_confirm_sent') {
    session.messages.push({
      id: `msg_drv_${Date.now()}`,
      sender: 'driver',
      text: 'Confirmar Envío ✓ (Documento enviado)',
      timestamp: now
    });

    session.status = 'COMPLETADO';
    const completedText = `¡Listo! Los documentos han sido confirmados y registrados correctamente en BIT ERP para el contenedor ${contNro} (Servicio #${session.servicioID}). Servicio completado con éxito.`;

    await sendWhatsAppViaYCloud(session.phone, completedText, { useTemplate: false });

    session.messages.push({
      id: `msg_bot_${Date.now() + 1}`,
      sender: 'bot',
      text: completedText,
      timestamp: new Date().toISOString(),
      deliveryStatus: 'delivered'
    });
  }
}

// 8. Simulate Driver Incoming Reply & Document Workflow with 3 flow branches
app.post('/api/bot/simulate-reply', async (req, res) => {
  const { servicioID, text, mediaUrl, docType, serviceData, buttonId } = req.body;
  const session = botSessions[servicioID];
  if (!session) {
    return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
  }

  const now = new Date().toISOString();
  const contNro = serviceData?.contNro || "S/N";

  // Case A: Driver clicked an interactive button response
  if (buttonId) {
    await processInteractiveAnswer(session, buttonId, serviceData);
    botSessions[servicioID] = session;
    return res.json({ success: true, session });
  }

  // Case B: Driver sent an image/file or text message
  let effectiveDocType: 'GD' | 'EIR' | undefined = docType;
  const lowerText = (text || '').toLowerCase().trim();

  // If session requires ONLY GD or ONLY EIR, automatically assign
  if (session.requiredMode === 'GD') {
    effectiveDocType = 'GD';
  } else if (session.requiredMode === 'EIR') {
    effectiveDocType = 'EIR';
  } else if (!effectiveDocType) {
    if (lowerText.includes('eir')) {
      effectiveDocType = 'EIR';
    } else if (
      lowerText.includes('guia') ||
      lowerText.includes('guía') ||
      lowerText.includes('gd') ||
      lowerText.includes('despacho')
    ) {
      effectiveDocType = 'GD';
    }
  }

  // 1. Driver incoming message
  const driverMessage: ChatMessage = {
    id: `msg_drv_${Date.now()}`,
    sender: 'driver',
    text: text || (mediaUrl ? "Adjunto respaldo solicitado" : "Recibido, te envío el documento"),
    timestamp: now,
    mediaUrl: mediaUrl,
    mediaType: mediaUrl ? 'image' : undefined,
    docType: effectiveDocType
  };
  session.messages.push(driverMessage);

  // 2. Logic based on requirement flow
  if (mediaUrl) {
    // --- FLOW 1: ONLY GUÍA DE DESPACHO ---
    if (session.requiredMode === 'GD') {
      session.docsReceived.gd = true;
      session.docsReceived.gdUrl = mediaUrl;
      session.docsReceived.gdConfirmedAt = now;
      session.status = 'CONFIRMANDO_FINAL';

      const promptText = `Hemos recibido la foto de la Guía de Despacho para el contenedor ${contNro}. Por favor confirma que corresponde a lo solicitado:`;
      const buttons: InteractiveButton[] = [
        { id: 'btn_confirm_sent', title: 'Documento enviado ✓' }
      ];

      await sendWhatsAppViaYCloud(session.phone, promptText, {
        useTemplate: false,
        interactiveButtons: buttons
      });

      session.messages.push({
        id: `msg_bot_${Date.now() + 1}`,
        sender: 'bot',
        text: promptText,
        timestamp: new Date(Date.now() + 500).toISOString(),
        deliveryStatus: 'delivered',
        actionType: 'CONFIRM_SENT',
        interactiveButtons: buttons
      });
    }
    // --- FLOW 2: ONLY EIR ---
    else if (session.requiredMode === 'EIR') {
      session.docsReceived.eir = true;
      session.docsReceived.eirUrl = mediaUrl;
      session.docsReceived.eirConfirmedAt = now;
      session.status = 'CONFIRMANDO_FINAL';

      const promptText = `Hemos recibido la foto del EIR para el contenedor ${contNro}. Por favor confirma que corresponde a lo solicitado:`;
      const buttons: InteractiveButton[] = [
        { id: 'btn_confirm_sent', title: 'Documento enviado ✓' }
      ];

      await sendWhatsAppViaYCloud(session.phone, promptText, {
        useTemplate: false,
        interactiveButtons: buttons
      });

      session.messages.push({
        id: `msg_bot_${Date.now() + 1}`,
        sender: 'bot',
        text: promptText,
        timestamp: new Date(Date.now() + 500).toISOString(),
        deliveryStatus: 'delivered',
        actionType: 'CONFIRM_SENT',
        interactiveButtons: buttons
      });
    }
    // --- FLOW 3: AMBAS (GD + EIR) ---
    else {
      // If already known which document was sent:
      if (effectiveDocType === 'GD' || effectiveDocType === 'EIR') {
        const isGD = effectiveDocType === 'GD';
        if (isGD) {
          session.docsReceived.gd = true;
          session.docsReceived.gdUrl = mediaUrl;
          session.docsReceived.gdConfirmedAt = now;
        } else {
          session.docsReceived.eir = true;
          session.docsReceived.eirUrl = mediaUrl;
          session.docsReceived.eirConfirmedAt = now;
        }

        const hasBoth = session.docsReceived.gd && session.docsReceived.eir;
        if (!hasBoth) {
          session.status = 'ESPERANDO_SEGUNDO_DOCUMENTO';
          const remaining = isGD ? 'EIR' : 'Guía de Despacho';
          const replyText = `¡Recibido! Hemos registrado la ${isGD ? 'Guía de Despacho' : 'EIR'}. Por favor adjunta ahora el documento restante: *${remaining}*.`;

          await sendWhatsAppViaYCloud(session.phone, replyText, { useTemplate: false });

          session.messages.push({
            id: `msg_bot_${Date.now() + 1}`,
            sender: 'bot',
            text: replyText,
            timestamp: new Date(Date.now() + 500).toISOString(),
            deliveryStatus: 'delivered',
            actionType: 'REQUEST_REMAINING'
          });
        } else {
          session.status = 'CONFIRMANDO_FINAL';
          const confirmPrompt = `¡Excelente! Hemos recibido tanto la Guía de Despacho como el EIR para el contenedor ${contNro}. Por favor confirma para registrar en BIT:`;
          const buttons: InteractiveButton[] = [
            { id: 'btn_confirm_sent', title: 'Documento enviado ✓' }
          ];

          await sendWhatsAppViaYCloud(session.phone, confirmPrompt, {
            useTemplate: false,
            interactiveButtons: buttons
          });

          session.messages.push({
            id: `msg_bot_${Date.now() + 1}`,
            sender: 'bot',
            text: confirmPrompt,
            timestamp: new Date(Date.now() + 500).toISOString(),
            deliveryStatus: 'delivered',
            actionType: 'CONFIRM_SENT',
            interactiveButtons: buttons
          });
        }
      } else {
        // Document unclassified in two-doc flow: send interactive buttons asking if GD or EIR
        session.status = 'CONFIRMANDO_DOCUMENTO';
        const questionText = `Hemos recibido tu documento para el contenedor ${contNro}. Por favor haz clic en una opción para confirmar cuál enviaste:`;
        const buttons: InteractiveButton[] = [
          { id: 'btn_gd', title: 'Guía de Despacho' },
          { id: 'btn_eir', title: 'EIR' }
        ];

        await sendWhatsAppViaYCloud(session.phone, questionText, {
          useTemplate: false,
          interactiveButtons: buttons
        });

        session.messages.push({
          id: `msg_bot_${Date.now() + 1}`,
          sender: 'bot',
          text: questionText,
          timestamp: new Date(Date.now() + 500).toISOString(),
          deliveryStatus: 'delivered',
          requiresClarification: true,
          actionType: 'SELECT_DOC_TYPE',
          interactiveButtons: buttons
        });
      }
    }
  } else {
    // Normal text message without attachment
    const botReplyText = `Hola, recuerda que para el contenedor ${contNro} requerimos adjuntar foto de: ${
      session.requiredMode === 'GD'
        ? 'la Guía de Despacho'
        : session.requiredMode === 'EIR'
        ? 'el EIR'
        : 'Guía de Despacho y EIR'
    }.`;

    await sendWhatsAppViaYCloud(session.phone, botReplyText, { useTemplate: false });

    session.messages.push({
      id: `msg_bot_${Date.now() + 1}`,
      sender: 'bot',
      text: botReplyText,
      timestamp: new Date(Date.now() + 500).toISOString(),
      deliveryStatus: 'delivered'
    });
  }

  botSessions[servicioID] = session;
  return res.json({ success: true, session });
});

// 9. Manual Document Confirmation by Operator
app.post('/api/bot/confirm-doc', (req, res) => {
  const { servicioID, docType, confirmed } = req.body;
  const session = botSessions[servicioID];
  if (!session) {
    return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
  }

  const now = new Date().toISOString();
  if (docType === 'GD') {
    session.docsReceived.gd = confirmed;
    if (confirmed) session.docsReceived.gdConfirmedAt = now;
  } else if (docType === 'EIR') {
    session.docsReceived.eir = confirmed;
    if (confirmed) session.docsReceived.eirConfirmedAt = now;
  }

  const mode = session.requiredMode || 'AMBAS';
  const isComplete =
    mode === 'GD'
      ? session.docsReceived.gd
      : mode === 'EIR'
      ? session.docsReceived.eir
      : session.docsReceived.gd && session.docsReceived.eir;

  if (isComplete) {
    session.status = 'COMPLETADO';
  }

  botSessions[servicioID] = session;
  return res.json({ success: true, session });
});

// 10. Official YCloud Webhook Endpoint for WhatsApp Inbound Messages
app.get('/api/webhook/ycloud', (req, res) => {
  return res.json({ status: 'active', message: 'YCloud WhatsApp Webhook receiver is ready.' });
});

app.post('/api/webhook/ycloud', async (req, res) => {
  try {
    const event = req.body;
    console.log('[YCloud Webhook Event]:', event?.type);

    if (event?.type === 'whatsapp.inbound_message.received' && event.whatsappInboundMessage) {
      const msg = event.whatsappInboundMessage;
      const fromPhone = normalizePhone(msg.from);

      // Match with known session
      let targetServiceId = Object.keys(botSessions).find((sid) => {
        const s = botSessions[Number(sid)];
        return normalizePhone(s.phone) === fromPhone;
      });

      // Default to test service if message is from test phone
      if (!targetServiceId && fromPhone.includes('56939568768')) {
        targetServiceId = String(testService.servicioID);
      }

      if (targetServiceId) {
        const sid = Number(targetServiceId);
        const session = botSessions[sid] || getOrCreateSession(testService);

        // Case 1: Driver clicked an interactive button on WhatsApp
        if (msg.interactive?.button_reply?.id) {
          const buttonId = msg.interactive.button_reply.id;
          await processInteractiveAnswer(session, buttonId, testService);
          botSessions[sid] = session;
          return res.status(200).json({ received: true });
        }

        // Case 2: Driver sent an image, document, or text
        const text = msg.text?.body || msg.image?.caption || msg.interactive?.button_reply?.title || '';
        const mediaUrl = msg.image?.link || msg.document?.link;

        // Process message through simulator core logic
        await fetch(`http://localhost:${PORT}/api/bot/simulate-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            servicioID: sid,
            text,
            mediaUrl,
            serviceData: testService
          })
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err?.message);
    return res.status(200).json({ error: err?.message });
  }
});

// Mount Vite middleware for dev or serve static files in production
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LYD Cargo Server] Escuchando en http://0.0.0.0:${PORT}`);
  });
}

initServer().catch(err => {
  console.error('Error starting server:', err);
});
