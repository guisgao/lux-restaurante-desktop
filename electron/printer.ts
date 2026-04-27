// Wrapper ESC/POS pra impressora térmica 80mm — TESTADO COM ELGIN i9/i8.
// Elgin usa ESC/POS Epson-compatível, então PrinterTypes.EPSON funciona direto.
//
// Configuração pelo Windows:
//   1. Instalar driver Elgin do site oficial (i9 USB)
//   2. Painel de Controle > Dispositivos e Impressoras → confirma que "Elgin i9"
//      aparece na lista
//   3. Setar env LUX_PRINTER_INTERFACE=printer:Elgin i9   (nome exato da fila)
//
// Outras opções:
//   - "tcp://192.168.1.50:9100" (impressoras de rede)
//   - "printer:auto" (tenta a primeira térmica detectada)
//
// Futuro: UI dentro do desktop pra usuário escolher e testar.

import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";

export interface PrintablePedido {
  numero: string | number;
  cliente: string;
  itens: Array<{ qtd: number; nome: string; obs?: string; opcoes?: string[] }>;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  pagamento: string;
  trocoPara?: number;
  endereco?: string;
  observacaoEntregador?: string;
  restauranteNome?: string;
  // Config dinâmica vinda da tela /restaurante-admin/configuracoes
  config?: {
    interfaceName?: string;
    papel?: "58mm" | "80mm";
    tipo?: "epson" | "star" | "tanca" | "daruma";
  };
}

const fallbackInterface = process.env.LUX_PRINTER_INTERFACE || "printer:auto";

const TIPO_MAP = {
  epson: PrinterTypes.EPSON,
  star: PrinterTypes.STAR,
  tanca: PrinterTypes.TANCA,
  daruma: PrinterTypes.DARUMA,
} as const;

function brl(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export async function printOrder(p: PrintablePedido): Promise<void> {
  const printerType = p.config?.tipo ? TIPO_MAP[p.config.tipo] : PrinterTypes.EPSON;
  const printerInterface = p.config?.interfaceName || fallbackInterface;
  const width = p.config?.papel === "58mm" ? 32 : 48;

  const printer = new ThermalPrinter({
    type: printerType,
    interface: printerInterface,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    removeSpecialCharacters: false,
    width,
    options: { timeout: 5000 },
  });

  printer.alignCenter();
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.println(p.restauranteNome || "Pedido Lux");
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.bold(true);
  printer.println(`PEDIDO #${p.numero}`);
  printer.bold(false);
  printer.println(`Cliente: ${p.cliente}`);
  if (p.endereco) printer.println(`Endereço: ${p.endereco}`);
  if (p.observacaoEntregador) printer.println(`Obs entregador: ${p.observacaoEntregador}`);
  printer.drawLine();

  for (const it of p.itens) {
    printer.bold(true);
    printer.leftRight(`${it.qtd}x ${it.nome}`, "");
    printer.bold(false);
    if (it.opcoes?.length) {
      printer.println(`  ${it.opcoes.join(" · ")}`);
    }
    if (it.obs) {
      printer.println(`  Obs: ${it.obs}`);
    }
  }

  printer.drawLine();
  printer.leftRight("Subtotal", brl(p.subtotal));
  printer.leftRight("Taxa entrega", brl(p.taxaEntrega));
  printer.bold(true);
  printer.setTextDoubleWidth();
  printer.leftRight("TOTAL", brl(p.total));
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  printer.println(`Pagamento: ${p.pagamento}`);
  if (p.trocoPara && p.trocoPara > p.total) {
    printer.println(`Troco para ${brl(p.trocoPara)} → ${brl(p.trocoPara - p.total)}`);
  }

  printer.alignCenter();
  printer.println("");
  printer.println(new Date().toLocaleString("pt-BR"));
  printer.println("Delivery Lux");
  printer.cut();

  const connected = await printer.isPrinterConnected();
  if (!connected) {
    throw new Error(
      `Impressora não conectada (interface=${fallbackInterface}). ` +
        "Verifique conexão USB ou troque LUX_PRINTER_INTERFACE.",
    );
  }
  await printer.execute();
}

export function listPrinters() {
  // Node-thermal-printer não lista nativamente; retorno vazio aqui — o main process
  // usa BrowserWindow.getPrintersAsync() que cobre as instaladas no Windows.
  return [];
}
