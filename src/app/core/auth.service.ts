import { Injectable, inject } from '@angular/core';
import { DadosRepository } from './dados.repository';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repo = inject(DadosRepository);

  entrar(email: string, senha: string): Promise<boolean> {
    return this.repo.entrar(email.trim(), senha);
  }

  sair(): Promise<void> {
    return this.repo.sair();
  }

  /**
   * Só decide a navegação. Quem protege os dados de verdade é o RLS no banco,
   * que valida o token em toda consulta.
   */
  async estaLogado(): Promise<boolean> {
    try {
      return await this.repo.temSessao();
    } catch {
      return false;
    }
  }
}
