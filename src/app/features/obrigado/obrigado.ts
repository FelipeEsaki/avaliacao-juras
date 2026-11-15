import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ehNotaValida } from '../../core/avaliacao.model';
import { IconeOk } from '../../shared/icones';
import { Topo } from '../../shared/topo/topo';

export interface ResumoEnvio {
  notaLanche: number;
  notaAtendimento: number;
  nomeUnidade: string;
  linkGoogle: string | null;
}

/** O estado da navegação vem do history, então é tratado como dado não confiável. */
export function lerResumo(estado: unknown): ResumoEnvio | null {
  const resumo = (estado as { resumo?: Partial<ResumoEnvio> } | null)?.resumo;
  if (
    !resumo ||
    !ehNotaValida(resumo.notaLanche) ||
    !ehNotaValida(resumo.notaAtendimento) ||
    typeof resumo.nomeUnidade !== 'string'
  ) {
    return null;
  }
  const link =
    typeof resumo.linkGoogle === 'string' && /^https:\/\//.test(resumo.linkGoogle)
      ? resumo.linkGoogle
      : null;
  return {
    notaLanche: resumo.notaLanche,
    notaAtendimento: resumo.notaAtendimento,
    nomeUnidade: resumo.nomeUnidade,
    linkGoogle: link,
  };
}

@Component({
  selector: 'app-obrigado',
  imports: [Topo, IconeOk],
  template: `
    <div class="app">
      <app-topo
        titulo="Avalie seu pedido"
        [subtitulo]="resumo ? 'Jura\\'s ' + resumo.nomeUnidade : null"
      />
      <main class="ok">
        <div class="okic"><app-icone-ok /></div>
        <h2 #titulo tabindex="-1">Obrigado! Sua avaliação foi enviada.</h2>
        <p>Sua opinião vai direto para a gerência do Jura's.</p>
        @if (resumo) {
          <div class="summary">
            <strong>Resumo</strong><br />
            Lanche: {{ resumo.notaLanche }} de 5<br />
            Atendimento: {{ resumo.notaAtendimento }} de 5
          </div>
          @if (resumo.linkGoogle) {
            <a class="btn sec" [href]="resumo.linkGoogle" target="_blank" rel="noopener noreferrer">
              Avaliar também no Google
            </a>
            <p class="note">
              Opcional. Abre direto a avaliação da Jura's {{ resumo.nomeUnidade }} no Google, onde
              outros clientes podem ler.
            </p>
          }
        }
      </main>
    </div>
  `,
})
export class Obrigado {
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');
  protected readonly resumo = lerResumo(
    inject(Router).currentNavigation()?.extras.state ?? globalThis.history?.state,
  );

  constructor() {
    // Leva o foco para a confirmação, senão o leitor de tela não percebe que a página mudou.
    afterNextRender(() => this.titulo().nativeElement.focus());
  }
}
