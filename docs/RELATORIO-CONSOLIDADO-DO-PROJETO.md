# Relatório consolidado do projeto IPTV

> Atualização posterior em 13/09/2026: a versão 0.1.4 acrescentou [favoritos e continuar assistindo](favoritos-e-continuar-assistindo.md). Este relatório preserva a consolidação das três prioridades anteriores.

**O que foi feito, por que foi feito e como continuar**

Este documento reúne o levantamento inicial, o estudo dos três repositórios de referência e as implementações das Prioridades 1, 2 e 3. É uma memória de decisões e resultados: explica os problemas encontrados, as mudanças realizadas, os motivos técnicos e os efeitos para quem usa o app.

**Estado registrado:** fontes da versão **0.1.3**, build **`0.1.3-00aa97c3a0ff`**, IndexedDB **v2**. Implementações realizadas em 11 e 12/09/2026. O último relatório de testes registra **66 testes aprovados e nenhuma falha**. A verificação estática abrange **47 arquivos**.

**Distinção essencial:** as três prioridades estão implementadas no código e verificadas nos cenários automatizados descritos aqui. Não foi gerado nem instalado um IPK novo. O pacote 0.1.0 que permanece na raiz é anterior a essas mudanças. A execução desta versão na TV física ainda precisa ser validada.

## 1. Objetivo e ponto de partida

O pedido inicial foi entender o app existente, documentá-lo e estudar Nodecast TV, Hypnotix e SFVIP-Player para identificar recursos úteis. Em seguida, foram solicitadas as implementações das três primeiras prioridades do plano de continuidade.

O app recebido já possuía componentes importantes: interface para controle remoto, lista virtualizada, reprodução nativa com HLS.js de reserva, catálogo local em IndexedDB, serviço Luna na TV e backend no PC. **Esses componentes não foram todos criados nesta conversa.** O trabalho consistiu em analisar essa base, corrigir os contratos e os comportamentos problemáticos e acrescentar as peças que faltavam nas prioridades solicitadas.

A ordem escolhida foi:

1. **Proteger o catálogo:** impedir perda de dados e mistura de fontes.
2. **Estabilizar reprodução e autonomia:** cancelar operações antigas e reduzir a dependência do PC.
3. **Completar navegação e diagnóstico:** tornar o retorno previsível e os registros úteis após falhas e reinícios.

Essa ordem tem uma razão prática. Favoritos ou progresso de filmes seriam pouco confiáveis se um item pudesse mudar de identidade, ser sobrescrito por outra fonte ou desaparecer após uma sincronização incompleta. Primeiro foi necessário estabilizar o que identifica, armazena e reproduz cada item.

## 2. Levantamento e documentação inicial

### O que foi examinado

| Conjunto | Arquivos inventariados | Resultado |
|---|---:|---|
| Projeto recebido | 88 | 49 arquivos atuais/dados/artefatos e 39 arquivos de backup |
| Nodecast TV | 66 | Dossiê por arquivo, inventário e estudo de recursos aproveitáveis |
| Hypnotix | 107 | Dossiê por arquivo, inventário e estudo de provedores/navegação |
| SFVIP-Player | 11 | Dossiê da árvore disponível e identificação de dependências ausentes |
| **Total** | **272** | Base histórica documentada |

Foram registrados caminhos, tamanhos, hashes e responsabilidades identificáveis. Os backups foram comparados aos arquivos atuais. Os logs e dados foram analisados para separar o que havia sido observado em uso do que era apenas uma hipótese pelo código. O IPK antigo foi inspecionado como arquivo, sem instalação.

**Por que fazer isso:** havia diferenças entre backups, código atual, comentários e relatos de funcionamento. Sem uma fotografia inicial, seria difícil saber o que realmente mudou e quais conclusões pertenciam à versão antiga.

**Limite desse trabalho:** inventariar todos os arquivos não equivale a auditar semanticamente cada linha de bibliotecas, traduções ou binários. O aprofundamento se concentrou nos fluxos úteis para continuar o app. Não foram executados os três aplicativos externos.

As referências completas estão no [índice da memória técnica](README.md), no [dossiê do app](arquivos-app.md), no [inventário original](inventario-app-local.md) e na [comparação dos backups](backups-comparados.md).

## 3. O que aproveitamos dos repositórios de referência

O estudo está vinculado às revisões registradas em 11/09/2026, não à suposição de que os repositórios continuam iguais hoje.

| Referência | Revisão estudada | Ideias úteis e motivo |
|---|---|---|
| Nodecast TV | `0e26a90dae211cf9ed4c7adc8941ec9fbddec972` | Organização de sincronização, persistência, favoritos, histórico, EPG, proxy e processamento de mídia. É a referência com maior proximidade de linguagem ao backend JavaScript. |
| Hypnotix | `0e0fa1c7596f7925c715c36efb0e4be53a3bde43` | Ciclo de cadastro/validação de provedores, separação de tipos de catálogo, episódios sob demanda e estados de navegação. |
| SFVIP-Player | `0e634fea82b2e38c10615d7195862a4e06ddf2f9` | Referência limitada de configuração e estados de tela. A árvore disponibilizada não contém material suficiente para extrair um motor de reprodução completo. |

No SFVIP, 105 das 112 referências a arquivos do projeto C# estavam ausentes na árvore estudada. Por isso não foi prometido reaproveitamento de buffering, EPG, mpv ou outros recursos cuja implementação não estava disponível.

**Decisão:** adaptar conceitos e contratos à estrutura existente do app. Não transplantar uma aplicação desktop inteira para o webOS. Python/GTK/mpv e C#/WPF não entram diretamente no player JavaScript da TV; o Nodecast também usa recursos de runtime diferentes dos alvos antigos documentados para este app.

**O que não foi feito:** não foram incorporados agora FFmpeg, EPG completo, favoritos ou continuação de episódios a partir desses projetos. O estudo desses recursos orienta etapas futuras. Também não foi estabelecida a origem exata de cada trecho já presente no app: sem histórico Git do projeto recebido, semelhança não prova cópia.

Leia o [estudo comparativo completo](estudo-repositorios.md) para os caminhos dos módulos externos, os cuidados de adaptação e as declarações de licença encontradas nos arquivos.

## 4. Arquitetura mantida e responsabilidades atuais

```text
Controle remoto / interface
          |
          v
 app.js + ChannelList + Settings
          |
          v
        Catalog
       /   |   \
      /    |    \
 IndexedDB Luna   API HTTP do PC
 catálogo  TV    catálogo / proxy / relatórios
 local     |
           v
        Provedor

Reprodução:
Player nativo -> URL direta quando possível
HLS.js ou nativo via proxy -> PC, quando necessário
```

| Camada | Responsabilidade | Por que foi mantida |
|---|---|---|
| Interface | Foco, categorias, séries, configuração e comandos do controle | O uso na TV exige navegação diferente de mouse/desktop. |
| `Catalog` | Escolher banco/transporte e expor operações à interface | Evita espalhar decisões de rede e origem por todas as telas. |
| `DB` | Persistência, identidade, consultas e publicação transacional | É a base para o catálogo continuar disponível sem PC. |
| `Sync` | Baixar, conferir e publicar uma geração de dados | Uma resposta de rede não deve alterar diretamente o catálogo visível. |
| Luna | Buscar dados do provedor no serviço da própria TV | Permite primeira configuração e atualização sem exigir backend no PC. |
| Backend | Compatibilidade, proxy, catálogo HTTP e diagnóstico persistente | Continua útil para streams que precisam de tratamento adicional. |
| Player | Ciclo de reprodução nativo/HLS.js | Os motores existentes já atendiam parte dos streams; o problema imediato era controlar seu ciclo de vida. |

O objetivo de autonomia é **dispensar o PC quando o caminho direto é suficiente**. Não significa assistir sem internet, baixar todos os vídeos nem garantir compatibilidade universal de codecs e cabeçalhos.

## 5. Prioridade 1 — integridade do catálogo

### C01 — Publicar somente uma carga comprovadamente completa

**Problema:** uma página curta ou vazia podia ser interpretada como fim da lista. O app então removia itens antigos como se o provedor tivesse confirmado que eles não existiam mais.

**Mudança:** o download passa por uma área temporária chamada `staging`. Cada página precisa ter total válido, offset correto, tamanho esperado, identidade e snapshot consistente. IDs inválidos e duplicados também impedem a publicação.

**Por quê:** “não recebi os dados” e “a coleção está vazia” são situações diferentes. A ausência de resposta não pode autorizar exclusão.

**Exemplo:** se o transporte anuncia 1.000 itens e entrega apenas dois, a tentativa falha. Os canais antigos continuam visíveis. Uma coleção vazia só é aceita com uma resposta válida que confirme total zero.

### C02 — Poda e contagem dentro da publicação

**Problema:** além da possibilidade de remoção indevida, a quantidade removida era perdida por uma adaptação incorreta dos argumentos do callback.

**Mudança:** a remoção de registros ausentes faz parte da transação final e retorna a contagem real de `podados`.

**Por quê:** o resultado deve corresponder ao que foi efetivamente confirmado no banco. Se a transação abortar, inclusão e remoção devem ser revertidas juntas.

### C03 — Identidade que inclui fonte e tipo

**Problema:** duas fontes podiam usar o mesmo número de canal, filme ou série. Um registro poderia sobrescrever outro ou um episódio ser recuperado no contexto errado.

**Mudança:** a chave interna passou a representar `[sourceId, store, providerId]`, com prefixo `k2:`. O identificador do provedor continua separado. Episódios referenciam a identidade completa da série.

**Por quê:** o número `123` do provedor A não é o mesmo item que `123` do provedor B; um filme e um canal também não são a mesma entidade.

Para M3U, a identidade deriva de SHA-256 da URL exata do stream. Renomear ou reordenar o canal não troca a identidade; trocar a URL troca. O hash evita colocar a URL do stream como texto do ID.

Foi implementada a migração do banco v1 para v2 com preservação de favoritos/histórico existentes e das referências legadas quando necessário. Uma migração não consegue recuperar registros que já tenham sido sobrescritos na versão antiga.

### C04 — Cache M3U separado por origem

**Problema:** um cache compartilhado podia entregar a playlist de uma fonte quando outra era selecionada.

**Mudança:** o cache passou a ter identidade por origem, metadados e checksum, com escrita em temporário e publicação por rename. Na P2, os cabeçalhos também passaram a participar da identidade.

**Por quê:** um dado reaproveitado precisa pertencer à mesma configuração que está sendo consultada. Falhar ao atualizar uma fonte não deve tornar o cache de outra uma resposta aceitável.

### C05 — Troca de fonte no backend após preparação completa

**Problema:** o servidor podia alterar a fonte ativa antes de concluir todas as buscas. Falhas e callbacks antigos podiam deixar um estado misturado.

**Mudança:** o backend prepara um estado separado e só o publica depois de concluir e persistir a ativação. As consultas capturam a origem/geração para rejeitar respostas de um contexto que já mudou.

**Por quê:** a interface deve receber uma versão coerente do catálogo, não partes de fontes diferentes.

### C06 — Serializar alterações e distinguir tentativa de sucesso

**Problema:** duas sincronizações podiam disputar os mesmos registros, e falhas parciais podiam ser apresentadas como sincronização concluída.

**Mudança:** operações de escrita entram em fila por fonte. Há marcadores separados para a última tentativa e a última publicação bem-sucedida. Categorias e itens só substituem a versão anterior após validação e confirmação transacional.

**Por quê:** “tentei atualizar agora” não significa “tenho um catálogo novo válido”. A última tentativa não deve apagar a data do último sucesso.

O estado `partial` descreve download parcial **sem publicação do catálogo parcial**. A fila é local ao processo do app; não é uma trava distribuída entre vários processos independentes.

### Fluxo resultante

```text
Solicitar atualização
        |
Baixar páginas em staging
        |
Validar total, offset, identidade, snapshot e IDs
        |
        +-- falhou --> descartar tentativa; manter catálogo anterior
        |
        +-- passou --> transação final: publicar + podar + marcar sucesso
```

Categorias de filmes/séries continuam sob demanda. A atualização geral preserva dados já carregados quando a categoria mantém sua identidade e nome. Remover uma série também remove seus episódios armazenados; outras fontes ficam isoladas.

**Resultado registrado da etapa:** 35 testes aprovados. Detalhes: [Prioridade 1](prioridade1-implementada.md) e [relatório histórico](validacao-prioridade1.json).

## 6. Prioridade 2 — reprodução e autonomia

### C07 — Cancelar a intenção antiga de reprodução/navegação

**Problema:** uma resposta lenta do canal A podia chegar depois da escolha de B e abrir A novamente. Timers de fallback e retentativa também podiam sobreviver ao STOP ou à troca de canal.

**Mudança:** cada intenção recebe uma geração. Callbacks, páginas, eventos e timers antigos só atuam se ainda pertencem à geração atual. STOP cancela debounce, retentativas, fallback e monitoramento.

**Por quê:** concluir uma operação antiga não significa que o usuário ainda a quer.

**Exemplo:** A demora três segundos; B responde rapidamente. Mesmo quando a resposta de A chega por último, B continua sendo a seleção válida. STOP antes dos 400 ms de debounce mantém a reprodução parada.

### C08 — Banco primeiro; endereço não é disponibilidade

**Problema:** o início local aguardava a resposta do PC, mesmo com catálogo salvo. Um endereço configurado era tratado como indicação de que o servidor estava utilizável.

**Mudança:** o banco abre antes da sondagem HTTP. O estado de disponibilidade é separado do endereço e expira em 30 s. A consulta de saúde tem teto de 3 s; respostas válidas de operações do servidor também renovam a disponibilidade. Trocar endereço ou simular PC desligado invalida o estado anterior.

**Por quê:** dados locais não precisam esperar por uma máquina desligada. E uma reserva HLS dependente de um proxy ausente não é uma reserva utilizável.

Quando precisa baixar dados, a operação tenta Luna com a configuração local e pode tentar HTTP se o PC estiver disponível. O transporte alternativo refaz a operação inteira, sem combinar páginas de snapshots distintos.

### C09 — Cadastro e ativação diretamente na TV

**Problema:** configurar a fonte e obter logos ainda dependia do PC.

**Mudança:** foram acrescentados cadastro, edição, teste, remoção e ativação local em IndexedDB. O primeiro uso pode ser feito pela TV. O cadastro antigo de `fonteLocal` migra para o banco e a preferência é limpa após persistência.

**Por quê:** o modo local não seria autônomo se precisasse do PC para iniciar ou administrar a fonte.

Os logos preservam a URL original. URLs antigas do proxy são desembrulhadas na leitura; sem PC, usa-se a origem direta. Não foi criado um armazenamento permanente de arquivos de logo na TV.

Alterar configuração que afeta acesso/identidade recebe uma nova identidade de cadastro para não reaproveitar URLs antigas incorretamente. O cadastro anterior permanece disponível. Remover cadastro não remove automaticamente cache, favoritos e histórico; a fonte ativa precisa ser substituída antes de remover seu cadastro.

### C10 — Formato e cabeçalhos coerentes entre chamadas

**Problema:** recriar o provedor em cada mensagem Luna podia reiniciar o formato para M3U8, mesmo quando a conta aceitava somente TS. User-Agent/Referer também podiam divergir entre PC e TV.

**Mudança:** o serviço autentica e negocia o formato antes das consultas e reutiliza a instância/configuração por até cinco minutos. O formato negociado acompanha as respostas e a sincronização para persistência. Ao reiniciar o serviço, a negociação é refeita. Cabeçalhos seguem a fonte e os itens normalizados.

**Por quê:** a URL de reprodução precisa corresponder ao que o provedor realmente aceita, e as operações da mesma fonte precisam usar a mesma configuração.

Foi mantida uma limitação explícita: o player nativo não recebe cabeçalhos arbitrários por essa integração. Quando eles são necessários, a UI informa a dependência do proxy do PC, em vez de prometer reprodução direta universal.

### C11 — Sonda de arquivo com leitura binária limitada

**Problema:** procurar a palavra `moov` como texto não interpreta a estrutura do MP4. Um marcador poderia existir dentro de outro conteúdo. Respostas 404 e chunks grandes também tinham tratamento inconsistente.

**Mudança:** PC e TV passaram a compartilhar a leitura binária dos atoms MP4 e um transporte com limites explícitos. A sonda mantém no máximo 64 KiB, valida HTTP/Content-Range e diferencia amostragem de limite de download completo.

**Por quê:** a amostra deve orientar o prazo de início sem baixar um arquivo enorme nem confundir uma resposta de erro com mídia válida.

Arquivos têm prazo de início de 45 s, reduzido para 25 s apenas quando a sonda identifica `moov` no início, com uma retentativa. Essa análise não certifica codec, DRM, seek nem imagem decodificável.

### Política resultante de reprodução

| Situação | Caminho | Motivo |
|---|---|---|
| Stream compatível sem headers especiais | Player nativo direto | Dispensa o proxy quando o aparelho pode acessar a mídia. |
| HLS que precisa de reserva e PC disponível | HLS.js pelo proxy | Evita as limitações de acesso do HLS.js diretamente à origem. |
| TS bruto | Nativo | Não encaminhar TS bruto ao motor HLS.js. |
| HLS com headers obrigatórios | HLS.js pelo PC | O proxy envia os headers exigidos. |
| TS/arquivo com headers obrigatórios | Nativo usando URL do proxy | Mantém o motor nativo com acesso tratado pelo PC. |
| Fonte exige headers, mas PC está ausente | Recusa explicada na UI | Evita tentar silenciosamente uma URL que não recebe a configuração necessária. |

O proxy passou a repassar Range/Content-Range e encerrar o upstream quando o cliente fecha. Uma fonte criada somente na TV não é automaticamente criada no servidor: o fallback HTTP de catálogo ainda exige a mesma fonte ativa e identificada no PC.

**Resultado registrado da etapa:** 50 testes aprovados, já incluindo regressões da P1. Detalhes: [Prioridade 2](prioridade2-implementada.md) e [relatório histórico](validacao-prioridade2.json).

## 7. Prioridade 3 — interface e diagnóstico

### C12 e C13 — Contagem honesta e categoria ainda não carregada

**Mudança:** contagem desconhecida aparece como “—”. Depois da leitura, faixa, status e log usam o total real. Uma única categoria VOD com `count:null` pode ser aberta.

**Por quê:** desconhecido não é zero. O usuário não deve receber uma tela vazia apenas porque os itens daquela categoria ainda não foram baixados. Parte dessa correção já havia entrado na P2; na P3 foi completada e testada explicitamente.

### C14 e C15 — VOLTAR, foco e categoria visível

**Mudança:** VOLTAR durante reprodução encerra o player e conserva a lista. Outro VOLTAR, na lista de episódios, retorna à categoria de séries e restaura índice/rolagem. A resposta de uma busca de episódios cancelada é descartada. A faixa horizontal desloca a categoria selecionada para a área visível.

**Por quê:** o controle remoto precisa de um caminho previsível de retorno. Obrigar o usuário a localizar novamente uma série em uma lista extensa tornava a navegação trabalhosa.

Na lista principal, VOLTAR mantém o catálogo e orienta a troca de categoria/seção. Fechar o app continua sendo uma ação do sistema da TV. A restauração usa índice/rolagem: se uma sincronização reordenar os itens, o mesmo índice pode passar a representar outro item.

### C16 — Formulário protegido de respostas atrasadas

**Mudança:** respostas de listagem/estado não recriam campos enquanto há edição. Rascunho e seleção são preservados. Revisões de edição e consulta impedem que um teste antigo altere um formulário que já mudou. Labels foram associados aos campos.

**Por quê:** atualizar o estado da fonte não deve apagar uma senha ou endereço que o usuário acabou de digitar. Receber a resposta de um teste antigo também não deve aplicar um formato à nova fonte em edição.

### C17 — Paginação da busca local

**Mudança:** a consulta começa no início da fonte e aplica offset uma vez, sobre os itens que passaram no filtro. Foi retirado código/comentário obsoleto e acrescentado teste de termos esparsos, fontes, categorias e posições com lacunas.

**Por quê:** aplicar o deslocamento antes e depois do filtro pula resultados. O ajuste da faixa já estava presente desde a P1; a P3 consolidou sua intenção e cobertura de regressão.

### C18 — Encerramento e recuperação de sessões

**Mudança:** cada sessão tem `playbackId`, fonte, build, posição e motivo de encerramento. Suspensão, fechamento, fim natural e falha terminal encerram o registro uma vez. São salvos checkpoints pequenos de navegação e reprodução. Ao retornar, a lista é restaurada sem retomar automaticamente a sessão antiga.

**Por quê:** uma sessão que termina sem registro distorce relatórios. Misturar a reprodução anterior com a seguinte também torna tempos e erros pouco úteis.

O checkpoint periódico de aproximadamente 15 s permite recuperar um relato interrompido no próximo início. Isso é infraestrutura de diagnóstico; **não é ainda o recurso “Continuar assistindo”** com escolha de retomada e seek.

### C19 — Relatório que sobrevive ao reinício

**Mudança:** `/api/report` passou a usar histórico compacto persistido. As escritas são atômicas, reenvios são deduplicados e agrupamentos usam identidade, sem juntar canais apenas pelo nome. O primeiro início pode importar logs antigos dentro de limites definidos.

**Por quê:** um relatório que esquece tudo ao reiniciar o backend perde justamente o contexto necessário para investigar problemas recorrentes.

Na TV, os playbacks sem confirmação ficam em uma fila persistente. O servidor não confirma sucesso quando falha a persistência. Eventos comuns de debug continuam transitórios, para não transformar toda a telemetria em armazenamento ilimitado.

### C20 — Separar evidências diferentes

**Mudança:** diagnóstico de acesso, reprodução observada e última falha passaram a ter campos independentes, data e origem. Eles aparecem na lista/HUD e no relatório.

**Por quê:** obter bytes ou um manifesto não significa que o aparelho decodificou imagem. E uma falha recente não deve apagar o fato de que o item já havia sido reproduzido anteriormente.

O campo legado `tFirstFrame` foi mantido por compatibilidade, mas a evidência observada é o avanço de `currentTime`. Isso não comprova um frame visível no pipeline nativo da LG. O relatório não apresenta acesso HTTP como certificação de imagem ou codec.

### C21 — Build e auditoria vinculados ao conteúdo

**Problema:** presença de arquivos, tamanho aproximado ou palavras em comentários não comprovavam a versão instalada. O script também podia seguir após erro de um comando nativo.

**Mudança:** o verificador analisa código e referências, compara módulos compartilhados e cria uma identidade SHA-256 do conjunto. A auditoria compara o conteúdo com esse manifesto. Empacotamento, instalação e abertura verificam o resultado de cada comando. Uma pasta nova de saída impede selecionar acidentalmente um IPK antigo.

**Por quê:** “o arquivo existe” é uma evidência diferente de “é o conteúdo desta entrega”. Da mesma forma, executar um comando não comprova que ele concluiu com sucesso.

O manifesto inclui app, serviço, backend e scripts verificados. Documentação, dados, logs, backups e credenciais não são usados como prova de build. O arquivo gerado com o próprio ID é excluído do cálculo para evitar autorreferência e é conferido separadamente.

**Resultado registrado da etapa:** 66 testes aprovados. Build `0.1.3-00aa97c3a0ff`; auditoria e `-CheckOnly` com código de saída zero. Detalhes: [Prioridade 3](prioridade3-implementada.md), [relatório](validacao-prioridade3.json) e [manifesto](../build-manifest.json).

## 8. Dados locais, persistência e limites adotados

| Estrutura | Conteúdo/finalidade | Limite ou cuidado |
|---|---|---|
| IndexedDB v2 | Fontes, catálogo, categorias, episódios, staging e metadados | Publicação transacional; migração preserva referências legadas quando possível. |
| `sync:<fonte>` | Última publicação bem-sucedida | Não é sobrescrito por uma tentativa malsucedida. |
| `syncAttempt:<fonte>` | Resultado da tentativa de atualização | `partial` não autoriza publicar catálogo incompleto. |
| `activeSource` | Identidade da fonte ativa | Persistida junto da fonte na ativação local. |
| `lastView` / `lastPlayback` | Navegação e último contexto/posição | Pequenos checkpoints; não implementam retomada automática de VOD. |
| `activePlayback` | Sessão ainda em andamento | Atualização periódica; encerramento abrupto pode perder o intervalo após o último checkpoint. |
| `playbackOutbox` | Playbacks ainda não confirmados pelo PC | Até 100 registros; removidos após confirmação positiva. |
| `playbackDiagnostics` | Evidência local por item | Até 500 entradas, em metadados do banco. |
| `playback-history.json` | Histórico compacto do backend | Até 30 dias, 10.000 registros e 32 MiB. Criado quando o backend for executado. |
| Importação de JSONL legado | Aproveitamento do histórico anterior | Até 30 arquivos, 2 MiB finais por arquivo, 16 MiB no total; linhas inválidas/interrompidas são ignoradas e contabilizadas. |

**Motivo dos limites:** impedir crescimento sem controle e reduzir custo de memória, principalmente na TV. São limites de retenção, não garantia de preservação de todos os eventos indefinidamente.

Não foi implementada criptografia adicional das credenciais no IndexedDB. A migração para o banco resolveu organização e autonomia do cadastro; não deve ser descrita como proteção criptográfica.

## 9. Contratos que precisam permanecer coerentes

| Contrato | Regra | Razão |
|---|---|---|
| HTTP de sincronização | Envia fonte e geração; respostas carregam identidade, snapshot, total, offset e itens | Impedir mistura de fontes e versões durante paginação. |
| Divergência de fonte/geração | Retorna 409; fonte ausente em sync retorna 400 | Falhar explicitamente é preferível a usar a origem errada. |
| Luna | Usa identidade/snapshot e configuração local da fonte | Tornar paginação e negociação reproduzíveis sem PC. |
| `Catalog.init(cb)` | Conclui depois da leitura do banco | A interface não deve tratar configuração ainda não carregada como ausência de fonte. |
| Callbacks do catálogo | `(erro, resultado)` | Evitar troca de argumentos e perda de contagens/erros. |
| Wrapper Luna | `(resultado, erro)` | O adaptador precisa respeitar a convenção da plataforma. |
| `POST /api/probe-file` | Recebe URL e headers da operação; devolve resultado de sonda limitada | Padronizar avaliação de arquivo entre PC e TV. |
| `POST /api/log` | Só confirma o lote quando a persistência necessária funciona | Permitir reenvio de playback sem perder histórico silenciosamente. |
| `GET /api/report` | Agrega registros persistidos e conserva identidade/evidência | Relatório útil após reinícios e trocas de fonte. |

App e serviço devem ser atualizados juntos. O cliente novo rejeita contratos antigos incompletos de sincronização; atualizar apenas uma parte pode quebrar operações que dependem dos dois lados.

## 10. Arquivos envolvidos e motivo de cada grupo de alterações

| Arquivo ou grupo | O que foi feito | Por que está nessa camada |
|---|---|---|
| [db.js](../app/js/platform/db.js) | Schema/migração v2, IDs, staging/commit, fonte ativa e consultas | Integridade e identidade precisam ser garantidas na persistência. |
| [sync.js](../app/js/platform/sync.js) | Filas, validação de páginas, publicação e metadados de tentativa | Coordena a carga completa antes de torná-la visível. |
| [catalog.js](../app/js/catalog.js) | Fachada local, CRUD, transporte por operação, logos e decisão de play | Centraliza escolha de origem e configuração, protegendo a interface dessas diferenças. |
| [api.js](../app/js/api.js) | Escopo HTTP, disponibilidade, timeouts e sonda | Separa configuração do endereço de estado real de rede. |
| [app.js](../app/js/app.js) | Tokens, comandos, navegação, lifecycle, checkpoints e instrumentação | É o ponto de coordenação entre intenção do usuário, player, lista e sessão. |
| [Player.js](../app/js/player/Player.js) | Cancelamento de timers/listeners, proteção HLS, URL nativa de proxy e evento de fim | Cada motor precisa respeitar a sessão atual e parar seus próprios recursos. |
| [ChannelList.js](../app/js/ui/ChannelList.js) | Gerações de paginação, posição/restauração e diagnóstico | A lista não pode aceitar páginas antigas nem perder o contexto de navegação. |
| [Settings.js](../app/js/ui/Settings.js) | Cadastro local, teste/importação, rascunho, revisões e labels | A configuração precisa funcionar na TV e suportar respostas assíncronas. |
| [Log.js](../app/js/platform/Log.js) | Fila persistente de playbacks, confirmação de envio e HUD | Preserva eventos importantes sem persistir toda a telemetria indiscriminadamente. |
| [Diagnostics.js](../app/js/platform/Diagnostics.js), novo | Histórico local de evidências e apresentação | Mantém diagnóstico separado da classificação bruta de rede. |
| [index.html](../app/index.html) e [tv.css](../app/css/tv.css) | Ajuda, atalhos clicáveis, scripts novos e estados visuais | Expõem os fluxos implementados sem substituir o desenho do app. |
| [server.js](../server/server.js) | Ativação coerente, contratos de sync/play, headers, logos, sonda e relatório | Publica um estado de servidor consistente e integra as rotas existentes. |
| [sourceStore.js](../server/lib/sourceStore.js) | Persistência de ativação e headers | A fonte ativa no disco deve corresponder à configuração publicada. |
| [playlist.js](../server/lib/playlist.js) e cópia no serviço | Cache por origem, IDs M3U, recusa de cargas incompletas e headers | PC e TV precisam interpretar a mesma fonte com regras equivalentes. |
| [sources.js](../server/lib/sources.js) e cópia no serviço | Validação de respostas, formato e headers por instância/item | Evita listas vazias falsas e perda de negociação do provedor. |
| [mediaFile.js](../server/lib/mediaFile.js) e cópia no serviço, novos | Transporte limitado e inspeção binária | Evita manter duas sondas com limites ou decisões divergentes. |
| [probe.js](../server/lib/probe.js) | Uso do transporte/sonda compartilhados | A política de reprodução precisa de informação obtida de forma consistente. |
| [proxy.js](../server/lib/proxy.js) | Range, headers e encerramento de upstream | Necessário para arquivos/streams que dependem do PC sem deixar conexões antigas abertas. |
| [validator.js](../server/lib/validator.js) | Sonda limitada e evidência de acesso com data/origem | A acessibilidade não pode ser apresentada como reprodução comprovada. |
| [playbackHistory.js](../server/lib/playbackHistory.js), novo | Histórico persistente, deduplicação, importação, retenção e agregação | O relatório deve sobreviver ao processo do servidor. |
| [service.js](../services/service.js) | Cache autenticado, identidade/paginação, headers e sonda compartilhada | Mantém autonomia e coerência nas chamadas Luna. |
| [verify-project.cjs](../scripts/verify-project.cjs), novo | Análise estática, referências, versões e manifesto | Substitui comprovação por marcadores textuais por verificação reproduzível. |
| [native-tools.ps1](../scripts/native-tools.ps1), novo | Propagação de falhas de comandos nativos | O PowerShell não deve seguir para deploy após erro silencioso. |
| [build.ps1](../build.ps1) / [auditar.ps1](../auditar.ps1) | Verificação por conteúdo, modos sem instalação e checagem de cada etapa | Diferencia verificar, empacotar, instalar e abrir. |
| [build-manifest.json](../build-manifest.json) / [build-info.js](../app/js/build-info.js), novos | Hashes e identidade do build no runtime | Relaciona o que o app relata ao conjunto de arquivos verificado. |
| [appinfo.json](../app/appinfo.json) / [package.json do serviço](../services/package.json) | Versões sincronizadas até 0.1.3 | App e serviço formam uma entrega conjunta. |
| `tests/` | Testes novos e adaptação dos cenários anteriores | Transformar os defeitos encontrados em regressões reproduzíveis. |
| `docs/`, README e `.gitignore` | Memória técnica, relatórios históricos, orientação atual e exclusão de saídas temporárias | Facilitar continuidade sem confundir dados/artefatos antigos com a entrega atual. |

O [inventário original](inventario-app-local.md) continua sendo histórico, não uma listagem de hashes atualizada silenciosamente. Os relatórios de cada prioridade registram as alterações em relação à base anterior.

## 11. Testes e evidências: o que foi realmente comprovado

| Entrega | Resultado registrado | Interpretação |
|---|---|---|
| P1 | 35 aprovados | Cenários de integridade, migração, concorrência e contratos |
| P2 | 50 aprovados | Suíte anterior mais reprodução/autonomia |
| P3 | 66 aprovados | Suíte acumulada com navegação, sessão, histórico e build |

**Esses números não devem ser somados.** A suíte final contém regressões das etapas anteriores.

Foram usados dados fictícios e transportes HTTP/Luna simulados. `fake-indexeddb` permite exercitar consultas, transações e aborts da implementação simulada; `acorn` verifica sintaxe. Os testes de PowerShell usaram comandos de teste para comprovar propagação de erro, sem instalar o app na TV.

Casos representativos:

- Queda de rede, total divergente e snapshot trocado preservam o catálogo anterior.
- Duas fontes com os mesmos IDs não compartilham indevidamente canais/episódios.
- A lento → B rápido e STOP durante debounce não abrem a seleção antiga.
- Banco salvo pode ser consultado após reiniciar o contexto com PC indisponível.
- Provedor somente TS mantém o formato negociado nas chamadas seguintes.
- Sonda limita chunks grandes, rejeita 404 e distingue marcadores MP4 estruturais de texto em payload.
- VOLTAR restaura série/categoria/foco e ignora resposta de episódios cancelada.
- Busca esparsa não pula resultados duas vezes.
- Histórico persiste após reinício, deduplica reenvios e não publica dados em falha de escrita.
- Manifesto detecta alteração e dependência ausente; falha de comando interrompe a sequência.

Foi também aberta uma prévia estática local de **1920×1080** no navegador para conferir o cadastro vazio e a navegação de rascunho. Não houve sobreposição observada nesse cenário. A prévia foi encerrada ao terminar o teste.

**Não comprovado por esses testes:** imagem real, áudio/codecs do aparelho, teclado webOS, desempenho e memória no hardware, funcionamento do instalador com a TV conectada e comportamento de toda a variedade de streams do provedor.

Evidências: [P1](validacao-prioridade1.json), [P2](validacao-prioridade2.json), [P3](validacao-prioridade3.json) e [saída integral da suíte final](testes-prioridade3.tap).

## 12. Como verificar o estado e preparar uma entrega

Execute os comandos a partir da raiz do projeto. As dependências a seguir são apenas de desenvolvimento/teste:

```powershell
npm ci --prefix tests --ignore-scripts
node scripts/verify-project.cjs --check
npm test --prefix tests
```

Depois de alterar código coberto pelo manifesto, regenere a identidade e produza o relatório atual:

```powershell
node scripts/verify-project.cjs --write
node docs/validar-prioridade3.cjs
node docs/validar-documentacao.cjs
```

Os relatórios P1/P2 são registros históricos. Para conferir a versão atual, prefira o relatório da P3; os runners antigos executam a suíte disponível no momento e podem sobrescrever os resultados históricos se forem chamados novamente.

Os modos do script de build são diferentes:

| Comando | Efeito |
|---|---|
| `.\auditar.ps1` | Confere a árvore contra o manifesto, sem instalar |
| `.\build.ps1 -CheckOnly` | Verificação estática, sem empacotar ou acessar a TV |
| `.\build.ps1 -PackageOnly` | Verifica, testa e empacota app + serviço, sem instalar |
| `.\build.ps1 -Launch -Device tv` | Verifica, testa, empacota, instala e abre na TV configurada |

Empacotar/instalar exige a CLI webOS e, para deploy, o dispositivo configurado. **Não confundir o comando de instalação com uma verificação somente de leitura.** O build completo cria uma pasta nova em `.artifacts` e registra o resultado das etapas concluídas.

Nesta implementação foram executados auditoria e `-CheckOnly`, ambos com sucesso. Empacotamento, instalação e abertura no aparelho não foram executados. A elaboração deste relatório consolidado não altera o código nem o build do app.

## 13. Preservações, limites e pendências conhecidas

### O que foi preservado

Os arquivos originais de credenciais, logs, backups e IPK não foram reescritos para simular uma validação. Os testes não usaram a conta real do provedor nem o banco da TV. A arquitetura existente e o carregamento sob demanda foram mantidos.

### O que ainda exige cuidado técnico

- A migração não recupera dados que a versão antiga já tenha sobrescrito.
- Encerramento abrupto pode deixar staging órfão; ele não fica visível, mas sua limpeza periódica continua sendo melhoria futura.
- A fila de sincronização não coordena escritores de processos independentes.
- O problema histórico do parser M3U com vírgula dentro de atributo não faz parte das correções concluídas nessas três prioridades.
- A TV continua dependendo do PC nos caminhos de vídeo que exigem headers/proxy; não foi criado proxy de vídeo local.
- Logos diretos ainda dependem de rede e acesso à origem; não há cache binário permanente de logos na TV.
- Checkpoints/filas têm limites e não garantem captura de todo evento diante de falta de espaço ou término abrupto.
- A análise sintática não certifica todas as APIs do Chromium/Node da TV.
- `corrigir.ps1` foi incluído na verificação de sintaxe/identidade, mas seu procedimento antigo de movimentação não foi modernizado nem executado.

### Segurança já registrada no levantamento

Persistem pendências documentadas de autenticação/pareamento do backend, exposição de rotas sensíveis, política de destinos de proxy, uso de TLS sem validação em alguns caminhos e interpolação de conteúdo externo em partes da UI. Não foi entregue endurecimento completo de segurança nem implantação pública do servidor. A lista original está em [continuidade](continuidade.md).

Essas pendências não são recursos implementados; continuam registradas para uma etapa própria.

## 14. Próxima etapa e critérios para prosseguir

O próximo recurso funcional planejado é **favoritos e continuar assistindo**. Ainda não foi implementado nesta sequência.

| Recurso futuro | Base já preparada | Trabalho que falta |
|---|---|---|
| Favoritar/remover | IDs por fonte/tipo e stores existentes | Ação pelo controle, métodos de persistência e lista de favoritos |
| Continuar VOD/episódio | Identidade estável e ciclo de sessão mais claro | Histórico de uso por item, progresso, duração e estado de conclusão |
| Continuar ou reiniciar | Player com cancelamento por intenção | Escolha na UI e seek após o momento adequado de carregamento |
| Próximo episódio | Episódios identificados e navegação estável | Ordenação, oferta/contagem regressiva e cancelamento ao trocar de contexto |

Antes dessa expansão, a verificação mais importante é instalar uma entrega conjunta de app/serviço e exercitar no aparelho:

1. Atualizar sem apagar preventivamente o banco, para validar a migração e a preservação do catálogo.
2. Reiniciar com PC desligado e consultar live, filmes e episódios já salvos.
3. Configurar/testar fonte pela TV e abrir uma categoria nova via Luna.
4. Fazer trocas rápidas, STOP antes da abertura e VOLTAR durante carregamento de episódios.
5. Voltar de episódios para uma série distante na lista, conferindo foco e rolagem.
6. Suspender/reabrir, terminar um vídeo e provocar uma falha de reprodução, conferindo o diagnóstico.
7. Testar os caminhos nativo, TS, MP4 e HLS/proxy nos casos em que forem necessários.
8. Conferir memória, tempos e a identidade de build apresentada pelo app.

## 15. Referências para a próxima pessoa que trabalhar no projeto

- [Índice da documentação](README.md): ponto de entrada para os dossiês.
- [Prioridade 1 implementada](prioridade1-implementada.md): contratos de catálogo e migração.
- [Prioridade 2 implementada](prioridade2-implementada.md): autonomia, fontes, headers e reprodução.
- [Prioridade 3 implementada](prioridade3-implementada.md): navegação, sessões, diagnóstico e build.
- [Plano de continuidade](continuidade.md): achados originais e sequência de evolução.
- [Estudo dos repositórios](estudo-repositorios.md): recursos úteis e limites de adaptação.
- [Relatório final de validação](validacao-prioridade3.json): resultados e hashes registrados.
- [Manifesto do build](../build-manifest.json): identidade do conteúdo da versão documentada.

Ao continuar, trate os documentos das entregas como atualização do levantamento original. Preserve a diferença entre intenção do produto, código implementado, cenário automatizado aprovado e comportamento realmente observado na TV.
