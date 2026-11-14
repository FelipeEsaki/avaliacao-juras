import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { DadosRepository } from './core/dados.repository';
import { SupabaseDadosRepository } from './core/supabase-dados.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: DadosRepository, useClass: SupabaseDadosRepository },
  ],
};
