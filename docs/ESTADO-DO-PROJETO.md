# Estado do projeto — app IPTV para LG webOS

**17/09/2026 · versão `0.1.8` · build `0.1.8-6985664c9878` · 59 arquivos no
manifesto · 84 testes aprovados, nenhuma falha.**

O pacote está instalado e aberto na LG 43UP7500PSF. Este documento diz o que
existe, em que estado cada parte está, **o que foi comprovado no aparelho e o
que não foi**, e o que vem depois.

Regra deste documento: verificação estática e teste automatizado não são prova
de funcionamento na TV. Onde a distinção importa, ela está escrita.

---

## 1. Em uma tela

| | |
|---|---|
| Aparelho de referência | LG 43UP7500PSF · webOS 6.5.3 · Chromium 79 · painel 4K (viewport 1920×1080 @ dpr 2) · ~190 MB de RAM livre |
| Código do app | ~6.600 linhas de JavaScript **ES5 puro, sem build**, mais 1.300 de CSS/HTML |
| Backend no PC | ~2.500 linhas, Node ≥18, sem dependências npm — **opcional** |
| Serviço na TV | ~940 linhas, Node 8.12 via Luna — é o que dispensa o PC |
| Testes | 84, em 7 arquivos (~1.030 linhas), com `fake-indexeddb` e `acorn` |
| Catálogo | IndexedDB v2 na própria TV; chave `k2:[fonte, tipo, id]` |
| Fonte de vídeo | provedor → TV, direto. O servidor **nunca** repassa vídeo |
| Licença | GPL-3.0 (o CSS deriva do nodecast-tv) |

---

## 2. Arquitetura

```text
Controle remoto
      |
   app.js  (paginas, zonas de foco, ciclo de reproducao)
      |
   Catalog  -- IndexedDB (catalogo local, biblioteca pessoal)
      |     \
      |      -- JS Service Luna (metadados do provedor, na propria TV)
      |       \
      |        -- API HTTP do PC (opcional: proxy, logos, diagnostico)
      |
   Player  -- nativo primeiro  -> URL direta do provedor
           -- hls.js de reserva -> so quando ha proxy no PC
```

Três decisões estruturais que continuam valendo:

- **O banco manda.** O servidor é uma das formas de encher o catálogo, nunca
  uma dependência para usá-lo.
- **Player, não serviço.** O stream vai do provedor direto para a TV.
- **Medir antes de decidir.** Nativo antes de hls.js, prazo por `readyState`,
  virtualização, tamanho de página — cada escolha saiu de número medido.

---

## 3. Estado de cada parte

Legenda: **Na TV** = exercitado no aparelho com provedor real · **Entregue**
= código e testes prontos, sem uso real ainda · **Parcial** · **Não feito**

### Interface

| Parte | Arquivos | Estado | Observação |
|---|---|---|---|
| Navbar e navegação por zonas | `app.js` | Na TV | Início · TV ao vivo · Filmes · Séries · Buscar · Configuração |
| Home de trilhas | `ui/Home.js`, `ui/Rail.js` | Na TV | Favoritos, continuar assistindo, recentes; tudo do banco local |
| Grade de pôsteres | `ui/PosterGrid.js` | Na TV | 8 colunas, virtualizada, paginada, imagens só na janela |
| Lista de canais | `ui/ChannelList.js` | Na TV | Virtualizada; também serve de lista de episódios |
| Ficha do título | `ui/Detail.js` | Na TV | Pôster, nota, gênero, sinopse, ações, episódios |
| Busca geral | `ui/Search.js` | Na TV | Canais, filmes e séries num termo só — confirmada em foto do aparelho |
| Cartões e tiles | `ui/Card.js` | Na TV | Imagem entra e sai do DOM conforme a janela |
| Assistente de 1º início | `ui/Setup.js` | Na TV | Tipo → dados → autenticação → sincronização com barra |
| Configuração | `ui/Settings.js` | Na TV | Fontes, PC, modo, download completo, apagar tudo |
| Navegação espacial | `nav/Spatial.js` | Na TV | Usada só na navbar |

### Reprodução

| Parte | Arquivos | Estado | Observação |
|---|---|---|---|
| Player nativo + hls.js | `player/Player.js` | Na TV | Escada de erros herdada do nodecast |
| Watchdog por `currentTime` | `player/HealthMonitor.js` | **Entregue** | A folga de busca (12 s) é da 0.1.8 e **ainda não foi testada na TV** |
| Controles de transporte | `player/Controls.js` | Na TV | ±10 s / ±60 s, pausa, barra com tempo, próximo |
| Tela cheia | `app.js` + `tv.css` | Na TV | CSS própria, não `requestFullscreen()`; 2º OK ou duplo clique |
| Retomada de posição | `player/Resume.js` | Na TV | Comprovada em 14/09: parou em 69,6 s e voltou nos 69,6 s |
| Próximo episódio | `player/UpNext.js` | Na TV | Painel aos 95% com contagem de 10 s e avanço automático |

### Catálogo e dados

| Parte | Arquivos | Estado | Observação |
|---|---|---|---|
| Banco local | `platform/db.js` | Na TV | IndexedDB v2, publicação transacional, staging/commit |
| Sincronização | `platform/sync.js` | Na TV | Fonte, categoria e **coleção inteira** (`colecao`, 0.1.8) |
| Fachada do catálogo | `catalog.js` | Na TV | Escolhe transporte, decide reprodução, busca, download completo |
| Biblioteca pessoal | `platform/Library.js` | Na TV | Favoritos e progresso por fonte, com journal síncrono |
| Vitrine da home | `platform/Shelf.js` | Na TV | Hidrata a biblioteca; episódio herda a capa da série |
| Serviço Luna | `services/service.js` | Na TV | `ping`, `config`, `fetch`, `m3u`, `xtream`, `probeFile` |
| Backend no PC | `server/` | Parcial | Funciona; **não é exigido** para nada do uso normal |

### Diagnóstico

| Parte | Arquivos | Estado | Observação |
|---|---|---|---|
| Telemetria e HUD | `platform/Log.js` | Na TV | Tecla AMARELA; anel de 300 eventos gravado no banco (0.1.8) |
| Diagnóstico por item | `platform/Diagnostics.js` | Na TV | Separa acesso, reprodução observada e última falha |
| Identidade de build | `scripts/verify-project.cjs` | Na TV | SHA-256 do conjunto; o app relata o id no boot |

### Não existe ainda

| Recurso | Situação |
|---|---|
| **EPG / guia de programação** | **Não feito.** Nenhuma linha em `app/js/`. `tvgId` é capturado, nada mais |
| Catchup / timeshift | Não feito. `tv_archive` é capturado e exibido, sem reprodução por data |
| Seleção de áudio, legenda ou qualidade | Não feito |
| Múltiplas fontes ativas ao mesmo tempo | Não feito. Uma fonte ativa por vez |
| Sincronizar favoritos entre aparelhos | Não feito |
| Perfis de usuário | Não feito |

---

## 4. Como o projeto chegou aqui

| Versão | O que entrou |
|---|---|
| 0.1.0 | Base recebida: lista virtualizada, player nativo + hls.js, IndexedDB, serviço Luna, backend |
| 0.1.1–0.1.3 | Prioridades 1–3: integridade do catálogo (staging/commit, identidade por fonte), autonomia e cancelamento por geração, navegação e diagnóstico |
| 0.1.4 | Favoritos e continuar assistindo; **primeira validação real na TV** |
| 0.1.5 | Interface portada do nodecast-tv: navbar, home de trilhas, grade, ficha, tela cheia |
| 0.1.6 | Controles de player, avanço automático de episódio, busca geral, pôster do episódio pela série, download completo do catálogo |
| 0.1.7 | Assistente de primeiro início com autenticação e barra de progresso; apagar tudo e recomeçar |
| 0.1.8 | Correção do falso "canal fora do ar" ao avançar; sincronização por coleção única; busca em memória; diagnóstico durável |

O detalhe de cada uma está em
[interface-nodecast-portada.md](interface-nodecast-portada.md),
[favoritos-e-continuar-assistindo.md](favoritos-e-continuar-assistindo.md) e no
[relatório consolidado](RELATORIO-CONSOLIDADO-DO-PROJETO.md).

---

## 5. O que está comprovado e o que não está

### Comprovado no aparelho

- Catálogo local com 3.348 canais abrindo sem o PC (`API.available() === false`).
- Reprodução nativa de canal ao vivo (1280×720) e de filme (1920×1080).
- Retomada real: parou em 69,6 s, reabriu e voltou nos 69,6 s; após fechar e
  reabrir o app, recuperou 128,9 s.
- Favoritar, remover, listar por fonte, sobreviver ao recarregamento.
- VOLTAR encerrando a reprodução e devolvendo a navegação.
- Autenticação da fonte pelo serviço Luna, sem backend.
- Interface 0.1.5–0.1.7 em uso: navbar, home, grade, ficha, busca, controles,
  próximo episódio, assistente de primeiro início.

### Medido, mas fora da TV (navegador, catálogo de 11.948 itens)

| Medida | Antes | Agora |
|---|---:|---:|
| Busca "big" (primeira, monta o índice) | 205 ms só em filmes | 216 ms nas três coleções |
| Busca seguinte ("bigb") | — | 1 ms |
| Busca "demonstracao" | 201 ms | 9 ms |
| Índice de nomes em memória | — | ~865 KB para 11.948 itens |

### Não comprovado

- **A correção do avanço de filme (0.1.8).** O diagnóstico está fechado e há
  teste, mas o comportamento no aparelho ainda não foi visto.
- **O ganho real da sincronização por coleção.** 84 requisições viraram 2 no
  código; quanto isso encurta depende do provedor.
- Imagem e som na maioria dos canais — só alguns foram vistos tocando.
- Suspensão e retorno com vídeo em andamento.
- Funcionamento com o PC fisicamente desligado (só foi testado com o PC
  inalcançável).
- Duas fontes reais convivendo na mesma TV.
- Memória do Chromium depois de percorrer muitas categorias de pôsteres.

---

## 6. O que precisa ser feito

### P0 — fechar a 0.1.8 (é o próximo passo)

1. Avançar um filme e confirmar que **não** aparece "canal fora do ar"; se
   falhar, a mensagem agora deve dizer que o servidor não aceita aquele ponto.
2. Cronometrar a primeira sincronização e ler no log qual caminho foi usado:
   `catalogo.colecao` (coleção inteira) ou `catalogo.categorias` (recuo para o
   caminho antigo), com o tempo de cada um.
3. Conferir a busca: a primeira demora, as seguintes devem ser imediatas.
4. Ligar a coleta de log: **AZUL → Endereço do servidor → `192.168.101.13:8099`**.
   Sem isso o diagnóstico fica só na TV (tecla AMARELA e anel no banco).

### P1 — EPG

É o recurso que falta para isto virar uma TV de verdade, e é o maior bloco de
trabalho restante: XMLTV comprimido ou `get_short_epg` do Xtream, parse fora da
thread principal, consulta por fonte + canal + janela, "agora / a seguir" na
lista e só depois a grade navegável por D-pad.

### P2 — reprodução

- Canais de uma faixa do provedor em que o nativo trava aos 8 s e o hls.js pega
  em ~6,5 s: descobrir se o que destrava é a segunda conexão ou a liberação do
  pipeline.
- O validador ainda não lê `max_connections` no caminho do JS Service.
- `mediaOption.transmission.playTime.start` para retomada pelo próprio motor da
  LG, em vez de `currentTime` após metadata.

### P3 — catálogo e biblioteca

- Catchup/timeshift a partir de `tv_archive`.
- Múltiplas fontes ativas ao mesmo tempo.
- Limpeza periódica de staging órfão (encerramento abrupto pode deixar).
- Contribuir categorias brasileiras de volta ao `iptv-org/database`.

### P4 — segurança (obrigatório antes de qualquer exposição fora da LAN)

Nada disso é hipotético; é o que está no código hoje:

- `GET /api/sources/:id/secret` devolve usuário e senha reais **sem
  autenticação**, e o servidor escuta em `0.0.0.0` com CORS aberto.
- `/proxy`, `/logo` e `/api/diag` aceitam URL externa **sem política de
  destinos** — dá para alcançar serviços da rede do PC através deles.
- 9 pontos com `rejectUnauthorized: false`; deveria ser exceção por fonte, não
  padrão.
- `overlay()` interpola o **nome vindo do provedor** em `innerHTML`
  (`app.js:653, 677`). O resto da interface já usa nós de texto; esta é a
  sobra.
- Credenciais em texto no `localStorage` da TV e no disco do PC.

### P5 — comercial

Ativação por MAC + chave num VPS, sincronização de configuração entre TVs do
mesmo cliente, EPG servido comprimido, publicação na Content Store (o modo
desenvolvedor expira) e revisão jurídica: termos de uso, app sem nenhuma
playlist embutida, nenhum provedor sugerido.

### Dívida técnica menor

- `url.parse()` depreciado, ainda em `server/server.js`.
- `attemptT0` e o `HealthMonitor` medem de origens diferentes; o `firstframe`
  às vezes sai menor que o `metadata`.
- `corrigir.ps1` entra na verificação de sintaxe, mas seu procedimento de
  movimentação de arquivos nunca foi modernizado nem executado.
- [estado-atual.md](estado-atual.md) e
  [operacao-e-contratos.md](operacao-e-contratos.md) descrevem a 0.1.0 e já
  estão desatualizados em vários pontos; valem como registro histórico.

---

## 7. Como operar

```powershell
# verificacao estatica + identidade do conteudo (nao toca na TV)
node scripts/verify-project.cjs --check

# suite completa
npm test --prefix tests

# previa da interface num navegador, com catalogo ficticio
node tests/preview-ui.cjs          # http://127.0.0.1:8875
#   ?novo=1     exercita o assistente de primeiro inicio
#   ?grande=1   semeia 3.348 canais + 8.000 filmes + 600 series
```

```powershell
.\auditar.ps1                 # confere a arvore contra o manifesto
.\build.ps1 -CheckOnly        # so verifica
.\build.ps1 -PackageOnly      # verifica, testa e empacota
.\build.ps1 -Launch -Device tv  # verifica, testa, empacota, instala e abre
```

Os `.ps1` são **ASCII puro** de propósito: o PowerShell 5.1 lê `.ps1` como ANSI
e acento quebra o parser.

O backend do PC é opcional; quando usado:

```powershell
node server/server.js          # porta 8099
```

### Teclas na TV

| Tecla | Ação |
|---|---|
| Setas / OK | Navegar e abrir; CIMA no topo sobe para categorias e depois para a navbar |
| VOLTAR | Tela cheia → janela; reprodução → parada; ficha → grade; grade → início |
| OK (2ª vez no mesmo canal) | Tela cheia — o mesmo que duplo clique com o ponteiro |
| Em tela cheia: ← → | ±10 s · REW/FWD ±60 s · BAIXO entra na fileira de botões |
| 1 | Favoritar o item em foco |
| VERDE | Próxima seção · **AZUL** configuração · **AMARELO** diagnóstico · **VERMELHO** recarregar |

---

## 8. Onde ler mais

- [Interface portada do nodecast-tv](interface-nodecast-portada.md) — entregas
  0.1.5 a 0.1.8, com a razão técnica de cada decisão.
- [Favoritos e continuar assistindo](favoritos-e-continuar-assistindo.md) — 0.1.4.
- [Relatório consolidado](RELATORIO-CONSOLIDADO-DO-PROJETO.md) — prioridades 1 a 3.
- [Validação na TV em 14/09](validacao-tv-2026-09-14.md) — o que o aparelho
  confirmou, item por item.
- [Plano de continuidade](continuidade.md) — achados originais e a sequência de
  evolução proposta.
- [Estudo dos três repositórios](estudo-repositorios.md) — nodecast-tv,
  Hypnotix e SFVIP-Player: o que serve e o que não serve.
- [Índice da memória técnica](README.md).
