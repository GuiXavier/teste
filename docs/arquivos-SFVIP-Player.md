# SFVIP-Player: arquivo por arquivo

Revisão fixada: [0e634fea82b2e38c10615d7195862a4e06ddf2f9](https://github.com/austintools/SFVIP-Player/tree/0e634fea82b2e38c10615d7195862a4e06ddf2f9). 11 arquivos presentes. A análise estrutural percorreu integralmente os textos; a revisão semântica concentrou-se nos fluxos de catálogo, sincronização, reprodução, persistência e nas partes aproveitáveis. Traduções, recursos e binários têm análise adequada ao seu tipo; não se afirma auditoria linha a linha de bibliotecas, cada tradução ou execução dos projetos externos.

## app.config

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/app.config). 189 bytes; 6 linhas.

Seleciona CLR v4/.NET Framework 4.7.2.

## app.manifest

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/app.manifest). 490 bytes; 12 linhas.

Manifesto Windows com privilégio asInvoker.

## App.xaml

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/App.xaml). 1034 bytes; 25 linhas.

Recursos WPF e dicionários de temas/idioma externos. Vários recursos referenciados não estão na árvore.

## App.xaml.cs

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/App.xaml.cs). 2248 bytes; 65 linhas.

Inicialização WPF e resolução de assemblies; contém marcadores de descompilação e identificadores não usuais. Referencia classes ausentes; não é um bootstrap compilável isoladamente.

Dependências/importações identificadas: `System`, `System.CodeDom.Compiler`, `System.Collections.Generic`, `System.Diagnostics`, `System.Reflection`, `System.Resources`, `System.Threading`, `System.Windows`, `libthemes.Themes`, `SFVipPlayer.Extensions`, `SFVipPlayer.Helpers`.

Pontos de entrada e funções (índice heurístico): [App](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/App.xaml.cs#L17).

## AppSettings.cs

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/AppSettings.cs). 1847 bytes; 46 linhas.

Contêiner estático de configurações, janela, log, pasta, UA e indicador de libmpv ausente. Implementações de SettingsMng/MainWindow/LogWriter não vieram.

Dependências/importações identificadas: `System`, `SFVipPlayer.Config`, `SFVipPlayer.Logging`.

Pontos de entrada e funções (índice heurístico): [AppSettings](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/AppSettings.cs#L8).

## LICENSE

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/LICENSE). 1089 bytes; 22 linhas.

Licença MIT declarada neste repositório. Não comprova origem/licença das DLLs ausentes nem de um binário externo.

## OptionsCommandLine.cs

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/OptionsCommandLine.cs). 696 bytes; 22 linhas.

Declara argumentos --sub e --file via libmpv.CommandLineArgs. Só comprova opções, não o carregamento de legendas.

Dependências/importações identificadas: `System`, `libmpv.CommandLineArgs`.

Pontos de entrada e funções (índice heurístico): [OptionsCommandLine](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/OptionsCommandLine.cs#L7).

## README.md

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/README.md). 2450 bytes; 30 linhas.

Descrição comercial de recursos e download de release. Legendas automáticas, playlists inteligentes e equalizador não são verificáveis no código entregue.

## ScreenState.cs

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/ScreenState.cs). 242 bytes; 16 linhas.

Enum PiP/Fullscreen/Normal. Inspira estados de interface, mas não implementa PiP.

Dependências/importações identificadas: `System`.

Pontos de entrada e funções (índice heurístico): [ScreenState](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/ScreenState.cs#L6).

## SFVipPlayer.csproj

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/SFVipPlayer.csproj). 13752 bytes; 314 linhas.

Projeto WPF .NET Framework 4.7.2 x64 com listas de código/recursos e DLLs ausentes. Mapa das funcionalidades pretendidas, não evidência de suas implementações.

## SFVipPlayer.ico

[Arquivo na revisão estudada](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/SFVipPlayer.ico). 77440 bytes; binário linhas.

Ícone binário Windows. Sem lógica de player.

