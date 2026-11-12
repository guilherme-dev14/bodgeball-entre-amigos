"""Extrai o build web conhecido do ASAR e aplica o ajuste PeerJS, sem executá-lo."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = Path("assets/index-Vt5LFJI6.js")
ORIGINAL_SHA256 = "420eb6d9d0063c2b62650a1a74d6dce09ae074ed90cffb8581692a839ff8de2e"
PATCHED_SHA256 = "31585df37e334156025474b02aa158c783f7f4de54f435f7609dd9712f327363"
NORMALIZER = "function BBWebMessage(e){return e instanceof ArrayBuffer||ArrayBuffer.isView(e)?e:JSON.parse(JSON.stringify(e))}"


def patch_transport(data):
    digest = hashlib.sha256(data).hexdigest()
    if digest == PATCHED_SHA256:
        return data
    if digest != ORIGINAL_SHA256:
        raise ValueError("Build desconhecido: nenhum ajuste foi aplicado.")
    text = data.decode("utf-8")
    start, end = text.index("class CD{"), text.index("function PD(")
    transport = text[start:end]
    replacements = {
        "null==(n=this.conns.get(e))||n.send(t)": "null==(n=this.conns.get(e))||n.send(BBWebMessage(t))",
        "n!==t&&a.send(e)": "n!==t&&a.send(BBWebMessage(e))",
    }
    for before, after in replacements.items():
        if transport.count(before) != 1:
            raise ValueError("Estrutura inesperada do transporte.")
        transport = transport.replace(before, after)
    result = (text[:start] + NORMALIZER + transport + text[end:]).encode("utf-8")
    if hashlib.sha256(result).hexdigest() != PATCHED_SHA256:
        raise ValueError("O resultado do ajuste não confere com a versão testada.")
    return result


def prepare(archive, output):
    output = output.resolve()
    if output.exists():
        raise FileExistsError("A pasta de destino já existe; escolha outra com --output.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="bodgeball-", dir=output.parent) as temporary:
        stage = Path(temporary) / "jogo"
        stage.mkdir()
        with archive.open("rb") as source:
            prefix = source.read(16)
            if len(prefix) != 16:
                raise ValueError("ASAR incompleto.")
            fields = struct.unpack("<4I", prefix)
            if fields[3] > 32 * 1024 * 1024:
                raise ValueError("Cabeçalho ASAR muito grande.")
            header = json.loads(source.read(fields[3]))
            base = 8 + fields[1]
            total = archive.stat().st_size

            def extract(entries, parent=Path()):
                for name, entry in entries.items():
                    if name in ("", ".", "..") or "/" in name or "\\" in name:
                        raise ValueError("Caminho inválido no ASAR.")
                    relative = parent / name
                    destination = stage / relative
                    if entry.get("unpacked") or entry.get("link"):
                        raise ValueError(f"Dependência externa: {relative}")
                    if "files" in entry:
                        extract(entry["files"], relative)
                        continue
                    size, offset = int(entry["size"]), base + int(entry["offset"])
                    if size < 0 or offset < base or offset + size > total:
                        raise ValueError(f"Arquivo fora dos limites: {relative}")
                    source.seek(offset)
                    data = source.read(size)
                    integrity = entry.get("integrity", {})
                    if integrity.get("algorithm") != "SHA256":
                        raise ValueError(f"Integridade SHA256 ausente: {relative}")
                    if hashlib.sha256(data).hexdigest() != integrity.get("hash"):
                        raise ValueError(f"SHA256 inválido: {relative}")
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(data)

            extract(header["files"]["dist"]["files"])
        bundle = stage / BUNDLE
        bundle.write_bytes(patch_transport(bundle.read_bytes()))
        shutil.move(str(stage), str(output))
    print(f"Jogo preparado em {output}; arquivo original preservado.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "BodgeBall-entre-amigos/jogo")
    args = parser.parse_args()
    prepare(args.archive, args.output)
