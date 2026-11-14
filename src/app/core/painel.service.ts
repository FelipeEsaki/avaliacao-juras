import { Injectable, inject } from '@angular/core';
import { AvaliacaoRegistrada, ehNotaBaixa } from './avaliacao.model';
import { DadosRepository } from './dados.repository';
import { Unidade } from './unidade.model';

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export interface MediaUnidade {
  unidadeId: number;
  nome: string;
  quantidade: number;
  /** null quando a unidade não teve avaliação no período. */
  mediaLanche: number | null;
  mediaAtendimento: number | null;
}

export interface NotaBaixa extends AvaliacaoRegistrada {
  nomeUnidade: string;
}

export interface ResumoPainel {
  medias: MediaUnidade[];
  notasBaixas: NotaBaixa[];
}

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

export function calcularMedias(
  unidades: Unidade[],
  avaliacoes: AvaliacaoRegistrada[],
): MediaUnidade[] {
  return unidades.map((unidade) => {
    const daUnidade = avaliacoes.filter((a) => a.unidadeId === unidade.id);
    const quantidade = daUnidade.length;
    const soma = (campo: 'notaLanche' | 'notaAtendimento') =>
      daUnidade.reduce((total, a) => total + a[campo], 0);
    return {
      unidadeId: unidade.id,
      nome: unidade.nome,
      quantidade,
      mediaLanche: quantidade ? arredondar(soma('notaLanche') / quantidade) : null,
      mediaAtendimento: quantidade ? arredondar(soma('notaAtendimento') / quantidade) : null,
    };
  });
}

export function filtrarNotasBaixas(
  unidades: Unidade[],
  avaliacoes: AvaliacaoRegistrada[],
): NotaBaixa[] {
  const nomes = new Map(unidades.map((u) => [u.id, u.nome]));
  return avaliacoes
    .filter(ehNotaBaixa)
    .map((a) => ({ ...a, nomeUnidade: nomes.get(a.unidadeId) ?? `Unidade ${a.unidadeId}` }))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

@Injectable({ providedIn: 'root' })
export class PainelService {
  private readonly repo = inject(DadosRepository);

  async carregar(dias: number, agora = new Date()): Promise<ResumoPainel> {
    const desde = new Date(agora.getTime() - dias * UM_DIA_MS);
    const [unidades, avaliacoes] = await Promise.all([
      this.repo.listarUnidades(),
      this.repo.listarAvaliacoes(desde),
    ]);
    return {
      medias: calcularMedias(unidades, avaliacoes),
      notasBaixas: filtrarNotasBaixas(unidades, avaliacoes),
    };
  }
}
