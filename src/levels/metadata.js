// Save validation and migration can read this metadata without loading level
// builders (which themselves import the save). Valid ids include planned content;
// the registry still exposes only the five currently shipped levels.
export const LEVEL_IDS = ['1', '2', '3', '4', '5', '6', 'ride', 'cave'];

// Stable ids in existing authoring order. Append future dogs; never reorder or
// rename released ids, since v2 saves can only remember each level's best count.
export const LEVEL_DOGS = {
  1: { 'shiba-a': 'Start', 'pug-a': 'Treat Ledge', 'dalmatian-a': 'Bone Switch', 'shiba-b': 'Belly-flop Pocket', 'corgi-a': 'Last Gap' },
  2: { 'corgi-a': 'First Gap', 'pug-a': 'Blue Path', 'shiba-a': 'Mushroom Landing' },
  3: { 'pug-a': 'Crusher Alley', 'dalmatian-a': 'Rug Puzzle', 'corgi-a': 'Fan Catwalk', 'shiba-a': 'Vacuum Hall', 'dalmatian-b': 'Final Stretch' },
  ride: { 'shiba-a': 'Hallway', 'corgi-a': 'Toy Piles' },
  cave: { 'pug-a': 'First Pit', 'shiba-a': 'Red Bone' },
};
