# Avaliação Jura's

[![CI](https://github.com/FelipeEsaki/avaliacao-juras/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeEsaki/avaliacao-juras/actions/workflows/ci.yml) [![Monitoramento](https://github.com/FelipeEsaki/avaliacao-juras/actions/workflows/monitoramento.yml/badge.svg)](https://github.com/FelipeEsaki/avaliacao-juras/actions/workflows/monitoramento.yml)

Em produção: https://avaliacao-juras.pages.dev

Sistema de avaliação de satisfação para as lojas do Jura's (São José do Rio Preto, Bady Bassitt, José Bonifácio e Mirassol).

O cliente lê um QR code na mesa, na embalagem ou no delivery, dá uma nota de 1 a 5 para o lanche e outra para o atendimento e, se quiser, deixa um comentário. Não precisa de cadastro e não pedimos dado pessoal. A gerência entra num painel com login e vê a média de cada unidade e a lista de notas baixas (1 ou 2) para agir rápido.

Projeto da disciplina Projeto de Software (ADS, Cruzeiro do Sul), feito com o Jura's como parceiro.

## Stack

- Angular 22 (standalone, Signals e Signal Forms), TypeScript 6
- Supabase: PostgreSQL, Auth e Row Level Security
- Cloudflare Pages para hospedagem
- Vitest para testes, GitHub Actions para CI

## Telas

| Rota | O que faz |
| --- | --- |
| `/avaliar?u=<unidade>&c=<canal>` | Formulário de avaliação. É para cá que o QR code aponta. `canal` é `mesa`, `embalagem` ou `delivery`. |
| `/obrigado` | Confirmação com resumo das notas e convite opcional que abre direto a tela de avaliação da loja no Google. |
| `/login` | Login do gestor (carregado sob demanda). |
| `/painel` | Médias por unidade e notas baixas, com filtro de 7, 30 ou 90 dias. Protegido por guard. |

## Rodando local

Precisa de Node 22.22+ ou 24.15+.

```bash
npm ci
cp .env.example .env   # preencha com a URL e a chave anon do Supabase
npm start              # http://localhost:4200/avaliar?u=1&c=mesa
```

O `src/environments/environment.ts` é gerado pelo `scripts/gerar-env.mjs` antes do `start`, do `build` e do `test`. Ele não vai para o Git.

## Banco (Supabase)

1. Crie o projeto no Supabase (região São Paulo).
2. No SQL Editor, rode na ordem:
   - `supabase/migrations/20261114120000_estrutura_inicial.sql`
   - `supabase/migrations/20261114120100_seguranca_rls.sql`
   - `supabase/migrations/20261115180000_links_avaliacao_google.sql`
   - `supabase/seed.sql`
3. Crie o acesso do gestor seguindo `supabase/criar-gestor.md`. O cadastro público fica desligado.

Regras que ficam no banco, e não só na tela:

- Nota só de 1 a 5, comentário até 500 caracteres, pedido só com números (até 10), canal só mesa, embalagem ou delivery.
- O cliente anônimo só consegue inserir avaliação de unidade ativa, e só nas colunas que ele preenche. `id` e `criado_em` quem define é o banco.
- O cliente anônimo não lê avaliação nenhuma. Só o gestor logado lê.
- Ninguém altera ou apaga avaliação pela API.

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist/avaliacao-juras/browser`
- Variáveis: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `NODE_VERSION=24`
- Cada merge na `main` publica sozinho. Pull requests ganham um endereço de prévia.

O arquivo `public/_headers` aplica a CSP e os outros cabeçalhos de segurança. A CSP só libera conexão com o próprio site e com o Supabase.

## QR codes

```bash
npm run qrcodes -- https://endereco-publicado.pages.dev
```

Gera um SVG (para a gráfica) e um PNG de cada unidade e canal em `qrcodes/`. Os ids do script precisam bater com os da tabela `unidade`.

## Testes

```bash
npm test                 # unitários e de integração
npm run test:cobertura   # mesma coisa com relatório de cobertura em coverage/
```

- Unitários: modelo (validações e nota baixa), serviços, guard e formatação de data e média.
- Integração: o app sobe com as rotas reais e um repositório em memória no lugar do Supabase (`src/testing/repositorio-falso.ts`). Cobre envio completo, QR inválido, erros de validação, falha de rede com nova tentativa, bloqueio de reenvio, login e painel.
- Repositório Supabase: `supabase-dados.repository.spec.ts` usa um cliente falso para conferir as consultas (filtros, ordem, paginação de 1000 em 1000) e a nova tentativa quando o supabase-js falha ao carregar.
- Banco: `supabase/testes/rls.test.sql` roda as migrations num PostgreSQL limpo e tenta burlar as regras (nota 6, data falsa, ler avaliação sem login, apagar avaliação etc.). `supabase/testes/dados.test.sql` confere que toda unidade ativa tem um link direto de avaliação no Google, tanto no banco novo quanto depois da migration aplicada em cima dos links antigos. Os dois rodam dentro de uma transação desfeita no final.

## CI

`.github/workflows/ci.yml` roda em todo push na `main` e em todo pull request:

1. `npm ci`, checagem de formatação e `npm audit` das dependências de produção
2. testes com cobertura
3. build de produção (o orçamento do Angular falha o build acima de 1 MB inicial)
4. em paralelo, sobe um PostgreSQL 16, roda migrations e seed e executa os testes de segurança e dos links do Google

## Monitoramento

`.github/workflows/monitoramento.yml` roda `scripts/monitorar.mjs` a cada 30 minutos contra o ambiente publicado e confere:

1. a tela do QR code responde com o app Angular e com o cabeçalho CSP
2. a rota do login devolve o app (fallback de SPA)
3. o JavaScript publicado tem a URL e a chave publishable do Supabase (o script lê dali, sem guardar segredo)
4. o banco responde à mesma consulta que a tela do QR faz como cliente anônimo e devolve as 4 unidades ativas
5. o Supabase Auth, usado no login do gestor, está saudável

Cada checagem tem limite de 10 segundos. Se alguma falhar, a execução fica vermelha (DOWN), o GitHub manda e-mail para o dono do repositório e uma issue "Sistema fora do ar" é aberta com o link da execução. O resumo de cada execução mostra o status e o tempo de resposta de cada item, e o selo no topo deste README mostra o último resultado. A consulta periódica também mantém o projeto do Supabase ativo, já que o plano gratuito pausa depois de 7 dias sem acesso.

Para rodar na mão: `node scripts/monitorar.mjs https://avaliacao-juras.pages.dev`.

O GitHub desativa agendamentos de repositórios públicos depois de 60 dias sem commit. Se isso acontecer, é só reativar o workflow na aba Actions.

## Estrutura

```
src/app/
  core/        modelo, serviços, guard e o repositório (único lugar que usa supabase-js)
  features/    avaliar, obrigado, login, painel
  shared/      topo e ícones
src/testing/   repositório em memória e helper dos testes de integração
supabase/      migrations, seed e testes do banco
scripts/       geração do environment, dos QR codes e monitoramento
```

## Decisões e limitações

- O supabase-js é carregado só quando precisa. O primeiro carregamento da tela do QR fica em torno de 83 KB comprimidos, o que conta no 4G dentro da loja.
- O convite do Google aparece para todo mundo, não só para quem deu nota alta. Filtrar quem é convidado vai contra a política de avaliações do Google.
- Página pública de avaliações ficou fora do MVP. Foi sugestão do parceiro na 1ª rodada de validação (deixar as avaliações visíveis, como no TripAdvisor). Publicar o que o cliente escreve exige autorização dele, moderação antes de ir ao ar e proteção contra avaliação falsa, já que não há login para avaliar. Para atender a necessidade agora, o convite do fim do formulário abre direto a tela de avaliação da loja no Google, onde quem procura o Jura's já lê as opiniões. A página própria fica para uma próxima versão.
- O bloqueio de reenvio (2 horas por unidade no mesmo aparelho) usa localStorage. Evita clique duplo e envio repetido na sequência, mas quem limpar o navegador consegue avaliar de novo. Para o volume das lojas isso foi aceito.
- As médias são calculadas no navegador a partir das avaliações do período, paginando de 1000 em 1000. Para o volume atual funciona bem. Se crescer muito, o caminho é uma view agregada no banco.
- O plano gratuito do Supabase pausa o projeto depois de 7 dias sem acesso e não tem backup para download. O monitoramento ajuda a manter o projeto ativo, mas backup continua sendo uma limitação.
