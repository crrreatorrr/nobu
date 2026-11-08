// Crash guard: keeps one thrown error from freezing the game forever.
//
// Game.loop reports every frame (frameOk / frameFailed). After CRASH_HALT_FRAMES failing frames
// in a row (or a boot failure) the guard halts: the loop stops updating and the onHalt listeners
// show the "Something broke" panel. One bad frame followed by a good one just resets the streak.
//
// Uncaught errors and unhandled rejections (installGlobal) feed the same counter. Console output
// is rate-limited: the first CRASH_LOG_LIMIT distinct errors are logged once each with their
// stack, the rest are only counted, so a throw in every frame never logs 60 times a second.
//
// onCrash(fn) is the hook for an opt-in crash reporter (hub Diagnostics, later). Nothing here
// sends data anywhere.

/** Failing frames in a row before the game halts and shows the panel. */
export const CRASH_HALT_FRAMES = 3;
/** Distinct errors logged to the console per session; later ones are only counted. */
export const CRASH_LOG_LIMIT = 5;

function describe(error) {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack || '' };
  let message;
  try {
    message = typeof error === 'string' ? error : (JSON.stringify(error) ?? String(error));
  } catch {
    message = String(error);
  }
  return { message, stack: '' };
}

export class CrashGuard {
  constructor(haltFrames = CRASH_HALT_FRAMES, logLimit = CRASH_LOG_LIMIT, log = (...args) => console.error(...args)) {
    this.haltFrames = haltFrames;
    this.logLimit = logLimit;
    this.log = log;
    this.total = 0;
    this.consecutive = 0;
    this.halted = false;
    this.suppressed = 0;
    this._logged = new Set();
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
    this.consecutive = 0;
  }

  /** A frame threw. Returns true if the game is (now) halted. */
  frameFailed(error) {
    return this.report(error, 'frame');
  }

  /** Any error ('frame' | 'error' | 'unhandledrejection' | 'boot'). Returns true if halted. */
  report(error, source) {
    this.total++;
    this.consecutive++;
    const { message, stack } = describe(error);
    const tipping = !this.halted && (source === 'boot' || this.consecutive >= this.haltFrames);
    if (tipping) this.halted = true;
    this._write(source, message, error);
    const info = { source, error, message, stack, total: this.total, consecutive: this.consecutive, halted: this.halted };
    for (const fn of this._crash.slice()) this._safely(fn, info);
    if (tipping) {
      this.log(`[Crash] game halted after ${this.consecutive} failing frame(s) in a row (${this.total} error(s) this session)`);
      for (const fn of this._halt.slice()) this._safely(fn, info);
    }
    return this.halted;
  }

  /** Clears the halt and the streak (dev "try to continue"; tests). */
  resume() {
    this.halted = false;
    this.consecutive = 0;
  }

  /** Listens for uncaught errors and unhandled rejections on target (window). */
  installGlobal(target) {
    this._uninstall?.();
    const onError = (e) => {
      // Logged here once, with the stack: keep the browser from logging it again.
      e.preventDefault?.();
      this.report(e.error ?? e.message ?? 'Unknown error', 'error');
    };
    const onRejection = (e) => {
      e.preventDefault?.();
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

  _write(source, message, error) {
    if (this._logged.has(message) || this._logged.size >= this.logLimit) {
      this.suppressed++;
      return;
    }
    this._logged.add(message);
    this.log(`[Crash] ${source}:`, error);
    if (this._logged.size === this.logLimit) this.log('[Crash] further errors are counted but not logged');
  }

  _safely(fn, info) {
    try {
      fn(info);
    } catch (err) {
      this._write(info.source, `listener: ${describe(err).message}`, err);
    }
  }
}

/** The game's guard: the main loop, window errors and boot all report here. */
export const crashGuard = new CrashGuard();

/** Hook for an opt-in crash reporter (hub Diagnostics). Sends nothing by itself. */
export function onCrash(fn) {
  return crashGuard.onCrash(fn);
}
