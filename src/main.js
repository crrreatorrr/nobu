import { Game } from './game/game.js';

const game = new Game(document.getElementById('game'), document.getElementById('ui'));
if (import.meta.env.DEV) {
  window.__nobu = game;
  import('./dev.js').then((m) => m.installDevTools(game));
}
game.boot();
