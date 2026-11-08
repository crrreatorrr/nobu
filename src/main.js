import { Game } from './game/game.js';
import { audio } from './audio/audio.js';
import { crashGuard } from './core/crashGuard.js';
import { CrashPanel } from './ui/crashPanel.js';

// Crash safety net: uncaught errors and rejections feed the crash guard; when it halts the game
// (a streak of failing frames, or a failed boot) the "Something broke" panel offers a reload.
// crashGuard.onCrash(fn) is where an opt-in crash reporter can attach later. Nothing is sent.
const crashPanel = new CrashPanel(document, () => window.location.reload());
crashGuard.installGlobal(window);
crashGuard.onHalt((info) => {
  try { audio.stopMusic(); } catch { /* audio may be what broke; the panel matters more */ }
  crashPanel.show(info.source === 'boot' ? 'retry' : 'reload');
});

const game = new Game(document.getElementById('game'), document.getElementById('ui'));
if (import.meta.env.DEV) {
  window.__nobu = game;
  import('./dev.js').then((m) => m.installDevTools(game));
}
game.boot().catch((err) => crashGuard.report(err, 'boot'));
