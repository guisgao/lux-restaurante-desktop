# Lux Restaurante — Desktop (Electron)

App desktop pro restaurante parceiro receber pedidos com:
- 🔔 Som loop até aceitar (não perde pedido)
- 📌 Tray icon — fica em background mesmo se fechar a janela
- 🖨️ Impressão automática em térmica 80mm (ESC/POS)
- 🔄 Auto-update via GitHub Releases
- 🚀 Inicia com Windows (configurável)

## Como funciona

O Electron carrega a versão web (`https://parceiro.lux.butecobar.com.br`) numa janela nativa e expõe APIs do desktop via `window.luxDesktop`. O frontend detecta a presença e ativa funcionalidades extras (som, impressão, tray) automaticamente.

Dessa forma:
- **Mudanças de UI** = só rebuild do site web (zero update do desktop)
- **Mudanças de native** (impressora, tray) = release novo do desktop com auto-update

## Setup local (dev)

```bash
cd desktop
npm install
npm run dev
```

Variáveis de ambiente:
- `LUX_APP_URL` — URL do parceiro (default: produção)
- `LUX_PRINTER_INTERFACE` — `printer:NomeDaImpressora` ou `tcp://192.168.1.50:9100` (default: `printer:auto`)

## Build do instalador Windows

```bash
npm run dist:win
```

Saída em `release/Lux Restaurante Setup 0.1.0.exe`.

## Build Mac + Win

```bash
npm run dist:winmac
```

## Auto-update

`electron-updater` checa `github.com/guisgao/lux-restaurante-desktop/releases` a cada 6h. Pra publicar update:

1. Bump versão em `package.json`
2. `npm run dist:win`
3. Cria release no GitHub com os arquivos `release/*.exe` + `latest.yml`
4. Restaurantes baixam silenciosamente, instalam no próximo restart

## APIs expostas pro frontend

```ts
window.luxDesktop?.notifyNewOrder({ pedidoId, restauranteNome, total });
window.luxDesktop?.orderAcknowledged();
window.luxDesktop?.printOrder(payload);
window.luxDesktop?.listPrinters();
window.luxDesktop?.appInfo();
```

Frontend detecta com `if (window.luxDesktop?.isDesktop) { ... }`.

## TODO próximas versões

- [ ] Tela de configuração de impressora dentro do app (substituir env var)
- [ ] Som customizável (mp3 escolhido pelo restaurante)
- [ ] Modo "balcão" — lista de pedidos sempre on top
- [ ] Atalhos de teclado (F1 aceitar, F2 cancelar, etc)
- [ ] Multi-restaurante (cadeia de lojas com 1 instalação)
- [ ] Mac DMG assinado
