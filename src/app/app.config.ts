import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Rutas con hash (#/panel): las recargas funcionan en GitHub Pages sin 404.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
