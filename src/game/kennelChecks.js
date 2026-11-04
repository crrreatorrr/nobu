// Development-only caller. Metadata stays static: this checker inspects an already-built stage.
import { ConedDog } from '../entities/dogs.js';
export function checkDogMetadata(session) {
  const { stage, def, level } = session, track = stage?.track;
  if (!track || !def?.dogs) return [];
  const errors = [], seen = new Set();
  for (const dog of stage.entities.filter((e) => e instanceof ConedDog)) {
    const prefix = `${level}:`, full = dog.dogId || '', local = full.startsWith(prefix) ? full.slice(prefix.length) : full;
    const d = track.project(dog.pos.x, dog.pos.z).s;
    const section = (track.sections || []).filter((s) => !!s.detour === !!dog.detour && d >= s.d0 && d < s.d1).sort((a, b) => b.d0 - a.d0)[0]?.name;
    if (!local || seen.has(local) || !Object.hasOwn(def.dogs, local)) errors.push({ level, id: full, problem: 'dog id mismatch' });
    else if (def.dogs[local] !== section) errors.push({ level, id: full, expected: def.dogs[local], actual: section, problem: 'dog section mismatch' });
    seen.add(local);
  }
  for (const id of Object.keys(def.dogs)) if (!seen.has(id)) errors.push({ level, id, problem: 'missing authored dog' });
  return errors;
}

export function installKennelChecks(game, report = (...args) => console.error(...args)) {
  if (!import.meta.env.DEV) return;
  const startLevel = game.startLevel.bind(game);
  game.startLevel = async (...args) => {
    const result = await startLevel(...args), session = game.session;
    if (session?.phase === 'level' && !session.devStrip && !session.boxDev) {
      for (const issue of checkDogMetadata(session)) report('[kennel metadata]', issue);
    }
    return result;
  };
}
