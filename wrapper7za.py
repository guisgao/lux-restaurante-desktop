"""Wrapper p/ 7za.exe que ignora exit code 2 quando o erro for SO symlink failure.
Substitui o node_modules/7zip-bin/win/x64/7za.exe pra contornar o bug de
electron-builder no Win10 sem Developer Mode.

Caminho real do 7za fica como 7za-real.exe.
"""
import os, sys, subprocess

REAL = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "7za-real.exe")

if not os.path.exists(REAL):
    print(f"7za-real.exe nao encontrado em {REAL}", file=sys.stderr)
    sys.exit(127)

proc = subprocess.run(
    [REAL] + sys.argv[1:],
    stdin=sys.stdin,
    capture_output=True,
)

# Repassa stdout
sys.stdout.buffer.write(proc.stdout)

stderr_text = proc.stderr.decode("utf-8", errors="replace")
sys.stderr.buffer.write(proc.stderr)

# Se o exit foi 2 (warning) e o erro for SO sobre symbolic link, forca exit 0
if proc.returncode == 2:
    only_symlink = "Cannot create symbolic link" in stderr_text
    other_errors = False
    for line in stderr_text.splitlines():
        if line.startswith("ERROR") and "symbolic link" not in line.lower():
            other_errors = True
            break
    if only_symlink and not other_errors:
        sys.exit(0)

sys.exit(proc.returncode)
