// All story text: cutscenes, boss smack talk, mask tips, tutorial pop-ups, death captions.
// Nobu never speaks. Everyone else does.

export const SPEAKERS = {
  mask: { name: 'SPROTO MASK', portrait: 'sproto_mask', blip: 'blip' },
  titan: { name: 'ROOMBA TITAN', portrait: 'portrait_titan', blip: 'blipLow' },
  bird: { name: 'MECHA BIRD', portrait: 'portrait_bird', blip: 'blip' },
  cat: { name: 'THE BIG CAT', portrait: 'portrait_cat', blip: 'blipLow' },
  cone: { name: 'THE EVIL CONE', portrait: 'portrait_cone', blip: 'blipLow' },
  narrator: { name: '', portrait: null, blip: 'blip' },
};

export const INTRO = [
  { img: 'story_intro_1', speaker: 'THE EVIL CONE', text: 'At last! My Cone of Shame Network is complete. Every dog on this island... in a CONE. Forever. MWAHAHA!' },
  { img: 'story_intro_2', speaker: '', text: 'His Broccoli Head army and the Mecha Bird swept the island. Corgis, pugs, dalmatians... one by one, coned. Zero tail wags detected.' },
  { img: 'story_intro_3', speaker: '', text: 'But in a cage at the Cone Factory, one Akita chewed through the bars. His cone? Shattered. His vibe? Immaculate.' },
  { img: 'story_intro_4', speaker: '', text: 'Nobu. The one dog who got away. The island needs a saviour dog... and he is NOT sitting this one out.' },
  { img: 'story_intro_4', speaker: 'SPROTO MASK', text: 'Yo Nobu! The name\'s Sproto. Smash blue spheres and I\'ll have your back. Let\'s go un-cone some doggos. WAGMI!' },
];

export const RESCUE = {
4: [
  { img: 'story_rescue_1', speaker: '', text: 'The Roomba Titan sputters, beeps sadly and spits out a mountain of cones. And one soggy map.' },
  { img: 'story_rescue_1', speaker: 'SPROTO MASK', text: 'The map shows a river of smog running from the House to some kind of... Pipeline. First stop: the rapids.' },
],
  1: [
    { img: 'story_rescue_1', speaker: '', text: 'The Mecha Bird is scrap! Its cargo cage bursts open and the cones go flying.' },
    { img: 'story_rescue_1', speaker: 'SPROTO MASK', text: 'Look at \'em go! Free tails, free zoomies. Next stop: Scratchpost Canyon.' },
  ],
  2: [
    { img: 'story_rescue_2', speaker: '', text: 'The Big Cat is down for the count. Dizzy. Humbled. Coughing up one last hairball.' },
    { img: 'story_rescue_2', speaker: 'SPROTO MASK', text: 'That\'s a W! Only the Cone Factory left. The big guy himself is waiting.' },
  ],
  3: [
    { img: 'story_rescue_3', speaker: 'THE EVIL CONE', text: 'No... NO! My beautiful plastic... I was supposed to be... a lampshade of POWER...' },
    { img: 'story_rescue_3', speaker: '', text: 'With the Evil Cone shattered, every cone on the island pops off at once. POP. POP. POP POP POP.' },
  ],
};

export const ENDING = [
  { img: 'story_ending', speaker: '', text: 'Every dog on the island is free. The zoomies can be heard from space.' },
  { img: 'story_ending', speaker: 'SPROTO MASK', text: 'Nobu, you absolute legend. Speech! Say something!' },
  { img: 'story_ending', speaker: '', text: 'Nobu says nothing. Nobu does a goofy little dance instead.' },
  { img: 'story_ending', speaker: 'SPROTO MASK', text: '...honestly? Iconic. THE END. (Golden Bones still waiting, if you\'re a completionist.)' },
];

export const BOSS_TALK = {
titan: {
  intro: [
    ['titan', 'BEEP. FOREIGN OBJECT DETECTED. CLASSIFICATION: DOG. CLASSIFICATION: DIRT.'],
    ['titan', 'The Pump Queen has scheduled a DEEP CLEAN. All collars will be... collected.'],
    ['mask', 'It\'s too tough to bite! Make it CRASH into a wall, then BELLY FLOP the red button!'],
  ],
  phase2: [['titan', 'SUCTION MODE ENGAGED. Resistance is... absorbed.'], ['mask', 'Mega BARK at it while it sucks! It hates that.']],
  phase3: [['titan', 'WARNING. WARNING. OVERHEAT PROTOCOL. LIGHTS: OFF.'], ['mask', 'It bounces off the walls now! Get it to ram a CAT. Or a fallen table leg!']],
  death: [['titan', 'Low... battery... please return me to my... dock...']],
},
  bird: {
    intro: [
      ['bird', 'SQUAWK! A loose Akita? I\'ve got a cone in my cargo bay with your name on it!'],
      ['bird', 'Hold still, mutt. Delivery guaranteed in 30 seconds or your cone is free!'],
      ['mask', 'Wait for it to crash into the ground, then BITE or JUMP on it!'],
    ],
    phase2: [['bird', 'Lucky dodge! Try my FEATHER MISSILES. Premium shipping!'], ['mask', 'It drops the CAGE where your shadow is. Keep moving! Stuck? Mash BITE!']],
    phase3: [['bird', 'ENOUGH! Plan C: cones from ABOVE. Look up, doggo!'], ['mask', 'Those drones fly low. Bite one for a Blue Sphere!']],
  },
  cat: {
    intro: [
      ['cat', 'Ohhh, look who ran all this way. You\'re cornered, little puppy.'],
      ['cat', 'The Evil Cone pays me in tuna to put that Akita in a cone. Easiest job ever.'],
      ['mask', 'When it counts 3-2-1, MOVE! If it misses the pounce, jump on its HEAD or bite it!'],
      ['mask', 'See that red dot? It CANNOT resist it. Lead it into a wall!'],
    ],
    phase2: [['cat', 'Hsssss! Lucky. Now I pounce TWICE. Cats always land on their feet.'], ['cat', 'Oops. Did I knock that off the shelf? I meant to.']],
    phase3: [['cat', 'MROWR! No more playing. Nine lives, puppy. How many do YOU have?'], ['mask', 'Catnip! Bite it and the cat goes wild: faster, but dizzier!']],
  },
  cone: {
    intro: [
      ['cone', 'So. The Akita who escaped. Do you know what you\'ve cost me? THREE henchmen. And a bird.'],
      ['cone', 'I am the Cone of Shame! I am inevitable! Every dog wears me eventually.'],
      ['cone', 'Now hold still while I put you in a cone. Forever.'],
      ['mask', 'He only opens up for a second after his combos. Be ready, Nobu!'],
      ['mask', 'And watch those pump.fun pills. They pump with every hop, then they DUMP. Pop them early!'],
      ['mask', 'If he cones you, you can\'t bite! BELLY FLOP or double jump to shake it off.'],
    ],
    phase2: [['cone', 'Impossible! Fine. FASTER, then. Fresh launches! Pump it, my pills! Seize the Akita!'], ['cone', 'Let\'s see how you like a RUG PULL. Mind the floor, mutt.']],
    phase3: [['cone', 'ENOUGH!!! Every pill to the moon! I will cone you, then the mask, then the MOON!'], ['mask', 'Smog! Get up on the pedestals, and keep hopping!']],
    death: [['cone', 'Wait wait wait... maybe we can just... share the cone?']],
  },
};

// Mask chatter before each level (tips, jokes, story updates).
export const LEVEL_INTRO = {
4: [
  ['mask', 'Laundry Day! Everything in here is HUGE. Or we\'re tiny. Let\'s not think about it.'],
  ['mask', 'Break stuff back to back for a CHOMP CHAIN. Keep it going and I\'ll pop out to help.'],
  ['mask', 'Clotheslines: BITE to grab on, JUMP to let go. Wheee.'],
],
  1: [
    ['mask', 'Welcome to Bark Jungle! The Broccoli Heads have coned this whole park.'],
    ['mask', 'Bite with J or SHIFT. Jump with SPACE, then jump again in the air for a double jump.'],
  ],
  2: [
    ['mask', 'Scratchpost Canyon... I hear purring. Big purring. Uh oh.'],
    ['mask', 'If that giant cat shows up: RUN toward the camera. Hold DOWN. Don\'t look back. Okay, look back a LITTLE.'],
  ],
  3: [
    ['mask', 'The Cone Factory. This is where it all started, Nobu. Where YOU started.'],
    ['mask', 'Crushers, conveyors, every trick he\'s got. Breathe. Bite. Believe.'],
  ],
  ride: [
    ['mask', 'The Owner\'s House! The Vacuum Bot\'s big brother went haywire and it\'s heading for the door.'],
    ['mask', 'Hop on and ride it out! It drives itself. Steer with LEFT / RIGHT, hop cables and gaps with SPACE.'],
    ['mask', 'Ram backpacks and mice. NOT toy piles, table legs, cats or rugs.'],
  ],
  cave: [
    ['mask', 'Glowworm Grotto. Can\'t see a thing... oh hey, a glowworm! Her name\'s Lumi.'],
    ['mask', 'Lumi\'s glow fades over time. Pass a glowing mushroom nest to top her up.'],
    ['mask', 'If she runs out she\'ll wait at the next nest. Follow the little light!'],
  ],
};

// Mask chatter after finishing a level (between levels).
export const BETWEEN = {
4: [
  ['mask', 'NEW MOVE: DUST DASH! SLIDE, then BITE mid-slide to burst forward.'],
  ['mask', 'Grey fuzzy walls? Dash right through them. There were a few of those back in the old levels...'],
],
  1: [
    ['mask', 'You took that bird\'s rotor trick! NEW MOVE: TAIL GLIDE. Out of jumps? Press SPACE again and HOLD it to helicopter down.'],
    ['mask', 'Pro tip: hold SPACE to jump farther. A SLIDE + JUMP gives a small burst of speed. Ctrl or K, then SPACE.'],
    ['mask', 'Also: break every backpack and free every dog in a level to earn a Golden Bone. Shiny. Very shiny.'],
  ],
  2: [
    ['mask', 'You outran a cat the size of a house. Your cardio is unmatched.'],
    ['mask', 'NEW MOVE: ZOOMIES! Slide, and KEEP HOLDING Ctrl or K to stay at sprint speed.'],
    ['mask', 'Belly flop tip: jump, then press Ctrl or K. Smashes everything around you. Spiky stuff too.'],
    ['mask', 'Rumor says the Evil Cone gets dizzy after his combos. Hit him then, not before!'],
  ],
  3: [
    ['mask', 'It\'s over. Every cone is popped. Every dog is free. I\'m not crying, YOU\'RE crying.'],
    ['mask', 'Oh, and you earned the MEGA BARK. Press L or E. Those cracked rocks back in the old levels? Something\'s inside...'],
  ],
};

export const TUTORIALS = {
  dustDash: { img: 'nobu_head', title: 'NEW MOVE: DUST DASH!', text: 'While sliding, press BITE to burst forward. Smash those Dust Walls!' },

  crystals: { img: 'nobu_head', title: 'CRYSTAL ECHO', text: 'Bite crystals to light the path. The platforms stay solid when their light fades.' },
  chase: { img: 'nobu_head', title: 'RUN!', text: 'The camera turns around. Hold DOWN.' },
  dustbunny: { img: 'mouse', title: 'DUST BUNNY', text: 'Bite it and it splits in two! Stomp or belly flop it to get rid of it for good.' },
  iron: { img: 'nobu_head', title: 'HOT IRON', text: 'It sweeps the whole board. Ride the steam vents up and let it pass underneath.' },
  stampede: { img: 'vacuum', title: 'STAMPEDE!', text: 'RUN toward the camera! Hold <span class="key">↓</span> / <span class="key">S</span> and jump the cables!' },
  boiler: { img: 'nobu_head', title: 'BOILER FLOOD', text: 'Hot water is rising! Keep climbing. Don\'t stop!' },
  spindrum: { img: 'nobu_head', title: 'SPIN CYCLE', text: 'Ride the platforms around the drum. Hop off when you reach the top!' },
  zipline: { img: 'nobu_head', title: 'CLOTHESLINE', text: '<span class="key">J</span> BITE near a line to grab it. <span class="key">SPACE</span> to let go. Wheee!' },
  toaster: { img: 'nobu_head', title: 'TOASTER', text: 'Stand on the toast. When it glows... POP! Hold <span class="key">SPACE</span> for extra height.' },
  market: { img: 'pill_bot', title: 'MARKET PLATFORMS', text: 'GREEN edge = going UP next beat. RED = going DOWN. Watch the arrows, then jump.' },
  rugpull: { img: 'rug', title: 'RUG PULL', text: 'The floor is leaving. Step on it and RUN. Do NOT stop.' },
  dustwall: { img: 'nobu_head', title: 'DUST WALL', text: 'Come back with a faster move.' },
  dustwallUnlocked: { img: 'nobu_head', title: 'DUST DASH', text: 'Dust Dash breaks this wall.' },
  smogvent: { img: 'nobu_head', title: 'SMOG VENT', text: 'Mega Bark clears the smog.' },
  smogventLocked: { img: 'nobu_head', title: 'SMOG VENT', text: 'A stronger bark could clear this smog.' },
  zoomiegate: { img: 'nobu_head', title: 'ZOOMIE GATE', text: 'This shutter needs a faster sprint.' },
  blinkbox: { img: 'backpack', title: 'BLINK BOX', text: "Blue boxes blink on a beat. Listen for the tick, then jump. Don't stand there when it ticks twice!" },
  fallbox: { img: 'backpack', title: 'FALL BOX', text: 'Cracked boxes drop the moment you land. Keep those paws moving.' },
  slidebox: { img: 'backpack', title: 'MOVING BOX', text: 'Moving boxes give you a ride. Jump when the gap is short.' },
  bouncechain: { img: 'backpack', title: 'BOUNCE CHAIN', text: 'Bounce, bounce, bounce! Hold jump to go long.' },
  bite: { img: 'nobu_head', title: 'BITE!', text: 'Press <span class="key">J</span> or <span class="key">SHIFT</span> to bite. Chomp backpacks for Golden Tickets!' },
  jump: { img: 'nobu_title', title: 'JUMP!', text: '<span class="key">SPACE</span> to jump, again in mid-air to double jump. Hold for higher.' },
  dog: { img: 'dog_shiba_coned', title: 'TRAPPED DOG', text: 'Bite or jump near a coned dog to pop the cone off. Free them all!' },
  broccoli: { img: 'broccoli', title: 'BROCCOLI HEAD', text: 'Bite it or jump on it. Easy greens.' },
  spiky: { img: 'broccoli_spiky', title: 'SPIKY BROCCOLI', text: 'DON\'T bite this one! Jump on its head instead (or belly flop it).' },
  cone: { img: 'broccoli_cone', title: 'CONE TROOPER', text: 'Raises its cone before slamming. Bite it while it winds up!' },
  sphere: { img: 'blue_sphere', title: 'BLUE SPHERE', text: 'Break it to summon a Sproto Mask. 1 mask = 1 free hit. 3 masks = invincible!' },
  doubleJump: { img: 'nobu_title', title: 'DOUBLE JUMP', text: 'Big gap! Jump, then press <span class="key">SPACE</span> again in the air.' },
  cat: { img: 'small_cat', title: 'CAT!', text: 'Touch it and it hisses 3...2...1 then POUNCES on everything nearby. Bite it and it pounces NOW.' },
  trampoline: { img: 'trampoline', title: 'TRAMPOLINE', text: 'Bounce for big height and free tickets. Something shiny is up there...' },
  rug: { img: 'rug', title: 'RUG', text: 'See it twitching? Touching it = RUG PULL. Instant rekt. Go around!' },
  snacks: { img: 'snacks', title: 'SNACKS = CHECKPOINT', text: 'Break a snack bag to save your progress.' },
  slide: { img: 'nobu_head', title: 'SLIDE', text: 'Running? Press <span class="key">K</span> or <span class="key">CTRL</span> to slide. Slide + jump = long jump!' },
  flop: { img: 'nobu_head', title: 'BELLY FLOP', text: 'In the air, press <span class="key">K</span> or <span class="key">CTRL</span> to slam down and smash everything around you.' },
  drone: { img: 'cone_drone', title: 'CONE DRONE', text: 'Flies low over the path. Jump and bite, or jump on it.' },
  squirrel: { img: 'squirrel', title: 'NUTJOB SQUIRREL', text: 'Hops like crazy. Time your bite between hops.' },
  lint: { img: 'icon_lint', title: 'LINT ROLLER', text: 'Hit this green box to roll up EVERY rug in the level. They count as broken!' },
  vacuum: { img: 'vacuum', title: 'VACUUM BOT', text: 'Fast patroller. Every dog\'s nemesis. Bite it or bounce on it.' },
  mouse: { img: 'mouse', title: 'BANDIT MOUSE', text: 'Scurries across the path. Don\'t let it trip you up!' },
  yarn: { img: 'small_cat', title: 'YARN BALL', text: 'Rolling yarn! Jump over it or bounce off the top.' },
  pill: { img: 'pill_bot', title: 'PILL BOT', text: 'Wobbles, then TUMBLES at you! Dodge the roll, then bite it in half.' },
  conveyor: { img: 'nobu_head', title: 'CONVEYOR', text: 'Belts push you around. Fight the current!' },
  crusher: { img: 'nobu_head', title: 'CONE STAMPER', text: 'Watch the shadow. Go when it lifts!' },
  lunchbox: { img: 'icon_lunchbox', title: 'STEEL LUNCHBOX', text: 'Unbreakable! Bites just clang off. Use it as a step.' },
  arrowbox: { img: 'icon_arrowbox', title: 'ARROW LUNCHBOX', text: 'Land on the arrow to get launched sky high. Hold <span class="key">SPACE</span> for extra height.' },
  zipped: { img: 'icon_zipped', title: 'ZIPPED BACKPACK', text: 'Three bites or bounces to unzip, a ticket each time. A slide or belly flop rips it open at once.' },
  vacswitch: { img: 'icon_vacswitch', title: 'VACUUM DOCK', text: 'Hit it and a robot vacuum pops EVERY rug in the level. They count as broken!' },
  knight: { img: 'icon_knight', title: 'LID KNIGHT', text: 'Bites and bounces clang off the pot lid and colander. SLIDE into it or BELLY FLOP it!' },
  shellback: { img: 'icon_shellback', title: 'SHELLBACK', text: 'Jump on it to flip it over, THEN bite it. Flipped, it\'s a handy springboard.' },
  ride: { img: 'icon_ride', title: 'VACUUM RIDE', text: '<span class="key">◀</span> <span class="key">▶</span> steer, <span class="key">SPACE</span> hops. Ram backpacks, dodge toys, legs, cats and rugs!' },
  glide: { img: 'nobu_head', title: 'TAIL GLIDE', text: 'Out of jumps? Press <span class="key">SPACE</span> again in the air and HOLD it to helicopter down slowly.' },
  zoom: { img: 'nobu_head', title: 'ZOOMIES', text: 'Slide, then KEEP HOLDING <span class="key">K</span> / <span class="key">CTRL</span> to keep sprinting.' },
  bark: { img: 'nobu_head', title: 'MEGA BARK', text: 'Press <span class="key">L</span> or <span class="key">E</span>: a blast of sound that knocks enemies flat and breaks backpacks in front of you.' },
  boneswitch: { img: 'icon_boneswitch', title: 'BONE SWITCH', text: 'Touch it, bite it or jump on it and the see-through outline nearby turns into a real bridge!' },
  treat: { img: 'snacks', title: 'TREAT TRAY', text: 'Hop in for a BONUS ROUND up in the sky. Fall off and you lose the haul, but not a life. Reach the green tray to keep it!' },
  barkrock: { img: 'nobu_head', title: 'CRACKED ROCK', text: 'Something shiny is inside. Bites won\'t crack it... maybe a really loud BARK would?' },
  glowworm: { img: 'icon_glowworm', title: 'LUMI THE GLOWWORM', text: 'Her light fades. Glowing mushroom nests refill it. If she runs out, find her at the next nest.' },
};

export const DEATH_CAPTIONS = {
  angel: ['PAPER PAWS!', 'NGMI... jk, try again', 'Nobu went to the big dog park in the sky', 'Bonk. Back to the checkpoint.'],
  fall: ['Gravity: still undefeated', 'Should\'ve double jumped, ser', 'Down bad. Literally.'],
  flat: ['FLATTENED', 'Nobu is now a doormat', 'Pancake Akita, extra syrup'],
  cone: ['CONED!', 'The cone of shame claims another', 'Nobu has been put in a cone. Tragic.'],
  rug: ['RUG PULLED!', 'Rugged. Should\'ve DYOR on that carpet.', 'Liquidity removed. So was the floor.'],
  puff: ['POOF!', 'Spiky broccoli: do not bite', 'That was NOT on the diet'],
};

export const DEATH_ART = { angel: 'death_angel', fall: 'death_angel', puff: 'death_angel', flat: 'death_flat', cone: 'death_cone', rug: 'death_rug' };
export const REWARD_TEXT = {
  chainSphere: ['CHOMP CHAIN x8!', 'Sproto Mask!'], chainBest: 'NEW BEST CHAIN',
  backpacks: 'BACKPACKS', dogs: 'DOGS FREED', tickets: 'TICKETS', bestChain: 'BEST CHAIN',
  continue: 'Press any key', complete: (n) => `LEVEL ${n} COMPLETE!`, bonusComplete: 'BONUS STAGE CLEAR!',
  hintGolden: ({ dogs, packs, section }) => `Golden Bone: ${[dogs ? `${dogs} ${dogs === 1 ? 'dog' : 'dogs'}` : '', packs ? `${packs} ${packs === 1 ? 'backpack' : 'backpacks'}` : ''].filter(Boolean).join(' and ')} missed${section ? ` near ${section}` : ''}.`,
  hintGoodBoy: (n) => `Good Boy Bone: ${n} deaths, need 3 or fewer.`,
  hintGoodBoyGod: 'Good Boy Bone: finish a run without God Mode and with 3 deaths or fewer.',
  hintGoodBoyGoal: 'Good Boy Bone: finish with 3 deaths or fewer.',
  hintSnackGoal: (target) => `Snack Bones: collect ${target}% of Tickets for ${target === 80 ? 'gold' : target === 60 ? 'silver' : 'bronze'}.`,
  hintSnack: (pct, target) => `Snack Bones: ${pct}% of Tickets, ${target}% for ${target === 80 ? 'gold' : target === 60 ? 'silver' : 'bronze'}.`,
  hintHidden: (section) => `Hidden Bone: somewhere near ${section}.`,
  hintNewMove: "Hidden Bone: you'll need a new move to reach it.",
  hintGoldenGoal: 'Golden Bone: break every backpack and free every dog.',
  hintGoldenMany: (n) => `Golden Bone: ${n} backpacks to go. Try the side paths.`,
  hintCompleteTrial: 'Board complete! Try the time trial for a Platinum Tag.', hintComplete: 'Board complete! Good boy.',
};
// Shared copy for the expansion's authored gameplay props.
export const PROP_TEXT = { rugPull: 'RUG PULL!', arrows: ['▼', '■', '▲'] };


export const MYSTERY_SURPRISE = { title: 'SURPRISE!', sub: 'RUN!' };
export const TRIAL_TEXT = { classicBest: 'Classic best', classicWorld: 'Classic WR', platinumTag: 'PLATINUM TAG!' };
export const ENVIRONMENT_TEXT = { rising: "IT'S RISING!" };
export const BONE_TEXT = {
  golden: 'GOLDEN BONE', goodBoy: 'GOOD BOY BONE', hidden: 'HIDDEN BONE',
  snack: ['SNACK BONE I', 'SNACK BONE II', 'SNACK BONE III'],
  hiddenTitle: 'HIDDEN BONE!', hiddenSub: "Shhh... it's a secret",
  goodBoyPercent: (n) => `GOOD BOY ${n}%`, board: 'BONE BOARD',
  liveStats: (s, p) => `Breakables ${s.broken}/${s.breakables} · Dogs ${s.dogs}/${s.dogsTotal} · Snacks ${p}%`,
  deaths: (n) => `${n}/3 deaths`, kennel: (id) => `KENNEL: ${id.toUpperCase()} UNLOCKED!`,
};
export const BOSS_MEDAL_TEXT = { noHit: 'NO-HIT!', speed: 'SPEED MEDAL' };
export const SECTION_TEXT = {
  start: 'Start', highRoad: 'High Road', clearing: 'Backpack Clearing', treatLedge: 'Treat Ledge',
  lilyPond: 'Lily Pond', canopy: 'Canopy Walk', boneSwitch: 'Bone Switch', planks: 'Plank Bridge',
  belly: 'Belly-flop Pocket', lastGap: 'Last Gap', fork: 'The Fork', firstGap: 'First Gap',
  bluePath: 'Blue Path', crumble: 'Crumbling Bridge', mushroom: 'Mushroom Landing', dock: 'Vacuum Dock',
  intake: 'Intake Hall', crushers: 'Crusher Alley', rugs: 'Rug Puzzle', hammers: 'Hammer Hall',
  fan: 'Fan Catwalk', vacuum: 'Vacuum Hall', vat: 'Vat Pit', final: 'Final Stretch',
  living: 'Living Room', hallway: 'Hallway', toys: 'Toy Piles', firstPit: 'First Pit',
  coconutRun: 'Coconut Run', sunkenTemple: 'Sunken Temple', burrow: 'The Burrow', waterfallHollow: 'Waterfall Hollow', gateApproach: 'Gate Approach',
  rafts: 'Underground Rafts', redBone: 'Red Bone', steps: 'Lunchbox Steps', exit: 'Exit', path: 'the path',
};
export const BIRD_STAGE_POWERS = { 2: 'Feather volleys · laser eye · cage drop · wind lanes', 3: 'Homing missiles · egg bombs · drone escort · laser combos' };

export const KENNEL_TEXT = {
  title: 'THE KENNEL', mapDescription: 'Your rescued pack is waiting in the yard.', mapControls: 'SPACE / ENTER enter · ESC title', names: { jukebox: 'JUKEBOX', buddy: 'BUDDY', fur: 'FUR', gallery: 'GALLERY', sniffer: 'SNIFFER', golden: 'GOLDEN KENNEL' },
  count: (freed, total) => `${freed}/${total} dogs rescued`, needed: (n) => `${n} dogs to go:`, more: (n) => `+${n} more dogs`,
  badges: 'CHOMP CHAIN BADGES', goldenTitle: 'GOLDEN KENNEL', goldenSpeaker: 'SPROTO MASK',
  golden: 'Every. Single. Dog. Nobu, the island owes you a lifetime supply of belly rubs.',
  continue: 'SPACE / ENTER: continue', play: 'SPACE: play · ESC: stop', choose: 'SPACE / ENTER: choose',
  controls: '◀ ▶ choose · SPACE / ENTER select · L / E bark for Sniffer · ESC back',
  allFound: 'Every secret in the open levels has been found. Good boy!',
  labels: { none: 'NONE', cream: 'CREAM', shadow: 'SHADOW', ginger: 'GINGER', chompGold: 'CHOMP GOLD', shiba: 'SHIBA', corgi: 'CORGI', pug: 'PUG', dalmatian: 'DALMATIAN' },
  secretLine: (level) => [level.hidden && `Hidden Bone near ${level.hidden.section}${level.hidden.move ? ` (needs ${{ dust: 'DUST DASH', moon: 'MOON JUMP', glide: 'TAIL GLIDE', zoom: 'ZOOMIES', bark: 'MEGA BARK' }[level.hidden.move] || level.hidden.move})` : ''}`,
    ...Object.entries(level.dogs.reduce((sections, dog) => ({ ...sections, [dog.section]: (sections[dog.section] || 0) + 1 }), {})).map(([section, n]) => `${n} ${n === 1 ? 'dog' : 'dogs'} near ${section}`)].filter(Boolean).join(' · '),
};
export const CONE_STAGE_POWERS = { 2: 'Floor sweeps · twin lasers · grab · vortex · RUG PULL', 3: 'Shadow clones · SMOG TIDE · combos of three · fastest' };
export const CAT_STAGE_POWERS = { 2: 'Double pounce · claw scratches · tail-whip · knocks things off the table', 3: 'Triple pounce · zoomies · ghost lives · the edge crumbles' };

export const MASTERY_TEXT = {
  perfect: 'PERFECT RUN!', perfectSub: 'Every backpack, every dog, no deaths',
  perfectRain: '...and not a single death! PERFECT RUN', noHit: 'No-Hit', speed: 'Speed',
  eligibleBest: (time) => `Eligible best ${time}`,
  bossNames: { bird: 'MECHA BIRD', cat: 'BIG CAT', cone: 'EVIL CONE', titan: 'ROOMBA TITAN', queen: 'PUMP QUEEN' },
};

export const TITAN_STAGE_POWERS = { 2: 'Suction · Mini-Roombas · rotating rug', 3: 'Reflected charges · falling legs · Lights Out' };
export const TITAN_FLOP_HINT = 'BELLY FLOP the button!';
export const BONUS_EXTENSION_TEXT = {
  ride: { split: 'Living Room Split', ramps: 'Toy Box Ramps', tile: 'Kitchen Tile Slide', door: 'Dog-Door Leap', sofa: 'Sofa Summit' },
  cave: { river: 'Underground River', mushrooms: 'Mushroom Bounce Cavern', crystals: 'Crystal Echo', hollow: "Lumi's Nest Hollow" },
};
export const L4_TEXT = {
  name: 'Laundry Day', gate: 'ROOMBA TITAN', cerealExitSign: ['DOUBLE', 'JUMP!'],
  sections: { hallway: 'Hallway', laundry: 'Laundry Room', ironing: 'Ironing Board', kitchen: 'Kitchen Counter', stampede: 'Roomba Stampede', basement: 'Basement Stairs', boiler: 'Boiler Room', topShelf: 'Top Shelf', pantry: 'The Pantry' },
  chainSign: ['CHOMP', 'CHAIN!'], biteSign: ['BITE', 'FAST'],
};

export const CHAPTER2 = [
  { img: 'story_ch2_1', speaker: '', text: 'Every dog is free. The island naps in the sun. Then one morning, the sky goes... grey again.' },
  { img: 'story_ch2_1', speaker: 'SPROTO MASK', text: 'Smog?! We popped the Evil Cone! Unless... somebody was PUMPING him the whole time.' },
  { img: 'story_ch2_2', speaker: '', text: 'Down the hill, the Owner\'s House hums. Something enormous is vacuuming up every popped cone on the island.' },
  { img: 'story_ch2_2', speaker: 'SPROTO MASK', text: 'Chapter 2, Nobu: The Smog Returns. Stretch those legs. We\'re going to the House.' },
];

export const MAIN_UNLOCK_TEXT = {
  4: ['CHAPTER 2', 'LAUNDRY DAY IS OPEN'],
  6: ['NEW STAGE', 'SMOG RAPIDS'],
  5: ['NEW STAGE', 'PUMP & DUMP PIPELINE'],
};
