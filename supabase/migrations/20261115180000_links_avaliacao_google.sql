-- Ajuste da 1ª rodada de validação com o parceiro.
-- O Thiago sentiu falta de as avaliações ficarem visíveis para outras pessoas. Em vez de uma
-- página pública própria, que exigiria moderação, autorização de quem escreveu e proteção
-- contra avaliação falsa, o convite do fim do formulário passa a abrir direto a tela de
-- escrever avaliação de cada loja no Google, onde quem procura o Jura's já lê as avaliações.
-- Cada link foi conferido no navegador. Em banco novo (CI) o update não acha linha nenhuma,
-- porque o seed roda depois e já insere os links novos.
update public.unidade
set link_google = 'https://search.google.com/local/writereview?placeid=ChIJuwcNcQetvZQRgMcSkyqzYis'
where nome = 'São José do Rio Preto';

update public.unidade
set link_google = 'https://search.google.com/local/writereview?placeid=ChIJsb90P6yzvZQR7mHTmCpCPrA'
where nome = 'Bady Bassitt';

update public.unidade
set link_google = 'https://search.google.com/local/writereview?placeid=ChIJI88s_oe_vZQRX0G8vnoZgSo'
where nome = 'José Bonifácio';

update public.unidade
set link_google = 'https://search.google.com/local/writereview?placeid=ChIJs_rR6h-vvZQRGkouGcN7aW8'
where nome = 'Mirassol';
