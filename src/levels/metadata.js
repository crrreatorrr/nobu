import { L1_ADDED_DOGS } from './data/l1-layout2.js';
import { L4_DOGS } from './data/laundry.js';
import { SECTION_TEXT, L4_TEXT } from '../story/script.js';
// Save validation and migration can read this metadata without loading level
// builders (which themselves import the save). Valid ids include planned content;
// the registry still exposes only the five currently shipped levels.
export const LEVEL_IDS = ['1', '2', '3', '4', '5', '6', 'ride', 'cave'];

// Stable ids in existing authoring order. Append future dogs; never reorder or
// rename released ids, since v2 saves can only remember each level's best count.
export const LEVEL_DOGS = {
  4: Object.fromEntries(L4_DOGS.map(dog=>[dog.id,L4_TEXT.sections[dog.section]])),
  1: { 'shiba-a': 'Start', 'pug-a': 'Treat Ledge', 'dalmatian-a': 'Bone Switch', 'shiba-b': 'Belly-flop Pocket', 'corgi-a': 'Last Gap', ...Object.fromEntries(Object.entries(L1_ADDED_DOGS).map(([id,key])=>[id,SECTION_TEXT[key]])) },
  2: { 'corgi-a': 'First Gap', 'pug-a': 'Blue Path', 'shiba-a': 'Mushroom Landing', 'corgi-b': SECTION_TEXT.switchbacks, 'shiba-b': SECTION_TEXT.catFlapAlley, 'dalmatian-a': SECTION_TEXT.scratchpostForest, 'pug-b': SECTION_TEXT.dryRiverbed },
  3: { 'pug-a': 'Crusher Alley', 'dalmatian-a': 'Rug Puzzle', 'corgi-a': 'Fan Catwalk', 'shiba-a': 'Vacuum Hall', 'dalmatian-b': 'Final Stretch', 'shiba-b': SECTION_TEXT.sorting, 'pug-b': SECTION_TEXT.packaging, 'corgi-b': SECTION_TEXT.maintenanceDucts, 'dalmatian-c': SECTION_TEXT.overheadRails },
  ride: { 'shiba-a': 'Hallway', 'corgi-a': 'Toy Piles', 'pug-a': 'Living Room Split', 'dalmatian-a': 'Sofa Summit' },
  cave: { 'pug-a': 'First Pit', 'shiba-a': 'Red Bone', 'corgi-a': 'Underground River', 'dalmatian-a': "Lumi's Nest Hollow" },
};
