# Simulador de economia

Referências conferidas durante o levantamento em outubro de 2026. São valores fixos editáveis pelo visitante, sem atualização automática. A comparação considera somente gasolina e eletricidade para a mesma distância em trajetos compatíveis; não inclui compra, financiamento, manutenção, seguro, depreciação ou troca da bateria.

## Parâmetros iniciais

| Parâmetro | Valor | Natureza |
| --- | --- | --- |
| Distância | 600 km/mês | Exemplo ajustável |
| Gasolina | R$ 6,36/l | Média estadual de SP, ANP, 11–17/10/2026 |
| Carro | 10 km/l | Estimativa adotada, sem modelo específico |
| Moto | Honda CG 160 Fan, 48,6 km/l | Resultado de teste publicado em 2018 |
| Bateria | 1 kWh | Média estimada adotada para a simulação, sem medição da linha da loja |
| Percurso por carga | 40 km | Hipótese ajustável |
| Eletricidade | R$ 1,01226/kWh | Referência Enel SP com tributos estimados |

O cliente definiu retirar o acréscimo de recarga. A fórmula usa diretamente a capacidade nominal informada, sem modelar perdas do carregamento. A capacidade média de 1 kWh não é uma especificação certificada de todos os modelos.

## Fontes

- [ANP — levantamento semanal de preços](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas). Média de SP na planilha de 11 a 17/10/2026, aba ESTADOS, gasolina comum.
- [Motociclismo — teste da CG 160 Fan](https://motociclismoonline.com.br/testes/testamos-a-honda-cg-160-fan-a-mais-vendida-do-brasil/), publicado em 27/07/2018. O consumo é daquele exemplar e teste; não é medição da fourBike, nem especificação universal das versões atuais.
- [Enel São Paulo — tarifa residencial B1 convencional](https://www.enel.com.br/pt-saopaulo/Para_Voce/tarifa-energia-eletrica.html), vigente desde 04/07/2026. TUSD de R$ 472,42/MWh e TE de R$ 316,96/MWh: soma de R$ 0,78938/kWh antes de tributos.
- [Enel São Paulo — tributos](https://www.enel.com.br/pt-saopaulo/Para_Voce/tarifa-taxas-e-impostos.html). Premissas: ICMS de 18% para consumo total da residência acima de 200 kWh e PIS/Cofins de 4,90%, referente a janeiro/2026, última linha da tabela disponível na consulta. Essa alíquota não foi confirmada para outubro. PIS/Cofins varia mensalmente e não incide sobre o ICMS.
- [ANEEL — bandeira verde em outubro/2026](https://www.gov.br/aneel/pt-br/assuntos/noticias/2026-defeso-eleitoral/outubro-tera-bandeira-verde-contas-de-luz-sem-custo-extra), sem adicional.

O valor de energia com tributos é uma estimativa composta: `0,78938 / [(1 − 0,18) × (1 − 0,049)] ≈ 1,01226`. Não representa uma tarifa final oficial de todas as residências de SP ou de Leme. Não inclui iluminação pública; considera a faixa de ICMS como fixa e não recalcula eventual mudança de faixa causada pela recarga. O campo aceita o valor final da conta do visitante, sem adicionar tributos novamente.

## Cálculo

```text
Gasolina mensal = km/mês ÷ km/l × R$/litro
Recarga mensal = km/mês ÷ km/carga × capacidade em kWh × R$/kWh
Diferença mensal = gasolina mensal − recarga mensal
Projeção de 12 meses = diferença mensal × 12
```

Valores são arredondados apenas para apresentação. O destaque é anual; o equivalente mensal aparece abaixo. Resultados desfavoráveis são identificados como custo adicional, sem destaque verde. Quando o visitante muda o consumo ou a tarifa, o novo número é identificado como informado por ele, sem atribuição ao teste ou à Enel.
