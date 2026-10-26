# fourBike

Catálogo de autopropelidos da fourBike, loja física em Leme/SP. Apresenta sete modelos, galeria de fotos, fichas técnicas, benefícios, simulador de economia, assistência técnica e contato pelo WhatsApp.

A negociação é presencial: sem preços dos veículos, carrinho, pagamento online ou entrega. O visual é sempre claro; a galeria permite swipe no celular e ampliação das fotos.

## Executar localmente

Requisito: Node.js 20 ou superior com npm. O projeto usa HTML, CSS e JavaScript nativos, sem dependências externas e sem etapa de build.

```sh
git clone git@github.com:fpp-7/fourBike-ecommerce.git
cd fourBike-ecommerce
npm start
```

Abra http://127.0.0.1:4173. Mantenha o terminal aberto e use `Ctrl+C` para encerrar. Não é necessário executar `npm install`.

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd start`. Para escolher outra porta no PowerShell: `$env:PORT = '4174'; npm start`.

## Verificar

```sh
npm run check
npm test
```

Os testes usam o próprio Node.js e verificam o cálculo financeiro, a integridade do catálogo e o isolamento da pasta pública. Também são executados no GitHub Actions.

## Organização

```text
public/                 Arquivos publicados na hospedagem
  index.html            Estrutura e conteúdo institucional
  styles.css            Estilos consolidados e responsivos
  assets/               Somente imagens, fonte e licenças usadas
  js/
    app.js              Catálogo, galeria, swipe e menu
    economy.js          Controles e apresentação do simulador
    data/               Modelos, contato e parâmetros iniciais
    domain/costs.js     Cálculo financeiro independente da interface
scripts/                Servidor local e verificação de sintaxe
tests/                  Testes portáveis, sem dependências
docs/                   Arquitetura, premissas e limites atuais
```

Para atualizar modelos, edite `public/js/data/models.js`; para contato, `public/js/data/store.js`; para premissas iniciais, `public/js/data/simulation.js`. O conteúdo estático de endereço, contatos alternativos e referências também deve permanecer coerente no HTML.

Para uma hospedagem estática, publique **somente `public/`**. O servidor local expõe apenas essa pasta. Os diretórios locais `assets/`, `dist/`, `tmp/` e `docs/discovery/` ficam fora do Git: contêm materiais de origem, versões anteriores, ferramentas temporárias e histórico interno.

## Situação e próximos passos

O simulador mostra uma estimativa de gasolina versus eletricidade, com projeção anual em destaque. Capacidade média de bateria de 1 kWh e percurso inicial de 40 km por carga são hipóteses ajustáveis. Consulte [premissas e fontes](docs/CALCULATIONS.md).

O acesso `/admin`, autenticação e persistência ainda não foram implementados. Domínio e hospedagem definitiva permanecem pendentes. Antes do lançamento, confirmar especificações com o fornecedor e completar horários, história e fotos da equipe.

Consulte a [arquitetura](docs/ARCHITECTURE.md) e os [avisos de terceiros](THIRD_PARTY_NOTICES.md). A publicação do repositório não concede uma licença aberta sobre a marca ou as fotografias.
