# Prioridade 1 implementada — integridade do catálogo

Fontes atualizados em 11/09/2026: versão **0.1.1**, build **0911-p1**, IndexedDB **v2**. C01–C06 foram implementados e têm testes automatizados. Não houve conexão ao provedor, alteração das credenciais, instalação na TV ou geração de um novo IPK. O IPK 0.1.0 da raiz continua sendo o artefato antigo. A CLI `ares-package` não está disponível neste ambiente.

## Alterações entregues

| Item | Implementação | Evidência automatizada |
|---|---|---|
| C01 | Páginas vão para `staging`. Total inteiro não negativo, offset, tamanho esperado, snapshot e identidade são obrigatórios. IDs inválidos/duplicados abortam a tentativa. Só uma carga validada publica os dados. | Página curta/vazia, total ausente/divergente, snapshot alterado, ID inválido, duplicidade, rede e timeout preservam o catálogo e o último sucesso. |
| C02 | A poda faz parte da transação de publicação e retorna `{podados}` no segundo argumento do callback. | Remoção de um canal e remoção da coleção vazia confirmada devolvem a contagem correta. Abort de transação não deixa poda parcial. |
| C03 | Chave `k2:` + JSON de `[sourceId, store, providerId]`; `providerId` fica separado. Episódios referenciam a chave canônica da série. M3U usa SHA-256 da URL, independente da ordem/nome. | Duas fontes com mesmos IDs, séries/episódios iguais, tipos distintos, migração v1 e SHA-256 comparado ao backend. |
| C04 | Cache M3U por hash de fonte + URL normalizada, metadados e checksum no mesmo JSON. Grava em temporário e publica por rename. | A → B → A, fonte diferente com mesma URL, cache antigo sem origem, falha de download e falha de rename. |
| C05 | Backend prepara estado separado e só troca a referência após sucesso completo e persistência da ativação. Recargas/ativações são serializadas. Consultas capturam o estado original. | Falhas em auth/categorias/live/VOD/séries/disco preservam a fonte anterior; callbacks atrasados não contaminam a fonte nova. |
| C06 | Fila por fonte para sync geral, categoria e episódios. Categorias/live/marcador de sucesso são publicados na mesma transação. Última tentativa é separada do último sucesso. | Falha após baixar live não publica nada; cache de categoria é preservado em erro; timestamp é mantido; itens/categorias/séries removidos são podados. |

## Banco local e migração

A v2 acrescenta `staging`, com chave composta geração/store/id e índice por geração. O download grava lotes nessa área, sem modificar as stores consultadas pela interface. No fim, uma única transação cobre `live`, `vod`, `series`, `episodes`, `categories`, `meta` e `staging`. Ela copia a nova geração, remove os registros obsoletos e registra o sucesso. Erro ou falta de espaço desfaz essa publicação inteira.

Sincronizações da mesma fonte entram em fila; fontes diferentes podem baixar simultaneamente. Essa fila protege os escritores deste processo do app, não constitui trava distribuída entre várias páginas/processos independentes.

O upgrade v1 → v2 percorre registros legados dentro da transação de upgrade e converte IDs e referências de episódios. Favoritos e histórico não são apagados: quando há fonte e tipo conhecidos, recebem `itemId` canônico e preservam a referência anterior em `legacyItemId`. Referências ambíguas permanecem intactas para futura reconciliação. A migração não pode recuperar dados que já tenham sido sobrescritos por colisões na versão antiga.

IDs Xtream usam o identificador externo. Para M3U, `providerId` é `m3u:` + SHA-256 da URL exata do stream; mudar nome ou ordem não muda a identidade, mas mudar URL muda. Credenciais/URLs não passam a fazer parte do texto dos IDs. A migração usa SHA-256 síncrono compatível com ES5, testado contra o hash nativo do Node, inclusive com Unicode.

Uma lista vazia só é publicada quando o transporte entrega uma resposta válida, com total explícito zero, offset zero e snapshot. Ausência de resposta/total ou página vazia antes do fim é erro. Playlists M3U malformadas ou com EXTINF sem URL são recusadas. Os filtros deliberados de conteúdo do parser permanecem existentes; o problema de vírgula dentro de atributo M3U, registrado fora da Prioridade 1, continua pendente.

## Categorias sob demanda

Atualizar apenas a lista de categorias preserva `carregadaEm`, `count` e a geração dos itens já carregados quando a categoria mantém sua identidade e nome. Categoria removida ou renomeada perde os itens associados para impedir que apareçam sob um contexto incorreto. A próxima abertura baixa novamente quando necessário.

Atualizar uma categoria expirada substitui apenas os itens daquela categoria, dentro de uma transação que também atualiza sua contagem/data. Falha preserva os itens anteriores. Remover séries elimina seus episódios armazenados; outras fontes permanecem intactas. A leitura paginada não pressupõe mais posições densas entre categorias, evitando saltos após substituições/podas.

## Contratos HTTP e Luna

`/api/categories` e `/api/channels` aceitam `sync=1&sourceId=...`; após a primeira resposta, o cliente envia também `generation=...`. Uma fonte diferente da ativa carregada ou uma geração desatualizada retorna **409**, sem trocar silenciosamente a origem. Para sincronizar via PC, a fonte desejada precisa estar carregada/ativa nele. Ausência de `sourceId` em sync retorna **400**.

As respostas de sincronização são envelopes `{sourceId, generation, snapshot, total, offset, items}`. O snapshot identifica o conteúdo da coleção; a geração identifica o estado carregado do backend. O sync não filtra canais mortos nem depende de contagem visual da UI. Falha de categoria retorna erro, em vez de uma lista vazia com sucesso. Cache M3U vencido pode servir a visualização, mas não autoriza sincronização que removeria dados locais.

Na listagem visual, os itens também usam chaves canônicas; o endpoint de play rejeita IDs sem identidade ou de outra fonte. Séries da UI exigem identidade; a consulta interna de sync pode enviar ID externo porque já leva `sourceId`. Os IDs antigos da API de play não devem ser reutilizados: atualizar a lista obtém as novas chaves.

Luna devolve `sourceId` e snapshot junto com total/offset. Categorias Xtream passam a ser paginadas, evitando o limite fixo de 2.000. O cache inclui a senha em seu hash de identidade; senhas diferentes não compartilham respostas. M3U é mantido em cache durante a paginação, em vez de ser baixado a cada página. Se a coleção mudar entre páginas, a tentativa falha e preserva os dados anteriores.

Ativar fonte no PC só responde sucesso após publicar o estado completo. O cliente concede até 240 segundos à ativação, pois inclui várias chamadas ao provedor. Na TV, `Catalog` só salva/troca a fonte ativa após sucesso do sync; a conclusão atrasada de uma solicitação anterior não desfaz a seleção mais recente.

## Metadados e falhas

- `sync:<fonte>` guarda apenas a última publicação bem-sucedida: `status:complete`, `generation`, `em`, `lastSuccess`, `lastAttempt`, live, origem e duração. O arranque continua compatível com `em`.
- `syncAttempt:<fonte>` registra `running`, `failed`, `partial` ou o sucesso completo. `partial` significa download parcial **sem publicação**, não catálogo parcialmente substituído.
- Relato final inclui `committed`, status, geração e erros. Callback com erro impede a UI de anunciar sincronização concluída.
- A área temporária da tentativa é removida ao finalizar/falhar normalmente. Encerramento abrupto pode deixar staging órfão; ele não fica visível nem autoriza poda. Limpeza periódica desses órfãos é uma melhoria operacional futura.

## Arquivos alterados

| Arquivo | Responsabilidade da mudança |
|---|---|
| `app/js/platform/db.js` | Schema v2, migração, identidade, staging/commit/descarte e consulta sem pressupor posições densas |
| `app/js/platform/sync.js` | Validação de páginas, filas, publicação e estados de tentativa/sucesso |
| `app/js/catalog.js` | Busca/episódios por fonte, captura da fonte por operação e ativação local após sucesso |
| `app/js/api.js` | Escopo fonte/geração, modo sync e timeout de ativação |
| `server/server.js` | Preparação/publicação de estado, HTTP de sync, IDs de UI e consultas presas à origem |
| `server/lib/sourceStore.js` | Persistência atômica da ativação, com erro propagado |
| `server/lib/playlist.js` e cópia no serviço | Cache por origem, IDs estáveis e recusa de download/parse incompleto |
| `server/lib/sources.js` e cópia no serviço | Respostas de catálogo/episódios inválidas não viram listas vazias de sucesso |
| `services/service.js` | Identidade/snapshot, cache por credenciais e paginação M3U consistente |
| `app/appinfo.json`, `services/package.json`, `app/js/app.js` | Versão dos fontes 0.1.1 / build 0911-p1 |
| `tests/` | Regressões de banco, transporte, backend e compatibilidade, com dependências apenas de desenvolvimento |

## Como validar e instalar depois

```powershell
npm ci --prefix tests --ignore-scripts
npm test --prefix tests
```

A suíte usa IndexedDB simulado com transações/abort reais dessa implementação, provedores fictícios e respostas HTTP/Luna simuladas. Nenhum teste usa os arquivos de credenciais, a conta do provedor ou o banco da TV. Também analisa sintaxe ES5 no código próprio da UI e ES2017 no serviço, e verifica que as cópias de `sources.js`/`playlist.js` coincidem. Isso não substitui execução no Chromium/Node reais do aparelho.

**Resultado final: 35 testes passaram, zero falhas**, em Node v24.20.0. [Relatório resumido e hashes dos 14 arquivos originais alterados](validacao-prioridade1.json) · [Saída completa dos testes](testes-prioridade1.tap). Para regenerar esses dois relatórios: `node docs/validar-prioridade1.cjs`. Os arquivos de credenciais, logs, backups e IPK original não foram alterados.

Quando a CLI webOS estiver disponível, `ares-package app services` empacota sem instalar. O script `build.ps1` existente também instala, por isso não foi executado nesta implementação. Atualizar app **e serviço** juntos: clientes novos recusam contratos antigos sem identidade/snapshot.

Validação pendente no aparelho: atualização sem desinstalar, migração do banco existente, tempo/espaço da transação final, navegação live/VOD/séries e sync interrompido por rede. Em atualização, não limpar o banco preventivamente: isso impediria validar a migração e removeria o cache que estas correções protegem.
