"""Tira screenshots mobile das telas principais pra auditoria visual."""
import os, subprocess, time

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT = r"D:\Claude Funcional\delivery-lux\desktop\audit-shots"
os.makedirs(OUT, exist_ok=True)

URLS = [
    ("01-cliente-home",        "https://lux.butecobar.com.br/"),
    ("02-cliente-buscar",      "https://lux.butecobar.com.br/buscar"),
    ("03-cliente-pedidos",     "https://lux.butecobar.com.br/pedidos"),
    ("04-cliente-conta",       "https://lux.butecobar.com.br/conta"),
    ("05-cliente-instalar",    "https://lux.butecobar.com.br/instalar"),
    ("06-cliente-login",       "https://lux.butecobar.com.br/login"),
    ("07-cliente-parceiros",   "https://lux.butecobar.com.br/parceiros"),
    ("08-restaurante-login",   "https://parceiro.lux.butecobar.com.br/restaurante-admin/login"),
    ("09-entregador-login",    "https://entregador.lux.butecobar.com.br/entregador/login"),
    ("10-admin-login",         "https://admin.lux.butecobar.com.br/lux-admin/login"),
]

# Mobile viewport pra cliente/entregador
for tag, url in URLS:
    out = os.path.join(OUT, f"{tag}.png")
    width = "1280" if "admin" in tag or "restaurante" in tag or "parceiros" in tag else "414"
    height = "900" if "admin" in tag or "restaurante" in tag or "parceiros" in tag else "896"
    print(f"[{tag}] {url}")
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        f"--screenshot={out}",
        "--virtual-time-budget=4000",
        url,
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)
    time.sleep(0.5)

print("Done. Saved to", OUT)
