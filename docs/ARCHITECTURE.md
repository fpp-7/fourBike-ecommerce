# Arquitetura

## Escolha atual

O produto é um catálogo estático, com atendimento por WhatsApp e negociação na loja. HTML, CSS e módulos JavaScript atendem ao escopo sem framework, banco de dados ou dependências de execução. A versão pública pode ser hospedada diretamente a partir de `public/`; não existe um diretório de build necessário ao funcionamento.

## Responsabilidades

- `public/index.html`: estrutura semântica, conteúdo institucional e controles da interface.
- `public/styles.css`: layout, tipografia Manrope, componentes e regras responsivas, preservando a identidade clara.
- `public/js/data/models.js`: catálogo e manifesto de fotos. A primeira foto é a capa; as seguintes são os registros originais da loja.
- `public/js/data/store.js`: contato público e construção dos links de WhatsApp.
- `public/js/data/simulation.js`: premissas iniciais e referências de consumo dos veículos.
- `public/js/app.js`: seleção de modelos, galeria, visualização ampliada, swipe, teclado e menu móvel.
- `public/js/domain/costs.js`: função pura para comparação financeira; valida entradas e retorna valores sem arredondamento.
- `public/js/economy.js`: validação dos campos, formatação monetária, fontes, anúncios acessíveis e apresentação dos resultados.
- `scripts/serve.mjs`: servidor local, restrito à pasta pública. Não é uma API de administração ou uma hospedagem de produção.

Os parâmetros numéricos iniciais são definidos nos módulos de dados e aplicados aos campos quando o simulador inicializa. O cálculo não depende do DOM e pode ser testado sem navegador. Textos institucionais e notas explicativas permanecem no HTML; ao alterar dados comerciais, manter esses textos coerentes.

## Conteúdo e segurança

O servidor aceita apenas GET/HEAD, não lista diretórios e valida a contenção do caminho real antes de ler arquivos. Arquivos ocultos e caminhos fora da pasta pública não são servidos, inclusive quando há symlinks/junctions. A hospedagem deve publicar apenas `public/`, nunca a raiz inteira do projeto.

Não há senhas, contas de administrador, coleta de dados ou envio automático de mensagens. Os visitantes abrem o WhatsApp e decidem enviar a mensagem. Materiais internos com preços, estoque, caminhos locais e estudos anteriores ficam preservados fora do versionamento.

As capas e originais mantêm os arquivos existentes; somente materiais públicos sem uso foram retirados da nova pasta pública. Licenças e procedência de terceiros acompanham o repositório e a pasta de hospedagem quando necessário.

## Evolução

Uma futura administração com um usuário exige autenticação no servidor, autorização, armazenamento persistente e gestão de imagens. Apenas criar a rota `/admin` não fornece essas funções. Quando esse escopo for iniciado, os módulos de dados podem ser substituídos por uma API mantendo a galeria e a lógica de cálculo separadas. Não há implementação simulada de login nesta versão.
