const FUSO = 'America/Sao_Paulo';

/** 4.25 -> "4,3". null vira traço. */
export function formatarMedia(valor: number | null): string {
  if (valor === null) return '–';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** ISO -> "12/11, 20h14", sempre no horário de Brasília. */
export function formatarDataHora(iso: string): string {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const p = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((x) => x.type === tipo)?.value ?? '';
  return `${p('day')}/${p('month')}, ${p('hour')}h${p('minute')}`;
}
