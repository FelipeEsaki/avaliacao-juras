import { Injectable, InjectionToken, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AvaliacaoRegistrada, NovaAvaliacao } from './avaliacao.model';
import { DadosRepository } from './dados.repository';
import { Unidade } from './unidade.model';

/** O PostgREST do Supabase devolve no máximo 1000 linhas por chamada. */
const TAMANHO_PAGINA = 1000;

interface LinhaUnidade {
  id: number;
  nome: string;
  link_google: string | null;
  ativa: boolean;
}

interface LinhaAvaliacao {
  id: number;
  unidade_id: number;
  canal: AvaliacaoRegistrada['canal'];
  nota_lanche: number;
  nota_atendimento: number;
  comentario: string | null;
  numero_pedido: string | null;
  criado_em: string;
}

const paraUnidade = (l: LinhaUnidade): Unidade => ({
  id: l.id,
  nome: l.nome,
  linkGoogle: l.link_google,
  ativa: l.ativa,
});

const paraAvaliacao = (l: LinhaAvaliacao): AvaliacaoRegistrada => ({
  id: l.id,
  unidadeId: l.unidade_id,
  canal: l.canal,
  notaLanche: l.nota_lanche,
  notaAtendimento: l.nota_atendimento,
  comentario: l.comentario,
  numeroPedido: l.numero_pedido,
  criadoEm: l.criado_em,
});

export type FabricaSupabase = () => Promise<SupabaseClient>;

/**
 * O supabase-js é carregado sob demanda. Assim o primeiro carregamento da tela
 * do QR code fica leve, o que conta no 4G do cliente dentro da loja.
 */
export function criarClienteSupabase(): Promise<SupabaseClient> {
  if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
    return Promise.reject(
      new Error('Supabase não configurado. Confira o .env e rode npm start de novo.'),
    );
  }
  return import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    }),
  );
}

/** Ponto de troca do cliente. Nos testes entra um cliente falso no lugar do supabase-js. */
export const FABRICA_SUPABASE = new InjectionToken<FabricaSupabase>('FABRICA_SUPABASE', {
  providedIn: 'root',
  factory: () => criarClienteSupabase,
});

@Injectable()
export class SupabaseDadosRepository extends DadosRepository {
  private readonly fabrica = inject(FABRICA_SUPABASE);
  private cliente?: Promise<SupabaseClient>;

  private obterCliente(): Promise<SupabaseClient> {
    // Se o carregamento falhar (4G caindo, por exemplo), a falha não fica guardada:
    // o "Tentar novamente" da tela precisa conseguir carregar de novo.
    this.cliente ??= this.fabrica().catch((erro: unknown) => {
      this.cliente = undefined;
      throw erro;
    });
    return this.cliente;
  }

  async buscarUnidade(id: number): Promise<Unidade | null> {
    const db = await this.obterCliente();
    const { data, error } = await db
      .from('unidade')
      .select('id, nome, link_google, ativa')
      .eq('id', id)
      .eq('ativa', true)
      .maybeSingle<LinhaUnidade>();
    if (error) throw error;
    return data ? paraUnidade(data) : null;
  }

  async listarUnidades(): Promise<Unidade[]> {
    const db = await this.obterCliente();
    const { data, error } = await db
      .from('unidade')
      .select('id, nome, link_google, ativa')
      .order('id')
      .returns<LinhaUnidade[]>();
    if (error) throw error;
    return (data ?? []).map(paraUnidade);
  }

  async inserirAvaliacao(dados: NovaAvaliacao): Promise<void> {
    const db = await this.obterCliente();
    // Sem .select() de propósito: o cliente anônimo pode inserir, mas não pode ler avaliações.
    const { error } = await db.from('avaliacao').insert({
      unidade_id: dados.unidadeId,
      canal: dados.canal,
      nota_lanche: dados.notaLanche,
      nota_atendimento: dados.notaAtendimento,
      comentario: dados.comentario,
      numero_pedido: dados.numeroPedido,
    });
    if (error) throw error;
  }

  async listarAvaliacoes(desde: Date): Promise<AvaliacaoRegistrada[]> {
    const db = await this.obterCliente();
    const todas: AvaliacaoRegistrada[] = [];
    for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
      const { data, error } = await db
        .from('avaliacao')
        .select(
          'id, unidade_id, canal, nota_lanche, nota_atendimento, comentario, numero_pedido, criado_em',
        )
        .gte('criado_em', desde.toISOString())
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })
        .range(inicio, inicio + TAMANHO_PAGINA - 1)
        .returns<LinhaAvaliacao[]>();
      if (error) throw error;
      const pagina = data ?? [];
      todas.push(...pagina.map(paraAvaliacao));
      if (pagina.length < TAMANHO_PAGINA) return todas;
    }
  }

  async entrar(email: string, senha: string): Promise<boolean> {
    const db = await this.obterCliente();
    const { error } = await db.auth.signInWithPassword({ email, password: senha });
    return !error;
  }

  async sair(): Promise<void> {
    const db = await this.obterCliente();
    await db.auth.signOut();
  }

  async temSessao(): Promise<boolean> {
    const db = await this.obterCliente();
    const { data } = await db.auth.getSession();
    return data.session !== null;
  }
}
