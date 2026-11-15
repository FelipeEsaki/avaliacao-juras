import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Canal,
  LIMITE_COMENTARIO,
  LIMITE_PEDIDO,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  ehCanal,
} from '../../core/avaliacao.model';
import { AvaliacaoService } from '../../core/avaliacao.service';
import { Unidade, linkGoogleSeguro } from '../../core/unidade.model';
import { IconeAlerta, IconeCheck } from '../../shared/icones';
import { Topo } from '../../shared/topo/topo';
import { ResumoEnvio } from '../obrigado/obrigado';

type Estado = 'carregando' | 'invalido' | 'falha' | 'ja-avaliou' | 'pronto';
type CampoNota = 'notaLanche' | 'notaAtendimento';

interface ModeloAvaliacao {
  notaLanche: number | null;
  notaAtendimento: number | null;
  comentario: string;
  numeroPedido: string;
}

@Component({
  selector: 'app-avaliar',
  imports: [FormField, Topo, IconeAlerta, IconeCheck],
  templateUrl: './avaliar.html',
})
export class Avaliar {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly avaliacoes = inject(AvaliacaoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly estado = signal<Estado>('carregando');
  protected readonly unidade = signal<Unidade | null>(null);
  protected readonly enviando = signal(false);
  protected readonly erroEnvio = signal(false);
  protected readonly subtitulo = computed(() => {
    const u = this.unidade();
    return u ? `Jura's ${u.nome}` : null;
  });
  protected readonly linkGoogle = computed(() => linkGoogleSeguro(this.unidade()));

  protected readonly limiteComentario = LIMITE_COMENTARIO;
  protected readonly notas = Array.from(
    { length: NOTA_MAXIMA - NOTA_MINIMA + 1 },
    (_, i) => i + NOTA_MINIMA,
  );
  protected readonly grupos: { campo: CampoNota; titulo: string }[] = [
    { campo: 'notaLanche', titulo: 'Nota para o lanche' },
    { campo: 'notaAtendimento', titulo: 'Nota para o atendimento' },
  ];

  private canal: Canal = 'mesa';
  private readonly modelo = signal<ModeloAvaliacao>({
    notaLanche: null,
    notaAtendimento: null,
    comentario: '',
    numeroPedido: '',
  });
  protected readonly f = form(this.modelo, (campo) => {
    required(campo.notaLanche, { message: 'Escolha uma nota de 1 a 5 para o lanche.' });
    required(campo.notaAtendimento, { message: 'Escolha uma nota de 1 a 5 para o atendimento.' });
    maxLength(campo.comentario, LIMITE_COMENTARIO, {
      message: `O comentário pode ter até ${LIMITE_COMENTARIO} caracteres.`,
    });
    pattern(campo.numeroPedido, new RegExp(`^\\d{0,${LIMITE_PEDIDO}}$`), {
      message: `Use só números, até ${LIMITE_PEDIDO} dígitos.`,
    });
  });

  constructor() {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const idTexto = params.get('u') ?? '';
    const canal = params.get('c');
    if (!/^\d{1,9}$/.test(idTexto) || !ehCanal(canal)) {
      this.estado.set('invalido');
      return;
    }
    const id = Number(idTexto);
    this.canal = canal;
    this.estado.set('carregando');
    try {
      const unidade = await this.avaliacoes.buscarUnidade(id);
      if (!unidade) {
        this.estado.set('invalido');
        return;
      }
      this.unidade.set(unidade);
      this.estado.set(this.avaliacoes.avaliouRecentemente(id) ? 'ja-avaliou' : 'pronto');
    } catch (erro) {
      // O cliente vê a mensagem genérica. O motivo real fica no console para quem for investigar.
      console.error('Falha ao carregar a unidade do QR code:', erro);
      this.estado.set('falha');
    }
  }

  protected campoNota(campo: CampoNota) {
    return this.f[campo];
  }

  protected escolherNota(campo: CampoNota, nota: number): void {
    this.f[campo]().value.set(nota);
  }

  protected rotuloNota(nota: number): string {
    if (nota === NOTA_MINIMA) return `${nota}, muito ruim`;
    if (nota === NOTA_MAXIMA) return `${nota}, muito bom`;
    return String(nota);
  }

  protected mostrarErro(campo: keyof ModeloAvaliacao): boolean {
    const estado = this.f[campo]();
    return estado.touched() && estado.invalid();
  }

  protected mensagemErro(campo: keyof ModeloAvaliacao): string {
    return this.f[campo]().errors()[0]?.message ?? '';
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    const unidade = this.unidade();
    if (this.enviando() || !unidade) return;
    this.erroEnvio.set(false);

    await submit(this.f, {
      action: async () => {
        this.enviando.set(true);
        try {
          const enviada = await this.avaliacoes.enviar({
            unidadeId: unidade.id,
            canal: this.canal,
            ...this.modelo(),
          });
          const resumo: ResumoEnvio = {
            notaLanche: enviada.notaLanche,
            notaAtendimento: enviada.notaAtendimento,
            nomeUnidade: unidade.nome,
            linkGoogle: linkGoogleSeguro(unidade),
          };
          await this.router.navigate(['/obrigado'], { state: { resumo } });
        } catch (erro) {
          // Os dados digitados continuam na tela para o cliente tentar de novo.
          console.error('Falha ao enviar a avaliação:', erro);
          this.erroEnvio.set(true);
        } finally {
          this.enviando.set(false);
        }
        return undefined;
      },
      onInvalid: () => this.focarPrimeiroErro(),
    });
  }

  private focarPrimeiroErro(): void {
    afterNextRender(
      () => {
        const alvo = this.host.nativeElement.querySelector<HTMLElement>(
          'fieldset[aria-invalid="true"] input, [aria-invalid="true"]:not(fieldset)',
        );
        alvo?.focus();
      },
      { injector: this.injector },
    );
  }
}
