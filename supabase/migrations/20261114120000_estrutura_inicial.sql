-- Estrutura inicial: unidades e avaliações.
-- As regras de validação ficam no banco (CHECK) para valer mesmo se alguém chamar a API direto,
-- sem passar pela tela.

create table public.unidade (
  id          bigint generated always as identity primary key,
  nome        text not null unique check (char_length(nome) between 1 and 80),
  link_google text check (link_google is null or link_google ~ '^https://'),
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table public.avaliacao (
  id               bigint generated always as identity primary key,
  unidade_id       bigint not null references public.unidade (id) on delete restrict,
  canal            text not null check (canal in ('mesa', 'embalagem', 'delivery')),
  nota_lanche      smallint not null check (nota_lanche between 1 and 5),
  nota_atendimento smallint not null check (nota_atendimento between 1 and 5),
  comentario       text check (comentario is null or char_length(comentario) <= 500),
  numero_pedido    text check (numero_pedido is null or numero_pedido ~ '^[0-9]{1,10}$'),
  criado_em        timestamptz not null default now()
);

-- O painel sempre filtra por período e ordena do mais novo para o mais antigo.
create index avaliacao_criado_em_idx on public.avaliacao (criado_em desc);
create index avaliacao_unidade_criado_em_idx on public.avaliacao (unidade_id, criado_em desc);

comment on table public.unidade is 'Lojas do Jura''s. Unidade desativada some do QR code, mas o histórico fica.';
comment on table public.avaliacao is 'Avaliações anônimas enviadas pelo QR code. Ninguém altera ou apaga pela API.';
