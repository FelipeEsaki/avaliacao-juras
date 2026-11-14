import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { RepositorioFalso, avaliacaoTeste } from '../../../testing/repositorio-falso';
import { abrirApp } from '../../../testing/tela';

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function repoComDados() {
  const repo = new RepositorioFalso();
  repo.logado = true;
  repo.avaliacoes = [
    avaliacaoTeste({
      id: 1,
      unidadeId: 1,
      notaLanche: 5,
      notaAtendimento: 4,
      criadoEm: horasAtras(2),
    }),
    avaliacaoTeste({
      id: 2,
      unidadeId: 1,
      notaLanche: 4,
      notaAtendimento: 4,
      criadoEm: horasAtras(3),
    }),
    avaliacaoTeste({
      id: 3,
      unidadeId: 2,
      canal: 'mesa',
      notaLanche: 4,
      notaAtendimento: 2,
      comentario: 'Demorou muito para sair.',
      numeroPedido: '4821',
      criadoEm: horasAtras(30),
    }),
    avaliacaoTeste({
      id: 4,
      unidadeId: 2,
      canal: 'delivery',
      notaLanche: 2,
      notaAtendimento: 3,
      criadoEm: horasAtras(24 * 20),
    }),
  ];
  return repo;
}

describe('Painel do gestor (integração)', () => {
  it('sem login, a rota /painel cai no login', async () => {
    const app = await abrirApp();
    await app.ir('/painel');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(app.repo.listarAvaliacoes).not.toHaveBeenCalled();
  });

  it('mostra médias por unidade e os cartões de nota baixa', async () => {
    const app = await abrirApp(repoComDados());
    await app.ir('/painel');

    const cards = [...app.tela().querySelectorAll('.card')];
    const valores = (card: Element) =>
      [...card.querySelectorAll('.v')].map((v) => v.textContent!.trim());
    expect(cards[0].textContent).toContain('São José do Rio Preto');
    expect(cards[0].textContent).toContain('2 avaliações');
    expect(valores(cards[0])).toEqual(['4,5', '4,0']);
    expect(cards[2].textContent).toContain('0 avaliações');
    expect(valores(cards[2])).toEqual(['–', '–']);

    const alertas = app.tela().querySelectorAll('.alertcard');
    expect(alertas).toHaveLength(2);
    expect(alertas[0].textContent).toContain('Bady Bassitt');
    expect(alertas[0].textContent).toContain('Pedido 4821');
    expect(alertas[0].textContent).toContain('"Demorou muito para sair."');
    expect(alertas[1].textContent).toContain('Sem pedido');
  });

  it('trocar o período recarrega e pode zerar as notas baixas', async () => {
    const app = await abrirApp(repoComDados());
    await app.ir('/painel');
    app.repo.avaliacoes = app.repo.avaliacoes.filter((a) => a.id <= 2);

    const select = app.tela().querySelector<HTMLSelectElement>('#periodo')!;
    select.value = '7';
    select.dispatchEvent(new Event('change'));
    await app.estabilizar();

    expect(app.repo.listarAvaliacoes).toHaveBeenCalledTimes(2);
    expect(app.texto()).toContain('Nenhuma nota baixa no período.');
  });

  it('erro de rede mostra aviso e botão para tentar de novo', async () => {
    const repo = repoComDados();
    repo.listarAvaliacoes.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const app = await abrirApp(repo);
    await app.ir('/painel');
    expect(app.texto()).toContain('Não foi possível carregar as avaliações.');

    app.botao('Tentar novamente')!.click();
    await app.estabilizar();
    expect(app.tela().querySelectorAll('.alertcard')).toHaveLength(2);
  });

  it('Sair encerra a sessão e volta para o login', async () => {
    const app = await abrirApp(repoComDados());
    await app.ir('/painel');
    app.botao('Sair')!.click();
    await app.estabilizar();
    expect(app.repo.sair).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
