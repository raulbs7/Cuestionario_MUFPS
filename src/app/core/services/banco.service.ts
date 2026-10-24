import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { AsignaturaId, Pregunta } from '../models/models';

@Injectable({ providedIn: 'root' })
export class BancoService {
  private readonly http = inject(HttpClient);

  /** Bancos ya cargados, por asignatura. */
  readonly bancos = signal<Partial<Record<AsignaturaId, Pregunta[]>>>({});
  readonly error = signal<string | null>(null);

  cargar(id: AsignaturaId): Observable<Pregunta[]> {
    const cacheado = this.bancos()[id];
    if (cacheado) return of(cacheado);
    return this.http.get<Pregunta[]>(`assets/data/${id}.json`).pipe(
      tap({
        next: (preguntas) => {
          this.error.set(null);
          this.bancos.update((b) => ({ ...b, [id]: preguntas }));
        },
        error: () => this.error.set('No se pudo cargar el banco de preguntas.'),
      }),
    );
  }
}
