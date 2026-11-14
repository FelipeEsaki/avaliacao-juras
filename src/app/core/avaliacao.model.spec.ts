import { describe, expect, it } from 'vitest';
import {
  EntradaAvaliacao,
  NovaAvaliacao,
  ehCanal,
  ehNotaBaixa,
  ehNotaValida,
  normalizarAvaliacao,
  validarAvaliacao,
} from './avaliacao.model';

const valida = (parcial: Partial<NovaAvaliacao> = {}): NovaAvaliacao => ({
  unidadeId: 1,
  canal: 'mesa',
  notaLanche: 4,
  notaAtendimento: 5,
  comentario: null,
  numeroPedido: null,
  ...parcial,
});

describe('modelo Avaliacao', () => {
  describe('validarAvaliacao', () => {
    it('aceita uma avaliação completa e correta', () => {
      expect(validarAvaliacao(valida({ comentario: 'Muito bom', numeroPedido: '4821' }))).toEqual(
        [],
      );
    });

    it.each([0, 6, 3.5, NaN])('recusa nota do lanche %s', (nota) => {
      expect(validarAvaliacao(valida({ notaLanche: nota }))).toContain(
        'Escolha uma nota de 1 a 5 para o lanche.',
      );
    });

    it('recusa nota do atendimento vazia', () => {
      expect(validarAvaliacao(valida({ notaAtendimento: NaN }))).toContain(
        'Escolha uma nota de 1 a 5 para o atendimento.',
      );
    });

    it('aceita comentário com exatamente 500 caracteres e recusa com 501', () => {
      expect(validarAvaliacao(valida({ comentario: 'a'.repeat(500) }))).toEqual([]);
      expect(validarAvaliacao(valida({ comentario: 'a'.repeat(501) }))).toEqual([
        'O comentário pode ter até 500 caracteres.',
      ]);
    });

    it.each(['12a', '-1', '12345678901', '48 21'])('recusa número de pedido "%s"', (pedido) => {
      expect(validarAvaliacao(valida({ numeroPedido: pedido }))).toHaveLength(1);
    });

    it('recusa canal e unidade inválidos', () => {
      const erros = validarAvaliacao(valida({ canal: 'balcao' as never, unidadeId: 0 }));
      expect(erros).toEqual(['Unidade inválida.', 'Canal inválido.']);
    });
  });

  describe('normalizarAvaliacao', () => {
    const entrada = (parcial: Partial<EntradaAvaliacao> = {}): EntradaAvaliacao => ({
      unidadeId: 1,
      canal: 'delivery',
      notaLanche: 3,
      notaAtendimento: 2,
      comentario: '',
      numeroPedido: '',
      ...parcial,
    });

    it('troca texto vazio ou só com espaço por null', () => {
      const dados = normalizarAvaliacao(entrada({ comentario: '   ', numeroPedido: ' ' }));
      expect(dados.comentario).toBeNull();
      expect(dados.numeroPedido).toBeNull();
    });

    it('tira os espaços das pontas do comentário e do pedido', () => {
      const dados = normalizarAvaliacao(
        entrada({ comentario: '  Chegou frio. ', numeroPedido: ' 4821 ' }),
      );
      expect(dados.comentario).toBe('Chegou frio.');
      expect(dados.numeroPedido).toBe('4821');
    });

    it('nota não escolhida vira NaN, e a validação barra', () => {
      const dados = normalizarAvaliacao(entrada({ notaLanche: null }));
      expect(validarAvaliacao(dados)).toContain('Escolha uma nota de 1 a 5 para o lanche.');
    });
  });

  it('ehNotaBaixa considera 1 e 2 em qualquer uma das notas', () => {
    expect(ehNotaBaixa({ notaLanche: 2, notaAtendimento: 5 })).toBe(true);
    expect(ehNotaBaixa({ notaLanche: 5, notaAtendimento: 1 })).toBe(true);
    expect(ehNotaBaixa({ notaLanche: 3, notaAtendimento: 3 })).toBe(false);
  });

  it('ehCanal e ehNotaValida', () => {
    expect(ehCanal('embalagem')).toBe(true);
    expect(ehCanal('balcao')).toBe(false);
    expect(ehCanal(null)).toBe(false);
    expect(ehNotaValida(5)).toBe(true);
    expect(ehNotaValida('5')).toBe(false);
  });
});
