-- Testes das regras de segurança do banco (CHECK, permissões e RLS).
-- Roda tudo dentro de uma transação e desfaz no final, então não suja os dados.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/testes/rls.test.sql
\set ON_ERROR_STOP on
\o /dev/null
begin;

-- Executa o comando e só passa se der exatamente o erro esperado.
create function pg_temp.espera_erro(comando text, estado text) returns void
language plpgsql as $$
begin
  execute comando;
  raise exception 'FALHOU: esperava erro % e o comando passou: %', estado, comando;
exception when others then
  if sqlstate <> estado then
    raise;
  end if;
end $$;

insert into public.unidade (nome, ativa) values ('Unidade teste desativada', false);
select id as inativa from public.unidade where nome = 'Unidade teste desativada' \gset
select id as ativa from public.unidade where ativa order by id limit 1 \gset

-- Cliente anônimo (QR code) ---------------------------------------------------
set local role anon;

do $$ begin
  if exists (select 1 from public.unidade where not ativa) then
    raise exception 'FALHOU: anon enxergou unidade desativada';
  end if;
end $$;

insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento, comentario, numero_pedido)
values (:ativa, 'mesa', 4, 2, 'Teste automatizado', '4821');

select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento) values (%s, ''mesa'', 5, 5)', :inativa), '42501');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento) values (%s, ''mesa'', 6, 5)', :ativa), '23514');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento) values (%s, ''mesa'', 5, 0)', :ativa), '23514');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento) values (%s, ''balcao'', 5, 5)', :ativa), '23514');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento, numero_pedido) values (%s, ''mesa'', 5, 5, ''12a'')', :ativa), '23514');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento, comentario) values (%s, ''mesa'', 5, 5, repeat(''x'', 501))', :ativa), '23514');
select pg_temp.espera_erro(format('insert into public.avaliacao (unidade_id, canal, nota_lanche, nota_atendimento, criado_em) values (%s, ''mesa'', 5, 5, ''2020-01-01'')', :ativa), '42501');
select pg_temp.espera_erro('select count(*) from public.avaliacao', '42501');
select pg_temp.espera_erro('delete from public.avaliacao', '42501');
select pg_temp.espera_erro('update public.avaliacao set nota_lanche = 5', '42501');
select pg_temp.espera_erro('update public.unidade set nome = ''x''', '42501');
select pg_temp.espera_erro('insert into public.unidade (nome) values (''Invasora'')', '42501');

-- Gestor logado --------------------------------------------------------------
reset role;
set local role authenticated;

do $$ begin
  if not exists (select 1 from public.avaliacao where comentario = 'Teste automatizado') then
    raise exception 'FALHOU: gestor não conseguiu ler a avaliação enviada';
  end if;
  if not exists (select 1 from public.unidade where not ativa) then
    raise exception 'FALHOU: gestor não enxergou a unidade desativada';
  end if;
end $$;

select pg_temp.espera_erro('delete from public.avaliacao', '42501');
select pg_temp.espera_erro('update public.avaliacao set nota_atendimento = 5', '42501');

reset role;
rollback;
\o
\echo 'Testes do banco: tudo certo.'
