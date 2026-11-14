// Gera os QR codes de cada unidade e canal em qrcodes/ (SVG para gráfica, PNG para conferir no celular).
// Uso: npm run qrcodes -- https://avaliacao-juras.pages.dev
// Os ids precisam bater com os da tabela unidade (ordem do seed.sql).
import { mkdirSync } from 'node:fs';
import QRCode from 'qrcode';

const UNIDADES = [
  { id: 1, nome: 'sao-jose-do-rio-preto' },
  { id: 2, nome: 'bady-bassitt' },
  { id: 3, nome: 'jose-bonifacio' },
  { id: 4, nome: 'mirassol' },
];
const CANAIS = ['mesa', 'embalagem', 'delivery'];

const base = (process.argv[2] ?? process.env.URL_APP ?? '').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/.test(base)) {
  console.error(
    'Informe a URL publicada, ex.: npm run qrcodes -- https://avaliacao-juras.pages.dev',
  );
  process.exit(1);
}

mkdirSync('qrcodes', { recursive: true });
// Correção de erro "Q" aguenta o QR um pouco sujo ou amassado, comum em mesa e embalagem.
const opcoes = {
  errorCorrectionLevel: 'Q',
  margin: 4,
  color: { dark: '#000000', light: '#ffffff' },
};

for (const unidade of UNIDADES) {
  for (const canal of CANAIS) {
    const url = `${base}/avaliar?u=${unidade.id}&c=${canal}`;
    const arquivo = `qrcodes/${unidade.nome}-${canal}`;
    await QRCode.toFile(`${arquivo}.svg`, url, { ...opcoes, type: 'svg' });
    await QRCode.toFile(`${arquivo}.png`, url, { ...opcoes, type: 'png', width: 800 });
    console.log(`${arquivo}  ->  ${url}`);
  }
}
