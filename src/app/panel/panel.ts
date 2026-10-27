import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ASIGNATURAS, AsignaturaId, infoAsignatura, resumenTemas } from '../core/models/models';
import { BancoService } from '../core/services/banco.service';
import { ExamenService } from '../core/services/examen.service';
import { HistorialService } from '../core/services/historial.service';

interface TemaInfo {
  nombre: string;
  total: number;
}

@Component({
  selector: 'app-panel',
  imports: [RouterLink, DatePipe],
  templateUrl: './panel.html',
})
export class Panel {
  private readonly bancoService = inject(BancoService);
  private readonly historialService = inject(HistorialService);
  private readonly examen = inject(ExamenService);
  private readonly router = inject(Router);

  readonly asignaturas = ASIGNATURAS;
  readonly opcionesRapidas = [10, 20, 30];
  readonly error = this.bancoService.error;

  readonly asignaturaId = this.examen.asignatura;
  readonly info = computed(() => infoAsignatura(this.asignaturaId()));
  readonly cantidad = signal(20);
  /** "Todas" sigue el tamaño de la selección de temas aunque esta cambie. */
  readonly todas = signal(false);
  /** Temas elegidos para el examen; vacío = todos los temas. */
  readonly temasElegidos = signal<string[]>([]);

  readonly banco = computed(() => this.bancoService.bancos()[this.asignaturaId()] ?? []);
  readonly totalBanco = computed(() => this.banco().length);
  /** Temas del banco en orden natural (Tema 1, Tema 1.1, Tema 2...), con su nº de preguntas. */
  readonly temas = computed<TemaInfo[]>(() => {
    const cuenta = new Map<string, number>();
    for (const p of this.banco()) cuenta.set(p.tema, (cuenta.get(p.tema) ?? 0) + 1);
    return [...cuenta]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  });
  readonly totalTemas = computed(() => this.temas().length);
  readonly todosLosTemas = computed(() => this.temasElegidos().length === 0);
  /** Preguntas disponibles con la selección de temas actual. */
  readonly disponibles = computed(() => {
    const elegidos = this.temasElegidos();
    if (!elegidos.length) return this.totalBanco();
    return this.temas()
      .filter((t) => elegidos.includes(t.nombre))
      .reduce((suma, t) => suma + t.total, 0);
  });
  readonly resumenSeleccion = computed(() => resumenTemas(this.temasElegidos()));
  /** Nº de preguntas que tendrá realmente el examen. */
  readonly cantidadEfectiva = computed(() =>
    this.todas() ? this.disponibles() : Math.max(0, Math.min(this.cantidad(), this.disponibles())),
  );
  readonly excede = computed(() => !this.todas() && this.disponibles() > 0 && this.cantidad() > this.disponibles());

  readonly ultimo = computed(() => this.historialService.ultimo(this.asignaturaId()));
  readonly recientes = computed(() => this.historialService.deAsignatura(this.asignaturaId()).slice(0, 3));

  constructor() {
    effect(() => {
      this.bancoService.cargar(this.asignaturaId()).subscribe({ error: () => undefined });
    });
  }

  elegirAsignatura(id: AsignaturaId): void {
    if (id === this.asignaturaId()) return;
    this.examen.asignatura.set(id);
    this.temasElegidos.set([]);
  }

  elegirTodosLosTemas(): void {
    this.temasElegidos.set([]);
  }

  /**
   * Marca o desmarca un tema. Marcarlos todos (o ninguno) equivale a "Todos los temas".
   * La selección se guarda en orden de tema, no en el orden en que se marcaron.
   */
  alternarTema(nombre: string): void {
    const marcados = new Set(this.temasElegidos());
    if (!marcados.delete(nombre)) marcados.add(nombre);
    const nuevos = this.temas()
      .map((t) => t.nombre)
      .filter((t) => marcados.has(t));
    this.temasElegidos.set(nuevos.length === this.totalTemas() ? [] : nuevos);
  }

  temaElegido(nombre: string): boolean {
    return this.temasElegidos().includes(nombre);
  }

  fijarCantidad(valor: number | string): void {
    const n = Math.floor(Number(valor));
    this.todas.set(false);
    this.cantidad.set(Number.isFinite(n) && n > 0 ? n : 1);
  }

  elegirTodas(): void {
    this.todas.set(true);
  }

  resumenTemas(temas?: string[]): string {
    return resumenTemas(temas);
  }

  porcentaje(aciertos: number, total: number): number {
    return total ? Math.round((aciertos / total) * 100) : 0;
  }

  iniciar(): void {
    if (this.disponibles() === 0) return;
    this.examen.iniciar(this.asignaturaId(), this.banco(), this.cantidadEfectiva(), this.temasElegidos());
    this.router.navigate(['/examen']);
  }
}
