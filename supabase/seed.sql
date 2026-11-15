-- Unidades do Jura's. Rode uma vez depois das migrations.
-- link_google: abre direto a tela de escrever avaliação da loja no Google (place id de cada unidade).
insert into public.unidade (nome, link_google) values
  ('São José do Rio Preto', 'https://search.google.com/local/writereview?placeid=ChIJuwcNcQetvZQRgMcSkyqzYis'),
  ('Bady Bassitt',          'https://search.google.com/local/writereview?placeid=ChIJsb90P6yzvZQR7mHTmCpCPrA'),
  ('José Bonifácio',        'https://search.google.com/local/writereview?placeid=ChIJI88s_oe_vZQRX0G8vnoZgSo'),
  ('Mirassol',              'https://search.google.com/local/writereview?placeid=ChIJs_rR6h-vvZQRGkouGcN7aW8')
on conflict (nome) do nothing;
