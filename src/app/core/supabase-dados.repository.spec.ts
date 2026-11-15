import { TestBed } from '@angular/core/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FABRICA_SUPABASE, SupabaseDadosRepository } from './supabase-dados.repository';

type Resultado = { data?: unknown; error?: unknown; count?: number };

/**
 * Imita o construtor de consultas do supabase-js: cada método devolve a própria consulta
 * e o await resolve com o resultado configurado. Guarda as chamadas para conferir os filtros.
 */
class ConsultaFalsa implements PromiseLike<Resultado> {
  readonly chamadas: [string, unknown[]][] = [];

  constructor(
    readonly tabela: string,
    private readonly responder: (consulta: ConsultaFalsa) => Resultado,
  ) {}

  private registrar(nome: string, args: unknown[]): this {
    this.chamadas.push([nome, args]);
    return this;
  }

  select = (...a: unknown[]) => this.registrar('select', a);
  insert = (...a: unknown[]) => this.registrar('insert', a);
  eq = (...a: unknown[]) => this.registrar('eq', a);
  gte = (...a: unknown[]) => this.registrar('gte', a);
  order = (...a: unknown[]) => this.registrar('order', a);
  range = (...a: unknown[]) => this.registrar('range', a);
  returns = () => this;
  maybeSingle = () => this.registrar('maybeSingle', []);

  argumentos(nome: string): unknown[][] {
    return this.chamadas.filter(([n]) => n === nome).map(([, a]) => a);
  }

  then<A = Resultado, B = never>(
    ok?: ((valor: Resultado) => A | PromiseLike<A>) | null,
    erro?: ((motivo: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.responder(this)).then(ok, erro);
  }
}

function clienteFalso(responder: (consulta: ConsultaFalsa) => Resultado) {
  const consultas: ConsultaFalsa[] = [];
  const auth = {
    signInWithPassword: vi.fn(async ({ password }: { email: string; password: string }) =>
      password === 'senha-certa'
        ? { error: null }
        : { error: { message: 'Invalid login credentials' } },
    ),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session: null as object | null } })),
  };
  const cliente = {
    from: (tabela: string) => {
      const consulta = new ConsultaFalsa(tabela, responder);
      consultas.push(consulta);
      return consulta;
    },
    auth,
  };
  return { cliente: cliente as unknown as SupabaseClient, consultas, auth };
}

const linhaAvaliacao = (id: number) => ({
  id,
  unidade_id: 1,
  canal: 'mesa',
  nota_lanche: 4,
  nota_atendimento: 2,
  comentario: null,
  numero_pedido: null,
  criado_em: '2026-11-14T20:00:00Z',
});

describe('SupabaseDadosRepository', () => {
  let falso: ReturnType<typeof clienteFalso>;
  let fabrica: ReturnType<typeof vi.fn>;
  let repo: SupabaseDadosRepository;
  let responder: (consulta: ConsultaFalsa) => Resultado;

  beforeEach(() => {
    responder = () => ({ data: [], error: null });
    falso = clienteFalso((c) => responder(c));
    fabrica = vi.fn(async () => falso.cliente);
    TestBed.configureTestingModule({
      providers: [SupabaseDadosRepository, { provide: FABRICA_SUPABASE, useValue: fabrica }],
    });
    repo = TestBed.inject(SupabaseDadosRepository);
  });

  it('busca só unidade ativa e converte os nomes das colunas', async () => {
    responder = () => ({
      data: { id: 2, nome: 'Bady Bassitt', link_google: 'https://g.page/r/x', ativa: true },
      error: null,
    });

    const unidade = await repo.buscarUnidade(2);

    expect(unidade).toEqual({
      id: 2,
      nome: 'Bady Bassitt',
      linkGoogle: 'https://g.page/r/x',
      ativa: true,
    });
    const consulta = falso.consultas[0];
    expect(consulta.tabela).toBe('unidade');
    expect(consulta.argumentos('eq')).toEqual([
      ['id', 2],
      ['ativa', true],
    ]);
  });

  it('devolve null quando a unidade não existe e lança quando o banco responde com erro', async () => {
    responder = () => ({ data: null, error: null });
    expect(await repo.buscarUnidade(99)).toBeNull();

    responder = () => ({ data: null, error: { message: 'permission denied' } });
    await expect(repo.buscarUnidade(1)).rejects.toEqual({ message: 'permission denied' });
    await expect(repo.listarUnidades()).rejects.toEqual({ message: 'permission denied' });
    await expect(repo.listarAvaliacoes(new Date())).rejects.toEqual({
      message: 'permission denied',
    });
  });

  it('lista as unidades ordenadas por id', async () => {
    responder = () => ({
      data: [{ id: 1, nome: 'Mirassol', link_google: null, ativa: false }],
      error: null,
    });

    expect(await repo.listarUnidades()).toEqual([
      { id: 1, nome: 'Mirassol', linkGoogle: null, ativa: false },
    ]);
    expect(falso.consultas[0].argumentos('order')).toEqual([['id']]);
  });

  it('insere a avaliação com os nomes das colunas do banco e sem pedir o registro de volta', async () => {
    responder = () => ({ error: null });

    await repo.inserirAvaliacao({
      unidadeId: 3,
      canal: 'delivery',
      notaLanche: 5,
      notaAtendimento: 1,
      comentario: 'Chegou frio.',
      numeroPedido: '4821',
    });

    const consulta = falso.consultas[0];
    expect(consulta.tabela).toBe('avaliacao');
    expect(consulta.argumentos('insert')).toEqual([
      [
        {
          unidade_id: 3,
          canal: 'delivery',
          nota_lanche: 5,
          nota_atendimento: 1,
          comentario: 'Chegou frio.',
          numero_pedido: '4821',
        },
      ],
    ]);
    // Sem select: o cliente anônimo não tem permissão de leitura em avaliacao.
    expect(consulta.argumentos('select')).toEqual([]);
  });

  it('repassa o erro do banco quando o insert é recusado', async () => {
    responder = () => ({ error: { code: '42501' } });
    await expect(
      repo.inserirAvaliacao({
        unidadeId: 1,
        canal: 'mesa',
        notaLanche: 5,
        notaAtendimento: 5,
        comentario: null,
        numeroPedido: null,
      }),
    ).rejects.toEqual({ code: '42501' });
  });

  it('pagina de 1000 em 1000 até a última página e converte as linhas', async () => {
    const total = Array.from({ length: 2500 }, (_, i) => linhaAvaliacao(i + 1));
    responder = (consulta) => {
      const [inicio, fim] = consulta.argumentos('range')[0] as [number, number];
      return { data: total.slice(inicio, fim + 1), error: null };
    };
    const desde = new Date('2026-10-15T12:00:00Z');

    const avaliacoes = await repo.listarAvaliacoes(desde);

    expect(avaliacoes).toHaveLength(2500);
    expect(avaliacoes[0]).toEqual({
      id: 1,
      unidadeId: 1,
      canal: 'mesa',
      notaLanche: 4,
      notaAtendimento: 2,
      comentario: null,
      numeroPedido: null,
      criadoEm: '2026-11-14T20:00:00Z',
    });
    expect(falso.consultas.map((c) => c.argumentos('range')[0])).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(falso.consultas[0].argumentos('gte')).toEqual([
      ['criado_em', '2026-10-15T12:00:00.000Z'],
    ]);
  });

  it('para na primeira página quando vem menos de 1000 linhas', async () => {
    responder = () => ({ data: [linhaAvaliacao(1)], error: null });
    expect(await repo.listarAvaliacoes(new Date())).toHaveLength(1);
    expect(falso.consultas).toHaveLength(1);
  });

  it('login devolve true ou false sem lançar, e sair encerra a sessão', async () => {
    expect(await repo.entrar('gestor@juras.com.br', 'senha-certa')).toBe(true);
    expect(await repo.entrar('gestor@juras.com.br', 'errada')).toBe(false);
    await repo.sair();
    expect(falso.auth.signOut).toHaveBeenCalled();
  });

  it('informa se existe sessão salva', async () => {
    expect(await repo.temSessao()).toBe(false);
    falso.auth.getSession.mockResolvedValueOnce({ data: { session: { access_token: 'x' } } });
    expect(await repo.temSessao()).toBe(true);
  });

  it('cria o cliente uma vez só e reaproveita nas próximas consultas', async () => {
    await repo.listarUnidades();
    await repo.listarUnidades();
    expect(fabrica).toHaveBeenCalledTimes(1);
  });

  it('se o carregamento do cliente falhar, a próxima tentativa carrega de novo', async () => {
    fabrica.mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'));

    await expect(repo.listarUnidades()).rejects.toThrow('Failed to fetch');
    await expect(repo.listarUnidades()).resolves.toEqual([]);
    expect(fabrica).toHaveBeenCalledTimes(2);
  });
});
