-- Unidades do Jura's. Rode uma vez depois das migrations.
-- link_google: por enquanto aponta para a busca do Google Maps. Quando o Thiago pegar o link
-- "Pedir avaliações" do Perfil da Empresa no Google, é só trocar com um update.
insert into public.unidade (nome, link_google) values
  ('São José do Rio Preto', 'https://www.google.com/maps/search/?api=1&query=Jura%27s+S%C3%A3o+Jos%C3%A9+do+Rio+Preto'),
  ('Bady Bassitt',          'https://www.google.com/maps/search/?api=1&query=Jura%27s+Bady+Bassitt'),
  ('José Bonifácio',        'https://www.google.com/maps/search/?api=1&query=Jura%27s+Jos%C3%A9+Bonif%C3%A1cio'),
  ('Mirassol',              'https://www.google.com/maps/search/?api=1&query=Jura%27s+Mirassol')
on conflict (nome) do nothing;
