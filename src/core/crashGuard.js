// Crash guard: keeps one thrown error from freezing the game forever.
//
// Game.loop reports every frame (frameOk / frameFailed). After CRASH_HALT_FRAMES failures in a row
// (or a boot failure) the guard halts: the loop stops updating and the onHalt listeners show the
// "Something broke" panel. One bad frame followed by a good one just resets the streak.
//
// Uncaught errors and unhandled rejections (installGlobal) are counted too, but they only add to a
// streak that already has a failing frame in it: errors from async loading or a hidden tab never
// halt the game by themselves. Browser noise (ResizeObserver loop warnings, cross-origin
// "Script error.", other origins' scripts, AbortError/NotAllowedError rejections) is ignored. The
// guard never calls preventDefault, so the browser still logs every uncaught error itself.
//
// Console output is rate-limited: the guard writes at most CRASH_LOG_LIMIT lines per session
// (distinct errors by message and stack, the halt line, the "further errors" note), so a throw in
// every frame never logs 60 times a second. A caught frame error is also handed once to
// `reportError`, so the browser and page-error checks still see it as uncaught; the guard's own
// window listener does not count it a second time.
//
// onCrash(fn) is the hook for an opt-in crash reporter (hub Diagnostics, later). Nothing here
// sends data anywhere.

/** Failures in a row before the game halts and shows the panel. */
export const CRASH_HALT_FRAMES = 3;
/** Console lines the guard writes per session; later errors are only counted. */
export const CRASH_LOG_LIMIT = 5;
/** Distinct errors remembered for dedupe; past this, new ones are only counted. */
const MAX_SIGNATURES = 100;

/**
 * Browser noise that is not a game error: ResizeObserver loop warnings, a cross-origin
 * "Script error." (no error object), and errors thrown by another origin's script (extensions,
 * injected ads). `origin` is the page's origin; without one the file check is skipped.
 */
export function isBenignError(ev, origin) {
  const message = typeof ev?.message === 'string' ? ev.message : '';
  if (/ResizeObserver loop/.test(message)) return true;
  const hasError = ev?.error !== undefined && ev?.error !== null;
  if (!hasError && /^Script error\.?$/.test(message.trim())) return true;
  if (origin && ev?.filename) {
    try {
      if (new URL(ev.filename, origin).origin !== origin) return true;
    } catch {
      // Not a URL we can read: keep the error.
    }
  }
  return false;
}

/** Rejections that are not game errors: an aborted fetch or media play, autoplay refused. */
export function isBenignRejection(reason) {
  if (typeof reason !== 'object' || reason === null) return false;
  return reason.name === 'AbortError' || reason.name === 'NotAllowedError';
}

function describeTarget(target) {
  if (typeof target !== 'object' || target === null || typeof target.tagName !== 'string') return '';
  const url = typeof target.src === 'string' && target.src ? ` src="${target.src}"`
    : typeof target.href === 'string' && target.href ? ` href="${target.href}"` : '';
  return ` on <${target.tagName.toLowerCase()}${url}>`;
}

/** A readable message (and stack) for anything that can be thrown or rejected. */
export function describeError(error) {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack || '' };
  if (typeof error === 'string') return { message: error, stack: '' };
  if (typeof error === 'object' && error !== null) {
    // A DOM Event (an <img> or <script> load failure rejected as-is): name it, not {"isTrusted":true}.
    if ((typeof Event !== 'undefined' && error instanceof Event) || (typeof error.type === 'string' && typeof error.isTrusted === 'boolean')) {
      return { message: `Event "${String(error.type)}"${describeTarget(error.target)}`, stack: '' };
    }
    // Error-shaped objects (a DOMException from another realm, a library's error object).
    if (typeof error.message === 'string') {
      const name = typeof error.name === 'string' && error.name ? error.name : 'Error';
      return { message: `${name}: ${error.message}`, stack: typeof error.stack === 'string' ? error.stack : '' };
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') return { message: json, stack: '' };
    } catch {
      // Circular or otherwise not JSON: fall through.
    }
    return { message: Object.prototype.toString.call(error), stack: '' };
  }
  return { message: String(error), stack: '' };
}

export class CrashGuard {
  /**
   * @param surface Hands a caught frame error back to the browser (once per distinct error).
   *   Left out: `globalThis.reportError` when the browser has it. `null`: never.
   */
  constructor(haltFrames = CRASH_HALT_FRAMES, logLimit = CRASH_LOG_LIMIT, log = (...args) => console.error(...args), surface = undefined) {
    this.haltFrames = haltFrames;
    this.logLimit = logLimit;
    this.log = log;
    this.surface = surface;
    this.total = 0;
    this.consecutive = 0;
    this.halted = false;
    /** Errors that were counted but not logged (repeats and the rate limit). */
    this.suppressed = 0;
    this._streakHasFrame = false;
    this._lines = 0;
    this._logged = new Set();
    this._surfaced = new WeakSet();
    this._crash = [];
    this._halt = [];
    this._uninstall = null;
  }

  /** Calls fn({source, error, message, stack, total, consecutive, halted}) for every error. Returns an unsubscribe. */
  onCrash(fn) {
    this._crash.push(fn);
    return () => { this._crash = this._crash.filter((f) => f !== fn); };
  }

  /** Calls fn once, when the game halts (shows the panel). Returns an unsubscribe. */
  onHalt(fn) {
    this._halt.push(fn);
    return () => { this._halt = this._halt.filter((f) => f !== fn); };
  }

  /** A frame finished without throwing: the failure streak resets. */
  frameOk() {
    this.resetStreak();
  }

  /** Ends the current streak without un-halting (boot finished, the tab became visible again). */
  resetStreak() {
    this.consecutive = 0;
    this._streakHasFrame = false;
  }

  /** A frame threw. Returns true if the game is (now) halted. */
  frameFailed(error) {
    return this.report(error, 'frame');
  }

  /** Any error ('frame' | 'error' | 'unhandledrejection' | 'boot'). Returns true if halted. */
  report(error, source) {
    this.total++;
    if (source === 'frame') this._streakHasFrame = true;
    // Global errors only extend a streak a failing frame started.
    if (source === 'frame' || source === 'boot' || this._streakHasFrame) this.consecutive++;
    const { message, stack } = describeError(error);
    const tipping = !this.halted && (source === 'boot' || (this._streakHasFrame && this.consecutive >= this.haltFrames));
    if (tipping) this.halted = true;
    const fresh = this._write(source, `${message}\n${stack}`, error);
    if (fresh && source === 'frame') this._surfaceOnce(error);
    const info = { source, error, message, stack, total: this.total, consecutive: this.consecutive, halted: this.halted };
    for (const fn of this._crash.slice()) this._safely(fn, info);
    if (tipping) {
      this._say(source === 'boot'
        ? `[Crash] the game could not start (${this.total} error(s) this session)`
        : `[Crash] game halted after ${this.consecutive} failure(s) in a row (${this.total} error(s) this session)`);
      for (const fn of this._halt.slice()) this._safely(fn, info);
    }
    return this.halted;
  }

  /** Clears the halt and the streak (dev "try to continue"; tests). */
  resume() {
    this.halted = false;
    this.resetStreak();
  }

  /**
   * Listens for uncaught errors and unhandled rejections on target (window). `origin` is the page's
   * origin, for ignoring other origins' scripts. The events are never preventDefault-ed.
   */
  installGlobal(target, origin = globalThis.location?.origin) {
    this._uninstall?.();
    const onError = (e) => {
      // A frame error we handed to reportError: already counted.
      if (typeof e.error === 'object' && e.error !== null && this._surfaced.has(e.error)) return;
      if (isBenignError(e, origin)) return;
      this.report(e.error ?? e.message ?? 'Unknown error', 'error');
    };
    const onRejection = (e) => {
      if (isBenignRejection(e.reason)) return;
      this.report(e.reason, 'unhandledrejection');
    };
    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);
    this._uninstall = () => {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onRejection);
      this._uninstall = null;
    };
  }

  uninstallGlobal() {
    this._uninstall?.();
  }
  /** Logs a distinct error once (within the line cap). Returns true the first time it is seen. */
  _write(source, signature, error) {
    if (this._logged.has(signature) || this._logged.size >= MAX_SIGNATURES) {
      this.suppressed++;
      return false;
    }
    this._logged.add(signature);
    // The error object itself, so the console shows its stack.
    if (!this._say(`[Crash] ${source}:`, error)) this.suppressed++;
    return true;
  }

  /** One console line, within the cap; the last line allowed is the "further errors" note. */
  _say(...args) {
    if (this._lines >= this.logLimit) return false;
    this._lines++;
    if (this._lines === this.logLimit) {
      this.log('[Crash] further errors are counted but not logged');
      return false;
    }
    this.log(...args);
    return true;
  }

  /** Hands a caught frame error to the browser (reportError) so page-error checks see it. */
  _surfaceOnce(error) {
    if (typeof error !== 'object' || error === null || this._surfaced.has(error)) return;
    const surface = this.surface === undefined
      ? (typeof globalThis.reportError === 'function' ? (e) => globalThis.reportError(e) : null)
      : this.surface;
    if (!surface) return;
    this._surfaced.add(error);
    try {
      surface(error);
    } catch {
      // Surfacing is best effort.
    }
  }

  _safely(fn, info) {
    try {
      fn(info);
    } catch (err) {
      // A broken listener must not break the guard; log it through the same limit.
      const d = describeError(err);
      this._write(info.source, `listener: ${d.message}\n${d.stack}`, err);
    }
  }
}

/** The game's guard: the main loop, window errors and boot all report here. */
export const crashGuard = new CrashGuard();

/** Hook for an opt-in crash reporter (hub Diagnostics). Sends nothing by itself. */
export function onCrash(fn) {
  return crashGuard.onCrash(fn);
}
