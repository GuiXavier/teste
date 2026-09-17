# Comparação de cada backup com o arquivo atual

São cópias parciais anteriores a alterações, não snapshots completos nem commits. Deltas em linhas: adições/remoções do backup para o arquivo atual.

| Backup | Arquivo atual | Igual | + / − | Símbolos novos desde essa cópia |
|---|---|---|---|---|
| _backup/20260909-1958/app/index.html | app/index.html | não | 4 / 1 |  |
| _backup/20260909-1958/app/js/api.js | app/js/api.js | não | 26 / 1 |  |
| _backup/20260909-1958/app/js/app.js | app/js/app.js | não | 183 / 17 | trocarSecao, abrirSerie, abrirLista |
| _backup/20260909-1958/server/lib/sources.js | server/lib/sources.js | não | 138 / 3 | XtreamProvider.prototype.getVodCategories, XtreamProvider.prototype.getVod, XtreamProvider.prototype.getVodInfo, XtreamProvider.prototype.getSeriesCategories, XtreamProvider.prototype.getSeries, XtreamProvider.prototype.getSeriesInfo |
| _backup/20260909-1958/server/server.js | server/server.js | não | 300 / 44 | carregarVod, carregarSeries, nomearCategorias, buscarCategoria, itensEmCache, colecao, responder |
| _backup/20260909-2111/app/js/api.js | app/js/api.js | não | 21 / 0 |  |
| _backup/20260909-2111/app/js/app.js | app/js/app.js | não | 110 / 18 | abrirLista |
| _backup/20260909-2111/app/js/player/Player.js | app/js/player/Player.js | não | 16 / 4 |  |
| _backup/20260909-2111/server/lib/sources.js | server/lib/sources.js | não | 22 / 2 |  |
| _backup/20260909-2111/server/server.js | server/server.js | não | 222 / 79 | buscarCategoria, itensEmCache, responder |
| _backup/20260910-1500/app/js/app.js | app/js/app.js | não | 100 / 18 | abrirLista |
| _backup/20260910-1500/app/js/player/HealthMonitor.js | app/js/player/HealthMonitor.js | não | 14 / 3 | HealthMonitor.prototype.setStartup |
| _backup/20260910-1500/server/lib/probe.js | server/lib/probe.js | não | 45 / 1 | exports.probeFile |
| _backup/20260910-1500/server/server.js | server/server.js | não | 62 / 3 |  |
| _backup/20260911-0923/app/js/app.js | app/js/app.js | não | 97 / 16 | abrirLista |
| _backup/20260911-0923/app/js/platform/luna.js | app/js/platform/luna.js | não | 15 / 2 | service |
| _backup/20260911-0923/app/js/ui/Settings.js | app/js/ui/Settings.js | não | 121 / 2 |  |
| _backup/20260911-0923/server/server.js | server/server.js | não | 29 / 2 |  |
| _backup/20260911-0925/app/index.html | app/index.html | não | 3 / 0 |  |
| _backup/20260911-1025/app/js/app.js | app/js/app.js | não | 66 / 7 | abrirLista |
| _backup/20260911-1103/app/js/api.js | app/js/api.js | não | 17 / 0 |  |
| _backup/20260911-1103/app/js/app.js | app/js/app.js | não | 44 / 7 | abrirLista |
| _backup/20260911-1103/app/js/catalog.js | app/js/catalog.js | não | 120 / 16 | decide, continuarSync, arrancar |
| _backup/20260911-1103/app/js/ui/Settings.js | app/js/ui/Settings.js | não | 30 / 1 |  |
| _backup/20260911-1103/server/server.js | server/server.js | não | 17 / 0 |  |
| _backup/20260911-1115/app/js/api.js | app/js/api.js | não | 3 / 0 |  |
| _backup/20260911-1115/app/js/ui/Settings.js | app/js/ui/Settings.js | não | 11 / 2 |  |
| _backup/20260911-1115/server/server.js | server/server.js | não | 11 / 0 |  |
| _backup/20260911-1146/app/js/app.js | app/js/app.js | não | 39 / 5 | abrirLista |
| _backup/20260911-1146/app/js/catalog.js | app/js/catalog.js | não | 100 / 9 | continuarSync, arrancar |
| _backup/20260911-1146/app/js/platform/sync.js | app/js/platform/sync.js | não | 106 / 34 | seguirPosPoda |
| _backup/20260911-1146/app/js/ui/Settings.js | app/js/ui/Settings.js | não | 11 / 20 |  |
| _backup/20260911-1156/app/js/app.js | app/js/app.js | não | 36 / 6 | abrirLista |
| _backup/20260911-1156/app/js/catalog.js | app/js/catalog.js | não | 96 / 26 | arrancar |
| _backup/20260911-1156/app/js/platform/sync.js | app/js/platform/sync.js | não | 104 / 89 | seguirPosPoda |
| _backup/20260911-1156/app/js/ui/Settings.js | app/js/ui/Settings.js | não | 7 / 0 |  |
| _backup/20260911-1412/app/js/app.js | app/js/app.js | não | 36 / 6 | abrirLista |
| _backup/20260911-1412/app/js/catalog.js | app/js/catalog.js | não | 74 / 21 | arrancar |
| _backup/20260911-1412/app/js/platform/sync.js | app/js/platform/sync.js | não | 84 / 86 |  |
