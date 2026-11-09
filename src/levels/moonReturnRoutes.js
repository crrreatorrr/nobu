import { MOON_RETURN_ROUTES, COLORED_RETURN_ROUTES } from './data/moon-return-routes.js';

export const MOON_EXTRA_RISE = 6.25;

export function addMoonReturnExtras(k, stage, id, { launchPad = true } = {}) {
  const installed = stage.moonExtras?.find(e => e.id === id);
  if (installed) return installed;
  const authored = MOON_RETURN_ROUTES[id];
  if (!authored) return null;
  const { launch } = authored;
  const launchWorld = k.W(launch.x, launch.y, launch.d);
  const pad = launchPad ? k.platform(launch.x, launch.y, launch.d, launch.w ?? 2.2, launch.dd ?? 2.2) : null;
  let ledge;
  if (authored.existing) ledge = stage.entities.find(e => e.kind === 'moonledge');
  else {
    const y = launchWorld.y + MOON_EXTRA_RISE - k.W(authored.x, 0, authored.d).y;
    ledge = k.moonLedge(authored.x, y, authored.d);
    const oneUp = k.oneUp(authored.x, y, authored.d);
    oneUp.countable = false;
    oneUp.detour = !!authored.detour;
  }
  if (!ledge) throw new Error(`Missing authored Moon Ledge in ${id}`);
  if (pad) pad.detour = !!authored.detour;
  ledge.detour = !!authored.detour;
  const c = ledge.pos;
  const nearbySurfaces = stage.world.all.filter(s => s.enabled && s !== ledge.solid).map(s => ({
    kind: s.ref?.constructor.name ?? s.kind, worldTop: s.max.y,
    edgeDistance: Math.hypot(Math.max(s.min.x-c.x,0,c.x-s.max.x), Math.max(s.min.z-c.z,0,c.z-s.max.z)),
  })).filter(s => s.edgeDistance <= 4);
  const info = { id, authored, launchWorld, pad, ledge, nearbySurfaces };
  (stage.moonExtras ||= []).push(info);
  return info;
}

export function addColoredReturnExtras(k, stage, id) {
  const authored = COLORED_RETURN_ROUTES[id];
  if (!authored) return null;
  // GoodBoyRoute otherwise defaults to twelve raw Tickets. These new paths
  // deliberately contain only their noncountable 1UP; the fixed budgets stay put.
  const route = k.colorPath(authored.color, authored.platforms, { jackpot: 0 });
  route.detour = !!authored.detour;
  return route;
}
