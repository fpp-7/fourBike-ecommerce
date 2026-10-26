# Arquitetura

O produto é um catálogo com atendimento pelo WhatsApp e negociação na loja. HTML, CSS e módulos JavaScript nativos atendem às interfaces pública e administrativa. Um servidor Node oferece API, autenticação e armazenamento privado, sem dependências externas.

## Responsabilidades

- public/index.html e styles.css: conteúdo institucional e identidade visual clara.
- public/js/app.js: carrega /api/models, renderiza somente modelos publicados e mantém galeria, swipe, teclado e menu. Em falha ou catálogo vazio, mostra estado próprio, sem restaurar modelos de origem.
- public/js/data/models.js: catálogo inicial e manifesto das fotos existentes. Usado somente ao criar o armazenamento; não é a fonte do catálogo em execução.
- public/js/data/store.js e simulation.js: contato e premissas do simulador.
- public/js/domain/costs.js e economy.js: cálculo puro e interface, separados da administração.
- admin/: login, lista, formulário, publicação e galeria, sem link na navegação pública.
- server/application.mjs: HTTP, sessões, origem, CSRF, limites de corpo e respostas.
- server/auth.mjs: configuração de um usuário, scrypt, limitação de tentativas e sessões em memória.
- server/validation.mjs: esquema de modelos e caminhos de imagens permitidos.
- server/catalog-store.mjs: fila de mutações, JSON atômico e uploads privados.
- server/static.mjs: serve arquivos regulares das raízes permitidas, validando caminhos reais e bloqueando arquivos ocultos, travessias e diretórios.
- scripts/serve.mjs e admin-user.mjs: inicialização e configuração/redefinição local do acesso.

## Fluxo e persistência

O navegador público recebe somente modelos publicados de GET /api/models. Capa, destaque, seletor, galeria e lista usam a mesma resposta. O primeiro modelo publicado aparece no destaque inicial. Sem modelos, o site mantém conteúdo institucional e contato.

O painel consulta /api/admin/session e autentica com POST /api/admin/login. Leitura e escrita passam por /api/admin/models; fotos são enviadas em corpo binário a /api/admin/uploads. Cada alteração informa a revisão do registro, impedindo que uma aba sobrescreva alterações mais recentes de outra.

Os dados ficam em pasta privada configurável: catálogo, hash das credenciais e uploads. O padrão data/ é ignorado pelo Git e nunca é servido. A aplicação rejeita armazenamento dentro de public/ ou admin/, incluindo aliases por symlink. Um catálogo existente vazio continua vazio após reinício.

Gravações são serializadas no processo e substituem o JSON por renomeação de arquivo temporário. Uma única instância Node deve usar a pasta; várias instâncias exigem banco transacional. Faça backup do diretório inteiro em volume persistente. Disco efêmero de hospedagem não preserva dados em novos deploys.

## Acesso e arquivos

Não há cadastro público. A conta é criada/redefinida via terminal. Credenciais recebem scrypt com salt aleatório; a senha não é gravada. Sessões aleatórias ficam em memória, duram até oito horas e são invalidadas ao sair, redefinir a conta ou reiniciar. O cookie é HttpOnly, SameSite Strict e Secure em HTTPS reconhecido pelo proxy configurado.

Mutações exigem origem correspondente. Após login também exigem token CSRF da sessão. Login tem limite de tentativas e de concorrência scrypt. O servidor usa o endereço da conexão, sem confiar em IP arbitrário informado em headers. Atrás de proxy, tentativas podem compartilhar o limite do IP do proxy, adequado ao acesso de uma pessoa.

Uploads aceitam somente JPEG, PNG e WebP, conferem assinatura e MIME, limitam tamanho e recebem nome UUID. Não são aceitos SVG, HTML, URLs externas ou caminhos arbitrários. Imagens enviadas ficam públicas somente enquanto algum modelo publicado as referencia; a sessão administrativa permite pré-visualizar rascunhos. Remover referências não apaga fisicamente uploads, para evitar perda acidental; retenção e limpeza futura devem considerar backups. Arquivos de origem em public/assets/ já são públicos.

Os textos digitados entram no DOM como texto, sem interpretar HTML. O painel recebe CSP, bloqueio de enquadramento e no-store. Materiais internos, credenciais, fotos de origem não publicadas e ferramentas temporárias ficam fora do Git.

## Operação

npm start inicia o servidor em loopback. Em produção são necessários proxy HTTPS, processo Node mantido ativo e volume privado persistente. FOURBIKE_TRUST_PROXY=1 deve ser usado somente atrás de proxy confiável, com Host preservado e X-Forwarded-Proto controlado. Uma origem fixa pode ser definida com FOURBIKE_PUBLIC_ORIGIN.

O projeto continua sem preços dos veículos, checkout, entrega ou gestão de acessórios. O painel administra somente modelos e fotos. Os testes exercitam autenticação, autorização, origem/CSRF, validação, mídia, revisão concorrente, reinício e catálogo vazio, além dos testes públicos existentes.
