// Gera src/environments/environment.ts a partir das variáveis de ambiente.
// Roda sozinho antes do build e dos testes (prebuild/pretest no package.json).
// Local: crie um .env com base no .env.example. Cloudflare Pages: configure as variáveis no painel.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
const ehDeploy = process.env.CF_PAGES === '1';

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
