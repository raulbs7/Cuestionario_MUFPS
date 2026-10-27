# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static Angular 21 app (no backend, no login) for practising multiple-choice exams for two subjects, Pedagogía and Psicología. All code, identifiers, comments and UI text are in Spanish — keep it that way. Deployed to GitHub Pages.

## Commands

```bash
npm install
npx ng serve                 # dev server, http://localhost:4200
npm run build                # production build -> dist/cuestionario/browser
npm run build:gh             # build with --base-href /cuestionario/ (for GitHub Pages)
npx prettier --write src     # format (printWidth 100, single quotes, angular parser for .html)
```

There are no tests: `angular.json` sets `skipTests: true` for every schematic, there are no `*.spec.ts` files, and no test target is configured, so `npm test` won't work.

## Architecture

- **Routing** (`src/app/app.routes.ts`): three lazy-loaded standalone components, `panel` → `examen` → `resultados`. The router uses `withHashLocation()` (`#/panel`) so page reloads work on GitHub Pages; don't switch to path routing.
- **State lives in root services using signals**, not in the components:
  - `BancoService` fetches `assets/data/<asignatura>.json` through HttpClient and caches each bank in a signal.
  - `ExamenService` holds the exam in progress (active subject, shuffled questions, index, answers). `iniciar()` optionally filters the bank by the chosen `tema`s (an empty list means all units), picks N random questions with Fisher-Yates and clamps N to the pool size. The chosen units are saved in the attempt's optional `temas` field. Once the last question is answered it saves the attempt to the history automatically. The active subject (`asignatura`) is also how Panel and Resultados know which subject is selected.
  - `HistorialService` keeps the attempts (`IntentoGuardado[]`) in a signal mirrored to `localStorage` under the key `cuestionario.intentos`. Reads and writes are wrapped in try/catch so the app still works when storage is unavailable.
- Exam state is held only in memory. If `examen` loads with no exam running (for example after a reload), it redirects to `/panel`.
- `src/app/core/models/models.ts` defines the data types, the `ASIGNATURAS` list (id, name, accent colour) and `LETRAS`. To add a subject, extend `AsignaturaId`, add an entry to `ASIGNATURAS`, and add a matching `src/assets/data/<id>.json`.

## Responsive layout

All styles are global in `src/styles.css`; the responsive rules live in its "Responsive" section at the end. Below 900px the sidebar becomes a top bar, and below 640px the layout is the phone one (full-width buttons, history table turned into two-line rows, stat cards in a 3-column grid). On phones and on short landscape screens (`max-height: 500px`) the exam's "Siguiente" button is `position: sticky` at the bottom of the screen. Inputs keep a 16px font on phones so iOS doesn't zoom on focus.

## Question banks

Each file in `src/assets/data/*.json` is an array of `{ id, tema, pregunta, opciones, correcta }`:
- `id` must be unique within its bank and uses the prefix `ped-` or `psi-`.
- `opciones` holds 3 or 4 options.
- `correcta` is the 0-based index of the right option.

The banks were generated from source PDFs and Word files in `docs/`, which is gitignored.

`tools/extraer_preguntas.py` converts those documents in two steps (`pip install pdfplumber python-docx`):
1. `extraer` turns the files into an editable `borrador.txt`. The intermediate format is documented in the script's docstring. In PDFs, an answer highlighted in yellow is detected by sampling pixel colour.
2. Fix the draft by hand: look for `RESPUESTA: ?` and `SIN TEMA`.
3. `generar borrador.txt -o src/assets/data/<x>.json --prefijo ped|psi [--anadir]` validates the draft and writes the JSON. It fails with a list of problems if anything is missing. `--anadir` appends to the existing bank instead of overwriting it.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It builds with `--base-href "/<repo-name>/"` and publishes `dist/cuestionario/browser` to GitHub Pages, which must be set to Source: GitHub Actions.
