import { Game } from './game/game.js';
import { audio } from './audio/audio.js';
import { crashGuard } from './core/crashGuard.js';
import { CrashPanel } from './ui/crashPanel.js';
import { installGameFeedback } from './hub/feedback.js';

// Crash safety net: uncaught errors and rejections feed the crash guard; when it halts the game
// (a streak of failing frames, or a failed boot) the "Something broke" panel offers a reload.
// crashGuard.onCrash(fn) is where an opt-in crash reporter can attach later. Nothing is sent.
const crashPanel = new CrashPanel(document, () => window.location.reload());
crashGuard.installGlobal(window);
// Errors while the tab was hidden (no frames ran) must not count toward a halt once it is back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') crashGuard.resetStreak();
});
crashGuard.onHalt((info) => {
  try { audio.stopMusic(); } catch { /* audio may be what broke; the panel matters more */ }
  crashPanel.show(info.source === 'boot' ? 'retry' : 'reload');
});

const game = new Game(document.getElementById('game'), document.getElementById('ui'));
// N twice, or SEND FEEDBACK in the pause menu: the hub SDK's feedback window (src/hub/feedback.js).
try { game.feedback = installGameFeedback(game); } catch (err) { console.warn('[feedback] not installed', err); }
if (import.meta.env.DEV) {
  window.__nobu = game;
  import('./dev.js').then((m) => m.installDevTools(game));
}
game.boot().then(
  // Loading is over: whatever went wrong during it does not count toward a halt.
  () => crashGuard.resetStreak(),
  (err) => crashGuard.report(err, 'boot'),
);
