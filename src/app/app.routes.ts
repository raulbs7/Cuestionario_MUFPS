import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  { path: 'panel', loadComponent: () => import('./panel/panel').then((m) => m.Panel) },
  { path: 'examen', loadComponent: () => import('./examen/examen').then((m) => m.Examen) },
  { path: 'resultados', loadComponent: () => import('./resultados/resultados').then((m) => m.Resultados) },
  { path: '**', redirectTo: 'panel' },
];
