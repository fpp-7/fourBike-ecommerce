# fourBike

Catálogo de autopropelidos da fourBike, loja física em Leme/SP. Galeria com swipe, fichas técnicas, benefícios, simulador de economia, assistência técnica e contato direto pelo WhatsApp.

A negociação é presencial: sem preços dos veículos, carrinho, pagamento online ou entrega. O visual é claro, com a identidade da fourBike.

## Executar

Requisito: Node.js 20 ou superior com npm. Sem dependências externas ou etapa de build.

```sh
git clone git@github.com:fpp-7/fourBike-ecommerce.git
cd fourBike-ecommerce
npm start
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Mantenha o terminal aberto; Ctrl+C encerra o servidor. Não é necessário npm install. Se o PowerShell bloquear npm.ps1, use `npm.cmd start`.

Na primeira execução, o servidor cria `data/catalog.json` com os sete modelos iniciais. Nas seguintes, usa o catálogo salvo, inclusive se todos os modelos tiverem sido excluídos.

## Administração

O painel fica em `/admin`, sem link no site público. Existe somente um administrador. Configure seu acesso em um terminal local:

```sh
npm run admin:setup
```

Informe usuário e senha de 12 a 128 caracteres. A senha fica oculta durante a digitação e é armazenada somente como hash scrypt com salt. Para substituir um acesso existente:

```sh
npm run admin:setup -- --reset
```

A redefinição invalida as sessões anteriores. Para automação, o comando aceita `--username nome --password-stdin`; forneça a senha pela entrada padrão, nunca como argumento. Não existe cadastro público de administradores.

No painel é possível adicionar, editar e excluir modelos, mostrar ou ocultar cada um, alterar fichas e recursos, enviar fotos e escolher a foto principal e a ordem da galeria. São aceitas até 20 fotos JPG, PNG ou WebP por modelo, com até 5 MB cada. As mudanças são salvas no servidor e aparecem no site ao recarregar a página.

Sessões duram até oito horas e encerram quando o servidor reinicia. O formulário é preservado em memória ao pedir novo login; recarregar a aba descarta alterações ainda não salvas. Há confirmação antes de excluir e de descartar um formulário alterado.

## Dados e hospedagem

**A aplicação agora precisa de servidor Node e armazenamento persistente.** Publicar somente `public/` em hospedagem estática não oferece o catálogo dinâmico nem o painel.

- `data/catalog.json`: catálogo e referências das fotos enviadas.
- `data/admin-user.json`: usuário, salt e hash da senha.
- `data/uploads/`: arquivos enviados pelo painel.

A pasta data/ fica fora do Git e das pastas servidas. Faça backup da pasta inteira. Remover fotos ou modelos do catálogo não apaga o arquivo do disco; imagens sem referência pública deixam de ser acessíveis sem autenticação. A limpeza física pode ser feita futuramente após verificar os backups.

Variáveis opcionais (veja .env.example; configure no ambiente, não há carregamento automático de .env):

| Variável | Uso |
| --- | --- |
| `PORT` | Porta local; padrão 4173. |
| `FOURBIKE_DATA_DIR` | Diretório privado, fora de public/ e admin/; padrão data/. Use o mesmo valor no servidor e em admin:setup. |
| `FOURBIKE_TRUST_PROXY=1` | Confia em X-Forwarded-Proto do proxy controlado para reconhecer HTTPS e usar cookie Secure. |
| `FOURBIKE_PUBLIC_ORIGIN` | Opcional: origem exata autorizada, como https://fourbike.com.br. |

O Node escuta em 127.0.0.1. Para produção, use proxy HTTPS confiável, preserve Host e informe o protocolo, mantenha o Node inacessível diretamente e habilite FOURBIKE_TRUST_PROXY=1. Para túnel HTTPS, use a mesma configuração de proxy. Localmente, o cookie usa HttpOnly e SameSite Strict; em HTTPS reconhecido, também Secure.

O armazenamento JSON atende esta operação com um administrador e **um único processo Node**. Não execute várias instâncias apontando para a mesma pasta. Para escalar, migre para banco transacional e armazenamento de imagens apropriado.

## Verificar

As fotos iniciais usam versões WebP responsivas, preservando os arquivos originais e as referências do catálogo. Para regenerá-las, consulte [imagens responsivas](docs/IMAGES.md); o conversor usa Python/Pillow somente no desenvolvimento.

```sh
npm run check
npm test
```

Os testes usam Node.js, dados temporários e nenhum segredo real. Cobrem cálculo financeiro, fotos iniciais, isolamento dos arquivos, autenticação, origem/CSRF, autorização, upload, conflitos de edição e persistência após reinício. Também executam no GitHub Actions.

## Organização

```text
public/                 Site público, imagens e fonte
  js/app.js             Catálogo via API, galeria e menu
  js/economy.js         Interface do simulador
  js/data/              Contato, premissas e catálogo de primeira criação
  js/domain/costs.js    Cálculo independente da interface
admin/                  HTML, CSS e JavaScript de /admin
server/                 HTTP, autenticação, validação e persistência
scripts/                Inicialização, configuração do usuário e verificação
tests/                  Testes sem dependências externas
docs/                   Arquitetura e premissas do simulador
data/                   Dados privados gerados em execução; fora do Git
```

Para modelos, use /admin: editar `public/js/data/models.js` não altera dados já salvos. Contato e parâmetros do simulador continuam em `public/js/data/store.js` e `simulation.js`. Mantenha o conteúdo institucional do HTML coerente.

Domínio e hospedagem definitiva permanecem pendentes. Antes do lançamento, confirme especificações com o fornecedor e complete horários, história e fotos da equipe. Consulte [arquitetura](docs/ARCHITECTURE.md), [premissas de cálculo](docs/CALCULATIONS.md) e [avisos de terceiros](THIRD_PARTY_NOTICES.md). O repositório não concede licença aberta sobre a marca ou as fotografias.
