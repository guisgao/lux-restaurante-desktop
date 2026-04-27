"""Extrai winCodeSign 7z manualmente, pulando symlinks (que Win10 nao-admin nao cria).
Workaround pro bug do 7za 21.07 que electron-builder usa.
"""
import os, glob, py7zr, sys

cache = os.path.expandvars(r"%LOCALAPPDATA%\electron-builder\Cache\winCodeSign")
if not os.path.isdir(cache):
    print(f"Cache nao existe: {cache}")
    sys.exit(1)

archives = glob.glob(os.path.join(cache, "*.7z"))
print(f"Achei {len(archives)} arquivos 7z")

for arc in archives:
    out_dir = arc.replace(".7z", "")
    if os.path.isdir(out_dir) and os.listdir(out_dir):
        print(f"  SKIP {os.path.basename(arc)} (ja extraido)")
        continue
    print(f"  extracting {os.path.basename(arc)} -> {out_dir}")
    try:
        with py7zr.SevenZipFile(arc, mode="r") as z:
            # py7zr extrai mas pula entradas que falham (symlinks)
            try:
                z.extractall(path=out_dir)
            except Exception as e:
                print(f"    WARN partial: {e}")
        print(f"  OK")
    except Exception as e:
        print(f"  FAIL: {e}")

print("Done.")
