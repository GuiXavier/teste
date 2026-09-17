# Favoritos e continuar assistindo — entrega 0.1.4

Implementação em 13/09/2026. Esta entrega acrescenta a biblioteca pessoal às três prioridades anteriores. **Atualização em 14/09:** o IPK foi instalado na LG e os testes reais estão descritos em [validação na TV](validacao-tv-2026-09-14.md). Há confirmação de favoritos, navegação, reprodução nativa e retomada de um filme; o roteiro completo ainda não foi certificado.

## Como usar

1. Cadastre e sincronize a fonte na TV. Os dados pessoais usam os IDs estáveis do catálogo, que incluem fonte, tipo e identificador externo.
2. Selecione um canal, filme, série ou episódio e pressione **1** para marcar ou remover o favorito. A estrela identifica os itens marcados. A ação vale para o item destacado na lista.
3. Pressione **VERDE** para percorrer **TV ao vivo → Filmes → Séries → Favoritos → Continuar assistindo**.
4. Favoritos e Continuar assistindo mostram somente a fonte ativa, identificada no título. Mude a fonte nas configurações para acessar sua outra biblioteca.
5. Ao abrir um filme ou episódio com pelo menos dez segundos de progresso ainda não concluído, escolha **Continuar** ou **Assistir do início**, usando as setas e OK. VOLTAR cancela.
6. Pausa, STOP, VOLTAR, troca de conteúdo e suspensão registram o ponto assistido. Durante a reprodução também há salvamento periódico.

O botão 1 no rodapé e os botões da escolha também respondem ao ponteiro. AMARELO continua abrindo o diagnóstico; AZUL mantém as configurações; VERMELHO recarrega a sessão conservando seu ponto de retomada.

## O que mudou e por quê

### Biblioteca persistente e independente do catálogo

O módulo [Library.js](../app/js/platform/Library.js) utiliza os stores `favorites` e `history` já existentes no IndexedDB v2. Não foi necessário recriar o banco nem elevar sua versão. Atualizações ou podas do catálogo não apagam os dados pessoais.

Cada registro usa a chave canônica `k2:[fonte,tipo,id]`, evitando que dois provedores com o mesmo número de filme compartilhem favorito ou progresso. O código recusa identidades inconsistentes, em vez de atribuir um item arbitrariamente à fonte ativa.

O favorito é alternado em uma única transação de leitura e escrita. Duas ações próximas são serializadas pelo banco. A interface só confirma a alteração após a conclusão da transação; falhas de armazenamento são apresentadas ao usuário.

Os registros contêm uma pequena descrição do item, suficiente para listar a biblioteca. Não incluem URL de vídeo, cabeçalhos de acesso ou senha. Ao assistir, o app resolve novamente o item pelo catálogo atual. Um favorito cujo conteúdo tenha desaparecido permanece disponível para remoção, mas a reprodução pode informar que o item não está mais no catálogo.

As listas usam os índices `addedAt` e `watchedAt`, em ordem decrescente. O cursor filtra pela fonte, conta os itens e devolve somente a página solicitada; a interface continua virtualizada, com páginas de 120 itens. Não é necessário carregar a biblioteca inteira em um array. A consulta percorre o índice para contar e filtrar, portanto bibliotecas muito grandes ainda têm custo de leitura proporcional ao histórico.

### Progresso de filmes e episódios

[Resume.js](../app/js/player/Resume.js) acompanha a sessão de mídia. Somente `vod` e `episode` geram progresso; transmissões ao vivo não entram em Continuar assistindo.

O progresso é salvo:

- A cada aproximadamente dez segundos, enquanto chegam eventos de avanço do vídeo.
- Ao pausar e nos checkpoints já existentes do monitor.
- Antes de parar, trocar o item, voltar, abrir configurações ou suspender o app.
- No encerramento natural, marcando o conteúdo como concluído.

Um item também é considerado concluído quando chega à margem final de `min(30 segundos, 5% da duração)`. Isso evita oferecer retomada nos últimos segundos. Para durações desconhecidas, o app não calcula essa margem; o evento de fim ainda conclui o item.

Itens concluídos e posições menores que dez segundos ficam fora de Continuar assistindo. Reabrir um item concluído inicia uma nova reprodução. **Assistir do início** confirma primeiro a gravação de posição zero; se ela falhar, a interface informa o erro e não inicia silenciosamente a escolha solicitada.

### Retomada e novas tentativas

A posição só é aplicada depois que o motor disponibiliza metadados. Se há faixas buscáveis conhecidas, o app aguarda a faixa que contém o ponto desejado. Uma duração menor que a anterior limita a busca ao final válido do vídeo.

Enquanto aguarda a busca e sua confirmação por `seeked`, o app conserva o ponto anterior. Eventos de pausa ou tempo zero durante a abertura não substituem o progresso salvo. Trocas de motor e novas tentativas também carregam o último ponto observado.

Se o motor recusar a mudança de posição, o app avisa que está aguardando a possibilidade de continuar e mantém o ponto salvo. A capacidade efetiva de busca depende do formato, servidor e motor da TV; esse comportamento precisa ser verificado com os vídeos reais. Não foi implementada conversão de mídia ou busca artificial de arquivos que não oferecem esse recurso.

### Proteção durante fechamento

Além das gravações no IndexedDB, há um único checkpoint pequeno em `localStorage`, chamado `iptv.progressJournal`. Ele é escrito sincronamente antes da transação e removido somente após sua confirmação. No próximo início, é reaplicado antes da leitura do progresso.

Isso cobre o caso em que `pagehide` ocorre e a transação assíncrona não termina. Um checkpoint antigo não remove um journal mais recente. O journal não é uma segunda cópia de todo o histórico.

Um desligamento abrupto ainda pode perder os últimos segundos desde o último checkpoint. Nenhum evento de fechamento é garantido quando o processo ou aparelho perde energia. Limpeza dos dados, desinstalação, falta de espaço ou falha do armazenamento também estão fora da garantia de persistência normal entre reinícios.

### Interface e concorrência

[app.js](../app/js/app.js) integra as duas seções, o diálogo de retomada e a tecla 1. As leituras assíncronas têm um identificador de intenção: trocar a seleção, a seção, a fonte ou pressionar VOLTAR/STOP impede que uma resposta antiga reabra o diálogo ou inicie o vídeo.

O diálogo tem foco visual e foco do navegador na opção ativa. Durante sua abertura, as teclas são consumidas pelo diálogo. VOLTAR apenas cancela a escolha, sem apagar progresso. O retorno da reprodução mantém a navegação anterior; a lista de histórico é atualizada ao parar ou concluir um item aberto nela.

[ChannelList.js](../app/js/ui/ChannelList.js) consulta as marcações das páginas carregadas, desenha a estrela e mostra os minutos assistidos nos registros de histórico. A decoração assíncrona respeita a geração da lista, para não repintar uma categoria já abandonada.

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| [Library.js](../app/js/platform/Library.js) | Favoritos, histórico, journal, isolamento e paginação |
| [Resume.js](../app/js/player/Resume.js) | Salvamento por sessão, busca e proteção durante retries |
| [app.js](../app/js/app.js) | Controle remoto, diálogo, seções e ciclo de vida |
| [ChannelList.js](../app/js/ui/ChannelList.js) | Estrelas e progresso na lista virtualizada |
| [index.html](../app/index.html) | Carregamento dos módulos e elementos acessíveis |
| [tv.css](../app/css/tv.css) | Apresentação do diálogo e opção em foco |
| [appinfo.json](../app/appinfo.json) e [package.json do serviço](../services/package.json) | Versões alinhadas em 0.1.4 |
| [library.test.cjs](../tests/library.test.cjs) | Persistência, isolamento, journal e mídia simulada |
| [interface-diagnostics.test.cjs](../tests/interface-diagnostics.test.cjs) | Fluxos reais do orquestrador com dependências simuladas |
| [preview-library.cjs](../tests/preview-library.cjs) | Prévia isolada de navegador com catálogo fictício |

Nenhum provedor real foi usado nos testes desta entrega. O backend e o serviço Luna não receberam novas funções de biblioteca: os dados pessoais ficam na TV. Não há sincronização de favoritos entre aparelhos, perfis de usuários ou reprodução automática do próximo episódio.

## Verificações

Consulte [resultado estruturado](validacao-biblioteca.json) e [saída dos testes](testes-biblioteca.tap). Os testes anteriores permanecem na suíte; os novos cenários cobrem:

- IDs iguais em fontes e tipos diferentes; alternâncias simultâneas de favorito.
- Reabertura do banco, páginas sem duplicação e remoção de favorito.
- Filmes e episódios; exclusão de live; conclusão e reinício em zero.
- Reaplicação do journal; erro de armazenamento sem falso sucesso.
- Preservação de favorito e progresso durante poda do catálogo.
- Espera por metadados, faixa buscável e confirmação de seek.
- Retry sem gravar zero; pausa, checkpoints e fim natural.
- Escolha pelo controle; VOLTAR com resposta atrasada; mudança de seção durante gravação.
- Listas pessoais consultadas por fonte, sem pedido ao backend.

A prévia foi verificada no navegador em **1920 × 1080**. Foram observados o diálogo, as duas opções com seleção, a estrela, a remoção pela tecla 1, as listas identificadas pela fonte e a preservação após recarregar. O vídeo da prévia é deliberadamente indisponível: a verificação é de interface e persistência, não de decodificação ou reprodução.

Para repetir os testes:

```powershell
node docs/validar-biblioteca.cjs
```

Para abrir a prévia de interface:

```powershell
node tests/preview-library.cjs
# Abra http://127.0.0.1:8874 no navegador.
```

A prévia injeta fixtures somente nas respostas do servidor de testes, não nos arquivos empacotados. Sua origem local tem um banco de demonstração próprio. Nenhum dado real do catálogo é alterado.

## Empacotamento e validação na TV

A geração usa [build.ps1](../build.ps1), com manifesto por conteúdo e verificações anteriores ao empacotamento. A ferramenta de empacotamento indicada pela LG é `@webos-tools/cli`, conforme a [documentação oficial](https://webostv.developer.lge.com/develop/tools/cli-installation).

O resultado efetivo do empacotamento desta entrega é registrado em `validacao-biblioteca.json`. Gerar um IPK não equivale a instalá-lo nem validar a TV. O IPK antigo da raiz foi preservado.

Roteiro de aceite no aparelho:

1. Instalar o novo pacote e conferir a identidade da versão no diagnóstico.
2. Verificar novamente VOLTAR, suspensão, reprodução e início com PC desligado, cobrindo as três prioridades anteriores.
3. Marcar e remover favoritos em live, filme, série e episódio; reiniciar e conferir a biblioteca.
4. Alternar duas fontes com IDs externos iguais e confirmar bibliotecas independentes.
5. Assistir um filme e um episódio por pelo menos um minuto; parar, reiniciar e testar as duas opções.
6. Repetir com PC desligado, usando uma fonte já sincronizada e vídeo compatível com reprodução direta.
7. Testar falha de rede/retry, suspensão durante reprodução, fim natural e arquivo sem suporte a seek.
8. Verificar que VOLTAR durante a leitura do progresso não inicia vídeo atrasado.

Próximas funções, após esse aceite: EPG agora/próximo e melhorias de VOD. A memória técnica anterior permanece em [relatório consolidado](RELATORIO-CONSOLIDADO-DO-PROJETO.md).
