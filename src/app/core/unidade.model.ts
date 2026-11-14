export interface Unidade {
  id: number;
  nome: string;
  linkGoogle: string | null;
  ativa: boolean;
}

/** Só deixa passar link https, o resto vira null e o botão do Google some. */
export function linkGoogleSeguro(unidade: Pick<Unidade, 'linkGoogle'> | null): string | null {
  const link = unidade?.linkGoogle ?? null;
  return link && /^https:\/\//.test(link) ? link : null;
}
