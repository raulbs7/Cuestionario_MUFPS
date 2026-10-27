export type AsignaturaId = 'pedagogia' | 'psicologia';

export interface Pregunta {
  id: string;
  tema: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
}

export interface DetalleRespuesta {
  preguntaId: string;
  correcta: boolean;
  respuestaElegida: number;
}

export interface IntentoGuardado {
  asignatura: AsignaturaId;
  /** ISO 8601 */
  fecha: string;
  /** Nº de preguntas realmente usadas en el intento */
  totalPreguntas: number;
  aciertos: number;
  detalle: DetalleRespuesta[];
  /** Temas elegidos para el intento; ausente si se usaron todos (y en intentos antiguos). */
  temas?: string[];
}

export interface AsignaturaInfo {
  id: AsignaturaId;
  nombre: string;
  acento: string;
}

export const ASIGNATURAS: readonly AsignaturaInfo[] = [
  { id: 'pedagogia', nombre: 'Pedagogía', acento: '#2F6F5E' },
  { id: 'psicologia', nombre: 'Psicología', acento: '#5B4B8A' },
];

export const LETRAS = ['A', 'B', 'C', 'D'] as const;

export function infoAsignatura(id: AsignaturaId): AsignaturaInfo {
  return ASIGNATURAS.find((a) => a.id === id)!;
}

/** "Tema 1.2 · Desarrollo cognitivo..." -> "Tema 1.2". */
export function temaCorto(tema: string): string {
  return tema.split(' · ')[0];
}

/** Texto breve con los temas de un intento, para listados. */
export function resumenTemas(temas?: string[]): string {
  return temas?.length ? temas.map(temaCorto).join(', ') : 'Todos los temas';
}
