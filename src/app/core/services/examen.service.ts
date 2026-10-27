import { Injectable, computed, inject, signal } from '@angular/core';
import { AsignaturaId, DetalleRespuesta, Pregunta } from '../models/models';
import { HistorialService } from './historial.service';

@Injectable({ providedIn: 'root' })
export class ExamenService {
  private readonly historial = inject(HistorialService);

  /** Asignatura activa, compartida entre Panel y Resultados. */
  readonly asignatura = signal<AsignaturaId>('pedagogia');

  readonly preguntas = signal<Pregunta[]>([]);
  /** Temas del examen en curso (vacío = todos). */
  readonly temas = signal<string[]>([]);
  readonly indice = signal(0);
  readonly respuestas = signal<DetalleRespuesta[]>([]);
  /** Opción elegida en la pregunta actual (null si aún no se ha respondido). */
  readonly elegida = signal<number | null>(null);
  /** Ya se guardó el intento actual en el historial. */
  readonly terminado = signal(false);

  readonly enCurso = computed(() => this.preguntas().length > 0);
  readonly total = computed(() => this.preguntas().length);
  readonly actual = computed(() => this.preguntas()[this.indice()]);
  readonly puntuacion = computed(() => this.respuestas().filter((r) => r.correcta).length);
  readonly respondida = computed(() => this.elegida() !== null);
  readonly esUltima = computed(() => this.indice() + 1 === this.total());

  /**
   * Toma `cantidad` preguntas aleatorias (temas mezclados) de los `temas` indicados,
   * o de todo el banco si `temas` está vacío.
   */
  iniciar(asignatura: AsignaturaId, banco: Pregunta[], cantidad: number, temas: string[] = []): void {
    const fuente = temas.length ? banco.filter((p) => temas.includes(p.tema)) : banco;
    const n = Math.max(1, Math.min(cantidad, fuente.length));
    this.asignatura.set(asignatura);
    this.temas.set(temas);
    this.preguntas.set(this.mezclar(fuente).slice(0, n));
    this.indice.set(0);
    this.respuestas.set([]);
    this.elegida.set(null);
    this.terminado.set(false);
  }

  responder(opcion: number): void {
    const pregunta = this.actual();
    if (!pregunta || this.respondida()) return;
    this.elegida.set(opcion);
    this.respuestas.update((r) => [
      ...r,
      { preguntaId: pregunta.id, correcta: opcion === pregunta.correcta, respuestaElegida: opcion },
    ]);
    if (this.esUltima()) this.finalizar();
  }

  siguiente(): void {
    if (!this.respondida() || this.esUltima()) return;
    this.indice.update((i) => i + 1);
    this.elegida.set(null);
  }

  private finalizar(): void {
    if (this.terminado()) return;
    this.terminado.set(true);
    this.historial.guardar({
      asignatura: this.asignatura(),
      fecha: new Date().toISOString(),
      totalPreguntas: this.total(),
      aciertos: this.puntuacion(),
      detalle: this.respuestas(),
      ...(this.temas().length ? { temas: this.temas() } : {}),
    });
  }

  /** Fisher-Yates sobre una copia. */
  private mezclar<T>(lista: T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }
}
