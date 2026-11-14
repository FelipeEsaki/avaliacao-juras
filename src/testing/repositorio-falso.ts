import { vi } from 'vitest';
import { AvaliacaoRegistrada, NovaAvaliacao } from '../app/core/avaliacao.model';
import { DadosRepository } from '../app/core/dados.repository';
import { Unidade } from '../app/core/unidade.model';

export const UNIDADES_TESTE: Unidade[] = [
  {
    id: 1,
    nome: 'São José do Rio Preto',
    linkGoogle: 'https://www.google.com/maps/rio-preto',
    ativa: true,
  },
  { id: 2, nome: 'Bady Bassitt', linkGoogle: 'https://www.google.com/maps/bady', ativa: true },
  { id: 3, nome: 'Mirassol', linkGoogle: null, ativa: false },
];

export function avaliacaoTeste(parcial: Partial<AvaliacaoRegistrada> = {}): AvaliacaoRegistrada {
  return {
    id: 1,
    unidadeId: 1,
    canal: 'mesa',
    notaLanche: 5,
    notaAtendimento: 5,
    comentario: null,
    numeroPedido: null,
    criadoEm: '2026-11-12T23:14:00.000Z',
    ...parcial,
  };
}

/** Banco em memória no lugar do Supabase. Cada método é um spy do Vitest. */
export class RepositorioFalso extends DadosRepository {
  unidades: Unidade[] = [...UNIDADES_TESTE];
  avaliacoes: AvaliacaoRegistrada[] = [];
  inseridas: NovaAvaliacao[] = [];
  logado = false;
  falharRede = false;

  private verificarRede() {
    if (this.falharRede) {
      return Promise.reject(new TypeError('Failed to fetch'));
    }
    return Promise.resolve();
  }

  buscarUnidade = vi.fn(async (id: number) => {
    await this.verificarRede();
    return this.unidades.find((u) => u.id === id && u.ativa) ?? null;
  });

  listarUnidades = vi.fn(async () => {
    await this.verificarRede();
    return [...this.unidades];
  });

  inserirAvaliacao = vi.fn(async (dados: NovaAvaliacao) => {
    await this.verificarRede();
    this.inseridas.push(dados);
  });

  listarAvaliacoes = vi.fn(async (desde: Date) => {
    await this.verificarRede();
    return this.avaliacoes.filter((a) => new Date(a.criadoEm) >= desde);
  });

  entrar = vi.fn(async (email: string, senha: string) => {
    await this.verificarRede();
    this.logado = email === 'gestor@juras.com.br' && senha === 'senha-certa';
    return this.logado;
  });

  sair = vi.fn(async () => {
    this.logado = false;
  });

  temSessao = vi.fn(async () => this.logado);
}
