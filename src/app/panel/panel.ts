import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ASIGNATURAS, AsignaturaId, infoAsignatura } from '../core/models/models';
import { BancoService } from '../core/services/banco.service';
import { ExamenService } from '../core/services/examen.service';
import { HistorialService } from '../core/services/historial.service';

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

  readonly banco = computed(() => this.bancoService.bancos()[this.asignaturaId()] ?? []);
  readonly totalBanco = computed(() => this.banco().length);
  readonly totalTemas = computed(() => new Set(this.banco().map((p) => p.tema)).size);
  /** Nº de preguntas que tendrá realmente el examen. */
  readonly cantidadEfectiva = computed(() => Math.max(0, Math.min(this.cantidad(), this.totalBanco())));
  readonly excede = computed(() => this.totalBanco() > 0 && this.cantidad() > this.totalBanco());
  readonly esTodas = computed(() => this.totalBanco() > 0 && this.cantidad() === this.totalBanco());

  readonly ultimo = computed(() => this.historialService.ultimo(this.asignaturaId()));
  readonly recientes = computed(() => this.historialService.deAsignatura(this.asignaturaId()).slice(0, 3));

  constructor() {
    effect(() => {
      this.bancoService.cargar(this.asignaturaId()).subscribe({ error: () => undefined });
    });
  }

  elegirAsignatura(id: AsignaturaId): void {
    this.examen.asignatura.set(id);
  }

  fijarCantidad(valor: number | string): void {
    const n = Math.floor(Number(valor));
    this.cantidad.set(Number.isFinite(n) && n > 0 ? n : 1);
  }

  elegirTodas(): void {
    this.cantidad.set(this.totalBanco());
  }

  porcentaje(aciertos: number, total: number): number {
    return total ? Math.round((aciertos / total) * 100) : 0;
  }

  iniciar(): void {
    if (this.totalBanco() === 0) return;
    this.examen.iniciar(this.asignaturaId(), this.banco(), this.cantidad());
    this.router.navigate(['/examen']);
  }
}
