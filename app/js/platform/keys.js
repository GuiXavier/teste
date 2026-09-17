/* Mapa de teclas do controle LG — TODOS medidos na 43UP7500PSF (webOS 6.5.3).
   Nao invente codigos aqui: se precisar de uma tecla nova, meça antes. */
var Keys = (function () {
  "use strict";
  var K = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13,
    BACK: 461,            /* ev.key === "GoBack" */
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
    PLAY: 415, PAUSE: 19, STOP: 413, FWD: 417, REW: 412,
    CH_UP: 33, CH_DOWN: 34,
    N0: 48, N9: 57
  };
  K.isDigit = function (k) { return k >= K.N0 && k <= K.N9; };
  K.digit = function (k) { return k - K.N0; };
  /* Play e Pause sao teclas SEPARADAS nesta TV — nao existe toggle. */
  return K;
})();
window.Keys = Keys;
