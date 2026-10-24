# Cuestionario · Pedagogía y Psicología

Web estática (Angular, sin backend ni login) para hacer exámenes tipo test de repaso de oposiciones.
El historial se guarda en el `localStorage` del navegador.

## Ejecutar en local

```bash
npm install
npx ng serve        # http://localhost:4200
```

Rutas: `#/panel`, `#/examen`, `#/resultados` (se usa hash para que las recargas funcionen en GitHub Pages).

## Añadir preguntas

Los bancos son `src/assets/data/pedagogia.json` y `src/assets/data/psicologia.json`. Cada pregunta:

```json
{
  "id": "ped-005",
  "tema": "Tema 1 · Nombre del tema",
  "pregunta": "Texto de la pregunta",
  "opciones": ["A", "B", "C", "D"],
  "correcta": 2
}
```

`id` único en el banco; `opciones` admite 3 o 4 respuestas; `correcta` es el índice (0-3) de la opción correcta. Los exámenes toman N preguntas
aleatorias de todo el banco; si pides más de las que hay, se usan todas y se avisa en el panel.
`pedagogia.json` y `psicologia.json` se generaron a partir de `docs/` (exámenes y temario; hay preguntas con 3 y con 4 opciones).

### Convertir PDF / Word a JSON

```bash
pip install pdfplumber python-docx
# 1) Extraer a un borrador TXT revisable
python tools/extraer_preguntas.py extraer examen.pdf temario.docx -o borrador.txt
# 2) Corregir borrador.txt a mano (busca "?" y "SIN TEMA"; el formato está en la cabecera del script)
# 3) Generar el JSON (--anadir lo añade al banco existente en vez de sobrescribirlo)
python tools/extraer_preguntas.py generar borrador.txt -o src/assets/data/pedagogia.json --prefijo ped --anadir
```

El paso 2 falla con un listado de problemas si falta alguna respuesta, tema u opción.

## Desplegar en GitHub Pages

1. Sube el proyecto a GitHub (rama `main`).
2. En *Settings → Pages* elige **Source: GitHub Actions**.
3. Cada `push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila con
   `--base-href "/<nombre-del-repo>/"` y publica `dist/cuestionario/browser`.

Build manual: `npm run build:gh` (asume el repo `cuestionario`; para otro nombre usa
`npx ng build --base-href /otro-nombre/`).
