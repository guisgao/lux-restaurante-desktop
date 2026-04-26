import { contextBridge, ipcRenderer } from "electron";

// API segura exposta pro frontend (parceiro.lux.butecobar.com.br) chamar.
// O frontend detecta `window.luxDesktop` e usa quando disponível; quando rodando
// no navegador comum, esse objeto é undefined e tudo continua funcionando.

export interface LuxDesktopAPI {
  notifyNewOrder: (payload: { pedidoId: string; restauranteNome?: string; total?: number }) => Promise<void>;
  orderAcknowledged: () => Promise<void>;
  listPrinters: () => Promise<{ ok: boolean; system?: unknown[]; usb?: unknown[]; error?: string }>;
  printOrder: (pedido: unknown) => Promise<{ ok: boolean; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  appInfo: () => Promise<{ version: string; platform: string; url: string }>;
  isDesktop: true;
}

const api: LuxDesktopAPI = {
  notifyNewOrder: (payload) => ipcRenderer.invoke("lux:notify-new-order", payload),
  orderAcknowledged: () => ipcRenderer.invoke("lux:order-acknowledged"),
  listPrinters: () => ipcRenderer.invoke("lux:list-printers"),
  printOrder: (pedido) => ipcRenderer.invoke("lux:print-order", pedido),
  openExternal: (url) => ipcRenderer.invoke("lux:open-external", url),
  appInfo: () => ipcRenderer.invoke("lux:app-info"),
  isDesktop: true,
};

contextBridge.exposeInMainWorld("luxDesktop", api);
