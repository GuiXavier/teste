# Interface no desenho do nodecast-tv — entregas 0.1.5 a 0.1.8

> **0.1.8 (15/09/2026), build `0.1.8-6985664c9878`, 84 testes aprovados.**
> Três achados de uso real:
>
> | Sintoma | Causa e correção |
> |---|---|
> | Avançar um filme travava com "canal fora do ar" | O watchdog não sabia distinguir *buscar* de *morrer*. Ver [Avançar não é morrer](#avançar-não-é-morrer) |
> | Primeira sincronização demorada | Filmes e séries vinham **uma requisição por categoria**, em série. Agora vêm numa só (`get_vod_streams` sem `category_id`). Ver [Uma requisição em vez de dezenas](#uma-requisição-em-vez-de-dezenas) |
> | Busca lenta a cada letra | A varredura materializava todos os registros. Agora o índice de nomes fica em memória. Ver [Busca](#busca-1) |
>
> Também: o diagnóstico passou a ser gravado no próprio banco da TV
> (`Log.dump`), e o endereço do PC virou um campo opcional no fim do
> assistente.


> **0.1.7 (15/09/2026), build `0.1.7-7f04287b02e3`, 82 testes aprovados.**
> Instalada na TV **depois de remover o pacote anterior**, para que o
> primeiro início fosse exercitado com a TV limpa.
>
> - **Assistente de primeiro início** ([Setup.js](../app/js/ui/Setup.js)):
>   escolha do tipo, dados do provedor, autenticação e sincronização
>   completa com barra de progresso. Ver [Primeiro início](#primeiro-início).
> - **Apagar tudo e recomeçar** nas configurações, com confirmação em dois
>   toques (`Catalog.apagarTudo`).
> - A última trilha da busca não subia ao receber o foco e ficava com o
>   título cortado no rodapé: `Search` agora rola o container de
>   resultados, como a home já fazia.


> **Ajustes da 0.1.6 (15/09/2026), build `0.1.6-f72ddf1284f4`, 81 testes
> aprovados, instalada e aberta na TV.** Vieram de uso real na 0.1.5:
>
> | Achado no aparelho | O que mudou |
> |---|---|
> | Ícones grandes demais, sem a borda enfeitada | Cartões e tiles menores e uma folga de 10 px (`--focus-pad`) reservada no container de rolagem: o anel de foco era **cortado**, não ausente. O tile passou a `object-fit: contain` com respiro, então o logo parou de cobrir o próprio anel |
> | Barra de arrastar aparecendo | `::-webkit-scrollbar` zerada em toda área rolável. Numa TV não existe ponteiro para arrastar: a barra só roubava pixels |
> | A série parava no fim do episódio | O `ended` lia a fila **depois** de `stopPlayback`, que já a tinha limpado, e o painel nunca aparecia. Agora a fila é lida antes, e o próximo entra sozinho |
> | Não dava para entrar no meio do episódio | [Controls.js](../app/js/player/Controls.js): avançar/voltar 10 s e 60 s, pausar, barra de progresso com tempo e um botão de próximo episódio |
> | "Continuar assistindo" com pôster vazio | Episódio passou a herdar a **capa da série** ([Shelf.js](../app/js/platform/Shelf.js)); o nome da série virou subtítulo do cartão |
> | Faltava busca | Página **Buscar** ([Search.js](../app/js/ui/Search.js)): um termo, resultados de canais, filmes e séries ao mesmo tempo, direto do banco local |
> | Trocar de categoria fazia esperar | **Baixar catálogo completo** nas configurações: percorre todas as categorias de filmes e séries uma vez; depois disso trocar de categoria é leitura local |
>
> Detalhes de cada um na seção [Ajustes da 0.1.6](#ajustes-da-016), no fim.


Implementação em 14/09/2026. Build **`0.1.5-5a29bc9fe686`**, 56 arquivos no
manifesto, **79 testes aprovados**. O pacote foi gerado, instalado e aberto na
LG 43UP7500PSF. **A validação de uso na TV ainda não foi feita:** o que está
comprovado aqui é verificação estática, suíte automatizada e prévia de
interface em 1920×1080 no navegador.

A entrega substitui a interface funcional anterior (lista em coluna + área de
vídeo) pelo desenho do [nodecast-tv](estudo-repositorios.md), adaptado ao
controle remoto e ao Chromium 79.

## O que a interface passou a ter

| Tela | Conteúdo |
|---|---|
| Navbar | Início · TV ao vivo · Filmes · Séries · Buscar · Configuração, com a página atual marcada, identidade de build e estado do app |
| Início | Trilhas horizontais: canais favoritos (tiles circulares), continuar assistindo (pôster com barra de progresso), seus filmes e séries, adicionados recentemente |
| TV ao vivo | Faixa de categorias, lista virtualizada de canais e o vídeo em janela ao lado |
| Filmes / Séries | Grade de pôsteres de 8 colunas, virtualizada e paginada |
| Ficha | Pôster grande, título, nota, gênero, sinopse, ações e, na série, a lista de episódios |
| Buscar | Campo com o teclado da TV e três trilhas de resultado: canais, filmes e séries (0.1.6) |
| Tela cheia | Vídeo ocupando a tela, barra de informação que se esconde sozinha, controles de transporte (0.1.6) e painel de próximo episódio |

### Navegação por zonas

O D-pad anda entre três zonas: **navbar**, **faixa de categorias** e
**conteúdo**. CIMA no topo do conteúdo sobe para as categorias; CIMA de novo
chega à navbar. Só uma zona por vez desenha o anel de foco — com navbar,
categorias e grade na mesma tela, dois anéis ao mesmo tempo fazem o usuário
perder de vista quem responde ao controle.

VOLTAR tem um caminho único e previsível: tela cheia → janela; reprodução →
parada; ficha → grade, com índice e rolagem restaurados; grade → início.

### Tela cheia sem botão

Não existe botão de tela cheia. Na TV ao vivo, o primeiro OK abre o canal na
janela e o **segundo OK, no mesmo canal, abre em tela cheia** — o equivalente
por controle ao duplo clique do player web. O **duplo clique com o ponteiro
mágico** também alterna, e um clique simples reacende a barra de informação.
Filme e episódio abrem direto em tela cheia, porque fora dela não têm onde
aparecer.

**Decisão técnica:** a tela cheia é do próprio app, por CSS, e não
`requestFullscreen()`. O app já ocupa a tela inteira na TV, então o resultado
visual é idêntico e não se depende do comportamento da API de fullscreen do
webOS. O `<video>` **nunca troca de pai**: `#stage` é `position:fixed` e só
muda de retângulo entre a janela da página ao vivo e a tela cheia. Trocar o pai
de um `<video>` reinicia a pipeline de mídia da LG, que é o recurso mais caro
do aparelho.

Sair da página TV ao vivo com a janela aberta encerra a reprodução. Um vídeo
flutuando sobre a home seria pior do que parar.

### Próximo episódio

Aos **95%** do episódio aparece o painel **A seguir** com o próximo título;
**um OK** entra nele. O limiar vale só com duração conhecida e acima de dois
minutos. VOLTAR dispensa o painel, e um painel dispensado não volta sozinho no
mesmo episódio. No fim natural, se ainda houver próximo, o painel continua
disponível em vez de a tela apenas informar que acabou.

> Revisto na 0.1.6: o painel ganhou contagem regressiva e o próximo episódio
> passa a entrar sozinho, no zero ou no fim do vídeo. Ver
> [Avanço automático de episódio](#avanço-automático-de-episódio).

A fila vem da ficha da série, já ordenada por temporada e episódio, então a
virada de temporada não precisa de caso especial e o último episódio não
oferece nada.

## O que foi preservado

Nada do que havia sido medido no aparelho foi trocado por conveniência visual:

- Player nativo primeiro, hls.js de reserva, escada de erros e prazo adaptativo
  por `readyState` — intocados.
- Cada reprodução continua gerando um registro `playback` completo; suspensão,
  fechamento, fim natural e falha terminal encerram o registro uma vez só.
- Toda resposta assíncrona carrega uma geração: resposta antiga não altera
  seleção nova, em qualquer das telas.
- Favoritos e continuar assistindo continuam no IndexedDB v2, por fonte. **O
  banco não mudou de versão** — não houve migração nova para arriscar.
- A home inteira sai do banco local. Nenhuma trilha chama o backend do PC.

## Memória: por que a grade não é só CSS

Uma grade de pôsteres é o ponto onde uma TV com ~190 MB livres morre. Três
regras no [PosterGrid](../app/js/ui/PosterGrid.js) e no [Rail](../app/js/ui/Rail.js):

1. o array de itens é **esparso** — só a janela visível existe;
2. páginas distantes são **descartadas**, não guardadas;
3. a imagem **sai do DOM** ao deixar a janela; esconder não basta, porque o
   bitmap decodificado continua ocupando memória.

O cartão monta sempre com um texto de reserva com o nome; a `<img>` entra
depois, só dentro da janela. Cartão sem pôster nunca aparece vazio.

Medidas fixas em px porque o `appinfo.json` fixa a resolução em 1920×1080:
8 colunas de 196 px com 20 px de intervalo e 10 px de folga de foco de cada
lado (1728 de 1792 úteis), pôster 2:3 de 294 px. Elas precisam continuar
batendo com `--card-w`, `--card-gap`, `--poster-h` e `--focus-pad` em
[tokens.css](../app/css/tokens.css).

## Restrições do Chromium 79 respeitadas

O desenho original usa três recursos que não existem no aparelho. As
substituições estão no CSS e são verificadas pelo `verify-project.cjs`, que
recusa o build se voltarem:

| No nodecast | Aqui |
|---|---|
| `display:flex; gap:20px` nas trilhas | `inline-block` + `margin-right`, deslocamento por `translateX` |
| `aspect-ratio: 2/3` no pôster | altura em px casada com a largura do cartão |
| `inset: 0` nos overlays | `top/right/bottom/left` |
| `:hover` como interface | foco por zona; `:hover` não existe no controle |

## Arquivos

| Arquivo | Papel |
|---|---|
| [Card.js](../app/js/ui/Card.js), novo | Cartão de pôster e tile circular; liga/desliga a imagem sob demanda |
| [Rail.js](../app/js/ui/Rail.js), novo | Trilha horizontal com janela de imagens e deslocamento por transform |
| [PosterGrid.js](../app/js/ui/PosterGrid.js), novo | Grade virtualizada e paginada, navegação em duas dimensões |
| [Home.js](../app/js/ui/Home.js), novo | As cinco trilhas; trilha vazia some e sai da navegação |
| [Detail.js](../app/js/ui/Detail.js), novo | Ficha, ações e lista de episódios; duas zonas de foco |
| [UpNext.js](../app/js/player/UpNext.js), novo | Painel de próximo episódio e a regra dos 95% |
| [Shelf.js](../app/js/platform/Shelf.js), novo | Reencontra no catálogo os itens da biblioteca; recentes por amostra |
| [app.js](../app/js/app.js) | Páginas, zonas de foco, palco, tela cheia e ciclo de reprodução |
| [ChannelList.js](../app/js/ui/ChannelList.js) | Ganhou foco por zona, mensagem de vazio e ponteiro |
| [Library.js](../app/js/platform/Library.js) | `decorate` responde favorito **e** progresso numa transação só |
| [Spatial.js](../app/js/nav/Spatial.js) | Ganhou `blur()`; passou a ser usado de verdade, na navbar |
| [index.html](../app/index.html), [tokens.css](../app/css/tokens.css), [tv.css](../app/css/tv.css) | Estrutura e desenho das telas novas |
| [expose.cjs](../tests/expose.cjs), novo | Injeta os ganchos de teste/prévia na leitura; o IPK não os contém |
| [preview-ui.cjs](../tests/preview-ui.cjs) e [preview-fixture.js](../tests/preview-fixture.js), novos | Prévia com catálogo fictício semeado no IndexedDB real |

## Verificação

```powershell
node scripts/verify-project.cjs --check
npm test --prefix tests
node tests/preview-ui.cjs     # http://127.0.0.1:8875
```

Os testes de interface foram reescritos para a estrutura nova preservando cada
achado anterior (C07, C12–C15, C18) e ganhando dois: as trilhas da home saem da
biblioteca local sem backend, e o painel de próximo episódio só avança com OK.

A prévia semeia 48 canais, 73 filmes, 17 séries e 48 episódios no IndexedDB
real, com favoritos e progresso, e serve pôsteres por HTTP. Foram conferidos
home, grade, ficha de filme, ficha de série com episódios, página ao vivo com o
vídeo em janela, tela cheia e o painel de próximo episódio. **O vídeo da prévia
é deliberadamente indisponível:** a verificação é de interface e persistência,
não de decodificação.

## O que falta conferir no aparelho

1. Fluidez do D-pad na grade de pôsteres e nas trilhas, com o catálogo real.
2. Memória do Chromium depois de percorrer várias categorias de filmes.
3. Os dois caminhos de tela cheia: segundo OK no canal e duplo clique.
4. Próximo episódio com um episódio real chegando aos 95%.
5. Continuar assistindo de ponta a ponta com a nova ficha.
6. Reinício com o PC desligado, agora que a home também lê o banco local.


## Ajustes da 0.1.6

### O anel de foco não estava ausente: estava cortado

O cartão em foco cresce 4% e ganha um anel com brilho — desenhado **fora** da
sua caixa. Os containers que cortam a rolagem (`.rail-track` com
`overflow:hidden`, `.grid-viewport`) cortavam junto. Duas medidas:

- `--focus-pad: 10px` de folga. Na trilha é `padding` do container; na grade,
  como as células são posicionadas de forma absoluta, o padding do container
  **não** as desloca — a folga entra na conta de cada célula e na altura total
  do espaçador.
- Cartões e tiles um pouco menores: grade de 8 colunas com 196 px (era 208),
  trilha com 156 px (era 168), tile de 84 px (era 96).

No tile, o logo usava `object-fit: cover` e cobria a borda inteira: virou
`contain` com 5 px de respiro, e a borda voltou a existir.

### Avanço automático de episódio

O defeito era de ordem: `player.on.statechange({state:"ended"})` lia a fila
**depois** de chamar `stopPlayback`, que limpa o `UpNext`. A fila chegava
vazia e o app só escrevia "reprodução concluída".

Agora a fila é lida antes de parar, e o próximo episódio entra sozinho. O
painel de 95% ganhou contagem regressiva de 10 s; ao chegar a zero, entra
igual. OK entra na hora, VOLTAR dispensa — e um episódio dispensado **não**
avança sozinho no fim, que é o que separa "deixei passar" de "quero parar".

Episódio curto que termina antes dos 95% também avança: `shouldAdvance()` não
depende de o painel ter aparecido.

### Controles de transporte

Duas zonas dentro da tela cheia: **seek** (padrão) e **botões**.

| Tecla | Efeito |
|---|---|
| ESQUERDA / DIREITA | ∓10 s |
| REW / FWD | ∓60 s |
| BAIXO | entra na fileira de botões; CIMA volta |
| PLAY / PAUSE | direto, sem passar pelos botões |
| OK | mostra a barra (na zona seek) ou aciona o botão em foco |

O pulo é **acumulado e aplicado uma vez só**, 450 ms depois da última tecla.
Cada `currentTime =` refaz a busca no servidor: dez toques viravam dez buscas
e o vídeo não saía do lugar. Acumular é o que torna "segurar a seta" usável.

Ao vivo não tem o que avançar, então lá as setas viram zapping: trocam de
canal sem sair da tela cheia.

### Pôster do episódio

`Shelf.hydrate` passou a buscar também o registro da série e usar a capa dela
no cartão do episódio, com o nome da série como subtítulo. A arte própria do
episódio quase sempre vem vazia do provedor, e quando vem é um still 16:9
dentro de um espaço 2:3.

### Busca

Uma página com campo e três trilhas de resultado. A varredura é do
**IndexedDB da fonte ativa** — não pergunta ao provedor nem ao PC, então
funciona com o computador desligado e responde enquanto o usuário digita
(debounce de 400 ms, mínimo de duas letras).

O teclado é o virtual da própria TV: OK no campo chama `focus()`, que é o
mesmo caminho que a tela de configuração já usa no aparelho. Enquanto o campo
está em edição, o app devolve todas as teclas ao teclado — senão digitar "1"
favoritaria um item.

### Catálogo completo

TV ao vivo já vinha inteira na sincronização. Filmes e séries continuam vindo
**por categoria, sob demanda**, e é isso que faz a primeira visita a cada
categoria esperar pela rede.

O botão **Baixar catálogo completo** percorre todas as categorias de filmes e
séries uma vez, com progresso. Depois disso, trocar de categoria é leitura
local; a revalidação de 6 horas continua existindo, mas acontece **por trás**,
sem segurar a tela.

Limites assumidos: é demorado na primeira vez (uma requisição por categoria),
respeita `max_connections` do provedor porque roda em série, e baixa
**metadados** — nenhum vídeo. Uma categoria que falhar não interrompe as
outras; o relatório diz quantas ficaram de fora.

Não foi feito download de tudo numa requisição só (`get_vod_streams` sem
categoria): o JSON inteiro de um provedor grande não cabe confortavelmente na
memória desta TV, e era justamente o risco que a paginação por categoria
evita.


## Primeiro início

Antes da 0.1.7, uma TV sem fonte cadastrada caía numa tela vazia com a dica
"aperte AZUL". Quem instala o app pela primeira vez não tem motivo para saber
disso. A 0.1.7 troca essa tela por um assistente.

### O que veio de cada referência

**Hypnotix** (`usr/lib/hypnotix/hypnotix.py`) resolve três coisas que foram
copiadas aqui:

1. **Tipo primeiro, campos depois.** O combo oferece *M3U URL*, *Local M3U
   File* e *Xtream API*, e `set_provider_type()` esconde os campos que aquele
   tipo não usa. Aqui viraram dois botões grandes na primeira tela — um
   combo é ruim de operar por D-pad.
2. **Autenticar antes de aceitar.** Em `reload()`, o provedor Xtream só é
   aprovado se `self.x.auth_data != {}`; caso contrário imprime
   "XTREAM Authentication Failed" e não guarda nada. O assistente faz igual:
   **nenhuma fonte é gravada no banco antes de a conta responder**, e há um
   teste que segura essa regra.
3. **Progresso como fase, não como número mágico.** O `status()` do Hypnotix
   escreve "Downloading playlist...", "Checking playlist...", "Loading
   channels...", sempre com o nome do provedor. A barra daqui mostra a fase
   junto com o contador real (`canais ao vivo 1740/3348`), porque o nosso
   `Sync` já entrega `{fase, feito, total}`.

**nodecast-tv** (`public/js/components/SourceManager.js`) contribuiu com:

4. **Testar como passo explícito**, separado de salvar (`testSource`).
5. **Avisar quando a lista é grande** antes de assumir o custo: eles
   estimam a contagem do M3U e sugerem uma lista filtrada. Aqui o
   equivalente é a escolha *Baixar tudo agora: SIM/NÃO*, que diz em texto o
   que cada opção custa.

O login de usuário do nodecast (`login.html` + `/auth/login`) **não** foi
portado: ele protege um servidor multiusuário. Este app não tem servidor
próprio nem contas — a credencial que existe é a do provedor do usuário.

### Os passos

| Passo | O que acontece |
|---|---|
| Bem-vindo | Dois botões: usuário e senha (Xtream) ou link de lista M3U |
| Dados | Campos do tipo escolhido, com o teclado virtual da TV; a opção de baixar tudo agora explica o custo dos dois lados |
| Conferindo | `Catalog.testSource` pela própria TV; conta recusada volta ao formulário com a mensagem do provedor e **nada é gravado** |
| Montando | Barra de progresso: 0–35% a sincronização da fonte, 35–100% o download das categorias de filmes e séries, com o nome da categoria atual |
| Pronto | Quantos canais, filmes e séries ficaram no banco |

Durante o download completo aparece **Começar a assistir agora**, que
interrompe entre uma categoria e outra (`Catalog.cancelarBaixarTudo`) sem
descartar o que já baixou. Um provedor com centenas de categorias não pode
prender o usuário na tela de espera.

### Recomeçar do zero

`Catalog.apagarTudo` apaga o IndexedDB e todas as preferências `iptv.*`:
catálogo, categorias, fontes, favoritos e progresso. Fica em **AZUL → Apagar
tudo e recomeçar do zero**, com confirmação em dois toques, e recarrega o app
em seguida — o que leva de volta ao assistente.


## Avançar não é morrer

Seguir o filme para a frente e receber "Canal fora do ar" era o
`HealthMonitor` fazendo o que foi mandado fazer. Uma busca move o
`currentTime` na hora, mas o vídeo só volta a andar quando o servidor
responde pelo novo ponto — vários segundos depois. Para o watchdog isso é
idêntico a um stream que parou: 2 s sem avanço → `onStall` → como filme tem
`maxRetry: 1`, a segunda parada esgotava as tentativas e caía na tela de
canal morto.

As referências não têm esse problema porque **não têm watchdog**: o
nodecast trata `waiting` como estado normal (mostra o spinner, esconde no
`canplay`) e deixa o hls.js se recuperar com `nudgeOffset`/`recoverMediaError`;
o Hypnotix entrega o buffer inteiro ao mpv. Como aqui o watchdog existe — e
é ele que salva canais ao vivo de verdade —, a correção foi ensiná-lo a
diferença:

- `HealthMonitor.noteSeek()` abre uma folga de 12 s em que travamento não é
  declarado; o evento `seeking` do próprio `<video>` a dispara, o que cobre
  os controles, a retomada e qualquer outro caminho que mexa em
  `currentTime`;
- enquanto `video.seeking` for verdadeiro a folga é renovada;
- a folga vale também para o prazo de partida, não só para o travamento.

E a mensagem deixou de mentir: filme que falha logo depois de uma busca diz
*"Não foi possível continuar deste ponto — este servidor pode não aceitar
avançar neste arquivo"*, não "canal fora do ar".

### O que o log agora registra

`seek.pedido` (de onde, para onde, motor, `readyState`), `seek` e `seek.ok`
(com quanto buffer havia à frente e quanto tempo levou), `waiting` com o
tempo desde a última busca, e o `stall` passou a carregar `readyState`,
`networkState`, `seeking` e `desdeBusca`. É o bastante para separar, no
relatório, "o servidor não atende este ponto" de "o stream caiu".

O anel de diagnóstico (300 eventos) é gravado no IndexedDB a cada 15 s e
recarregado no início seguinte, então ele sobrevive a um travamento mesmo
sem PC configurado. Com o endereço do PC preenchido, **AZUL → Enviar
diagnóstico ao PC agora** despeja tudo em `/api/log`.

## Uma requisição em vez de dezenas

O Xtream aceita `get_vod_streams` e `get_series` **sem** `category_id`: a
resposta traz a coleção inteira, com o `category_id` em cada item. O
download completo fazia o contrário — uma requisição por categoria, em
série. Com 40 categorias de filmes e 44 de séries, eram 84 idas ao provedor
antes de a barra chegar ao fim.

`Sync.colecao()` baixa a coleção inteira numa passada e publica com um modo
novo de commit (`mode: "collection"`), que usa a mesma regra de poda do ao
vivo: a coleção veio completa, logo o que não está nesta geração não existe
mais. As categorias recebem contagem e `carregadaEm` na mesma transação.

Provedor que não aceite a coleção inteira — ou resposta grande demais para
esta TV — **cai de volta** no caminho antigo, categoria a categoria. O log
registra qual dos dois foi usado (`catalogo.colecao` ou
`catalogo.categorias`) e quanto tempo levou.

Duas folgas acompanharam a mudança: a página do transporte Luna subiu de 400
para 1000 itens (cada mensagem atravessa o PalmServiceBridge e é serializada
dos dois lados, então o custo por mensagem pesa mais que o custo por item) e
o cache do serviço subiu de 5 para 10 minutos, para uma coleção longa não
perder o cache no meio da paginação.

## Busca

A varredura antiga abria um cursor de **valores** e desserializava cada
registro — com sinopse, elenco e gênero — só para ler o nome. Medido no
navegador com 3.348 canais + 8.000 filmes + 600 séries: 205 ms só para
varrer os filmes, e isso a cada letra digitada.

Agora a primeira busca lê do banco apenas o índice `srcName`
(`[fonte, nome]`) com `openKeyCursor`, monta a lista `[chave, nome]` na
memória e guarda. Da segunda busca em diante, procurar é filtrar strings:

| Termo | Antes (só filmes) | Agora (as três coleções) |
|---|---:|---:|
| `big` (primeira busca, monta o índice) | 205 ms | 216 ms |
| `bigb` | — | 1 ms |
| `demonstracao` | 201 ms | 9 ms |
| `canal 12` | — | 4 ms |

O índice custa ~865 KB serializados para 11.948 itens. Catálogo acima de
20.000 itens por coleção **não** é guardado — melhor pagar a varredura do
que responder busca com meia lista. O índice é descartado em qualquer
sincronização e na suspensão do app.

Efeito colateral documentado: a busca geral sai em **ordem alfabética**
(é o índice de nomes), não na ordem do provedor. Dentro de uma categoria a
ordem do provedor continua valendo.
