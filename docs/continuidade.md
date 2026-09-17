# Ponto de continuidade e prioridades

O próximo marco deve ser **modo local confiável para live, filmes e séries**, com preservação de catálogo durante falhas e isolamento entre fontes. A base já existe; reconstruir o app ou importar um player desktop inteiro não é necessário para atingir esse marco.

**Atualização em 12/09/2026:** C01–C06 foram implementados na [Prioridade 1](prioridade1-implementada.md), C07–C11 na [Prioridade 2](prioridade2-implementada.md) e C12–C21 na [Prioridade 3](prioridade3-implementada.md). Fontes atuais **0.1.3**, com identidade de build por conteúdo. Falta validar no aparelho. Os relatos abaixo preservam os defeitos do levantamento original. **Atualização em 13/09/2026:** favoritos e continuar assistindo também foram implementados na versão **0.1.4**; consulte a [entrega da biblioteca](favoritos-e-continuar-assistindo.md). O próximo marco é validar no aparelho e depois avançar para EPG.

## Prioridade 1: integridade do catálogo — implementada, validação na TV pendente

### C01 — Poda de canais após carga incompleta — reproduzido

Em `Sync.baixarTudo`, receber menos itens que o tamanho da página encerra com sucesso, mesmo quando `total` anuncia mais. Página vazia intermediária, após duas novas tentativas, também encerra sem erro. `Sync.fonte` autoriza poda quando não há erro explícito e existe ao menos um item, sem comparar `gravados` com `total`.

O cenário isolado anunciou 1.000 registros e devolveu dois; o fluxo chamou a poda mantendo apenas os dois, sem avisos. Corrigir com estado explícito de conclusão, validação de total/offset e commit de uma geração completa. Se o provedor não oferecer total confiável, definir contrato inequívoco de fim antes de remover antigos. Não converter resposta curta inesperada em sucesso.

**Aceite:** queda de rede, página vazia, ID inválido, timeout e total divergente preservam todos os registros anteriormente válidos; uma carga comprovadamente completa remove apenas o que desapareceu.

### C02 — Número de canais removidos é perdido — reproduzido

`DB.pruneSource` chama `cb(null,n)`, mas o Sync passa `seguirPosPoda(n)` diretamente. O primeiro argumento recebido é `null`, convertido a zero. O teste simulou oito removidos e obteve `podados:0`.

**Aceite:** callback adapta `(erro,n)`; erro de poda é reportado, sucesso mostra contagem real. O `podados:0` do log não prova que nada foi excluído naquela sessão.

### C03 — IDs de itens colidem entre fontes — evidência estática

`DB` usa keyPath `id`; Xtream produz `x123`, `v123`, `s123`, `e123` sem sourceId. `Catalog.achar` e `episodesOf` tampouco escopam a busca pela fonte. Dois provedores com o mesmo número podem sobrescrever ou recuperar o item errado. IDs M3U por nome/sufixo são instáveis quando a ordem muda.

**Aceite:** chave canônica inclui fonte, tipo e ID externo; migração IndexedDB planejada, com preservação de favoritos/histórico futuros. Testar duas fontes com IDs idênticos e séries de mesmo ID. Manter `providerId` separado da chave interna para montar URLs.

### C04 — Cache M3U não é separado por URL — evidência estática

`playlist.load` usa sempre `server/data/playlist.m3u`. Se mudar fonte dentro de seis horas, a nova pode receber a playlist antiga. Fallback para cache vencido também desconhece a origem.

**Aceite:** cache identificado por fonte/URL normalizada, com metadados e gravação atômica; teste A → B → A com listas diferentes.

### C05 — Troca de fonte e sincronização não são atômicas — evidência estática

Ativação responde antes de `reload` acabar. `STATE.source/provider` mudam antes de todos os dados; `episodeCache` não é limpo por fonte. Falhas de auth/categorias podem conservar pedaços do estado anterior. `Sync.origemHttp` ignora `src.id` e usa a ativa do PC, podendo gravar catálogo de B sob ID local de A.

**Aceite:** carregar nova geração isoladamente, só publicá-la no sucesso; respostas carregam sourceId/geração; HTTP de sincronização exige fonte explícita; erros não trocam silenciosamente a fonte de um banco existente.

### C06 — Erros parciais viram sincronização “concluída” — evidência estática

`Sync.fonte` guarda erros no relato, mas termina `cb(null,relato)` e atualiza `sync:<fonte>` mesmo com falhas. Algumas escritas de categoria ignoram erro; novas categorias sobrescrevem `carregadaEm`; categorias/itens VOD desaparecidos não são podados. Não há trava contra dois syncs concorrentes.

**Aceite:** distinguir tentativa, sucesso completo e sucesso parcial; manter lastSuccess separado; serializar por fonte; atualizar categorias e itens com a mesma geração; preservar cache em falha.

## Prioridade 2: reprodução e autonomia

### C07 — Respostas e timers antigos sobrevivem à seleção — evidência estática

`Catalog.play` → callback em app.js, consultas de categoria e `_loadPage` não validam se a seleção ainda é atual. `Player._fail` agenda HLS; timers de rede usam `self.hls`, que pode já ser de outro canal. STOP não cancela o debounce de play.

**Aceite:** cada reprodução/lista tem token de geração; respostas antigas são descartadas; stop cancela debounce, retries e fallback; teste A lento → B rápido mantém B, e STOP antes dos 400 ms mantém parado. Testar navegação rápida por categorias enquanto chegam páginas antigas.

### C08 — Modo local aguarda PC e confunde endereço com disponibilidade — evidência estática

Boot espera health antes de `Catalog.arrancar`. `temPC` em vários caminhos significa apenas base configurada. O usuário pode ficar 15 s esperando um PC ausente e ainda receber uma reserva hls.js impossível. A origem Luna é escolhida pelo ping, sem fallback por operação.

**Aceite:** banco local abre antes da sondagem HTTP; disponibilidade possui estado/validade própria; reserva só é anunciada quando disponível; cada operação decide se pode usar cache, Luna ou HTTP.

### C09 — Fontes e logos ainda dependem do PC — evidência estática

Settings lista/cadastra fontes somente pelo backend; fonte local vem de `localStorage` e não de CRUD local em `sources`. Sincronização HTTP persiste logos já reescritos como `/logo` no PC.

**Aceite:** configurar/testar fonte pelo serviço da TV, inclusive no primeiro uso sem PC; preservar URL original de logo e escolher origem local/direta/cache; confirmar que live/categorias/séries continuam operáveis após reiniciar com PC fisicamente desligado.

### C10 — Formato Xtream e headers divergem entre PC/TV — evidência estática

Novo provedor por mensagem Luna reinicia container para M3U8; auth não persiste formato permitido. Preferências UA/Referer salvas no PC não configuram automaticamente o serviço. O nativo não envia headers personalizados; não existe proxy de vídeo na TV para resolver casos que realmente exigem esses headers.

**Aceite:** preservar formato negociado e configuração por fonte nas operações; testar provedor somente TS e fonte com Referer obrigatório. A UI deve informar a dependência de proxy quando ela existir, sem anunciar reprodução autônoma universal.

### C11 — Sonda de arquivo é heurística e tem limites diferentes — evidência estática

PC e serviço procuram marcadores MP4 como texto; isso não interpreta a árvore de atoms. No fetchText do serviço, um chunk maior que maxBytes produz erro antes do caminho de amostra. Arquivos 404 não HTML podem ser marcados ok pelo serviço.

**Aceite:** distinguir limite de resposta e amostragem; validar HTTP; ler Buffer com limites corretos; comparar MP4 faststart, moov tardio, servidor que ignora Range, 404 e arquivo enorme. Preservar prazo suficiente, sem prometer codec pelo container.

## Prioridade 3: interface e diagnóstico — implementada nos fontes, validação na TV pendente

| ID | Achado | Evidência e aceite |
|---|---|---|
| C12 | `cat.total` não existe | Usar `count` ou total real da página; tratar contagem desconhecida com “—”, nunca “null/undefined” |
| C13 | Uma categoria VOD pode parecer vazia | `trocarSecao` interpreta `count:null` como zero; sempre permitir abrir categoria ainda não carregada |
| C14 | BACK não volta de episódios | Implementar estado de navegação série/episódios/categoria, restaurar foco e definir saída do player |
| C15 | Categoria ativa fica fora da área visível | `.cat-strip` overflow hidden sem ajuste; rolar categoria ativa para a janela |
| C16 | Settings apaga edição em respostas assíncronas | `carregar` chama render várias vezes; separar dados/campos de formulário, atualizar sem perder foco/rascunho |
| C17 | Busca paginada local pula resultados duas vezes | Em `DB.query`, com q e sourceId, range começa em offset e filtro reaplica offset; teste busca com várias páginas e termos esparsos |
| C18 | Eventos não fecham todos os playbacks | beforeunload/visibility só flush; definir encerramento/suspensão, salvar último estado e não misturar sessão anterior |
| C19 | `/api/report` perde histórico ao reiniciar | Relatório só usa PLAYBACKS em memória; criar agregação de JSONL ou persistência própria com retenção |
| C20 | Validação “vivo” não comprova imagem | Diferenciar acessível, reproduzido e última falha; preservar data/origem do diagnóstico |
| C21 | Build/auditoria dão confiança excessiva | Incluir todos os scripts/serviço na verificação, checar exit codes de deploy e identificar build por conteúdo; tratar docs como documentação |

## Achados de segurança concretos no código

Não são requisitos inventados para bloquear a análise: fazem parte do estado técnico que será herdado.

- `/api/sources/:id/secret` devolve senha real sem autenticação; servidor escuta `0.0.0.0`, com CORS aberto. Qualquer cliente que alcance a API pode solicitar esse dado. A listagem esconder a senha não protege a rota secret ou as URLs de stream.
- Fontes, overlays e algumas estatísticas interpolam texto externo em `innerHTML`. Substituir por text nodes/escape antes de considerar um catálogo de origem arbitrária confiável.
- `/proxy`, `/logo` e `/api/diag` aceitam URL externa sem política de destinos; podem ser usados para acessar serviços alcançáveis pela máquina do backend. Não há controle de acesso.
- Várias requisições definem `rejectUnauthorized:false`. Deve virar exceção explícita por fonte, com verificação TLS normal como padrão, em uma mudança futura testada.
- Credenciais são persistidas em texto no PC e em `localStorage` na TV. Evitar propagá-las a logs/erros, e separar pareamento/configuração de leitura de catálogo.

**Aceite de endurecimento:** pareamento/autenticação na API, restrição de origens/destinos, escape de UI e política por fonte para headers/TLS. Não publicar esse backend na internet com o estado atual. Nenhuma publicação foi feita nesta tarefa.

## Sequência de entregas proposta

1. **Catálogo íntegro:** C01–C06 com testes de falha de rede, concorrência, duas fontes e migração.
2. **Reprodução previsível e modo local:** C07–C11; teste real na LG com PC desligado e cache frio/quente.
3. **Navegação e consistência:** C12–C21; restaurar categoria/foco e corrigir ajuda das teclas.
4. **Favoritos e continuar assistindo:** usar stores existentes após estabilizar IDs; referência Nodecast, salvamento local periódico e em transições.
5. **EPG agora/próximo:** get_short_epg do Xtream ou XMLTV em lotes, fuso/expiração, consulta por fonte+canal+janela; só depois grade virtual por D-pad.
6. **VOD mais completo:** próximo episódio cancelável, seleção de legenda/áudio quando suportada, detalhes de filme e busca de catálogo.
7. **Backend opcional de compatibilidade:** remux/conversão de áudio via FFmpeg no PC/VPS apenas se testes mostrarem necessidade; não exigir isso do modo autônomo.

## Roteiro de validação na TV

- Reinício com banco preenchido e PC desligado: medir tempo até lista, tocar live, abrir categoria VOD já vista e outra nova via Luna.
- Primeiro uso sem banco: configuração de fonte, progresso e erro compreensível; não perder a fonte antiga se uma nova falhar.
- Sync completo/incompleto, queda no meio, provedor devolvendo 0/HTML/JSON errado; conferir total e conteúdo antes/depois.
- Duas fontes com mesmo stream/series ID; garantir catálogo e episódios independentes.
- Zap rápido, STOP durante debounce, trocar fonte/categoria durante fetch; nada da seleção antiga deve reaparecer.
- Live nativo, fallback HLS com PC, TS bruto, MP4 faststart/sem faststart, pausa longa, fim de episódio e retorno.
- D-pad em lista extensa e Settings com respostas atrasadas, teclado aberto e BACK; foco e texto devem permanecer consistentes.
- Memória de Chromium e serviço durante rolagem/sync repetidos, sem presumir que a paginação Luna limite o download JSON do provedor.

Esses testes de TV ainda não foram executados nesta tarefa. O que foi executado está nos relatórios JSON e na memória técnica.
