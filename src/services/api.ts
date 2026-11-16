import { ServicioBIT, BotSession, BotConfig, YCloudStatus } from '../types';

export const api = {
  async getServices(): Promise<{ success: boolean; data: ServicioBIT[]; count: number; cached?: boolean }> {
    try {
      const res = await fetch('/api/bit/servicios');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('API getServices error:', err);
      return { success: false, data: [], count: 0 };
    }
  },

  async getSessions(): Promise<Record<number, BotSession>> {
    try {
      const res = await fetch('/api/bot/sessions');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.sessions || {};
    } catch (err) {
      console.warn('API getSessions error:', err);
      return {};
    }
  },

  async getConfig(): Promise<BotConfig | null> {
    try {
      const res = await fetch('/api/bot/config');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.config;
    } catch (err) {
      console.warn('API getConfig error:', err);
      return null;
    }
  },

  async updateConfig(config: Partial<BotConfig>): Promise<BotConfig | null> {
    try {
      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.config;
    } catch (err) {
      console.warn('API updateConfig error:', err);
      return null;
    }
  },

  async dispatchBot(
    servicioID: number,
    phone?: string,
    serviceData?: ServicioBIT,
    isRetry = false,
    requiredMode: 'AMBAS' | 'GD' | 'EIR' = 'AMBAS'
  ): Promise<{ success: boolean; session: BotSession; ycloudResponse?: any }> {
    const res = await fetch('/api/bot/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicioID, phone, serviceData, isRetry, requiredMode }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async updateServiceMode(
    servicioID: number,
    requiredMode: 'AMBAS' | 'GD' | 'EIR'
  ): Promise<{ success: boolean; session: BotSession }> {
    const res = await fetch('/api/bot/session-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicioID, requiredMode }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async simulateReply(
    servicioID: number,
    payload: {
      text?: string;
      mediaUrl?: string;
      docType?: 'GD' | 'EIR';
      buttonId?: string;
      serviceData?: ServicioBIT;
    }
  ): Promise<{ success: boolean; session: BotSession }> {
    const res = await fetch('/api/bot/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicioID, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async confirmDoc(
    servicioID: number,
    docType: 'GD' | 'EIR',
    confirmed: boolean
  ): Promise<{ success: boolean; session: BotSession }> {
    const res = await fetch('/api/bot/confirm-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicioID, docType, confirmed }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async getYCloudStatus(): Promise<YCloudStatus | null> {
    try {
      const res = await fetch('/api/ycloud/status');
      if (!res.ok) return null;
      const json = await res.json();
      if (json.data?.items && json.data.items.length > 0) {
        return json.data.items[0];
      }
      return null;
    } catch (err) {
      return null;
    }
  },

  async changeTestServiceState(nuevoEstado: string, autoTrigger = true): Promise<{
    success: boolean;
    testService: ServicioBIT;
    prevEstado: string;
    nuevoEstado: string;
    isTrigger: boolean;
    triggered: boolean;
    session: BotSession;
    ycloudResult?: any;
  }> {
    const res = await fetch('/api/test-service/change-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoEstado, autoTrigger }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async resetTestService(): Promise<{ success: boolean; testService: ServicioBIT; session: BotSession }> {
    const res = await fetch('/api/test-service/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }
};
