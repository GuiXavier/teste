const fs=require('fs'),path=require('path');
const inv=JSON.parse(fs.readFileSync(path.join(__dirname,'inventario.json'),'utf8'));
const descriptions={
'nodecast-tv':{
'server/index.js':'Inicializa Express, sessão/Passport, arquivos estáticos, rotas, FFmpeg/ffprobe, plugins e sincronização. A inicialização carrega todos os serviços; isso não deve ser transplantado para o Node 8 da TV.',
'server/auth.js':'Hash e verificação de senha, emissão/validação de JWT, estratégias local/JWT/OIDC e autorização por papel. Referência para proteger o backend, com configuração de segredos própria.',
'server/db.js':'Persistência legada JSON de fontes, usuários, configurações e itens ocultos. Convive com SQLite; não é o banco de catálogo atual inteiro.',
'server/db/sqlite.js':'Schema de categorias, itens, programação, sincronização, favoritos e histórico; índices e WAL. Aproveitar o modelo de consulta, adaptando a IndexedDB e incluindo fonte e tipo nas chaves.',
'server/services/cache.js':'Cache JSON em disco por chave, leitura com validade e limpeza por fonte. Inspiração para separar caches do app por provedor.',
'server/services/epgParser.js':'XMLTV com SAX, datas com fuso, programas atuais/próximos e gerador de lotes. Revisar backpressure: pendingBatch único pode ser sobrescrito se o produtor avançar durante o consumo.',
'server/services/m3uParser.js':'Parser M3U por linhas, EXTINF/EXTGRP, IDs e lotes. Aproveitar entrada incremental; preservar os atributos adicionais e as multicategorias do app local.',
'server/services/m3uXtreamAdapter.js':'Consulta M3U já sincronizado no SQLite e o expõe como métodos Xtream. Referência direta para a fachada de provedores.',
'server/services/xtreamApi.js':'Cliente Xtream, URLs de live/VOD/séries, autenticação, informações detalhadas e EPG curto/XMLTV. Usa APIs modernas de Node; não copiar literalmente para o serviço webOS.',
'server/services/syncService.js':'Sincronização por fonte com trava activeSyncs, lotes, status e poda. EPG antigo é apagado antes da nova carga: não reproduzir esse risco no catálogo da TV.',
'server/services/transcodeSession.js':'Sessões FFmpeg para HLS em disco, seleção de encoder, cópia de vídeo, conversão de áudio, seek, persistência e limpeza. Útil apenas em backend opcional PC/VPS; exige limites de disco, processos e isolamento.',
'server/services/hwDetect.js':'Detecta NVIDIA, VAAPI, Quick Sync e AMF e recomenda encoder no servidor. Não detecta as capacidades do elemento video da LG.',
'server/routes/auth.js':'Login/setup/logout, sessão e integração OIDC. Fluxo web de autenticação a adaptar para pareamento da TV.',
'server/routes/users.js':'Administração de usuários. Arquivo presente, mas não há montagem direta /api/users no server/index.js inspecionado; conferir integração antes de presumir endpoint ativo.',
'server/routes/sources.js':'CRUD/teste/atualização de fontes e coordenação da sincronização. Referência para estados de carregamento e edição de fontes.',
'server/routes/proxy.js':'Rotas Xtream/M3U/EPG, cache, imagem e streaming; encaminha Range e Content-Range. Há definições duplicadas de algumas rotas, logo a ordem do Express importa.',
'server/routes/channels.js':'Ocultar/exibir canais e categorias, operações em lote e listagem de novidades. Usa consultas parametrizadas e cascata de visibilidade.',
'server/routes/favorites.js':'Favoritos do usuário autenticado, identificados por fonte, item e tipo. Bom contrato para uma camada local de favoritos.',
'server/routes/history.js':'Histórico do usuário com posição/duração e snapshot do item. A chave userId:itemId omite fonte/tipo: adaptar sem perpetuar colisões.',
'server/routes/probe.js':'Executa ffprobe, identifica codecs/container/legendas e recomenda remux ou transcode. A matriz é de navegador desktop, não uma certificação para a LG.',
'server/routes/remux.js':'Remultiplexação via FFmpeg para browser. Alternativa de servidor quando codecs são compatíveis e só o container atrapalha.',
'server/routes/transcode.js':'API de transcodificação, sessões e entrega de playlists/segmentos. Depende do serviço de sessões e de FFmpeg.',
'server/routes/subtitle.js':'Extração de faixa de legenda pelo servidor para WebVTT. Exige FFmpeg; separar da seleção de faixas já presentes no HLS.',
'server/routes/settings.js':'Leitura/alteração de configurações e recursos de hardware. Separar preferências de TV das do backend.',
'server/plugins/hello.js':'Plugin de exemplo com rota própria. Demonstra o contrato app/services; não agrega reprodução ao app local.',
'server/plugins/PLUGINS.md':'Documentação do carregamento e ciclo de vida de plugins. Código local do servidor é executado com privilégios do processo.',
'public/js/app.js':'Orquestra páginas, navegação, autenticação e componentes. Referência para substituir estado global disperso por rotas explícitas.',
'public/js/api.js':'Cliente HTTP e grupos de operações para fontes, proxy, favoritos e configuração. Comparar contratos, não caminhos literais com a API local.',
'public/js/auth.js':'Estado de autenticação no browser, setup/login/logout e seleção de interface por papel.',
'public/js/login.js':'Inicialização da página de login. Não contém lógica de mídia.',
'public/js/icons.js':'Biblioteca de ícones SVG em strings para controles. Reaproveitamento visual possível respeitando procedência e escala de TV.',
'public/js/components/ChannelList.js':'Grupos recolhíveis, busca, favoritos, informações EPG, menus e renderização em lotes. Não substituir a paginação limitada em memória da TV pelo carregamento integral usado em alguns caminhos.',
'public/js/components/EpgGuide.js':'Grade de programação com linhas visíveis, coordenadas de tempo, indicador de agora, favoritos e detalhes. Adaptar foco para D-pad e buscar somente a janela de canais/tempo.',
'public/js/components/VideoPlayer.js':'Player ao vivo com HLS, recuperação, controles, legendas, qualidade, proxy/remux/transcode e EPG. Preservar a preferência pelo motor nativo medida no app local.',
'public/js/components/SourceManager.js':'Cadastro/edição/teste de fontes, status da sincronização e árvore de visibilidade. Vários métodos repetidos exigem ler a última definição efetiva.',
'public/js/pages/Guide.js':'Ciclo de exibição/ocultação da grade EPG e atualização. Bom exemplo de limpeza de timers por página.',
'public/js/pages/HomePage.js':'Dashboard de favoritos, histórico, filmes/séries recentes e navegação para assistir. Modelo de produto para uma home posterior.',
'public/js/pages/LivePage.js':'Integra lista, player e informação do programa atual com ciclo de página e teclado.',
'public/js/pages/MoviesPage.js':'Fontes/categorias de filmes, filtros, renderização em lotes, favoritos e abertura do WatchPage.',
'public/js/pages/SeriesPage.js':'Catálogo de séries, detalhes, temporadas/episódios e favoritos. A UI desktop precisa ser redesenhada para o controle.',
'public/js/pages/Settings.js':'Preferências do player, transcodificação, hardware, abas e usuários. Só partes se aplicam ao modo local.',
'public/js/pages/WatchPage.js':'VOD/episódios, seek, legendas, retomada, salvamento a cada 10 segundos e próximo episódio com cancelamento. Fonte principal para continuar assistindo.',
'public/index.html':'Estrutura DOM da SPA e modais. Inventário abaixo lista IDs e scripts; não portar layout desktop inteiro.',
'public/login.html':'Tela de login/setup; conteúdo de autenticação separado do player.',
'public/css/main.css':'Design system e estilos de desktop, player, catálogo, configurações e EPG. App local já declara derivação de tokens; recursos modernos devem passar por compatibilidade Chrome 79.',
'package.json':'Manifesto 2.1.4, Node >=18, scripts start/dev e dependências Express, SQLite, Passport, SAX e ferramentas FFmpeg.',
'package-lock.json':'Grafo fixado das dependências npm e integridades. Não foi instalado nem executado durante o estudo.',
'Dockerfile':'Ambiente de construção/execução em contêiner do servidor; não é empacotamento de TV.',
'docker-compose.yml':'Exemplo de implantação e volumes persistentes do backend.',
'nodecast.patch':'Patch auxiliar armazenado no repositório; não deve ser reaplicado automaticamente sobre o estado atual.',
'README.md':'Descrição, operação e recursos anunciados. Afirmações foram confrontadas com os módulos relevantes.',
'LICENSE':'Texto GPL v3. O package.json declara GPL-3.0-only; preservar a licença e a atribuição dos trechos reutilizados.',
'.gitignore':'Exclusões de arquivos locais/gerados para o Git.',
'.github/workflows/docker-publish.yml':'Automação de construção/publicação da imagem Docker; não usada nesta análise.',
'.github/ISSUE_TEMPLATE/bug_report.md':'Formulário para relatar defeitos, ambiente e reprodução.',
'.github/ISSUE_TEMPLATE/feature_request.md':'Formulário para propostas de recursos.'},
'hypnotix':{
'usr/lib/hypnotix/common.py':'Modelos Provider/Group/Channel/Serie/Season; M3U, cache, validação e favoritos. Tratar vírgulas entre aspas e integridade de download com testes próprios; código upstream também tem limitações.',
'usr/lib/hypnotix/xtream.py':'Cliente Python Xtream com autenticação/cache, categorias, live/VOD/séries, episódios e builders de EPG. Filtro is_adult é opcional e tem padrão false no construtor, diferente da generalização do README local.',
'usr/lib/hypnotix/hypnotix.py':'Aplicação GTK: construção de UI, navegação com back_page, busca, favoritos, provedores, logos, reprodução mpv e observadores. Aproveitar regras de navegação e de produto, não GTK/GLib.',
'usr/lib/hypnotix/mpv.py':'Binding Python de libmpv via ctypes: eventos, propriedades, comandos, streams, renderização e overlays. Dependência nativa incompatível com o app webOS empacotado; nenhuma promessa de portar screenshot/PiP.',
'usr/share/glib-2.0/schemas/org.x.hypnotix.gschema.xml':'Preferências GSettings: opções mpv, UA, Referer, provedor ativo/lista e yt-dlp local. Formato de credenciais separado por ::: não é bom substituto para JSON.',
'usr/share/hypnotix/hypnotix.ui':'Layout GTK Builder: páginas, campos, controles e sinais ligados ao MainWindow. Serve de mapa de jornadas de usuário.',
'usr/share/hypnotix/shortcuts.ui':'Janela GTK de atalhos de teclado. Ideia: ajuda contextual das teclas realmente suportadas na TV.',
'usr/share/hypnotix/hypnotix.css':'Estilos GTK de listas e player. Não é CSS de navegador pronto para reaproveitar.',
'usr/share/hypnotix/countries.list':'Lista textual de países usada para identificação/organização visual.',
'usr/share/applications/hypnotix.desktop':'Integração ao menu de aplicativos Linux.',
'usr/bin/hypnotix':'Launcher do aplicativo Python no ambiente Linux.',
'README.md':'Apresentação do projeto e links do aplicativo; não substitui inspeção do código.',
'debian/copyright':'Declara GPL-3+ e autoria Linux Mint; conferir também cabeçalhos das bibliotecas incorporadas.',
'debian/control':'Dependências e descrição de pacote Debian, incluindo runtime Python/GTK/mpv.',
'debian/rules':'Regras de construção Debian.',
'debian/install':'Mapeamento dos arquivos que entram no pacote Linux.',
'debian/postinst':'Ações após instalação do pacote, não executadas aqui.',
'debian/changelog':'Histórico de releases do pacote. Não confundir a última versão empacotada com cada commit do Git.',
'debian/compat':'Nível de compatibilidade debhelper.',
'debian/source/format':'Formato do pacote-fonte Debian.',
'Makefile':'Regras de construção/instalação e traduções.',
'makepot':'Extração de mensagens traduzíveis para gettext.',
'generate_desktop_files':'Gera arquivos desktop com traduções.',
'hypnotix.pot':'Template de todas as mensagens gettext, base dos idiomas.',
'test':'Launcher para desenvolvimento/teste manual; não constitui uma suíte unitária completa.',
'.github/workflows/build.yml':'Workflow de construção do pacote.',
'.gitignore':'Exclusões do repositório.'},
'SFVIP-Player':{
'App.xaml':'Recursos WPF e dicionários de temas/idioma externos. Vários recursos referenciados não estão na árvore.',
'App.xaml.cs':'Inicialização WPF e resolução de assemblies; contém marcadores de descompilação e identificadores não usuais. Referencia classes ausentes; não é um bootstrap compilável isoladamente.',
'AppSettings.cs':'Contêiner estático de configurações, janela, log, pasta, UA e indicador de libmpv ausente. Implementações de SettingsMng/MainWindow/LogWriter não vieram.',
'OptionsCommandLine.cs':'Declara argumentos --sub e --file via libmpv.CommandLineArgs. Só comprova opções, não o carregamento de legendas.',
'ScreenState.cs':'Enum PiP/Fullscreen/Normal. Inspira estados de interface, mas não implementa PiP.',
'SFVipPlayer.csproj':'Projeto WPF .NET Framework 4.7.2 x64 com listas de código/recursos e DLLs ausentes. Mapa das funcionalidades pretendidas, não evidência de suas implementações.',
'app.config':'Seleciona CLR v4/.NET Framework 4.7.2.',
'app.manifest':'Manifesto Windows com privilégio asInvoker.',
'README.md':'Descrição comercial de recursos e download de release. Legendas automáticas, playlists inteligentes e equalizador não são verificáveis no código entregue.',
'LICENSE':'Licença MIT declarada neste repositório. Não comprova origem/licença das DLLs ausentes nem de um binário externo.',
'SFVipPlayer.ico':'Ícone binário Windows. Sem lógica de player.'}};
const repos={
'nodecast-tv':['technomancer702/nodecast-tv','0e26a90dae211cf9ed4c7adc8941ec9fbddec972'],
'hypnotix':['linuxmint/hypnotix','0e0fa1c7596f7925c715c36efb0e4be53a3bde43'],
'SFVIP-Player':['austintools/SFVIP-Player','0e634fea82b2e38c10615d7195862a4e06ddf2f9']};
for(const [name,[repo,sha]] of Object.entries(repos)){
 let out=`# ${name}: arquivo por arquivo\n\nRevisão fixada: [${sha}](https://github.com/${repo}/tree/${sha}). ${inv[name].length} arquivos presentes. A análise estrutural percorreu integralmente os textos; a revisão semântica concentrou-se nos fluxos de catálogo, sincronização, reprodução, persistência e nas partes aproveitáveis. Traduções, recursos e binários têm análise adequada ao seu tipo; não se afirma auditoria linha a linha de bibliotecas, cada tradução ou execução dos projetos externos.\n\n`;
 for(const f of inv[name]){
  const t=f.binary?'':fs.readFileSync(path.join(__dirname,'referencias',name,f.path),'utf8');
  let desc=descriptions[name][f.path];
  if(!desc&&f.path.endsWith('.po'))desc=`Tradução gettext ${path.basename(f.path,'.po').replace('hypnotix-','')}; ${[...t.matchAll(/^msgid /gm)].length} entradas. Material de localização, sem lógica de IPTV.`;
  if(!desc&&/\.(png|jpg|svg|ico)$/.test(f.path))desc=f.path.includes('screenshot')?'Captura visual de demonstração. Documenta aparência; não comprova funcionamento nem contém código de aplicação.':'Recurso visual de marca, placeholder, categoria ou idioma; analisar identidade/atribuição antes de reutilizar.';
  if(!desc)throw new Error('Sem descrição: '+name+'/'+f.path);
  const url=`https://github.com/${repo}/blob/${sha}/${f.path}`;
  out+=`## ${f.path}\n\n[Arquivo na revisão estudada](${url}). ${f.bytes} bytes; ${f.lines??'binário'} linhas.\n\n${desc}\n\n`;
  const codeText=/\.(js|py|cs)$/.test(f.path)?t:'';
  const deps=[...codeText.matchAll(/require\(['"]([^'"]+)['"]\)|^\s*(?:from|import|using)\s+([\w.]+)/gm)].map(m=>m[1]||m[2]);
  if(deps.length)out+=`Dependências/importações identificadas: ${[...new Set(deps)].map(x=>'`'+x+'`').join(', ')}.\n\n`;
  if(f.symbols.length)out+=`Pontos de entrada e funções (índice heurístico): ${f.symbols.map(s=>`[${s.name}](${url}#L${s.line})`).join('; ')}.\n\n`;
  const routes=[...t.matchAll(/(?:router|app)\.(get|post|put|delete|patch|use)\(['"]([^'"]+)['"]/g)].map(m=>m[1].toUpperCase()+' '+m[2]);
  if(routes.length)out+=`Rotas/montagens declaradas: ${routes.map(r=>'`'+r+'`').join('; ')}. Caminhos relativos dependem da montagem no servidor.\n\n`;
  if(/\.(html|ui|xaml|xml)$/.test(f.path)){
   const ids=[...t.matchAll(/\b(?:id|x:Name|name)="([\w.-]+)"/g)].map(m=>m[1]);
   if(ids.length)out+=`Elementos/chaves nomeados: ${[...new Set(ids)].map(x=>'`'+x+'`').join(', ')}.\n\n`;
  }
 }
 fs.writeFileSync(path.join(__dirname,`arquivos-${name}.md`),out);
}
// Lista de todas as referências de build que não foram disponibilizadas.
const base=path.join(__dirname,'referencias','SFVIP-Player');
const csproj=fs.readFileSync(path.join(base,'SFVipPlayer.csproj'),'utf8');
const refs=[...csproj.matchAll(/<(Compile|Page|Resource|EmbeddedResource|None|ApplicationDefinition) Include="([^"]+)"/g)].map(m=>({kind:m[1],path:m[2],exists:fs.existsSync(path.join(base,m[2]))}));
fs.writeFileSync(path.join(__dirname,'sfvip-arquivos-ausentes.json'),JSON.stringify(refs.filter(r=>!r.exists),null,2));
console.log(JSON.stringify({dossies:Object.keys(repos),sfvipBuildReferences:refs.length,missing:refs.filter(r=>!r.exists).length}));
