import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositorioFalso } from '../../testing/repositorio-falso';
import { authGuard } from './auth.guard';
import { DadosRepository } from './dados.repository';

describe('authGuard', () => {
  let repo: RepositorioFalso;
  const executar = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: DadosRepository, useValue: repo }],
    });
  });

  it('manda para o login quando não há sessão', async () => {
    const resultado = (await executar()) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/login');
  });

  it('libera o painel quando o gestor está logado', async () => {
    repo.logado = true;
    expect(await executar()).toBe(true);
  });

  it('se a verificação de sessão der erro, trata como deslogado', async () => {
    repo.temSessao.mockRejectedValueOnce(new Error('storage indisponível'));
    expect(await executar()).toBeInstanceOf(UrlTree);
  });
});
