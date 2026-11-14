import { describe, expect, it } from 'vitest';
import { formatarDataHora, formatarMedia } from './formatos';

describe('formatos', () => {
  it('formata média com vírgula e uma casa', () => {
    expect(formatarMedia(4.25)).toBe('4,3');
    expect(formatarMedia(4)).toBe('4,0');
    expect(formatarMedia(null)).toBe('–');
  });

  it('mostra data e hora no horário de Brasília, igual ao protótipo', () => {
    expect(formatarDataHora('2026-11-12T23:14:00Z')).toBe('12/11, 20h14');
    // Virada de dia: 01h UTC ainda é dia anterior em Brasília.
    expect(formatarDataHora('2026-11-13T01:05:00Z')).toBe('12/11, 22h05');
  });
});
