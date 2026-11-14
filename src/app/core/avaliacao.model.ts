export const CANAIS = ['mesa', 'embalagem', 'delivery'] as const;
export type Canal = (typeof CANAIS)[number];

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const NOTA_BAIXA = 2;
export const LIMITE_COMENTARIO = 500;
export const LIMITE_PEDIDO = 10;

export const NOMES_CANAL: Record<Canal, string> = {
  mesa: 'Mesa',
  embalagem: 'Embalagem',
  delivery: 'Delivery',
};

/** O que sai da tela do cliente, antes de ir para o banco. */
export interface NovaAvaliacao {
  unidadeId: number;
  canal: Canal;
  notaLanche: number;
  notaAtendimento: number;
  comentario: string | null;
  numeroPedido: string | null;
}

/** Avaliação já gravada, como o painel recebe. */
export interface AvaliacaoRegistrada extends NovaAvaliacao {
  id: number;
  criadoEm: string;
}

export interface EntradaAvaliacao {
  unidadeId: number;
  canal: Canal;
  notaLanche: number | null;
  notaAtendimento: number | null;
  comentario: string;
  numeroPedido: string;
}

export function ehCanal(valor: unknown): valor is Canal {
  return typeof valor === 'string' && (CANAIS as readonly string[]).includes(valor);
}

export function ehNotaValida(nota: unknown): nota is number {
  return (
    Number.isInteger(nota) && (nota as number) >= NOTA_MINIMA && (nota as number) <= NOTA_MAXIMA
  );
}

/** Tira espaços sobrando e troca texto vazio por null, que é como o banco guarda. */
export function normalizarAvaliacao(entrada: EntradaAvaliacao): NovaAvaliacao {
  const comentario = entrada.comentario.trim();
  const pedido = entrada.numeroPedido.trim();
  return {
    unidadeId: entrada.unidadeId,
    canal: entrada.canal,
    notaLanche: entrada.notaLanche ?? NaN,
    notaAtendimento: entrada.notaAtendimento ?? NaN,
    comentario: comentario === '' ? null : comentario,
    numeroPedido: pedido === '' ? null : pedido,
  };
}

/**
 * Mesmas regras dos CHECKs do banco. O banco continua sendo a barreira final,
 * aqui é só para o cliente ver o erro antes de enviar.
 */
export function validarAvaliacao(dados: NovaAvaliacao): string[] {
  const erros: string[] = [];
  if (!Number.isInteger(dados.unidadeId) || dados.unidadeId <= 0) {
    erros.push('Unidade inválida.');
  }
  if (!ehCanal(dados.canal)) {
    erros.push('Canal inválido.');
  }
  if (!ehNotaValida(dados.notaLanche)) {
    erros.push('Escolha uma nota de 1 a 5 para o lanche.');
  }
  if (!ehNotaValida(dados.notaAtendimento)) {
    erros.push('Escolha uma nota de 1 a 5 para o atendimento.');
  }
  if (dados.comentario !== null && dados.comentario.length > LIMITE_COMENTARIO) {
    erros.push(`O comentário pode ter até ${LIMITE_COMENTARIO} caracteres.`);
  }
  if (
    dados.numeroPedido !== null &&
    !new RegExp(`^\\d{1,${LIMITE_PEDIDO}}$`).test(dados.numeroPedido)
  ) {
    erros.push(`O número do pedido aceita só números, até ${LIMITE_PEDIDO} dígitos.`);
  }
  return erros;
}

export function ehNotaBaixa(
  avaliacao: Pick<NovaAvaliacao, 'notaLanche' | 'notaAtendimento'>,
): boolean {
  return avaliacao.notaLanche <= NOTA_BAIXA || avaliacao.notaAtendimento <= NOTA_BAIXA;
}
