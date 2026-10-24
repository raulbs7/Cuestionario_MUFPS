import { Injectable, signal } from '@angular/core';
import { AsignaturaId, IntentoGuardado } from '../models/models';

const CLAVE = 'cuestionario.intentos';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  /** Copia en memoria del historial: los componentes que la leen se actualizan solos. */
  private readonly intentos = signal<IntentoGuardado[]>(this.leer());

  todos(): IntentoGuardado[] {
    return this.intentos();
  }

  /** Intentos de una asignatura, del más reciente al más antiguo. */
  deAsignatura(id: AsignaturaId): IntentoGuardado[] {
    return this.intentos()
      .filter((i) => i.asignatura === id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  ultimo(id: AsignaturaId): IntentoGuardado | undefined {
    return this.deAsignatura(id)[0];
  }

  guardar(intento: IntentoGuardado): void {
    this.actualizar([...this.intentos(), intento]);
  }

  /** Borra el historial de una asignatura. */
  borrar(id: AsignaturaId): void {
    this.actualizar(this.intentos().filter((i) => i.asignatura !== id));
  }

  private actualizar(intentos: IntentoGuardado[]): void {
    this.intentos.set(intentos);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(intentos));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota...): la sesión actual sigue funcionando.
    }
  }

  private leer(): IntentoGuardado[] {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }
}
