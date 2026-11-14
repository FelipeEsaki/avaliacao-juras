import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { abrirApp } from '../../../testing/tela';

describe('Tela de avaliação (integração)', () => {
  beforeEach(() => localStorage.clear());

  const escolherNota = (tela: HTMLElement, grupo: 'notaLanche' | 'notaAtendimento', nota: number) =>
    tela.querySelector<HTMLInputElement>(`input[name="${grupo}"][value="${nota}"]`)!.click();

  it('abre com o nome da unidade do QR code e os campos do protótipo', async () => {
    const app = await abrirApp();
    await app.ir('/avaliar?u=1&c=mesa');

    expect(app.texto()).toContain("Jura's São José do Rio Preto");
    expect(app.texto()).toContain('Leva menos de 30 segundos. Não precisa de cadastro.');
    expect(app.tela().querySelectorAll('input[type="radio"]')).toHaveLength(10);
    expect(app.botao('Enviar avaliação')).toBeTruthy();
    expect(app.repo.buscarUnidade).toHaveBeenCalledWith(1);
  });

  it.each([
    ['unidade que não existe', '/avaliar?u=99&c=mesa'],
    ['unidade desativada', '/avaliar?u=3&c=mesa'],
    ['canal inválido', '/avaliar?u=1&c=balcao'],
    ['link sem parâmetros', '/'],
  ])('mostra QR inválido para %s', async (_caso, url) => {
    const app = await abrirApp();
    await app.ir(url);
    expect(app.texto()).toContain('Este QR code não é válido. Peça ajuda a um atendente.');
    expect(app.tela().querySelector('form')).toBeNull();
  });

  it('sem as notas, mostra os dois erros, foca a primeira nota e não envia nada', async () => {
    const app = await abrirApp();
    await app.ir('/avaliar?u=1&c=mesa');

    app.botao('Enviar avaliação')!.click();
    await app.estabilizar();

    expect(app.texto()).toContain('Escolha uma nota de 1 a 5 para o lanche.');
    expect(app.texto()).toContain('Escolha uma nota de 1 a 5 para o atendimento.');
    expect(app.tela().querySelectorAll('fieldset[aria-invalid="true"]')).toHaveLength(2);
    expect((document.activeElement as HTMLInputElement | null)?.name).toBe('notaLanche');
    expect(app.repo.inserirAvaliacao).not.toHaveBeenCalled();
  });

  it('envia a avaliação e mostra a confirmação com o resumo e o convite do Google', async () => {
    const app = await abrirApp();
    await app.ir('/avaliar?u=1&c=embalagem');

    escolherNota(app.tela(), 'notaLanche', 4);
    escolherNota(app.tela(), 'notaAtendimento', 2);
    app.digitar('#comentario', '  O lanche estava ótimo, mas demorou para sair. ');
    app.digitar('#pedido', '4821');
    await app.estabilizar();
    expect(app.texto()).toContain('48/500');

    app.botao('Enviar avaliação')!.click();
    await app.estabilizar();

    expect(app.repo.inseridas).toEqual([
      {
        unidadeId: 1,
        canal: 'embalagem',
        notaLanche: 4,
        notaAtendimento: 2,
        comentario: 'O lanche estava ótimo, mas demorou para sair.',
        numeroPedido: '4821',
      },
    ]);
    expect(TestBed.inject(Router).url).toBe('/obrigado');
    expect(app.texto()).toContain('Obrigado! Sua avaliação foi enviada.');
    expect(app.texto()).toContain('Lanche: 4 de 5');
    expect(app.texto()).toContain('Atendimento: 2 de 5');
    const google = app.tela().querySelector<HTMLAnchorElement>('a.btn')!;
    expect(google.href).toBe('https://www.google.com/maps/rio-preto');
    expect(google.rel).toContain('noopener');
  });

  it('número do pedido com letra mostra erro e não envia', async () => {
    const app = await abrirApp();
    await app.ir('/avaliar?u=1&c=mesa');
    escolherNota(app.tela(), 'notaLanche', 5);
    escolherNota(app.tela(), 'notaAtendimento', 5);
    app.digitar('#pedido', '12a');

    app.botao('Enviar avaliação')!.click();
    await app.estabilizar();

    expect(app.texto()).toContain('Use só números, até 10 dígitos.');
    expect(app.repo.inserirAvaliacao).not.toHaveBeenCalled();
  });

  it('sem internet, avisa, mantém o que foi digitado e deixa tentar de novo', async () => {
    const app = await abrirApp();
    await app.ir('/avaliar?u=2&c=delivery');
    escolherNota(app.tela(), 'notaLanche', 2);
    escolherNota(app.tela(), 'notaAtendimento', 3);
    app.digitar('#comentario', 'Chegou frio.');

    app.repo.falharRede = true;
    app.botao('Enviar avaliação')!.click();
    await app.estabilizar();

    expect(app.texto()).toContain(
      'Não foi possível enviar. Verifique sua conexão e tente de novo.',
    );
    expect(app.tela().querySelector<HTMLTextAreaElement>('#comentario')!.value).toBe(
      'Chegou frio.',
    );

    app.repo.falharRede = false;
    app.botao('Tentar novamente')!.click();
    await app.estabilizar();

    expect(app.repo.inseridas).toHaveLength(1);
    expect(app.texto()).toContain('Obrigado! Sua avaliação foi enviada.');
  });

  it('quem acabou de avaliar a unidade vê o aviso em vez do formulário', async () => {
    localStorage.setItem('juras.avaliacao.envios', JSON.stringify({ 1: Date.now() }));
    const app = await abrirApp();
    await app.ir('/avaliar?u=1&c=mesa');

    expect(app.texto()).toContain('Você já avaliou esta unidade agora há pouco.');
    expect(app.tela().querySelector('form')).toBeNull();
  });

  it('se não conseguir carregar a unidade, oferece tentar de novo', async () => {
    const app = await abrirApp();
    app.repo.falharRede = true;
    await app.ir('/avaliar?u=1&c=mesa');
    expect(app.texto()).toContain('Não foi possível abrir a avaliação.');

    app.repo.falharRede = false;
    app.botao('Tentar novamente')!.click();
    await app.estabilizar();
    expect(app.texto()).toContain('Nota para o lanche');
  });
});
