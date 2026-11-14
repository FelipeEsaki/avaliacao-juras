import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositorioFalso, UNIDADES_TESTE, avaliacaoTeste } from '../../testing/repositorio-falso';
import { DadosRepository } from './dados.repository';
import { PainelService, calcularMedias, filtrarNotasBaixas } from './painel.service';

describe('PainelService', () => {
  describe('calcularMedias', () => {
    it('calcula a média por unidade com uma casa decimal', () => {
      const medias = calcularMedias(UNIDADES_TESTE, [
        avaliacaoTeste({ id: 1, unidadeId: 1, notaLanche: 5, notaAtendimento: 4 }),
        avaliacaoTeste({ id: 2, unidadeId: 1, notaLanche: 4, notaAtendimento: 4 }),
        avaliacaoTeste({ id: 3, unidadeId: 1, notaLanche: 4, notaAtendimento: 2 }),
        avaliacaoTeste({ id: 4, unidadeId: 2, notaLanche: 3, notaAtendimento: 5 }),
      ]);
      expect(medias[0]).toEqual({
        unidadeId: 1,
        nome: 'São José do Rio Preto',
        quantidade: 3,
        mediaLanche: 4.3,
        mediaAtendimento: 3.3,
      });
      expect(medias[1]).toMatchObject({ quantidade: 1, mediaLanche: 3, mediaAtendimento: 5 });
    });

    it('unidade sem avaliação no período fica com média null, não com zero', () => {
      const medias = calcularMedias(UNIDADES_TESTE, []);
      expect(
        medias.every(
          (m) => m.quantidade === 0 && m.mediaLanche === null && m.mediaAtendimento === null,
        ),
      ).toBe(true);
    });
  });

  describe('filtrarNotasBaixas', () => {
    it('traz só nota 1 ou 2, da mais nova para a mais antiga, com o nome da unidade', () => {
      const baixas = filtrarNotasBaixas(UNIDADES_TESTE, [
        avaliacaoTeste({ id: 1, notaAtendimento: 2, criadoEm: '2026-11-10T10:00:00Z' }),
        avaliacaoTeste({
          id: 2,
          notaLanche: 3,
          notaAtendimento: 3,
          criadoEm: '2026-11-13T10:00:00Z',
        }),
        avaliacaoTeste({ id: 3, unidadeId: 2, notaLanche: 1, criadoEm: '2026-11-12T10:00:00Z' }),
      ]);
      expect(baixas.map((b) => b.id)).toEqual([3, 1]);
      expect(baixas[0].nomeUnidade).toBe('Bady Bassitt');
    });
  });

  describe('carregar', () => {
    let repo: RepositorioFalso;
    let servico: PainelService;

    beforeEach(() => {
      repo = new RepositorioFalso();
      TestBed.configureTestingModule({ providers: [{ provide: DadosRepository, useValue: repo }] });
      servico = TestBed.inject(PainelService);
    });

    it('busca avaliações a partir do início do período escolhido', async () => {
      const agora = new Date('2026-11-14T12:00:00Z');
      await servico.carregar(30, agora);
      expect(repo.listarAvaliacoes).toHaveBeenCalledWith(new Date('2026-10-15T12:00:00Z'));
    });

    it('deixa fora o que é mais antigo que o período', async () => {
      repo.avaliacoes = [
        avaliacaoTeste({ id: 1, notaLanche: 1, criadoEm: '2026-11-13T12:00:00Z' }),
        avaliacaoTeste({ id: 2, notaLanche: 1, criadoEm: '2026-11-01T12:00:00Z' }),
      ];
      const resumo = await servico.carregar(7, new Date('2026-11-14T12:00:00Z'));
      expect(resumo.notasBaixas.map((n) => n.id)).toEqual([1]);
      expect(resumo.medias[0].quantidade).toBe(1);
    });
  });
});
