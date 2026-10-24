import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LETRAS, infoAsignatura } from '../core/models/models';
import { ExamenService } from '../core/services/examen.service';

@Component({
  selector: 'app-examen',
  imports: [RouterLink],
  templateUrl: './examen.html',
})
export class Examen {
  readonly examen = inject(ExamenService);
  readonly letras = LETRAS;

  readonly nombre = computed(() => infoAsignatura(this.examen.asignatura()).nombre);
  readonly progreso = computed(() => Math.round(((this.examen.indice() + 1) / Math.max(1, this.examen.total())) * 100));
  readonly acierto = computed(() => {
    const e = this.examen.elegida();
    return e !== null && e === this.examen.actual()?.correcta;
  });

  constructor() {
    // Sin examen en curso (p. ej. al recargar la página) se vuelve al panel.
    if (!this.examen.enCurso()) inject(Router).navigate(['/panel']);
  }

  claseOpcion(i: number): string {
    const e = this.examen;
    if (!e.respondida()) return '';
    if (i === e.actual().correcta) return 'correct';
    return i === e.elegida() ? 'incorrect' : '';
  }
}
