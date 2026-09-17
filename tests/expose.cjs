// Expoe as funcoes internas do orquestrador para teste e previa.
// O app empacotado NAO contem este trecho: ele e injetado na leitura.
const TAIL = `window.h={choosePlayback:choosePlayback,acceptChoice:acceptChoice,toggleFavorite:toggleFavorite,` +
  `boot:boot,renderCats:renderCats,loadCategoryNow:loadCategoryNow,goPage:goPage,onKey:onKey,` +
  `play:playChannelNow,playChannelNow:playChannelNow,playChannel:playChannel,loadCategory:loadCategory,` +
  `suspend:suspend,resume:resume,player:player,` +
  `abrirFicha:abrirFicha,fecharFicha:fecharFicha,enterFull:enterFull,exitFull:exitFull,` +
  `setStatus:setStatus,carregarHome:carregarHome,` +
  `state:function(){return{pagina:pagina,zona:zona,watchMode:watchMode,categories:categories,` +
  `catIndex:catIndex,currentChannel:currentChannel,list:list,grids:grids,home:home};},` +
  `setup:function(cats,pageId){list=window.testList||list;categories=cats;` +
  `if(pageId!==undefined&&pageId!==null){pagina=pageIndexOf(pageId);}if(estado[PAGES[pagina].id]){estado[PAGES[pagina].id].cats=cats;}}};})();`;

exports.expose = (source) => source.replace(/\}\)\(\);\s*$/, TAIL);
