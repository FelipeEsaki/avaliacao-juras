import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { abrirApp } from '../../../testing/tela';

describe('Login do gestor (integração)', () => {
  it('campos vazios mostram o que falta e não chamam o Supabase', async () => {
    const app = await abrirApp();
    await app.ir('/login');
    app.botao('Entrar')!.click();
    await app.estabilizar();

    expect(app.texto()).toContain('Informe o e-mail.');
    expect(app.texto()).toContain('Informe a senha.');
    expect(app.repo.entrar).not.toHaveBeenCalled();
  });

  it('senha errada mostra mensagem genérica, sem dizer se o e-mail existe', async () => {
    const app = await abrirApp();
    await app.ir('/login');
    app.digitar('#email', 'gestor@juras.com.br');
    app.digitar('#senha', 'errada');
    app.botao('Entrar')!.click();
    await app.estabilizar();

    expect(app.texto()).toContain('E-mail ou senha inválidos.');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('login certo leva para o painel', async () => {
    const app = await abrirApp();
    await app.ir('/login');
    app.digitar('#email', ' gestor@juras.com.br ');
    app.digitar('#senha', 'senha-certa');
    app.botao('Entrar')!.click();
    await app.estabilizar();

    expect(app.repo.entrar).toHaveBeenCalledWith('gestor@juras.com.br', 'senha-certa');
    expect(TestBed.inject(Router).url).toBe('/painel');
    expect(app.texto()).toContain('Médias por unidade');
  });
});
