import { Component, input } from '@angular/core';

@Component({
  selector: 'app-topo',
  template: `
    <header class="top">
      <img class="logo" src="logo-juras.png" alt="Logo Jura's" width="60" height="60" />
      <div>
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
    </header>
  `,
})
export class Topo {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);
}
