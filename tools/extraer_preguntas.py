#!/usr/bin/env python3
"""Convierte preguntas de PDF/Word al JSON del banco, en dos pasos revisables.

Paso 1 - extraer: lee PDF/DOCX y escribe un TXT intermedio para revisar a mano.
    python tools/extraer_preguntas.py extraer examen1.pdf temario.docx -o borrador.txt

Paso 2 - generar: lee el TXT ya corregido y escribe el JSON final.
    python tools/extraer_preguntas.py generar borrador.txt -o src/assets/data/pedagogia.json --prefijo ped

Formato del TXT intermedio (bloques separados por una línea en blanco):

    # TEMA: Tema 3 · Currículo
    1. Texto de la pregunta (puede ocupar varias líneas)
    A) Opción A
    B) Opción B
    C) Opción C
    D) Opción D
    RESPUESTA: B

- "# TEMA:" fija el tema de las preguntas siguientes (hasta el próximo "# TEMA:").
- Si el documento no marca la respuesta, el borrador deja "RESPUESTA: ?" para rellenarla a mano.
- Las líneas que empiezan por "#" (salvo "# TEMA:") son comentarios y se ignoran.

Dependencias: pip install pdfplumber python-docx
"""
import argparse
import json
import re
import sys
from pathlib import Path

RE_PREGUNTA = re.compile(r"^\s*(\d{1,4})\s*[.)\-]\s+(.*\S)")
RE_OPCION = re.compile(r"^\s*([A-Da-d])\s*[.)\-]\s+(.*\S)")
RE_RESPUESTA = re.compile(r"^\s*(?:respuesta(?:\s+correcta)?|soluci[oó]n|clave)\s*[:\-]?\s*([A-Da-d])\b", re.I)
RE_TEMA = re.compile(r"^\s*#\s*TEMA\s*:\s*(.+\S)", re.I)
# Cabeceras de tema dentro de los documentos: "TEMA 2: Currículo..." o "Preguntas tipo test · Tema 3"
RE_TEMA_DOC = re.compile(r"^\s*TEMA\s+(\d+)\s*[:.\-]\s*(.*\S)?\s*$")
RE_TEMA_DOC2 = re.compile(r"^\s*Preguntas tipo test\s*[·.\-]\s*Tema\s+(\d+)", re.I)
# Líneas repetidas por página que no forman parte de ninguna pregunta
RE_RUIDO = re.compile(r"^\s*(Page \d+ of \d+|Tema \d+\s*[·.]\s*Test de re?spaso|Tema \d+\s*[·.]\s*Test de repaso|M[ÁA]STER UNIVERSITARIO.*|Y BACHILLERATO, FORMACI[ÓO]N PROFESIONAL.*)\s*$", re.I)
RE_CORTAS = re.compile(r"^\s*Preguntas cortas", re.I)
MARCA = chr(1)  # prefijo de línea resaltada en amarillo


# ---------------------------------------------------------------- extracción
def _amarilla(img, escala: float, linea: dict) -> bool:
    """True si una parte importante de la caja de la línea está pintada de amarillo (subrayador)."""
    x0, x1 = int(linea["x0"] * escala), int(linea["x1"] * escala)
    y0, y1 = int(linea["top"] * escala), int(linea["bottom"] * escala)
    caja = img.crop((max(x0, 0), max(y0, 0), max(x1, x0 + 1), max(y1, y0 + 1))).convert("RGB")
    datos = caja.tobytes()
    px = list(zip(datos[0::3], datos[1::3], datos[2::3]))
    amarillos = sum(1 for r, g, b in px if r > 200 and g > 200 and b < 140)
    return bool(px) and amarillos / len(px) > 0.25


def texto_pdf(ruta: Path) -> list[str]:
    """Líneas de texto del PDF. Las líneas resaltadas en amarillo llevan el prefijo MARCA."""
    import pdfplumber

    resolucion = 100
    escala = resolucion / 72
    lineas: list[str] = []
    with pdfplumber.open(ruta) as pdf:
        for pagina in pdf.pages:
            img = pagina.to_image(resolution=resolucion).original
            for l in pagina.extract_text_lines(return_chars=False):
                marca = MARCA if _amarilla(img, escala, l) else ""
                lineas.append(marca + l["text"])
    return lineas


def texto_docx(ruta: Path) -> list[str]:
    import docx

    doc = docx.Document(ruta)
    lineas = [p.text for p in doc.paragraphs]
    for tabla in doc.tables:
        for fila in tabla.rows:
            lineas.extend(c.text for c in fila.cells)
    return lineas


def leer_lineas(ruta: Path) -> list[str]:
    ext = ruta.suffix.lower()
    if ext == ".pdf":
        return texto_pdf(ruta)
    if ext == ".docx":
        return texto_docx(ruta)
    if ext == ".txt":
        return ruta.read_text(encoding="utf-8").splitlines()
    sys.exit(f"Formato no soportado: {ruta} (usa .pdf, .docx o .txt)")


def estructurar(lineas: list[str]) -> list[dict]:
    """Agrupa líneas en preguntas {tema, pregunta, opciones, correcta}. Tolerante: lo dudoso se revisa a mano."""
    preguntas: list[dict] = []
    actual: dict | None = None
    tema = ""
    zona = None  # "pregunta" | índice de opción

    esperando_titulo = False
    corto = False
    for bruta in lineas:
        marcada = bruta.startswith(MARCA)
        linea = bruta.lstrip(MARCA).strip()
        if not linea or RE_RUIDO.match(linea):
            continue
        m = RE_TEMA.match(linea)
        if m:
            tema = m.group(1)
            continue
        m = RE_TEMA_DOC.match(linea)
        if m:
            tema = f"Tema {m.group(1)}" + (f" · {m.group(2)}" if m.group(2) else "")
            esperando_titulo = True
            actual = None
            corto = False
            continue
        m = RE_TEMA_DOC2.match(linea)
        if m:
            # Se repite como cabecera en cada página: solo cambia el tema si el número es distinto
            if not tema.startswith(f"Tema {m.group(1)}"):
                tema = f"Tema {m.group(1)}"
                actual = None
                corto = False
            continue
        if RE_CORTAS.match(linea):
            # Sección de preguntas de desarrollo: no son test
            corto = True
            actual = None
            continue
        if corto:
            continue
        if esperando_titulo:
            # El título del tema puede continuar en la línea siguiente ("...sistema educativo / español")
            if re.match(r"^(preguntas|\d)", linea, re.I):
                esperando_titulo = False
            else:
                tema += " " + linea
                continue
        m = RE_RESPUESTA.match(linea)
        if m and actual:
            actual["correcta"] = "ABCD".index(m.group(1).upper())
            continue
        m = RE_OPCION.match(linea)
        if m and actual:
            actual["opciones"].append(m.group(2))
            zona = len(actual["opciones"]) - 1
            if marcada:
                actual["correcta"] = zona
            continue
        m = RE_PREGUNTA.match(linea)
        if m and (actual is None or len(actual["opciones"]) >= 2):
            actual = {"tema": tema, "pregunta": m.group(2), "opciones": [], "correcta": None}
            preguntas.append(actual)
            zona = "pregunta"
            continue
        # Continuación de la línea anterior (texto partido por el ancho de página)
        if actual:
            if zona == "pregunta":
                actual["pregunta"] += " " + linea
            elif isinstance(zona, int):
                actual["opciones"][zona] += " " + linea
    return preguntas


def escribir_borrador(preguntas: list[dict], destino: Path) -> None:
    salida: list[str] = []
    tema_prev = None
    for n, p in enumerate(preguntas, 1):
        if p["tema"] != tema_prev:
            salida.append(f"# TEMA: {p['tema'] or 'SIN TEMA'}\n")
            tema_prev = p["tema"]
        salida.append(f"{n}. {p['pregunta']}")
        for i, op in enumerate(p["opciones"]):
            salida.append(f"{'ABCD'[i] if i < 4 else '?'}) {op}")
        letra = "ABCD"[p["correcta"]] if p["correcta"] is not None else "?"
        salida.append(f"RESPUESTA: {letra}\n")
    destino.write_text("\n".join(salida), encoding="utf-8")


# ---------------------------------------------------------------- generación
def cmd_extraer(args: argparse.Namespace) -> None:
    todas: list[dict] = []
    for f in args.archivos:
        ruta = Path(f)
        p = estructurar(leer_lineas(ruta))
        print(f"{ruta.name}: {len(p)} preguntas detectadas")
        todas.extend(p)
    escribir_borrador(todas, Path(args.salida))
    print(f"Borrador escrito en {args.salida}. Revísalo (busca '?' y 'SIN TEMA') y luego ejecuta 'generar'.")


def cmd_generar(args: argparse.Namespace) -> None:
    preguntas = estructurar(Path(args.borrador).read_text(encoding="utf-8").splitlines())
    errores = []
    for n, p in enumerate(preguntas, 1):
        if len(p["opciones"]) != 4:
            errores.append(f"Pregunta {n}: tiene {len(p['opciones'])} opciones (deben ser 4)")
        if p["correcta"] is None:
            errores.append(f"Pregunta {n}: falta la RESPUESTA")
        if not p["tema"] or p["tema"] == "SIN TEMA":
            errores.append(f"Pregunta {n}: sin tema")
    if errores:
        print("\n".join(errores), file=sys.stderr)
        sys.exit(f"{len(errores)} problemas: corrige el borrador y vuelve a ejecutar.")

    destino = Path(args.salida)
    existentes: list[dict] = []
    if args.anadir and destino.exists():
        existentes = json.loads(destino.read_text(encoding="utf-8"))
    inicio = len(existentes)
    nuevas = [
        {
            "id": f"{args.prefijo}-{inicio + i:03d}",
            "tema": p["tema"],
            "pregunta": p["pregunta"],
            "opciones": p["opciones"],
            "correcta": p["correcta"],
        }
        for i, p in enumerate(preguntas, 1)
    ]
    destino.write_text(json.dumps(existentes + nuevas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(nuevas)} preguntas escritas en {destino} (total: {len(existentes) + len(nuevas)})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    e = sub.add_parser("extraer", help="PDF/DOCX -> borrador TXT revisable")
    e.add_argument("archivos", nargs="+")
    e.add_argument("-o", "--salida", default="borrador.txt")
    e.set_defaults(func=cmd_extraer)

    g = sub.add_parser("generar", help="borrador TXT revisado -> JSON final")
    g.add_argument("borrador")
    g.add_argument("-o", "--salida", required=True, help="p. ej. src/assets/data/pedagogia.json")
    g.add_argument("--prefijo", required=True, help="prefijo de los ids (ped, psi...)")
    g.add_argument("--anadir", action="store_true", help="añadir al JSON existente en vez de sobrescribirlo")
    g.set_defaults(func=cmd_generar)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
