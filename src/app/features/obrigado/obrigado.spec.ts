import { describe, expect, it } from 'vitest';
import { lerResumo } from './obrigado';

describe('lerResumo (estado vindo do history)', () => {
  const resumo = {
    notaLanche: 4,
    notaAtendimento: 2,
    nomeUnidade: 'Mirassol',
    linkGoogle: 'https://g.page/r/x/review',
  };

  it('aceita um resumo válido', () => {
    expect(lerResumo({ resumo })).toEqual(resumo);
  });

  it('descarta estado vazio ou com nota fora da faixa', () => {
    expect(lerResumo(null)).toBeNull();
    expect(lerResumo({})).toBeNull();
    expect(lerResumo({ resumo: { ...resumo, notaLanche: 9 } })).toBeNull();
  });

  it('não deixa passar link que não seja https', () => {
    expect(
      lerResumo({ resumo: { ...resumo, linkGoogle: 'javascript:alert(1)' } })?.linkGoogle,
    ).toBeNull();
  });
});
