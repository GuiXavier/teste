# Memória técnica do app IPTV

Atualização em 15/09/2026: a versão **0.1.8** corrige o travamento ao avançar um filme, troca a sincronização de filmes/séries por uma requisição única e deixa a busca instantânea depois da primeira. A **0.1.7** acrescentou o assistente de primeiro início (cadastro da fonte, autenticação e sincronização completa com barra de progresso) e o "apagar tudo e recomeçar". A **0.1.6** acrescentou busca geral, controles de player, avanço automático de episódio e download completo do catálogo. A **0.1.5** substituiu a interface pelo desenho do nodecast-tv, com navbar, home de trilhas, grade de pôsteres, ficha do título, tela cheia e próximo episódio. Consulte [a entrega da interface](interface-nodecast-portada.md). O pacote foi instalado na TV; o uso real ainda precisa ser conferido.

Atualização em 13/09/2026: **Prioridades 1, 2 e 3 e biblioteca pessoal implementadas nos fontes**, versão **0.1.4**, banco v2. Consulte [favoritos e continuar assistindo](favoritos-e-continuar-assistindo.md). Os documentos anteriores preservam a história de cada entrega; a validação física na TV continua pendente.

O levantamento original abaixo descreve o build `0911-1709`, versão `0.1.0`. Inventários, hashes, backups e logs desse levantamento foram preservados como base histórica. O documento da implementação prevalece onde houve mudança.

## Por onde continuar

**Comece por aqui:** [estado do projeto](ESTADO-DO-PROJETO.md) — o que existe, em que estado está cada parte, o que foi comprovado na TV e o que falta.

**Visão consolidada:** [tudo que foi feito, por que foi feito e como continuar](RELATORIO-CONSOLIDADO-DO-PROJETO.md).

**Interface atual:** [porte do desenho do nodecast-tv](interface-nodecast-portada.md).

1. [Estado atual e arquitetura](estado-atual.md): o que existe, como funciona e o que o log realmente comprova.
2. [App: arquivo por arquivo](arquivos-app.md): responsabilidade, contratos e limitações de todos os 49 arquivos fora dos backups.
3. [Problemas e plano de continuidade](continuidade.md): defeitos reproduzidos, riscos identificados no código e critérios de conclusão das próximas etapas.
4. [Estudo comparativo dos três repositórios](estudo-repositorios.md): partes úteis, adaptações necessárias e prioridades.
5. [Operação, API HTTP e serviço Luna](operacao-e-contratos.md): comandos existentes, teclas, dados e endpoints.

## Cobertura do levantamento original

| Conjunto | Arquivos | Entrega |
|---|---:|---|
| Projeto recebido | 88: 49 atuais/dados/artefatos + 39 backups | [Inventário com hashes e símbolos](inventario-app-local.md) |
| Nodecast TV | 66 | [Dossiê por arquivo](arquivos-nodecast-tv.md) · [Hashes](inventario-nodecast-tv.md) |
| Hypnotix | 107 | [Dossiê por arquivo](arquivos-hypnotix.md) · [Hashes](inventario-hypnotix.md) |
| SFVIP-Player | 11 | [Dossiê por arquivo](arquivos-SFVIP-Player.md) · [Hashes](inventario-SFVIP-Player.md) |
| Cada cópia de backup | 39, já incluídas nos 88 | [Comparação individual](backups-comparados.md) |

Os 272 arquivos foram inventariados. Código próprio atual foi lido; backups foram comparados ao atual; dados tabulares e logs foram percorridos por análise estruturada; o IPK foi aberto como arquivo, sem instalar. Nas referências, o índice estrutural percorre os textos e registra funções, importações, rotas e elementos de interface. A revisão semântica aprofunda os fluxos úteis ao app; **não equivale a uma auditoria linha a linha de todas as bibliotecas e traduções externas**. Binários, imagens, catálogos de tradução e lockfile são classificados como tais, sem inventar lógica que não contêm. Os módulos dos três projetos externos não foram instalados nem executados.

## O que ficou comprovado no levantamento original

- Log local: 239 eventos, uma sessão, entre 15:59:48 e 16:08:13 de 11/09, horário de São Paulo. O identificador de build é um rótulo; `1709` não foi interpretado como horário real.
- Uma sincronização via TV informa 3.333 canais, 42 categorias de filmes e 44 de séries em 11.915 ms, sem avisos nesse relato.
- Quinze registros de reprodução encerrados têm avanço de tempo detectado e motor nativo; há travamentos e retentativas no log. Isso não certifica todos os canais ou todos os codecs.
- Os 66 arquivos JavaScript locais, incluindo backups e hls.js, passam na verificação sintática do Node v24.20.0. Isso não prova compatibilidade com Chromium 79 ou Node 8.
- Três problemas foram reproduzidos com dados fictícios: poda após carga incompleta, contagem de poda incorreta e parser M3U com vírgula dentro de atributo.
- O SFVIP enviado está incompleto: 105 das 112 referências a arquivos no projeto C# não estão na árvore disponibilizada.

## Evidências reproduzíveis

- [Resumo dos logs](evidencias-logs.json) e [resumo dos dados](evidencias-dados.json), sem reproduzir credenciais.
- [Resultados dos cenários isolados](verificacao-achados.json).
- [Verificação sintática](verificacao-sintaxe.json).
- [Conteúdo e hashes do IPK](inspecao-ipk.json).
- [Arquivos ausentes do SFVIP](sfvip-arquivos-ausentes.json).
- [Inventário estruturado](inventario.json) e [comparações dos backups](backups-comparados.json).
- [Validação dos links e preservação dos arquivos originais](validacao-documentacao.json).
- [Validação da implementação da Prioridade 1](validacao-prioridade1.json) · [35 testes aprovados](testes-prioridade1.tap).

As cópias públicas estudadas estão em `docs/referencias/`, com commits fixados no estudo. São material de consulta, não dependências do app. `build.ps1` empacota apenas `app/` e `services/`.

Para validar a implementação atual, executar `npm test --prefix tests`. Os utilitários abaixo geram novos levantamentos e podem substituir relatórios históricos; não são necessários para continuar o desenvolvimento:

```powershell
node docs/gerar-inventario.cjs
node docs/analisar-evidencias.cjs
node docs/verificar-achados.cjs
node docs/destrinchar-referencias.cjs
node docs/validar-documentacao.cjs
```

Esses utilitários escrevem os relatórios em `docs/`, sem acessar o provedor ou a TV. Os cenários de defeitos confirmam o comportamento atual defeituoso; depois de uma correção deverão ser convertidos em testes de regressão com a expectativa correta.

O README original da raiz foi preservado como registro histórico. Suas pendências e várias descrições já estão desatualizadas; para retomar o trabalho, usar esta memória técnica.
