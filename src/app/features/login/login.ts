import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconeAlerta } from '../../shared/icones';
import { Topo } from '../../shared/topo/topo';

@Component({
  selector: 'app-login',
  imports: [FormField, Topo, IconeAlerta],
  template: `
    <div class="app">
      <app-topo titulo="Painel do gestor" subtitulo="Acesso restrito à gerência do Jura's" />
      <main>
        <form novalidate (submit)="entrar($event)">
          <div class="field">
            <label for="email">E-mail</label>
            <input
              id="email"
              type="email"
              autocomplete="username"
              [formField]="f.email"
              [attr.aria-invalid]="mostrarErro('email') ? 'true' : null"
              [attr.aria-describedby]="mostrarErro('email') ? 'erro-email' : null"
            />
            @if (mostrarErro('email')) {
              <div class="err" id="erro-email">
                <app-icone-alerta /><span>{{ mensagemErro('email') }}</span>
              </div>
            }
          </div>
          <div class="field">
            <label for="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autocomplete="current-password"
              [formField]="f.senha"
              [attr.aria-invalid]="mostrarErro('senha') ? 'true' : null"
              [attr.aria-describedby]="mostrarErro('senha') ? 'erro-senha' : null"
            />
            @if (mostrarErro('senha')) {
              <div class="err" id="erro-senha">
                <app-icone-alerta /><span>{{ mensagemErro('senha') }}</span>
              </div>
            }
          </div>
          @if (erro()) {
            <div class="err espaco-abaixo" role="alert">
              <app-icone-alerta /><span>{{ erro() }}</span>
            </div>
          }
          <button type="submit" class="btn" [attr.aria-disabled]="entrando() ? 'true' : null">
            {{ entrando() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
      </main>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly erro = signal<string | null>(null);
  protected readonly entrando = signal(false);
  private readonly modelo = signal({ email: '', senha: '' });
  protected readonly f = form(this.modelo, (campo) => {
    required(campo.email, { message: 'Informe o e-mail.' });
    email(campo.email, { message: 'Confira o e-mail digitado.' });
    required(campo.senha, { message: 'Informe a senha.' });
  });

  constructor() {
    void this.auth.estaLogado().then((logado) => {
      if (logado) void this.router.navigate(['/painel']);
    });
  }

  protected mostrarErro(campo: 'email' | 'senha'): boolean {
    const estado = this.f[campo]();
    return estado.touched() && estado.invalid();
  }

  protected mensagemErro(campo: 'email' | 'senha'): string {
    return this.f[campo]().errors()[0]?.message ?? '';
  }

  protected async entrar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.entrando()) return;
    this.erro.set(null);
    await submit(this.f, async () => {
      this.entrando.set(true);
      try {
        const { email: usuario, senha } = this.modelo();
        if (await this.auth.entrar(usuario, senha)) {
          await this.router.navigate(['/painel']);
        } else {
          // Mensagem única de propósito: não revela se o e-mail existe.
          this.erro.set('E-mail ou senha inválidos.');
        }
      } catch {
        this.erro.set('Não foi possível entrar. Verifique sua conexão e tente de novo.');
      } finally {
        this.entrando.set(false);
      }
      return undefined;
    });
  }
}
