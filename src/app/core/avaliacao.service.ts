import { Injectable, inject } from '@angular/core';
import {
  EntradaAvaliacao,
  NovaAvaliacao,
  normalizarAvaliacao,
  validarAvaliacao,
} from './avaliacao.model';
import { DadosRepository } from './dados.repository';
import { Unidade } from './unidade.model';

const CHAVE_ENVIOS = 'juras.avaliacao.envios';
/** Depois de enviar, o mesmo aparelho espera esse tempo para avaliar a mesma unidade de novo. */
export const INTERVALO_REENVIO_MS = 2 * 60 * 60 * 1000;

export class ErroValidacao extends Error {
  constructor(readonly erros: string[]) {
    super(erros.join(' '));
    this.name = 'ErroValidacao';
  }
}

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly repo = inject(DadosRepository);

  /** null quando o id não existe ou a unidade foi desativada (QR code antigo). */
  buscarUnidade(id: number): Promise<Unidade | null> {
    return this.repo.buscarUnidade(id);
  }

  /**
   * Trava simples contra clique duplo e reenvio na sequência. Não é segurança:
   * quem limpar o navegador consegue enviar de novo. Está documentado como limitação.
   */
  avaliouRecentemente(unidadeId: number, agora = Date.now()): boolean {
    const ultimo = this.lerEnvios()[unidadeId];
    return typeof ultimo === 'number' && agora - ultimo < INTERVALO_REENVIO_MS;
  }

  async enviar(entrada: EntradaAvaliacao, agora = Date.now()): Promise<NovaAvaliacao> {
    const dados = normalizarAvaliacao(entrada);
    const erros = validarAvaliacao(dados);
    if (erros.length > 0) {
      throw new ErroValidacao(erros);
    }
    await this.repo.inserirAvaliacao(dados);
    this.registrarEnvio(dados.unidadeId, agora);
    return dados;
  }

  private lerEnvios(): Record<number, number> {
    try {
      const bruto = localStorage.getItem(CHAVE_ENVIOS);
      const valor: unknown = bruto ? JSON.parse(bruto) : {};
      return valor && typeof valor === 'object' ? (valor as Record<number, number>) : {};
    } catch {
      // Aba anônima ou storage bloqueado: segue sem a trava.
      return {};
    }
  }

  private registrarEnvio(unidadeId: number, agora: number): void {
    try {
      const envios = this.lerEnvios();
      envios[unidadeId] = agora;
      localStorage.setItem(CHAVE_ENVIOS, JSON.stringify(envios));
    } catch {
      // Sem storage, sem trava. A avaliação já foi gravada, então não é erro para o cliente.
    }
  }
}
