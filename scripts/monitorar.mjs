// Monitoramento do ambiente publicado. Roda no GitHub Actions a cada 30 minutos
// (.github/workflows/monitoramento.yml) e sai com erro se alguma checagem falhar,
// o que marca a execução como falha e dispara o e-mail do GitHub para o dono do repo.
//
// Não guarda chave nenhuma: a URL e a chave publishable do Supabase são lidas do
// próprio JavaScript publicado, então a checagem também confirma que o deploy
// subiu com a configuração certa.
//
// Uso: node scripts/monitorar.mjs [url-do-site]
import { appendFileSync } from 'node:fs';

const SITE = (
  process.argv[2] ??
  process.env.SITE_URL ??
  'https://avaliacao-juras.pages.dev'
).replace(/\/$/, '');
const TEMPO_MAXIMO_MS = Number(process.env.TEMPO_MAXIMO_MS ?? 10_000);
const UNIDADES_ESPERADAS = Number(process.env.UNIDADES_ESPERADAS ?? 4);

const resultados = [];

async function checar(nome, url, validar, cabecalhos = {}) {
  const inicio = performance.now();
  try {
    const resposta = await fetch(url, {
      headers: cabecalhos,
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    });
    const corpo = await resposta.text();
    const ms = Math.round(performance.now() - inicio);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const detalhe = (await validar(resposta, corpo)) ?? 'ok';
    resultados.push({ nome, ok: true, ms, detalhe });
    return corpo;
  } catch (erro) {
    const ms = Math.round(performance.now() - inicio);
    const causa = erro?.cause?.code ? ` (${erro.cause.code})` : '';
    const detalhe =
      erro?.name === 'TimeoutError'
        ? `sem resposta em ${TEMPO_MAXIMO_MS} ms`
        : `${erro.message}${causa}`;
    resultados.push({ nome, ok: false, ms, detalhe });
    return null;
  }
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

// 1. Tela que o QR code abre.
const html = await checar(
  'Tela de avaliação (QR code)',
  `${SITE}/avaliar?u=1&c=mesa`,
  (r, corpo) => {
    exigir(corpo.includes('<app-root'), 'HTML sem <app-root>');
    exigir(r.headers.get('content-security-policy'), 'cabeçalho CSP ausente');
    return 'HTML do Angular e CSP presentes';
  },
);

// 2. Rota do painel (o fallback de SPA precisa devolver o index).
await checar('Tela de login do gestor', `${SITE}/login`, (_r, corpo) => {
  exigir(corpo.includes('<app-root'), 'rota não devolveu o app');
});

// 3. Configuração do Supabase dentro do JavaScript publicado.
let supabase = null;
if (html) {
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(
    (m) => new URL(m[1], `${SITE}/`).href,
  );
  const vistos = new Set();
  const fila = [...scripts];
  while (fila.length && !supabase && vistos.size < 30) {
    const url = fila.shift();
    if (vistos.has(url)) continue;
    vistos.add(url);
    const js = await fetch(url, { signal: AbortSignal.timeout(TEMPO_MAXIMO_MS) })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    const endereco = js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0];
    const chave = js.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
    if (endereco && chave) supabase = { endereco, chave };
    for (const m of js.matchAll(/["'`(]\.?\/?(chunk-[A-Za-z0-9_-]+\.js)["'`)]/g)) {
      fila.push(new URL(m[1], `${SITE}/`).href);
    }
  }
}
resultados.push(
  supabase
    ? {
        nome: 'Configuração do Supabase no deploy',
        ok: true,
        ms: 0,
        detalhe: new URL(supabase.endereco).host,
      }
    : {
        nome: 'Configuração do Supabase no deploy',
        ok: false,
        ms: 0,
        detalhe: 'URL ou chave não encontrada no JS',
      },
);

// 4. Banco: a mesma consulta que a tela do QR faz como cliente anônimo.
// 5. Autenticação do gestor.
if (supabase) {
  const cabecalhos = { apikey: supabase.chave };
  await checar(
    'Banco (unidades ativas)',
    `${supabase.endereco}/rest/v1/unidade?select=id&ativa=eq.true`,
    (_r, corpo) => {
      const unidades = JSON.parse(corpo);
      exigir(Array.isArray(unidades), 'resposta não é uma lista');
      exigir(
        unidades.length >= UNIDADES_ESPERADAS,
        `${unidades.length} unidades ativas, esperado ${UNIDADES_ESPERADAS}`,
      );
      return `${unidades.length} unidades ativas`;
    },
    cabecalhos,
  );
  await checar(
    'Autenticação (Supabase Auth)',
    `${supabase.endereco}/auth/v1/health`,
    () => {},
    cabecalhos,
  );
}

// Relatório: console e resumo da execução no GitHub Actions.
const falhas = resultados.filter((r) => !r.ok);
const linhas = resultados.map(
  (r) =>
    `| ${r.ok ? '✅ UP' : '❌ DOWN'} | ${r.nome} | ${r.ms ? `${r.ms} ms` : '-'} | ${r.detalhe} |`,
);
const relatorio = [
  `### Monitoramento de ${SITE}`,
  '',
  `Verificado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (horário de Brasília)`,
  '',
  '| Status | Checagem | Tempo | Detalhe |',
  '| --- | --- | --- | --- |',
  ...linhas,
  '',
  falhas.length ? `**${falhas.length} checagem(ns) falharam.**` : '**Tudo no ar.**',
  '',
].join('\n');

console.log(relatorio);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, relatorio);
process.exitCode = falhas.length ? 1 : 0;
