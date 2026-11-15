import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NOMES_CANAL, NOTA_BAIXA } from '../../core/avaliacao.model';
import { formatarDataHora, formatarMedia } from '../../core/formatos';
import { PainelService, ResumoPainel } from '../../core/painel.service';
import { IconeAlerta, IconeAlertaBranco } from '../../shared/icones';

type Estado = 'carregando' | 'erro' | 'pronto';

export const PERIODOS = [
  { dias: 7, nome: 'Últimos 7 dias' },
  { dias: 30, nome: 'Últimos 30 dias' },
  { dias: 90, nome: 'Últimos 90 dias' },
] as const;

@Component({
  selector: 'app-painel',
  imports: [IconeAlerta, IconeAlertaBranco],
  templateUrl: './painel.html',
})
export class Painel {
  private readonly painel = inject(PainelService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private requisicao = 0;

  protected readonly periodos = PERIODOS;
  protected readonly nomesCanal = NOMES_CANAL;
  protected readonly notaBaixa = NOTA_BAIXA;
  protected readonly formatarMedia = formatarMedia;
  protected readonly formatarDataHora = formatarDataHora;

  protected readonly dias = signal(30);
  protected readonly estado = signal<Estado>('carregando');
  protected readonly resumo = signal<ResumoPainel>({ medias: [], notasBaixas: [] });

  constructor() {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    // Se o gestor trocar o período rápido, só a última resposta vale.
    const atual = ++this.requisicao;
    this.estado.set('carregando');
    try {
      const resumo = await this.painel.carregar(this.dias());
      if (atual !== this.requisicao) return;
      this.resumo.set(resumo);
      this.estado.set('pronto');
    } catch (erro) {
      console.error('Falha ao carregar o painel:', erro);
      if (atual === this.requisicao) this.estado.set('erro');
    }
  }

  protected mudarPeriodo(evento: Event): void {
    this.dias.set(Number((evento.target as HTMLSelectElement).value));
    void this.carregar();
  }

  protected async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigate(['/login']);
  }
}
