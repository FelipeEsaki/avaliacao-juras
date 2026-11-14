import { AvaliacaoRegistrada, NovaAvaliacao } from './avaliacao.model';
import { Unidade } from './unidade.model';

/**
 * Contrato de acesso a dados. A implementação real usa Supabase
 * (supabase-dados.repository.ts) e é o único ponto do app que conhece o supabase-js.
 * Nos testes entra um mock no lugar desta classe.
 */
export abstract class DadosRepository {
  /** Retorna a unidade só se existir e estiver ativa. */
  abstract buscarUnidade(id: number): Promise<Unidade | null>;
  abstract listarUnidades(): Promise<Unidade[]>;
  abstract inserirAvaliacao(dados: NovaAvaliacao): Promise<void>;
  /** Todas as avaliações a partir da data, já paginadas. */
  abstract listarAvaliacoes(desde: Date): Promise<AvaliacaoRegistrada[]>;

  abstract entrar(email: string, senha: string): Promise<boolean>;
  abstract sair(): Promise<void>;
  abstract temSessao(): Promise<boolean>;
}
