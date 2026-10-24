import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ASIGNATURAS, AsignaturaId, LETRAS, Pregunta, infoAsignatura } from '../core/models/models';
import { BancoService } from '../core/services/banco.service';
import { ExamenService } from '../core/services/examen.service';
import { HistorialService } from '../core/services/historial.service';

interface LineaDesglose {
  texto: string;
  ok: boolean;
  nota: string;
}

@Component({
  selector: 'app-resultados',
  imports: [RouterLink, DatePipe],
  templateUrl: './resultados.html',
})
export class Resultados {
  private readonly bancoService = inject(BancoService);
  private readonly historialService = inject(HistorialService);
  private readonly examen = inject(ExamenService);

  readonly asignaturas = ASIGNATURAS;
  readonly asignaturaId = this.examen.asignatura;
  readonly info = computed(() => infoAsignatura(this.asignaturaId()));

  readonly historial = computed(() => this.historialService.deAsignatura(this.asignaturaId()));
  readonly ultimo = computed(() => this.historial()[0]);
  readonly porcentaje = computed(() => {
    const u = this.ultimo();
    return u && u.totalPreguntas ? Math.round((u.aciertos / u.totalPreguntas) * 100) : 0;
  });

  readonly desglose = computed<LineaDesglose[]>(() => {
    const u = this.ultimo();
    const banco = this.bancoService.bancos()[this.asignaturaId()] ?? [];
    const porId = new Map<string, Pregunta>(banco.map((p) => [p.id, p]));
    if (!u) return [];
    return u.detalle.map((d) => {
      const p = porId.get(d.preguntaId);
      if (!p) return { texto: d.preguntaId, ok: d.correcta, nota: d.correcta ? 'Correcta' : 'Incorrecta' };
      const nota = d.correcta
        ? 'Correcta'
        : `Incorrecta · respondiste "${p.opciones[d.respuestaElegida]}", la correcta es "${p.opciones[p.correcta]}"`;
      return { texto: p.pregunta, ok: d.correcta, nota };
    });
  });

  constructor() {
    effect(() => {
      this.bancoService.cargar(this.asignaturaId()).subscribe({ error: () => undefined });
    });
  }

  elegirAsignatura(id: AsignaturaId): void {
    this.examen.asignatura.set(id);
  }

  borrarHistorial(): void {
    const nombre = this.info().nombre;
    if (confirm(`¿Borrar todo el historial de ${nombre}? Esta acción no se puede deshacer.`)) {
      this.historialService.borrar(this.asignaturaId());
    }
  }

  letra(i: number): string {
    return LETRAS[i];
  }
}
