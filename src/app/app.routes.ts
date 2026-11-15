import { Routes } from '@angular/router';
import { Avaliar } from './features/avaliar/avaliar';
import { Obrigado } from './features/obrigado/obrigado';

export const routes: Routes = [
  // O QR code aponta para /avaliar?u=<id da unidade>&c=<mesa|embalagem|delivery>
  { path: '', pathMatch: 'full', redirectTo: 'avaliar' },
  { path: 'avaliar', component: Avaliar, title: "Avalie seu pedido - Jura's" },
  { path: 'obrigado', component: Obrigado, title: "Avaliação enviada - Jura's" },
  { path: '**', redirectTo: 'avaliar' },
];
