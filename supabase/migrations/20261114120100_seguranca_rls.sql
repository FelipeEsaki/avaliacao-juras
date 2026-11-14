-- Permissões e Row Level Security.
-- anon = cliente que abriu o QR code (sem login).
-- authenticated = gestor logado. O cadastro público fica desligado no painel do Supabase,
-- então só existe conta criada pelo administrador.

alter table public.unidade enable row level security;
alter table public.avaliacao enable row level security;

-- O Supabase dá todas as permissões por padrão. Aqui fecha tudo e abre só o necessário.
revoke all on public.unidade, public.avaliacao from anon, authenticated;

-- unidade
grant select on public.unidade to anon, authenticated;
grant insert, update on public.unidade to authenticated;

create policy "cliente le unidades ativas"
  on public.unidade for select to anon
  using (ativa);

create policy "gestor le todas as unidades"
  on public.unidade for select to authenticated
  using (true);

create policy "gestor cadastra unidade"
  on public.unidade for insert to authenticated
  with check (true);

create policy "gestor altera unidade"
  on public.unidade for update to authenticated
  using (true) with check (true);

-- avaliacao
-- Insert liberado só nas colunas que o cliente preenche. id e criado_em quem define é o banco,
-- então ninguém consegue mandar avaliação com data falsa.
grant insert (unidade_id, canal, nota_lanche, nota_atendimento, comentario, numero_pedido)
  on public.avaliacao to anon, authenticated;
grant select on public.avaliacao to authenticated;

create policy "cliente avalia unidade ativa"
  on public.avaliacao for insert to anon, authenticated
  with check (
    exists (select 1 from public.unidade u where u.id = unidade_id and u.ativa)
  );

create policy "gestor le avaliacoes"
  on public.avaliacao for select to authenticated
  using (true);

-- Sem policy de update e delete em avaliacao: a nota que o cliente deu não muda.
