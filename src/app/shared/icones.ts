import { Component } from '@angular/core';

/** Ícones do protótipo. Todos decorativos: o texto ao lado já diz o que é. */

@Component({
  selector: 'app-icone-check',
  template: `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="#fff"
      stroke-width="3.2"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`,
})
export class IconeCheck {}

@Component({
  selector: 'app-icone-alerta',
  template: `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3l10 18H2z" fill="#b3261e" />
    <path d="M12 10v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
    <circle cx="12" cy="18" r="1.3" fill="#fff" />
  </svg>`,
})
export class IconeAlerta {}

@Component({
  selector: 'app-icone-alerta-branco',
  template: `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3l10 18H2z" fill="#fff" />
    <path d="M12 10v5" stroke="#b3261e" stroke-width="2.6" stroke-linecap="round" />
    <circle cx="12" cy="18" r="1.4" fill="#b3261e" />
  </svg>`,
})
export class IconeAlertaBranco {}

@Component({
  selector: 'app-icone-ok',
  template: `<svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="#1e6b34"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`,
})
export class IconeOk {}
