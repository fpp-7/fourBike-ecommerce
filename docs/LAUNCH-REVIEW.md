# Revisão para lançamento — fourBike

Revisão guiada pelas skills grill-with-docs, grilling e domain-modeling. Decisões consolidadas são registradas aqui; propostas permanecem identificadas até resposta do responsável pelo projeto.

## Decisões confirmadas

- Priorizar hospedagem gratuita, se viável. Gratuidade é uma preferência; ainda não foi definida como restrição absoluta nem foi aceito um provedor específico.
- O cliente administra os modelos pelo painel.
- Felipe é responsável pela manutenção técnica, hospedagem, atualizações e backups.
- As contas de domínio e hospedagem pertencerão ao cliente. Felipe terá acesso técnico completo para administrá-las.
- O site deve funcionar sem exigir reativação manual de serviços após períodos sem acesso. Não foi definido um compromisso contratual de disponibilidade nem tempo máximo de resposta.
- Começar com uma solução gratuita e considerar plano pago futuramente se necessário, combinando o custo com o cliente antes. Não há autorização para contratar ou ativar planos pagos automaticamente.
- As fotos e fichas técnicas dos sete modelos já foram aprovadas pela loja, conforme confirmação de Felipe nesta revisão.
- O lançamento deve usar o domínio próprio desejado fourbike.com.br, conforme o nome discutido no projeto. Não divulgar um endereço temporário do provedor como endereço de lançamento. A disponibilidade e o registro do domínio ainda precisam ser verificados.
- Fazer backup automático diário do catálogo e das fotos. Felipe será responsável por restaurar os dados quando necessário; também manter uma cópia antes de mudanças importantes na aplicação.
- O site não terá contagem de estoque. A visibilidade dos modelos é controlada manualmente no painel, sem integração com estoque.
- Mantêm-se catálogo sem preços, negociação presencial, contato em um único WhatsApp, assistência técnica em destaque e acessórios fora do escopo inicial.

## Fatos técnicos verificados

- A implementação atual persiste catálogo, credenciais e uploads na pasta privada data/. Sua preservação é necessária entre reinícios e publicações.
- O armazenamento atual é adequado a um único processo Node; um plano gratuito com disco efêmero exige adaptar a persistência antes de publicar.
- A documentação do Render informa que o serviço web gratuito entra em repouso após 15 minutos sem tráfego e perde alterações no disco local ao reiniciar, republicar ou entrar em repouso. O próprio provedor não recomenda essas instâncias para produção. Fonte: https://render.com/docs/free
- O Supabase oferece plano gratuito para banco e armazenamento, com limites de uso; projetos gratuitos podem ser pausados após uma semana de inatividade. Trata-se de uma opção a avaliar, não de uma escolha aprovada. Fonte: https://supabase.com/pricing
- Cloudflare Workers, D1 e R2 possuem franquias gratuitas, mas exigem adaptação do backend e da persistência. Workers Free limita CPU por requisição a 10 ms; o custo de scrypt no login precisa ser validado, sem reduzir a segurança para caber no plano. R2 cobra excedentes da franquia sem exigir mudança de plano, o que requer avaliação específica frente à regra de custos previamente combinados. Fontes: https://developers.cloudflare.com/workers/platform/limits/ e https://developers.cloudflare.com/r2/pricing/
- Netlify Free inclui funções e armazenamento de arquivos, com 300 créditos mensais. Ao atingir o limite, projetos podem ser pausados até o ciclo seguinte. O plano permite apenas um membro de console, o que precisa ser compatibilizado com a titularidade do cliente e o acesso técnico completo de Felipe. A adaptação da persistência continua necessária. Fonte: https://www.netlify.com/pricing/

## Decisões ainda abertas

- Possibilidade de cadastrar meio de pagamento para serviços com franquia gratuita, sem autorização automática para assumir custos.
- Provedor, eventual adaptação da persistência e política de backup/restauração.
- Disponibilidade, registro e configuração do domínio próprio desejado fourbike.com.br.

## Ajustes editoriais a considerar após a revisão

- Fotos e fichas técnicas já têm aprovação comercial. Rever o aviso genérico de dados ainda sujeitos à confirmação no site, preservando ressalvas úteis sobre variação de autonomia e condições de uso.

Não implementar uma mudança de arquitetura ou publicar em um provedor a partir destas propostas sem concluir a revisão e confirmar o entendimento com Felipe.
