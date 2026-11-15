-- Confere os links de avaliação do Google das unidades.
-- Roda depois das migrations e do seed, dentro de uma transação desfeita no final.
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/testes/dados.test.sql (a partir da raiz do repo)
\set ON_ERROR_STOP on
\o /dev/null
begin;

create function pg_temp.confere_links(etapa text) returns void
language plpgsql as $$
begin
  if (select count(*) from public.unidade where ativa) < 4 then
    raise exception 'FALHOU (%): faltam unidades ativas', etapa;
  end if;
  if exists (
    select 1 from public.unidade
    where ativa
      and (link_google is null
        or link_google !~ '^https://search\.google\.com/local/writereview\?placeid=ChIJ[A-Za-z0-9_-]{23}$')
  ) then
    raise exception 'FALHOU (%): unidade ativa sem link direto de avaliação no Google', etapa;
  end if;
  if (select count(distinct link_google) from public.unidade where link_google is not null)
     <> (select count(*) from public.unidade where link_google is not null) then
    raise exception 'FALHOU (%): duas unidades com o mesmo link do Google', etapa;
  end if;
end $$;

-- Banco novo: o seed já deixa os links certos.
select pg_temp.confere_links('seed');

-- Banco de produção: as unidades foram criadas com o link antigo da busca do Maps,
-- e a migration de 15/11 precisa trocar todas.
update public.unidade
set link_google = 'https://www.google.com/maps/search/?api=1&query=' || replace(nome, ' ', '+');
\i supabase/migrations/20261115180000_links_avaliacao_google.sql
select pg_temp.confere_links('migration');

rollback;
\o
\echo 'dados.test.sql: links de avaliação conferidos'
