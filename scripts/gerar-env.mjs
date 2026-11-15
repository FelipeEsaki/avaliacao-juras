// Gera src/environments/environment.ts a partir das variáveis de ambiente.
// Roda sozinho antes do build e dos testes (prebuild/pretest no package.json).
// Local: crie um .env com base no .env.example. Cloudflare Pages: configure as variáveis no painel.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();
const ehDeploy = process.env.CF_PAGES === '1';

// Os valores do .env.example passam na validação de formato, mas apontam para um projeto que
// não existe. Sem esta checagem o app sobe e a tela só diz "verifique sua conexão".
if (/seu-projeto/.test(supabaseUrl) || /^cole-/.test(supabaseAnonKey)) {
  console.error(
    'O .env ainda está com os valores de exemplo. Troque SUPABASE_URL e SUPABASE_ANON_KEY pelos ' +
      'do seu projeto (Supabase > Project Settings > API Keys) e rode o comando de novo.',
  );
  process.exit(1);
}

if (ehDeploy && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY nas variáveis do Cloudflare Pages.');
  process.exit(1);
}
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl)) {
  console.error('SUPABASE_URL deve ser algo como https://xxxx.supabase.co, sem barra no final.');
  process.exit(1);
}

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/environment.ts',
  `// Arquivo gerado por scripts/gerar-env.mjs. Não edite e não versione.\n` +
    `export const environment = ${JSON.stringify({ supabaseUrl, supabaseAnonKey }, null, 2)} as const;\n`,
);
console.log(`environment.ts gerado${supabaseUrl ? '' : ' sem Supabase (modo teste)'}.`);
