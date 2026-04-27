import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
  shell,
  dialog,
} from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printOrder, listPrinters, type PrintablePedido } from "./printer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single-instance lock — restaurante NUNCA pode ter 2 instâncias
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

const APP_URL = process.env.LUX_APP_URL || "https://parceiro.lux.butecobar.com.br";
const ICON_PATH = path.join(__dirname, "..", "build", "icon.png");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let pendingOrders = 0;

function createWindow() {
  // Em notebooks 1366x768 com DPI scale 125% o "viewport útil" fica ~1093x550 — abrimos
  // maximizado por padrão pro restaurante ter o painel ocupando a tela toda.
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // mostra só depois de maximizar pra evitar flash
    title: "Lux Restaurante",
    icon: ICON_PATH,
    backgroundColor: "#0A0A0A",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // zoomFactor evita ficar minúsculo em telas com DPI scale alto
      zoomFactor: 1.0,
    },
  });

  mainWindow.maximize();
  mainWindow.show();

  // Garante que o conteúdo recebe foco e o zoom não é alterado por gesto
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.setZoomFactor(1.0);
    mainWindow?.webContents.setVisualZoomLevelLimits(1, 1);
  });

  mainWindow.loadURL(APP_URL);

  // Links externos abrem no navegador padrão (não na janela do app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Fechar = ir pra bandeja (não sair do app)
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      if (tray && process.platform === "win32" && pendingOrders === 0) {
        tray.displayBalloon({
          icon: nativeImage.createFromPath(ICON_PATH),
          title: "Lux continua rodando",
          content: "Você vai receber notificação quando chegar pedido novo. Clique no ícone da bandeja pra abrir.",
        });
      }
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Lux Restaurante");
  refreshTrayMenu();

  tray.on("click", () => mainWindow?.show());
  tray.on("double-click", () => mainWindow?.show());
}

function refreshTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: pendingOrders > 0 ? `🔔 ${pendingOrders} pedido(s) novo(s)` : "Nenhum pedido pendente",
      enabled: false,
    },
    { type: "separator" },
    { label: "Abrir Lux Restaurante", click: () => mainWindow?.show() },
    { label: "Recarregar", click: () => mainWindow?.reload() },
    { type: "separator" },
    {
      label: "Verificar atualizações",
      click: async () => {
        try {
          const r = await autoUpdater.checkForUpdates();
          dialog.showMessageBox({
            type: "info",
            title: "Atualizações",
            message: r?.updateInfo?.version
              ? `Versão disponível: ${r.updateInfo.version}`
              : "Você já está na versão mais recente.",
          });
        } catch (err) {
          dialog.showErrorBox("Erro", String(err));
        }
      },
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);

  // Bolinha vermelha no ícone se tiver pedido pendente
  const baseIcon = nativeImage.createFromPath(ICON_PATH);
  tray.setImage(baseIcon.resize({ width: 16, height: 16 }));
}

// =============================
// IPC — APIs expostas pro renderer
// =============================

ipcMain.handle("lux:notify-new-order", (_e, payload: { pedidoId: string; restauranteNome?: string; total?: number }) => {
  pendingOrders += 1;
  refreshTrayMenu();

  // Notificação nativa Windows/Mac
  if (Notification.isSupported()) {
    const n = new Notification({
      title: "Pedido novo no Lux",
      body: payload.total
        ? `Pedido R$ ${payload.total.toFixed(2)} — clique pra atender`
        : "Você recebeu um pedido novo. Clique pra atender.",
      icon: ICON_PATH,
      urgency: "critical",
    });
    n.on("click", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    n.show();
  }

  // Mostra a janela e foca (mas não rouba foco se user tá em outra coisa importante)
  if (!mainWindow?.isVisible()) mainWindow?.show();
  mainWindow?.flashFrame(true);
});

ipcMain.handle("lux:order-acknowledged", () => {
  pendingOrders = Math.max(0, pendingOrders - 1);
  refreshTrayMenu();
  mainWindow?.flashFrame(false);
});

ipcMain.handle("lux:list-printers", async () => {
  try {
    const local = await mainWindow?.webContents.getPrintersAsync();
    const usb = listPrinters();
    return { ok: true, system: local ?? [], usb };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("lux:print-order", async (_e, payload: PrintablePedido) => {
  try {
    await printOrder(payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("lux:open-external", (_e, url: string) => shell.openExternal(url));

ipcMain.handle("lux:app-info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  url: APP_URL,
}));

// =============================
// Lifecycle
// =============================

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Auto-update silencioso (só checa, baixa em background, instala no próximo start)
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 1000 * 60 * 60 * 6);
  }
});

app.on("second-instance", () => {
  mainWindow?.show();
  mainWindow?.focus();
});

app.on("window-all-closed", (e: Event) => {
  // No Mac é normal app continuar rodando sem janelas; no Win/Linux mantemos pra tray
  e.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
});
