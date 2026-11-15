import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { appConfig } from './app.config';
import { DadosRepository } from './core/dados.repository';
import { SupabaseDadosRepository } from './core/supabase-dados.repository';

describe('App', () => {
  it('usa o repositório do Supabase como implementação de DadosRepository', () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
    expect(TestBed.inject(DadosRepository)).toBeInstanceOf(SupabaseDadosRepository);
  });

  it('cria o componente raiz com o router-outlet', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
