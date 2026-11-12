"""Monta uma versão de Windows com lista explícita de arquivos e SHA256."""

import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "BodgeBall-entre-amigos"
FILES = ["servidor.cjs", "abrir.html", "INICIAR-WINDOWS.cmd", "LEIA-ME.txt", "PASSO-A-PASSO.txt"]
RUNTIME = ["runtime/node.exe", "runtime/ORIGEM.json", "runtime/LICENSE.txt"]


def build():
    origin = json.loads((PACKAGE / "runtime/ORIGEM.json").read_text())
    executable = PACKAGE / "runtime/node.exe"
    if hashlib.sha256(executable.read_bytes()).hexdigest() != origin["sha256"]:
        raise ValueError("O runtime não confere com o hash registrado.")
    if not (PACKAGE / "jogo/index.html").is_file():
        raise ValueError("Prepare a pasta jogo/ antes de empacotar.")
    paths = [PACKAGE / name for name in FILES + RUNTIME]
    paths += sorted(p for p in (PACKAGE / "jogo").rglob("*") if p.is_file())
    for file in paths:
        if file.is_symlink() or not file.is_file():
            raise ValueError(f"Arquivo ausente ou link simbólico: {file}")
        if any(part.startswith(".") for part in file.relative_to(PACKAGE).parts):
            raise ValueError(f"Arquivo oculto inesperado: {file}")
    output = ROOT / "dist/BodgeBall-entre-amigos-Windows.zip"
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in paths:
            archive.write(file, Path(PACKAGE.name) / file.relative_to(PACKAGE))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip():
            raise ValueError("Falha na verificação do ZIP.")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(".zip.sha256").write_text(f"{digest}  {output.name}\n")
    print(f"{output}: {output.stat().st_size} bytes; SHA256 {digest}")


if __name__ == "__main__":
    build()
