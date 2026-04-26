#!/usr/bin/env python3
"""Gera icon.png 512x512 e icon.ico multi-resolucao pro Lux Restaurante.
Visual placeholder ate o nano-banana entregar a versao final.

Layout: fundo charcoal (#0A0A0A), aro dourado, letra L em serif dourada.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PNG_PATH = os.path.join(OUT_DIR, "icon.png")
ICO_PATH = os.path.join(OUT_DIR, "icon.ico")

CHARCOAL = (10, 10, 10, 255)
GOLD = (212, 175, 55, 255)
IVORY = (245, 239, 230, 255)

SIZE = 512
PADDING = 36

def make_master() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fundo arredondado charcoal
    radius = 96
    d.rounded_rectangle(
        [(0, 0), (SIZE, SIZE)],
        radius=radius,
        fill=CHARCOAL,
    )

    # Anel dourado interno
    inner_radius = radius - PADDING // 3
    d.rounded_rectangle(
        [(PADDING, PADDING), (SIZE - PADDING, SIZE - PADDING)],
        radius=inner_radius,
        outline=GOLD,
        width=10,
    )

    # Letra L em serif dourada — caca a melhor fonte disponivel no sistema
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf",   # Georgia Bold (serif)
        "C:/Windows/Fonts/timesbd.ttf",    # Times Bold
        "C:/Windows/Fonts/Constantb.ttf",
        "/Library/Fonts/Georgia Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ]
    font = None
    for c in candidates:
        if os.path.exists(c):
            try:
                font = ImageFont.truetype(c, 360)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()

    text = "L"
    try:
        bbox = d.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        offset_x = -bbox[0]
        offset_y = -bbox[1]
    except Exception:
        text_w, text_h = font.getsize(text)
        offset_x = offset_y = 0

    pos = ((SIZE - text_w) // 2 + offset_x, (SIZE - text_h) // 2 + offset_y - 18)

    # Sombra suave
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((pos[0] + 4, pos[1] + 6), text, font=font, fill=(0, 0, 0, 160))
    img = Image.alpha_composite(img, shadow)

    d = ImageDraw.Draw(img)
    d.text(pos, text, font=font, fill=GOLD)

    # Barra inferior "LUX"
    sub_font = None
    for c in ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(c):
            try:
                sub_font = ImageFont.truetype(c, 38)
                break
            except Exception:
                continue
    if sub_font:
        sub = "LUX"
        try:
            sb = d.textbbox((0, 0), sub, font=sub_font)
            sw = sb[2] - sb[0]
        except Exception:
            sw = sub_font.getsize(sub)[0]
        d.text(((SIZE - sw) // 2, SIZE - PADDING - 64), sub, font=sub_font, fill=IVORY)

    return img


def main():
    master = make_master()
    master.save(PNG_PATH, "PNG")
    print(f"OK {PNG_PATH}")

    # ICO multi-resolucao (16, 24, 32, 48, 64, 128, 256)
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(ICO_PATH, "ICO", sizes=sizes)
    print(f"OK {ICO_PATH} ({len(sizes)} tamanhos)")


if __name__ == "__main__":
    main()
