# nodecast-tv: arquivo por arquivo

Revisão fixada: [0e26a90dae211cf9ed4c7adc8941ec9fbddec972](https://github.com/technomancer702/nodecast-tv/tree/0e26a90dae211cf9ed4c7adc8941ec9fbddec972). 66 arquivos presentes. A análise estrutural percorreu integralmente os textos; a revisão semântica concentrou-se nos fluxos de catálogo, sincronização, reprodução, persistência e nas partes aproveitáveis. Traduções, recursos e binários têm análise adequada ao seu tipo; não se afirma auditoria linha a linha de bibliotecas, cada tradução ou execução dos projetos externos.

## .github/ISSUE_TEMPLATE/bug_report.md

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/.github/ISSUE_TEMPLATE/bug_report.md). 1515 bytes; 50 linhas.

Formulário para relatar defeitos, ambiente e reprodução.

## .github/ISSUE_TEMPLATE/feature_request.md

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/.github/ISSUE_TEMPLATE/feature_request.md). 880 bytes; 35 linhas.

Formulário para propostas de recursos.

## .github/workflows/docker-publish.yml

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/.github/workflows/docker-publish.yml). 1562 bytes; 57 linhas.

Automação de construção/publicação da imagem Docker; não usada nesta análise.

## .gitignore

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/.gitignore). 124 bytes; 13 linhas.

Exclusões de arquivos locais/gerados para o Git.

## docker-compose.yml

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/docker-compose.yml). 377 bytes; 14 linhas.

Exemplo de implantação e volumes persistentes do backend.

## Dockerfile

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/Dockerfile). 1569 bytes; 57 linhas.

Ambiente de construção/execução em contêiner do servidor; não é empacotamento de TV.

## LICENSE

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/LICENSE). 35825 bytes; 676 linhas.

Texto GPL v3. O package.json declara GPL-3.0-only; preservar a licença e a atribuição dos trechos reutilizados.

## nodecast.patch

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/nodecast.patch). 46990 bytes; 870 linhas.

Patch auxiliar armazenado no repositório; não deve ser reaplicado automaticamente sobre o estado atual.

## package-lock.json

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/package-lock.json). 81200 bytes; 1870 linhas.

Grafo fixado das dependências npm e integridades. Não foi instalado nem executado durante o estudo.

## package.json

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/package.json). 891 bytes; 32 linhas.

Manifesto 2.1.4, Node >=18, scripts start/dev e dependências Express, SQLite, Passport, SAX e ferramentas FFmpeg.

## public/css/main.css

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/css/main.css). 95419 bytes; 4822 linhas.

Design system e estilos de desktop, player, catálogo, configurações e EPG. App local já declara derivação de tokens; recursos modernos devem passar por compatibilidade Chrome 79.

## public/favicon.svg

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/favicon.svg). 767 bytes; 4 linhas.

Recurso visual de marca, placeholder, categoria ou idioma; analisar identidade/atribuição antes de reutilizar.

## public/img/logo-banner.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/logo-banner.png). 19570 bytes; binário linhas.

Recurso visual de marca, placeholder, categoria ou idioma; analisar identidade/atribuição antes de reutilizar.

## public/img/placeholder.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/placeholder.png). 23270 bytes; binário linhas.

Recurso visual de marca, placeholder, categoria ou idioma; analisar identidade/atribuição antes de reutilizar.

## public/img/poster-placeholder.jpg

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/poster-placeholder.jpg). 47866 bytes; binário linhas.

Recurso visual de marca, placeholder, categoria ou idioma; analisar identidade/atribuição antes de reutilizar.

## public/img/screenshots/screenshot-1.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-1.png). 526457 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/img/screenshots/screenshot-2.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-2.png). 151414 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/img/screenshots/screenshot-3.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-3.png). 900271 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/img/screenshots/screenshot-4.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-4.png). 916832 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/img/screenshots/screenshot-dashboard.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-dashboard.png). 494226 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/img/screenshots/screenshot-settings.png

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/img/screenshots/screenshot-settings.png). 67320 bytes; binário linhas.

Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.

## public/index.html

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/index.html). 59565 bytes; 1128 linhas.

Estrutura DOM da SPA e modais. Inventário abaixo lista IDs e scripts; não portar layout desktop inteiro.

Elementos/chaves nomeados: `viewport`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `mobile-web-app-capable`, `description`, `app`, `version-badge`, `mobile-menu-toggle`, `navbar-menu`, `now-playing-indicator`, `now-playing-text`, `page-home`, `page-live`, `channel-toggle-btn`, `channel-sidebar-overlay`, `sidebar-expand-btn`, `channel-sidebar`, `channel-search`, `sidebar-collapse-btn`, `source-select`, `toggle-groups`, `channel-list`, `video-container`, `video-player`, `player-controls-overlay`, `player-channel-name`, `player-transcode-status`, `player-quality-badge`, `player-center-play`, `player-loading`, `btn-play`, `btn-mute`, `player-volume`, `player-captions-btn`, `player-captions-menu`, `player-captions-list`, `btn-pip`, `btn-fullscreen`, `btn-overflow`, `player-overflow-menu`, `btn-copy-url`, `player-overlay`, `now-playing`, `up-next-list`, `page-guide`, `epg-group-select`, `epg-search`, `guide-prev`, `guide-date`, `guide-next`, `epg-grid`, `page-movies`, `movies-source-select`, `movies-category-select`, `movies-search`, `movies-favorites-btn`, `movies-grid`, `page-series`, `series-source-select`, `series-category-select`, `series-search`, `series-favorites-btn`, `series-grid`, `series-details`, `series-poster`, `series-title`, `series-plot`, `series-seasons`, `page-settings`, `users-tab`, `tab-sources`, `add-xtream`, `xtream-list`, `add-m3u`, `m3u-list`, `add-epg`, `epg-list`, `epg-refresh-interval`, `epg-last-refreshed`, `tab-player`, `setting-arrow-keys`, `setting-overlay-duration`, `setting-default-volume`, `volume-value`, `setting-remember-volume`, `setting-autoplay-next`, `tab-transcode`, `hw-info-container`, `setting-hw-encoder`, `setting-max-resolution`, `setting-quality`, `setting-audio-mix`, `setting-upscale-enabled`, `upscale-method-container`, `setting-upscale-method`, `upscale-target-container`, `setting-upscale-target`, `setting-auto-transcode-tc`, `setting-force-transcode-tc`, `setting-force-video-transcode-tc`, `setting-force-remux-tc`, `setting-stream-format-tc`, `setting-user-agent-tc`, `custom-user-agent-container-tc`, `setting-user-agent-custom-tc`, `setting-force-proxy-tc`, `tab-content`, `content-type-channels`, `content-type-movies`, `content-type-series`, `content-source-select`, `content-search`, `content-show-all`, `content-hide-all`, `content-save`, `content-tree`, `tab-users`, `user-list`, `add-user-form`, `new-username`, `username`, `new-password`, `password`, `new-role`, `role`, `page-watch`, `watch-video`, `watch-overlay`, `watch-back-btn`, `watch-title`, `watch-subtitle`, `watch-transcode-status`, `watch-quality-badge`, `watch-center-play`, `watch-loading`, `watch-time-current`, `watch-progress`, `watch-skip-back`, `watch-play-pause`, `watch-skip-fwd`, `watch-mute`, `watch-volume`, `watch-captions-btn`, `watch-captions-menu`, `watch-captions-list`, `watch-pip`, `watch-fullscreen`, `watch-overflow`, `watch-overflow-menu`, `watch-copy-url`, `watch-scroll-hint`, `watch-next-episode`, `next-episode-title`, `next-countdown`, `next-play-now`, `next-cancel`, `watch-details`, `watch-poster`, `watch-content-title`, `watch-year`, `watch-rating`, `watch-duration`, `watch-description`, `watch-play-btn`, `watch-play-btn-text`, `watch-favorite-btn`, `watch-recommended`, `watch-recommended-grid`, `watch-episodes`, `watch-seasons`, `modal`, `modal-title`, `modal-body`, `modal-footer`, `context-menu`, `edit-user-modal`, `edit-user-close`, `edit-user-form`, `edit-user-id`, `edit-username`, `edit-email`, `edit-role`, `edit-password`, `edit-password-hint`, `oidc-info-group`, `edit-oidc-id`, `edit-user-cancel`, `edit-user-save`.

## public/js/api.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/api.js). 8156 bytes; 174 linhas.

Cliente HTTP e grupos de operações para fontes, proxy, favoritos e configuração. Comparar contratos, não caminhos literais com a API local.

Pontos de entrada e funções (índice heurístico): [request](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/api.js#L9).

## public/js/app.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js). 10861 bytes; 294 linhas.

Orquestra páginas, navegação, autenticação e componentes. Referência para substituir estado global disperso por rotas explícitas.

Pontos de entrada e funções (índice heurístico): [App](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L5); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L6); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L29); [checkAuth](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L167); [addLogoutButton](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L208); [navigateTo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/app.js#L243).

## public/js/auth.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js). 3961 bytes; 145 linhas.

Estado de autenticação no browser, setup/login/logout e seleção de interface por papel.

Pontos de entrada e funções (índice heurístico): [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L11); [showSetup](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L47); [showLogin](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L56); [showApp](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L65); [setup](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L82); [login](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L97); [logout](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L112); [isAdmin](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L127); [isViewer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L134); [getCurrentUser](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/auth.js#L141).

## public/js/components/ChannelList.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js). 58327 bytes; 1464 linhas.

Grupos recolhíveis, busca, favoritos, informações EPG, menus e renderização em lotes. Não substituir a paginação limitada em memória da TV pelo carregamento integral usado em alguns caminhos.

Pontos de entrada e funções (índice heurístico): [ChannelList](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L7); [getProxiedImageUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L35); [loadCollapsedState](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L47); [saveCollapsedState](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L65); [toggleGroup](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L76); [expandAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L92); [collapseAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L117); [toggleAllGroups](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L135); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L146); [startEpgRefreshTimer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L194); [updateVisibleEpgInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L210); [getProgramInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L243); [clearProgramInfoCache](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L276); [escapeHtml](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L282); [render](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L295); [renderNextBatch](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L432); [attachGroupListeners](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L546); [renderGroupChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L588); [loadSources](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L661); [loadChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L701); [loadAllChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L745); [loadXtreamChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L777); [loadM3uChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L817); [loadHiddenItems](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L857); [isHidden](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L869); [loadFavorites](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L876); [isFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L893); [toggleFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L900); [updateFavoritesGroup](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L971); [createChannelElement](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1029); [selectChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1076); [showContextMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1178); [hideContextMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1193); [handleContextAction](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1200); [showEpgInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1233); [syncFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1315); [selectNextChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1353); [selectPrevChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1397); [showEpgInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1440); [getVisibleChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/ChannelList.js#L1451).

## public/js/components/EpgGuide.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js). 35539 bytes; 932 linhas.

Grade de programação com linhas visíveis, coordenadas de tempo, indicador de agora, favoritos e detalhes. Adaptar foco para D-pad e buscar somente a janela de canais/tempo.

Pontos de entrada e funções (índice heurístico): [EpgGuide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L7); [getProxiedImageUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L45); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L54); [initResizer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L80); [navigate](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L118); [startBackgroundRefresh](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L128); [stopBackgroundRefresh](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L156); [getLastRefreshTime](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L167); [loadEpg](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L174); [fetchEpgData](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L198); [getCurrentProgram](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L271); [updateFilteredChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L311); [render](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L343); [syncHeaderCornerWidth](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L500); [updateVisibleRows](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L512); [createChannelRow](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L560); [attachRowListeners](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L615); [toggleFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L649); [syncFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L730); [generateTimeSlots](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L768); [renderProgrammes](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L783); [updateDateDisplay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L829); [debounce](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L846); [updateNowIndicator](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L858); [showProgramDetails](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L888); [playChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js#L915).

## public/js/components/SourceManager.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js). 55282 bytes; 1333 linhas.

Cadastro/edição/teste de fontes, status da sincronização e árvore de visibilidade. Vários métodos repetidos exigem ler a última definição efetiva.

Pontos de entrada e funções (índice heurístico): [SourceManager](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L7); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L23); [showWarningModal](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L41); [pollSyncStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L94); [updateSyncStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L103); [loadSources](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L111); [renderSourceList](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L126); [showAddModal](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L168); [showEditModal](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L195); [getSourceForm](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L225); [saveNewSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L264); [updateSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L315); [deleteSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L344); [toggleSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L363); [testSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L375); [refreshSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L391); [initContentBrowser](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L494); [reloadContentTree](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L557); [loadContentSources](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L578); [loadContentTree](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L604); [getFilteredGroups](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L689); [renderTree](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L715); [getGroupHtml](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L734); [escapeHtml](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L777); [attachTreeListeners](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L787); [toggleGroupExpand](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L812); [loadMovieCategoriesTree](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L838); [loadSeriesCategoriesTree](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L895); [toggleVisibility](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L943); [toggleGroupChildren](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L974); [setAllVisibility](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L1022); [saveContentChanges](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L1100); [String](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L1234); [pollSyncStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L1267); [updateSyncStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/SourceManager.js#L1284).

## public/js/components/VideoPlayer.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js). 66365 bytes; 1571 linhas.

Player ao vivo com HLS, recuperação, controles, legendas, qualidade, proxy/remux/transcode e EPG. Preservar a preferência pelo motor nativo medida no app local.

Pontos de entrada e funções (índice heurístico): [isMobile](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L7); [VideoPlayer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L11); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L12); [getDefaultSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L44); [loadSettingsFromServer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L64); [saveSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L88); [loadSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L106); [getHlsConfig](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L113); [initCustomControls](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L155); [toggleFullscreen](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L418); [togglePictureInPicture](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L443); [copyStreamUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L466); [toggleCaptionsMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L509); [closeCaptionsMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L525); [updateCaptionsTracks](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L534); [selectCaptionTrack](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L584); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L600); [showNowPlayingOverlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L785); [hideNowPlayingOverlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L805); [startTranscodeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L815); [stopTranscodeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L837); [play](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L853); [playHls](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1192); [updateTranscodeStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1216); [getQualityLabel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1237); [updateQualityBadge](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1250); [fetchEpgData](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1265); [getProxiedUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1356); [getTranscodeUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1363); [getRemuxUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1371); [decodeBase64](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1378); [stop](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1390); [updateNowPlaying](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1417); [showError](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1450); [handleKeyboard](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1458); [channelUp](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1528); [channelDown](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1544); [toggleFullscreen](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js#L1560).

## public/js/icons.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/icons.js). 7163 bytes; 33 linhas.

Biblioteca de ícones SVG em strings para controles. Reaproveitamento visual possível respeitando procedência e escala de TV.

## public/js/login.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/login.js). 568 bytes; 14 linhas.

Inicialização da página de login. Não contém lógica de mídia.

## public/js/pages/Guide.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js). 1086 bytes; 39 linhas.

Ciclo de exibição/ocultação da grade EPG e atualização. Bom exemplo de limpeza de timers por página.

Pontos de entrada e funções (índice heurístico): [GuidePage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js#L5); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js#L6); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js#L10); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js#L14); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Guide.js#L33).

## public/js/pages/HomePage.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js). 22053 bytes; 513 linhas.

Dashboard de favoritos, histórico, filmes/séries recentes e navegação para assistir. Modelo de produto para uma home posterior.

Pontos de entrada e funções (índice heurístico): [HomePage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L5); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L6); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L12); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L16); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L21); [renderLayout](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L28); [initScrollArrows](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L121); [updateScrollArrows](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L159); [loadDashboardData](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L168); [renderFavoriteChannels](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L193); [createChannelTile](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L253); [playChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L268); [renderHistory](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L293); [navigateToSeries](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L328); [renderRecentMovies](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L350); [renderRecentSeries](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L379); [createCard](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L408); [createRecentCard](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L436); [playItem](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/HomePage.js#L458).

## public/js/pages/LivePage.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js). 3650 bytes; 110 linhas.

Integra lista, player e informação do programa atual com ciclo de página e teclado.

Pontos de entrada e funções (índice heurístico): [LivePage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L5); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L6); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L11); [updateProgramInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L33); [handleKeydown](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L73); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L94); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/LivePage.js#L104).

## public/js/pages/MoviesPage.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js). 15651 bytes; 401 linhas.

Fontes/categorias de filmes, filtros, renderização em lotes, favoritos e abertura do WatchPage.

Pontos de entrada e funções (índice heurístico): [MoviesPage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L7); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L28); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L63); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L79); [loadFavorites](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L83); [loadSources](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L93); [loadCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L110); [loadMovies](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L163); [filterAndRender](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L220); [renderNextBatch](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L260); [playMovie](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L336); [toggleFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/MoviesPage.js#L364).

## public/js/pages/SeriesPage.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js). 20118 bytes; 502 linhas.

Catálogo de séries, detalhes, temporadas/episódios e favoritos. A UI desktop precisa ser redesenhada para o controle.

Pontos de entrada e funções (índice heurístico): [SeriesPage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L7); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L32); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L72); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L92); [loadFavorites](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L96); [loadSources](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L105); [loadCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L122); [loadSeries](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L175); [filterAndRender](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L232); [renderNextBatch](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L272); [showSeriesDetails](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L345); [hideDetails](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L415); [playEpisode](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L421); [toggleFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/SeriesPage.js#L465).

## public/js/pages/Settings.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js). 28629 bytes; 650 linhas.

Preferências do player, transcodificação, hardware, abas e usuários. Só partes se aplicam ao modo local.

Pontos de entrada e funções (índice heurístico): [SettingsPage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L5); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L6); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L14); [initPlayerSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L30); [initTranscodingSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L97); [loadHardwareInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L257); [initUserManagement](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L312); [loadUsers](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L338); [openEditUserModal](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L385); [setupModalHandlers](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L460); [deleteUser](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L504); [switchTab](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L517); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L537); [updateEpgLastRefreshed](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L600); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/Settings.js#L644).

## public/js/pages/WatchPage.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js). 57089 bytes; 1445 linhas.

VOD/episódios, seek, legendas, retomada, salvamento a cada 10 segundos e próximo episódio com cancelamento. Fonte principal para continuar assistindo.

Pontos de entrada e funções (índice heurístico): [WatchPage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L7); [init](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L100); [play](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L248); [showNowPlaying](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L307); [hideNowPlaying](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L319); [startTranscodeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L329); [stopTranscodeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L355); [updateTranscodeStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L368); [getQualityLabel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L388); [updateQualityBadge](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L401); [loadVideo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L412); [playHls](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L566); [setVolumeFromStorage](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L613); [stop](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L619); [togglePlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L649); [skip](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L657); [seek](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L663); [toggleMute](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L669); [setVolume](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L676); [toggleFullscreen](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L685); [togglePictureInPicture](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L707); [copyStreamUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L730); [updateProgress](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L770); [onMetadataLoaded](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L800); [onPlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L822); [onPause](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L832); [onEnded](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L842); [onError](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L854); [updateVolumeUI](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L862); [formatTime](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L868); [showLoading](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L881); [hideLoading](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L886); [toggleCaptionsMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L892); [closeCaptionsMenu](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L902); [updateCaptionsTracks](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L907); [selectCaptionTrack](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L940); [showOverlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L962); [hideOverlay](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L968); [startOverlayTimer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L975); [handleKeyboard](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L982); [renderDetails](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1039); [checkFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1062); [toggleFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1076); [updateFavoriteUI](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1096); [scrollToVideo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1104); [loadRecommended](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1113); [renderRecommendedGrid](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1138); [playRecommendedMovie](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1156); [renderEpisodes](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1187); [playEpisodeFromList](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1239); [getNextEpisode](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1274); [showNextEpisodePanel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1308); [playNextEpisode](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1329); [cancelNextEpisode](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1363); [goBack](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1375); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1384); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1388); [startHistoryTracking](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1397); [stopHistoryTracking](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1402); [saveProgress](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js#L1409).

## public/login.html

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/login.html). 12149 bytes; 320 linhas.

Tela de login/setup; conteúdo de autenticação separado do player.

Elementos/chaves nomeados: `viewport`, `login-subtitle`, `error-message`, `setup-message`, `login-form`, `username`, `password`, `submit-btn`, `btn-sso-login`.

## README.md

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/README.md). 15395 bytes; 351 linhas.

Descrição, operação e recursos anunciados. Afirmações foram confrontadas com os módulos relevantes.

## server/auth.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js). 8610 bytes; 269 linhas.

Hash e verificação de senha, emissão/validação de JWT, estratégias local/JWT/OIDC e autorização por papel. Referência para proteger o backend, com configuração de segredos própria.

Dependências/importações identificadas: `bcryptjs`, `jsonwebtoken`, `passport`, `passport-jwt`, `passport-local`, `passport-openidconnect`.

Pontos de entrada e funções (índice heurístico): [hashPassword](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L20); [verifyPassword](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L28); [generateToken](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L35); [verifyToken](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L50); [configureLocalStrategy](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L61); [configureJwtStrategy](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L88); [configureSessionSerialization](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L117); [configureOidcStrategy](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L135); [requireAdmin](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L236); [requireRole](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/auth.js#L246).

## server/db/sqlite.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js). 7994 bytes; 217 linhas.

Schema de categorias, itens, programação, sincronização, favoritos e histórico; índices e WAL. Aproveitar o modelo de consulta, adaptando a IndexedDB e incluindo fonte e tipo nas chaves.

Dependências/importações identificadas: `better-sqlite3`, `path`, `fs`.

Pontos de entrada e funções (índice heurístico): [getDb](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L15); [initSchema](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L27); [getAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L153); [add](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L171); [remove](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L181); [isFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L191); [getAllAsSet](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js#L201).

## server/db.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js). 13587 bytes; 469 linhas.

Persistência legada JSON de fontes, usuários, configurações e itens ocultos. Convive com SQLite; não é o banco de catálogo atual inteiro.

Dependências/importações identificadas: `fs/promises`, `path`, `fs`.

Pontos de entrada e funções (índice heurístico): [loadDb](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L14); [getDefaultSettings](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L57); [getUserAgent](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L97); [saveDb](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L108); [getAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L132); [getById](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L137); [getByType](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L142); [create](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L147); [update](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L161); [delete](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L175); [toggleEnabled](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L184); [getAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L198); [hide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L206); [show](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L223); [isHidden](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L231); [bulkHide](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L238); [bulkShow](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L265); [getAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L285); [add](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L297); [remove](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L316); [isFavorite](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L325); [get](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L335); [update](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L340); [reset](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L347); [getAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L357); [getById](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L362); [getByUsername](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L367); [getByOidcId](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L372); [getByEmail](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L377); [create](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L382); [update](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L412); [delete](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L440); [count](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db.js#L462).

## server/index.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/index.js). 8254 bytes; 224 linhas.

Inicializa Express, sessão/Passport, arquivos estáticos, rotas, FFmpeg/ffprobe, plugins e sincronização. A inicialização carrega todos os serviços; isso não deve ser transplantado para o Node 8 da TV.

Dependências/importações identificadas: `express`, `dotenv`, `path`, `passport`, `./services/syncService`, `./db`, `express-session`, `child_process`, `ffmpeg-static`, `@ffprobe-installer/ffprobe`, `fs`, `./routes/auth`, `./routes/sources`, `./routes/proxy`, `./routes/channels`, `./routes/favorites`, `./routes/transcode`, `./routes/remux`, `./routes/probe`, `./routes/subtitle`, `./routes/settings`, `./routes/history`, `../package.json`, `./services/hwDetect`.

Pontos de entrada e funções (índice heurístico): [findFFmpeg](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/index.js#L36); [findFFprobe](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/index.js#L63); [loadPlugins](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/index.js#L117).

Rotas/montagens declaradas: `USE /api/auth`; `USE /api/sources`; `USE /api/proxy`; `USE /api/channels`; `USE /api/favorites`; `USE /api/transcode`; `USE /api/remux`; `USE /api/probe`; `USE /api/subtitle`; `USE /api/settings`; `USE /api/history`; `GET /api/version`; `GET *`. Caminhos relativos dependem da montagem no servidor.

## server/plugins/hello.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/plugins/hello.js). 846 bytes; 25 linhas.

Plugin de exemplo com rota própria. Demonstra o contrato app/services; não agrega reprodução ao app local.

Pontos de entrada e funções (índice heurístico): [module.exports](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/plugins/hello.js#L5).

Rotas/montagens declaradas: `GET /api/hello`. Caminhos relativos dependem da montagem no servidor.

## server/plugins/PLUGINS.md

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/plugins/PLUGINS.md). 4893 bytes; 163 linhas.

Documentação do carregamento e ciclo de vida de plugins. Código local do servidor é executado com privilégios do processo.

Rotas/montagens declaradas: `GET /api/my-route`; `GET /api/my-route`; `GET /api/status`. Caminhos relativos dependem da montagem no servidor.

## server/routes/auth.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/auth.js). 8814 bytes; 295 linhas.

Login/setup/logout, sessão e integração OIDC. Fluxo web de autenticação a adaptar para pareamento da TV.

Dependências/importações identificadas: `express`, `../db`, `../auth`.

Rotas/montagens declaradas: `GET /oidc/login`; `GET /oidc/callback`; `GET /setup-required`; `POST /setup`; `POST /login`; `POST /logout`; `GET /me`; `GET /users`; `POST /users`; `PUT /users/:id`; `DELETE /users/:id`. Caminhos relativos dependem da montagem no servidor.

## server/routes/channels.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/channels.js). 12830 bytes; 330 linhas.

Ocultar/exibir canais e categorias, operações em lote e listagem de novidades. Usa consultas parametrizadas e cascata de visibilidade.

Dependências/importações identificadas: `express`, `../db/sqlite`.

Pontos de entrada e funções (índice heurístico): [mapItemType](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/channels.js#L6).

Rotas/montagens declaradas: `GET /hidden`; `POST /hide`; `POST /show`; `GET /hidden/check`; `POST /hide/bulk`; `POST /show/bulk`; `POST /show/all`; `POST /hide/all`; `GET /recent`. Caminhos relativos dependem da montagem no servidor.

## server/routes/favorites.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/favorites.js). 2134 bytes; 67 linhas.

Favoritos do usuário autenticado, identificados por fonte, item e tipo. Bom contrato para uma camada local de favoritos.

Dependências/importações identificadas: `express`, `../db/sqlite`, `../auth`.

Rotas/montagens declaradas: `GET /`; `POST /`; `DELETE /`; `GET /check`. Caminhos relativos dependem da montagem no servidor.

## server/routes/history.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/history.js). 3408 bytes; 113 linhas.

Histórico do usuário com posição/duração e snapshot do item. A chave userId:itemId omite fonte/tipo: adaptar sem perpetuar colisões.

Dependências/importações identificadas: `express`, `../db/sqlite`, `../auth`.

Rotas/montagens declaradas: `GET /`; `POST /`; `DELETE /:itemId`. Caminhos relativos dependem da montagem no servidor.

## server/routes/probe.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/probe.js). 7051 bytes; 202 linhas.

Executa ffprobe, identifica codecs/container/legendas e recomenda remux ou transcode. A matriz é de navegador desktop, não uma certificação para a LG.

Dependências/importações identificadas: `express`, `child_process`.

Pontos de entrada e funções (índice heurístico): [probeStream](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/probe.js#L31); [analyzeProbeResult](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/probe.js#L80).

Rotas/montagens declaradas: `GET /`. Caminhos relativos dependem da montagem no servidor.

## server/routes/proxy.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/proxy.js). 31301 bytes; 824 linhas.

Rotas Xtream/M3U/EPG, cache, imagem e streaming; encaminha Range e Content-Range. Há definições duplicadas de algumas rotas, logo a ordem do Express importa.

Dependências/importações identificadas: `express`, `../db`, `../db/sqlite`, `../services/xtreamApi`, `../services/epgParser`, `../services/cache`, `path`, `fs`, `http`, `https`, `child_process`, `ffmpeg-static`, `stream`.

Pontos de entrada e funções (índice heurístico): [getCategoriesFromDb](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/proxy.js#L20); [getStreamsFromDb](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/proxy.js#L36).

Rotas/montagens declaradas: `GET /xtream/:sourceId`; `GET /xtream/:sourceId/live_categories`; `GET /xtream/:sourceId/live_streams`; `GET /xtream/:sourceId/vod_categories`; `GET /xtream/:sourceId/vod_streams`; `GET /xtream/:sourceId/series_categories`; `GET /xtream/:sourceId/series`; `GET /xtream/:sourceId/series_info`; `GET /xtream/:sourceId/vod_info`; `GET /xtream/:sourceId/stream/:streamId/:type`; `GET /m3u/:sourceId`; `GET /epg/:sourceId`; `DELETE /cache/:sourceId`; `GET /xtream/:sourceId/:action`; `GET /xtream/:sourceId/stream/:streamId/:type?`; `GET /epg/:sourceId`; `DELETE /cache/:sourceId`; `DELETE /epg/:sourceId/cache`; `POST /epg/:sourceId/channels`; `GET /stream`; `GET /image`. Caminhos relativos dependem da montagem no servidor.

## server/routes/remux.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/remux.js). 4771 bytes; 125 linhas.

Remultiplexação via FFmpeg para browser. Alternativa de servidor quando codecs são compatíveis e só o container atrapalha.

Dependências/importações identificadas: `express`, `child_process`, `../db`.

Rotas/montagens declaradas: `GET /`. Caminhos relativos dependem da montagem no servidor.

## server/routes/settings.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/settings.js). 3050 bytes; 112 linhas.

Leitura/alteração de configurações e recursos de hardware. Separar preferências de TV das do backend.

Dependências/importações identificadas: `express`, `../db`, `../services/syncService`, `../services/hwDetect`.

Rotas/montagens declaradas: `GET /`; `PUT /`; `DELETE /`; `GET /defaults`; `GET /sync-status`; `GET /hw-info`; `POST /hw-info/refresh`. Caminhos relativos dependem da montagem no servidor.

## server/routes/sources.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/sources.js). 10335 bytes; 282 linhas.

CRUD/teste/atualização de fontes e coordenação da sincronização. Referência para estados de carregamento e edição de fontes.

Dependências/importações identificadas: `express`, `../db`, `../db/sqlite`, `../services/xtreamApi`, `../services/syncService`, `../services/m3uParser`.

Rotas/montagens declaradas: `GET /`; `GET /status`; `GET /type/:type`; `GET /:id`; `POST /`; `PUT /:id`; `DELETE /:id`; `POST /:id/toggle`; `POST /:id/sync`; `POST /:id/test`; `POST /estimate`; `GET /:id/estimate`; `POST /sync-all`. Caminhos relativos dependem da montagem no servidor.

## server/routes/subtitle.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/subtitle.js). 1704 bytes; 59 linhas.

Extração de faixa de legenda pelo servidor para WebVTT. Exige FFmpeg; separar da seleção de faixas já presentes no HLS.

Dependências/importações identificadas: `express`, `child_process`.

Rotas/montagens declaradas: `GET /`. Caminhos relativos dependem da montagem no servidor.

## server/routes/transcode.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/transcode.js). 9667 bytes; 274 linhas.

API de transcodificação, sessões e entrega de playlists/segmentos. Depende do serviço de sessões e de FFmpeg.

Dependências/importações identificadas: `express`, `child_process`, `path`, `fs`, `../db`, `../services/transcodeSession`.

Rotas/montagens declaradas: `POST /session`; `GET /:sessionId/stream.m3u8`; `GET /:sessionId/:segment`; `DELETE /:sessionId`; `GET /sessions`; `GET /`. Caminhos relativos dependem da montagem no servidor.

## server/routes/users.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/users.js). 6040 bytes; 187 linhas.

Administração de usuários. Arquivo presente, mas não há montagem direta /api/users no server/index.js inspecionado; conferir integração antes de presumir endpoint ativo.

Dependências/importações identificadas: `express`, `../db`, `../auth`.

Rotas/montagens declaradas: `GET /`; `POST /`; `PUT /:id`; `DELETE /:id`. Caminhos relativos dependem da montagem no servidor.

## server/services/cache.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js). 4009 bytes; 152 linhas.

Cache JSON em disco por chave, leitura com validade e limpeza por fonte. Inspiração para separar caches do app por provedor.

Dependências/importações identificadas: `fs`, `path`.

Pontos de entrada e funções (índice heurístico): [ensureCacheDir](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L13); [getCachePath](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L22); [get](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L37); [set](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L66); [clear](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L82); [clearSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L96); [clearAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L113); [getInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/cache.js#L126).

## server/services/epgParser.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js). 14708 bytes; 449 linhas.

XMLTV com SAX, datas com fuso, programas atuais/próximos e gerador de lotes. Revisar backpressure: pendingBatch único pode ser sobrescrito se o produtor avançar durante o consumo.

Dependências/importações identificadas: `sax`, `zlib`, `stream`.

Pontos de entrada e funções (índice heurístico): [parseXmltvDate](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L15); [parse](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L44); [getProgrammesForChannel](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L159); [getCurrentAndUpcoming](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L166); [fetchAndParse](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L185); [fetchAndParseStreaming](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L235); [parseStreaming](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js#L268).

## server/services/hwDetect.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js). 8066 bytes; 282 linhas.

Detecta NVIDIA, VAAPI, Quick Sync e AMF e recomenda encoder no servidor. Não detecta as capacidades do elemento video da LG.

Dependências/importações identificadas: `child_process`, `os`.

Pontos de entrada e funções (índice heurístico): [detectNvidia](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L31); [detectVAAPI](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L83); [detectQuickSync](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L121); [detectAMF](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L168); [detect](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L217); [getCapabilities](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L261); [refresh](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js#L268).

## server/services/m3uParser.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js). 10092 bytes; 317 linhas.

Parser M3U por linhas, EXTINF/EXTGRP, IDs e lotes. Aproveitar entrada incremental; preservar os atributos adicionais e as multicategorias do app local.

Dependências/importações identificadas: `readline`, `stream`.

Pontos de entrada e funções (índice heurístico): [generateStableId](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L15); [parseExtinf](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L32); [parse](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L86); [fetchAndParse](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L157); [parseStreaming](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L186); [fetchAndParseStreaming](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L256); [countEntries](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js#L280).

## server/services/m3uXtreamAdapter.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js). 4103 bytes; 134 linhas.

Consulta M3U já sincronizado no SQLite e o expõe como métodos Xtream. Referência direta para a fachada de provedores.

Dependências/importações identificadas: `../db/sqlite`.

Pontos de entrada e funções (índice heurístico): [M3uXtreamAdapter](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L10); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L11); [getLiveCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L19); [getLiveStreams](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L52); [buildStreamUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L106); [getXmltvUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L121); [createFromSourceId](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js#L129).

## server/services/syncService.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js). 21141 bytes; 575 linhas.

Sincronização por fonte com trava activeSyncs, lotes, status e poda. EPG antigo é apagado antes da nova carga: não reproduzir esse risco no catálogo da TV.

Dependências/importações identificadas: `../db/sqlite`, `../db`, `./xtreamApi`, `./m3uParser`, `./epgParser`.

Pontos de entrada e funções (índice heurístico): [SyncService](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L10); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L11); [getLastSyncTime](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L20); [startSyncTimer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L28); [stopSyncTimer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L70); [restartSyncTimer](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L81); [syncAll](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L88); [syncSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L108); [updateSyncStatus](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L157); [syncXtream](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L173); [saveCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L221); [saveStreams](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L262); [purgeStaleItems](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L359); [syncEpgFromUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L391); [syncM3u](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L499); [syncEpg](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js#L568).

## server/services/transcodeSession.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js). 26485 bytes; 773 linhas.

Sessões FFmpeg para HLS em disco, seleção de encoder, cópia de vídeo, conversão de áudio, seek, persistência e limpeza. Útil apenas em backend opcional PC/VPS; exige limites de disco, processos e isolamento.

Dependências/importações identificadas: `child_process`, `path`, `fs`, `crypto`, `events`, `./hwDetect`.

Pontos de entrada e funções (índice heurístico): [generateSessionId](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L36); [ensureCacheDir](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L43); [TranscodeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L55); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L56); [start](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L86); [buildFFmpegArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L172); [addHwAccelInputArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L289); [addVideoEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L328); [getTargetHeight](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L366); [buildScaleFilter](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L390); [addNvencEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L426); [addAmfEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L444); [addVaapiEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L462); [addQsvEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L483); [addSoftwareEncoderArgs](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L500); [stop](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L517); [touch](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L534); [isPlaylistReady](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L541); [waitForPlaylist](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L555); [getPlaylist](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L569); [getSegment](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L581); [persist](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L595); [cleanup](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L634); [createSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L652); [getSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L662); [getOrCreateSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L673); [removeSession](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L688); [cleanupStaleSessions](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L699); [recoverSessions](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L712); [startCleanupInterval](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L739); [getAllSessions](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js#L749).

## server/services/xtreamApi.js

[Arquivo na revisão estudada](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js). 4335 bytes; 162 linhas.

Cliente Xtream, URLs de live/VOD/séries, autenticação, informações detalhadas e EPG curto/XMLTV. Usa APIs modernas de Node; não copiar literalmente para o serviço webOS.

Pontos de entrada e funções (índice heurístico): [XtreamApi](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L6); [constructor](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L7); [buildApiUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L17); [request](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L35); [authenticate](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L47); [getLiveCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L58); [getLiveStreams](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L65); [getVodCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L72); [getVodStreams](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L79); [getVodInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L86); [getSeriesCategories](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L93); [getSeries](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L100); [getSeriesInfo](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L107); [getShortEpg](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L114); [getSimpleDateTable](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L121); [buildStreamUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L128); [getXmltvUrl](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L141); [createFromSource](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L149); [authenticate](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/xtreamApi.js#L156).

