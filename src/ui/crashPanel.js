// The "Something broke" panel: a small card over the game, shown when the crash guard halts the
// game (or boot fails). One button: RELOAD (a halted game) or RETRY (boot). Styles: .crash-panel
// in style.css. It lives on <body>, outside #ui, so screen changes never wipe it.

export const CRASH_PANEL_ID = 'crash-panel';

export class CrashPanel {
  constructor(doc, reload) {
    this.doc = doc;
    this.reload = reload;
    this.shown = false;
  }

  /** Shows the panel ('reload' | 'retry'), once; later calls do nothing. */
  show(kind) {
    if (this.shown) return;
    this.shown = true;
    const doc = this.doc;
    const root = doc.createElement('div');
    root.id = CRASH_PANEL_ID;
    root.className = 'crash-panel';
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-label', 'Something broke');
    const card = doc.createElement('div');
    card.className = 'crash-card';
    const title = doc.createElement('div');
    title.className = 'crash-title';
    title.textContent = 'Something broke';
    const detail = doc.createElement('div');
    detail.className = 'crash-detail';
    detail.textContent = kind === 'retry'
      ? 'Nobu could not start. Check your connection and try again.'
      : 'The game hit an error and paused. Reloading usually fixes it.';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'crash-button';
    button.textContent = kind === 'retry' ? 'RETRY' : 'RELOAD';
    button.addEventListener('click', () => this.reload());
    card.append(title, detail, button);
    root.append(card);
    doc.body.append(root);
    button.focus();
  }
}
