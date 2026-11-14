import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app/app.routes';
import { DadosRepository } from '../app/core/dados.repository';
import { RepositorioFalso } from './repositorio-falso';

/**
 * Sobe o app com as rotas de verdade e o banco em memória.
 * É o teste de integração: tela + serviço + guard + roteamento, só o Supabase é trocado.
 */
export async function abrirApp(repo = new RepositorioFalso()) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: DadosRepository, useValue: repo }],
  });
  const harness = await RouterTestingHarness.create();

  const estabilizar = async () => {
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
  };
  const ir = async (url: string) => {
    await harness.navigateByUrl(url);
    await estabilizar();
  };
  const tela = () => harness.fixture.nativeElement as HTMLElement;
  const texto = () => tela().textContent?.replace(/\s+/g, ' ') ?? '';
  const botao = (rotulo: string) =>
    [...tela().querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === rotulo,
    );
  const digitar = (seletor: string, valor: string) => {
    const campo = tela().querySelector<HTMLInputElement | HTMLTextAreaElement>(seletor)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  return { repo, harness, ir, tela, texto, botao, digitar, estabilizar };
}
