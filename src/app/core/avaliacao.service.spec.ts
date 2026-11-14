import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositorioFalso } from '../../testing/repositorio-falso';
import { EntradaAvaliacao } from './avaliacao.model';
import { AvaliacaoService, ErroValidacao, INTERVALO_REENVIO_MS } from './avaliacao.service';
import { DadosRepository } from './dados.repository';

const entrada = (parcial: Partial<EntradaAvaliacao> = {}): EntradaAvaliacao => ({
  unidadeId: 1,
  canal: 'mesa',
  notaLanche: 4,
  notaAtendimento: 2,
  comentario: ' Demorou. ',
  numeroPedido: '',
  ...parcial,
});

describe('AvaliacaoService', () => {
  let servico: AvaliacaoService;
  let repo: RepositorioFalso;

  beforeEach(() => {
    localStorage.clear();
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({ providers: [{ provide: DadosRepository, useValue: repo }] });
    servico = TestBed.inject(AvaliacaoService);
  });

  it('envia a avaliação já normalizada para o repositório', async () => {
    await servico.enviar(entrada());
    expect(repo.inserirAvaliacao).toHaveBeenCalledWith({
      unidadeId: 1,
      canal: 'mesa',
      notaLanche: 4,
      notaAtendimento: 2,
      comentario: 'Demorou.',
      numeroPedido: null,
    });
  });

  it('não chama o banco quando a avaliação é inválida', async () => {
    await expect(servico.enviar(entrada({ notaAtendimento: null }))).rejects.toBeInstanceOf(
      ErroValidacao,
    );
    expect(repo.inserirAvaliacao).not.toHaveBeenCalled();
  });

  it('bloqueia novo envio da mesma unidade no mesmo aparelho por 2 horas', async () => {
    const agora = Date.parse('2026-11-14T20:00:00Z');
    await servico.enviar(entrada(), agora);

    expect(servico.avaliouRecentemente(1, agora + 60_000)).toBe(true);
    expect(servico.avaliouRecentemente(2, agora + 60_000)).toBe(false);
    expect(servico.avaliouRecentemente(1, agora + INTERVALO_REENVIO_MS + 1)).toBe(false);
  });

  it('quando a rede falha, não registra o bloqueio e o cliente pode tentar de novo', async () => {
    repo.falharRede = true;
    await expect(servico.enviar(entrada())).rejects.toThrow('Failed to fetch');
    expect(servico.avaliouRecentemente(1)).toBe(false);
  });

  it('ignora lixo no localStorage em vez de quebrar a tela', () => {
    localStorage.setItem('juras.avaliacao.envios', '{quebrado');
    expect(servico.avaliouRecentemente(1)).toBe(false);
  });
});
