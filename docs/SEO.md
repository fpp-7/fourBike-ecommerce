# SEO e publicação

A página principal usa URL canônica HTTPS sem www, título e descrição locais,
Open Graph e dados estruturados Store com os dados públicos da loja.
Não publicar horários, avaliações ou especificações sem confirmação.
O painel administrativo já contém noindex; não bloqueá-lo no robots.txt,
pois os buscadores precisam ler essa diretiva. Autenticação protege os dados.

## Após publicar

1. Adicionar fourbike.com.br como propriedade de domínio no Google Search Console.
2. Criar no Registro.br a entrada TXT fornecida pelo Google e verificar a propriedade.
   Preservar os registros A, MX e demais registros existentes.
3. Enviar https://fourbike.com.br/sitemap.xml na seção Sitemaps.
4. Inspecionar https://fourbike.com.br/ e solicitar indexação.
5. Validar a página no Teste de resultados avançados do Google.
6. Criar ou reivindicar o Perfil da Empresa no Google. Usar nome, endereço e telefone
   consistentes com o site; informar horários reais, categoria adequada, fotos e URL.
7. Acompanhar indexação, consultas e cliques no Search Console.

SEO não garante indexação, posição ou prazo. Sitemap contém apenas URLs públicas
reais: âncoras da página e o painel não são páginas de destino adicionais.

## Atualização na VPS

Depois que as alterações estiverem no branch publicado do repositório:

```sh
cd /opt/fourbike
git pull --ff-only
sudo systemctl restart fourbike
curl -I https://fourbike.com.br/
curl -I https://fourbike.com.br/robots.txt
curl -I https://fourbike.com.br/sitemap.xml
```

Os dados persistem em /var/lib/fourbike; manter backup dessa pasta.

## Evolução do catálogo

O catálogo atual é carregado via JavaScript. Criar páginas de modelo com URL
própria e HTML renderizado no servidor usando o catálogo persistido, somente
para modelos publicados, antes de adicioná-las ao sitemap. Não gerar páginas
estáticas a partir dos modelos iniciais: podem divergir do painel.
Não inventar preços ou disponibilidade para obter resultados de produto.

Referências:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/local-business
