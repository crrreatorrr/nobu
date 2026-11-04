import { availableMilestones, dogsFreedCount, kennelUnlocks, totalDogs } from './progress.js';

export const FUR_TINTS = Object.freeze({ none: null, cream: 0xf3e3c3, shadow: 0x5a5560, ginger: 0xd08a4a, chompGold: 0xf2c14e });
export const GALLERY = ['concept_keyart', 'concept_environments', 'story_intro_1', 'story_intro_2', 'story_intro_3', 'story_intro_4', 'story_rescue_1', 'story_rescue_2', 'story_rescue_3', 'story_ending'];
const levels = (registry) => Object.values(registry.LEVELS || registry).filter((d) => d.shipped && d.dogs);
export function freedDogs(data, registry) {
  return levels(registry).flatMap((def) => Object.entries(def.dogs).filter(([id]) => data.dogsFreed?.[`${def.id}:${id}`] === true)
    .map(([id, section]) => ({ key: `${def.id}:${id}`, id, level: def.id, breed: id.split('-')[0], section })));
}
export const chainBadges = (data, registry) => levels(registry).filter((def) => data.chainBadges?.[def.id] === true).map((def) => def.id);
export function kennelStatus(data, registry) {
  const total = totalDogs(registry), freed = dogsFreedCount(data, registry);
  return { total, freed, unlocks: kennelUnlocks(data, total, freed), milestones: availableMilestones(total).map((m) => ({ ...m,
    target: m.at === 'all' ? total : m.at, remaining: Math.max(0, (m.at === 'all' ? total : m.at) - freed) })),
    badges: chainBadges(data, registry), breeds: [...new Set(freedDogs(data, registry).map((d) => d.breed))] };
}
export function allowedTints(data, registry) {
  const status = kennelStatus(data, registry);
  if (!status.unlocks.includes('fur')) return ['none'];
  return Object.keys(FUR_TINTS).filter((id) => id !== 'chompGold' || status.badges.length >= 5);
}
export function selectedBuddy(data, registry, context = {}) {
  if (context.phase !== 'level' || context.trial || context.remix || context.rush || context.ride || context.board) return null;
  const status = kennelStatus(data, registry), breed = data.kennel?.buddy;
  return status.unlocks.includes('buddy') && status.breeds.includes(breed) ? breed : null;
}
export function selectedTint(data, registry, context = {}) {
  if (context.trial || context.board) return null;
  const tint = data.kennel?.tint || 'none';
  return allowedTints(data, registry).includes(tint) ? FUR_TINTS[tint] : null;
}
export function missingSecrets(data, registry) {
  return levels(registry).filter((def) => data.open?.[def.id]).map((def) => ({ id: def.id, name: def.name,
    hidden: data.boneBoard?.[def.id]?.hidden ? null : def.hidden || null,
    dogs: Object.entries(def.dogs).filter(([id]) => !data.dogsFreed?.[`${def.id}:${id}`]).map(([id, section]) => ({ id, section }))
  })).filter((def) => def.hidden || def.dogs.length);
}
export function crowdLayout(data, registry, lowEnd = false) {
  const dogs = freedDogs(data, registry), visible = dogs.slice(0, lowEnd ? 12 : 54);
  return { hidden: dogs.length - visible.length, dogs: visible.map((dog, i) => ({ ...dog,
    x: (i % 9 - 4) * 1.1 + Math.sin(i * 13.1) * .18,
    z: (Math.floor(i / 9) - 2.5) * 1.05 + Math.cos(i * 7.7) * .18, offset: i * .37 })) };
}
