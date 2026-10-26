# fourBike — revisão de conversão

Aplicação da skill revenue-centric-design ao catálogo da fourBike. O documento reúne a auditoria inicial, as propostas e o registro da implementação autorizada dos itens 1 a 3. A configuração de hospedagem não faz parte desta mudança.

## Aplicação após aprovação

Felipe autorizou aplicar clareza da abertura, contato após o simulador e otimização das imagens. A implementação ajusta esses três pontos, preservando o fluxo e a identidade visual aprovados. O diagnóstico abaixo registra o estado anterior à implementação.

Resultado técnico: 41 fotos receberam fontes responsivas. As versões maiores das sete capas somam 847.942 bytes, contra 13.941.460 bytes dos PNGs canônicos, redução de aproximadamente 94%. Os originais e as referências salvas pelo painel permanecem preservados. Esse comparativo é de arquivos, não de receita ou de todo o carregamento inicial da página.

Para confiança, a autorização foi pensar em uma proposta, sem publicar novos materiais: incluir futuramente uma foto real da equipe na própria loja e um texto curto com quem atende. Selecionar a foto e confirmar nomes/funções com a loja antes de inserir. Manter a seção Sobre nós atual até haver esse material; não adicionar rostos sintéticos, avaliações ou números de clientes.

## Objetivo e limites

O resultado comercial desejado é gerar conversas qualificadas pelo WhatsApp, visitas à loja e negociações presenciais. Cliques são sinais intermediários, não vendas confirmadas. Não há dados de tráfego, conversas atribuídas ao site ou vendas para estimar ganho de conversão ou receita.

Preservar o escopo aprovado: sete modelos iniciais, ausência de preços e contagem de estoque, negociação presencial, um WhatsApp para toda a equipe, assistência técnica em destaque e administração de modelos pelo cliente. Acessórios continuam para uma etapa futura.

As fotos e fichas técnicas já foram aprovadas pela loja. Não há base recebida para adicionar avaliações, números de clientes, promessas de garantia, horários ou condições de financiamento.

## Evidência observada

- Inspeção do HTML, CSS e módulos do catálogo, simulador e contato.
- Navegação automatizada em Chrome, com 1440 × 900 e 390 × 844 pixels, usando dados temporários isolados. Sem erros JavaScript ou transbordamento horizontal nessas duas verificações. Não equivale a uma auditoria completa de acessibilidade ou compatibilidade.
- A abertura usa o título “Sua rotina, em outro ritmo.”, uma indicação menor de autopropelidos em Leme e o botão “Conhecer os modelos”.
- Na primeira tela móvel, o botão flutuante do WhatsApp está disponível; o botão textual do cabeçalho não aparece. O contato já existe e não está bloqueado por formulário ou cadastro.
- Cada modelo tem um botão de WhatsApp com seu nome na mensagem, contexto que deve ser mantido.
- A seção de benefícios contém o simulador, mas não possui uma chamada própria para o WhatsApp após o resultado. O botão flutuante geral permanece disponível.
- As sete capas PNG somam 13.941.460 bytes, aproximadamente 13,94 MB decimais; cada arquivo varia de 1,83 a 2,07 MB. Esse é o volume dos arquivos, não uma medição de transferência inicial: o site utiliza carregamento tardio em parte das fotos.
- A análise do código não encontrou instrumentação de métricas de conversão.

## Prioridades

### 1. Clareza em cinco segundos — título e proposta local

**Princípio:** teste de compreensão da abertura. O visitante deve reconhecer rapidamente o produto e o contexto da loja. A frase atual tem personalidade, mas o entendimento depende também da indicação menor e da imagem. Essa é uma hipótese de clareza, não um resultado de teste com clientes.

**Proposta de texto:**

> Autopropelidos elétricos em Leme.
>
> Conheça os modelos, simule o gasto com recarga e converse com a nossa equipe para visitar a loja. A fourBike também oferece assistência técnica.

Manter “Conhecer os modelos” como entrada para explorar o catálogo. Testar a compreensão da proposta com pessoas que possam comprar na loja antes de concluir que uma variante é superior. Não substituir a identidade visual aprovada por um novo desenho de página.

**Validação:** mostrar a abertura por cinco segundos e perguntar, sem induzir, o que a loja vende, onde fica e qual é o próximo passo. Registrar as respostas; esse teste ainda não foi feito.

**Fonte do mecanismo:** [Richard — teste de compreensão da abertura](https://x.com/richardrx/status/2060409264683044995).

### 2. CTA adequado ao estágio — conectar economia e conversa

**Princípio:** a ação deve corresponder ao momento da decisão e tornar o destino do clique explícito. Depois de simular um trajeto, o visitante tem uma dúvida concreta que a equipe pode atender.

**Proposta:** colocar uma chamada próxima do resultado do simulador com “Conversar no WhatsApp” e apoio “Conte como você se desloca e tire suas dúvidas com a equipe.” Uma mensagem possível é: “Olá! Usei o simulador no site da fourBike e gostaria de conhecer os modelos na loja.”

Usar o mesmo número já aprovado. Não prometer resposta instantânea, desconto, reserva ou avaliação técnica personalizada sem confirmação da loja. Preservar as ressalvas da estimativa e os botões de contato por modelo já implementados.

**Validação:** verificar se a pessoa encontra o contato após a simulação e compreende que a negociação será na loja. Um clique abre o WhatsApp; não comprova que a mensagem foi enviada.

**Fontes do mecanismo:** [Richard — texto do CTA](https://x.com/richardrx/status/2058875777739866490) e [CTA conforme o estágio](https://x.com/richardrx/status/1986836679953719632).

### 3. Desempenho como parte da conversão — otimizar as fotos

**Princípio:** espera e carregamento fazem parte do caminho até o contato. O tamanho observado das capas justifica otimização independentemente de qualquer promessa de receita.

**Proposta:** gerar imagens em formatos e dimensões apropriados para capa, cartão e miniatura, preservando os originais; evitar entregar uma capa grande para uma miniatura pequena. Conferir visualmente logotipos, detalhes e fidelidade dos veículos após a conversão. Manter a foto principal priorizada e o restante da galeria com carregamento tardio.

**Validação:** comparar bytes transferidos e carregamento da imagem principal, com cache frio e conexão móvel controlada, além de revisar nitidez em desktop e celular. Ainda não foi medido LCP nem realizado teste em rede móvel real. Não transportar percentuais de outros negócios para a fourBike.

**Fonte do mecanismo:** [Richard — desempenho e conversão](https://x.com/richardrx/status/2084589988843299217).

### 4. Prova proporcional à promessa — confiança verificável

**Princípio:** confiança precisa de evidência específica, não de números ou depoimentos inventados.

**Manter:** galeria com fotos da loja, fotos originais dos veículos, endereço, mapa, Instagram e assistência técnica. As capas tratadas valorizam a apresentação; as fotos originais ajudam a pessoa a conhecer o veículo real.

**Evoluir quando houver material:** apresentar os rostos da equipe e os horários confirmados. Avaliações só entram quando forem reais, atribuíveis e verificáveis. Não é necessário preencher essa lacuna com conteúdo sintético.

O aviso de especificações ainda sujeitas à confirmação pode ser atualizado para refletir a aprovação já informada, mantendo a indicação de que autonomia e consumo variam conforme o uso. Aprovação das fichas não transforma as estimativas do simulador em medições de cada modelo.

**Fonte do mecanismo:** [Richard — contraste, posição e confiança](https://x.com/richardrx/status/2049215050997784774).

### 5. Qualidade do sinal — acompanhar o caminho até a loja

**Princípio:** medir a ação que se aproxima do resultado comercial, distinguindo interesse de compra efetiva.

**Plano de medição proposto:** acompanhar consultas aos modelos, uso do simulador, cliques no WhatsApp por origem e abertura do mapa. A loja pode registrar, no atendimento, quais conversas viraram visitas e quais visitas resultaram em vendas. Não presumir que o navegador consegue observar conversas privadas ou negociações presenciais.

Instrumentação ainda precisa ser escolhida e implementada. Não adicionar rastreadores externos automaticamente como parte desta auditoria. Começar por observação qualitativa e uma base real; testes A/B exigem volume e desenho adequados, ainda desconhecidos.

**Fontes do mecanismo:** [Richard — sinais de valor além de cadastros](https://x.com/richardrx/status/2065082771987394651) e [limites de testes A/B com amostras pequenas](https://x.com/richardrx/status/2061463480868229189).

## Disciplina de escopo

Aplicar o filtro Swiss Knife: uma adição deve melhorar o caminho entre conhecer um modelo, tirar dúvidas e visitar a loja, com custo de manutenção justificável. Para este lançamento, não adicionar carrinho, checkout, estoque, CRM ou novas seções de acessórios. O painel já atende à operação de um administrador.

Fonte do mecanismo: [Richard — filtro Swiss Knife](https://x.com/richardrx/status/2059236567533650119).

## Ordem sugerida

1. Otimizar capas, imagens de cartões e miniaturas e medir o resultado técnico.
2. Refinar a proposta da abertura e validar sua compreensão.
3. Conectar o resultado do simulador ao contato da equipe.
4. Completar prova real da loja quando houver material e definir medição básica.

Os itens 1 a 3 foram aplicados no projeto após autorização. Fotos da equipe, novas provas reais e instrumentação de métricas continuam como propostas. A publicação definitiva depende da etapa de hospedagem. Não há base para afirmar aumento de vendas ou de conversão antes de observar o uso real.

## Atribuição e termos da referência

Revenue-Centric Design e os princípios citados são de Richard (@richardrx), organizados na skill [heliocosta-dev/revenue-centric-design](https://github.com/heliocosta-dev/revenue-centric-design). Os achados sobre o código e as propostas para a fourBike são a aplicação desta revisão ao projeto.

Texto integral da licença da referência:

```text
Revenue-Centric Design Skill — License & Usage Terms
Copyright (c) 2026 the curators of this repository.

The underlying ideas, frameworks, examples, and the coined term "Revenue-Centric
Design" are the intellectual property of Richard (@richardrx on X) and are used
here WITH PERMISSION. This repository is a distilled, translated index of his
public posts, shared for educational and reference use.

You are granted permission to use, copy, and share this material, subject to ALL
of the following conditions:

1. ATTRIBUTION. You must retain clear attribution to Richard (@richardrx) and a
   link to the source. Do not misrepresent the origin of these ideas.

2. NO GAMBLING / BETTING / CASINO USE. You may NOT use this material — in whole
   or in part — to design, build, optimize, market, or grow betting, casino,
   gambling, or other real-money games-of-chance products or projects (including
   loot-box and real-money-gaming mechanics). This restriction was set by the
   original author as an explicit condition of reuse and MUST be preserved in any
   copy or derivative.

3. PRESERVE THESE TERMS. Any copy or derivative work must include this license in
   full, including the restrictions above.

4. NO WARRANTY. This material is provided "AS IS", without warranty of any kind,
   express or implied. The curators and the original author are not liable for any
   claim, damages, or other liability arising from its use.

Note: Because of the field-of-use restriction in clause 2, this is a
SOURCE-AVAILABLE license, not an OSI-approved open-source license.
```
