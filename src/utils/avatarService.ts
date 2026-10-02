// Serviço centralizado de gerenciamento e catálogo de avatares

export type AvatarCategory = {
  id: string;
  name: string;
  style: string;
  seeds: string[];
};

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'avataaars',
    name: 'Pessoas',
    style: 'avataaars',
    seeds: [
      'Felix', 'Aneka', 'Milo', 'Zoe', 'Leo', 'Maya', 'Nico', 'Sara', 'Sam', 'Lola',
      'Jack', 'Mia', 'Lucas', 'Oliver', 'Emma', 'Liam', 'Sophia', 'Noah', 'Ava', 'Ethan',
      'Isabella', 'Mason', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn', 'Elijah', 'Abigail', 'Logan',
      'Emily', 'Alexander', 'Elizabeth', 'William', 'Mila', 'Henry', 'Ella', 'Sebastian', 'Avery', 'Jackson',
      'Sofia', 'Mateo', 'Camila', 'David', 'Aria', 'Carter', 'Scarlett', 'Wyatt', 'Victoria', 'Jayden'
    ],
  },
  {
    id: 'adventurer',
    name: 'Aventureiros',
    style: 'adventurer',
    seeds: [
      'Aiden', 'Luna', 'Orion', 'Willow', 'Jasper', 'Freya', 'Kael', 'Lyra', 'Rowan', 'Nova',
      'Finn', 'Ember', 'Thorin', 'Aragorn', 'Legolas', 'Gimli', 'Gandalf', 'Frodo', 'Galadriel', 'Elrond',
      'Arthur', 'Merlin', 'Lancelot', 'Galahad', 'Gawain', 'Robin', 'Sherwood', 'Marian', 'Valeria', 'Conan',
      'Redsonja', 'Xena', 'Hercules', 'Achilles', 'Perseus', 'Atalanta', 'Cassandra', 'Theseus', 'Bellerophon', 'Jason',
      'Medea', 'Roland', 'Charlemagne', 'Beowulf', 'Grendel', 'Sigurd', 'Brynhild', 'Ragnar', 'Lagertha', 'Bjorn'
    ],
  },
  {
    id: 'bottts',
    name: 'Robôs',
    style: 'bottts',
    seeds: [
      'Gizmo', 'Sparky', 'Pixel', 'Bolt', 'Byte', 'Glitch', 'Cosmo', 'Radar', 'Echo', 'Nano',
      'Chip', 'Rusty', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Zeta', 'Titan', 'Atlas',
      'Vortex', 'Pulse', 'Cyber', 'Circuit', 'Matrix', 'Nexus', 'Quantum', 'Vector', 'Silicon', 'Micro',
      'Laser', 'Turbo', 'Rocket', 'Astro', 'Sonic', 'Mech', 'Gundam', 'Optimus', 'Bumblebee', 'Megatron',
      'Iron', 'Steel', 'Gear', 'Cog', 'Widget', 'Sprocket', 'Dynamo', 'Static', 'Neon', 'Flux'
    ],
  },
  {
    id: 'fun-emoji',
    name: 'Expressões',
    style: 'fun-emoji',
    seeds: [
      'Happy', 'Cool', 'Crazy', 'Surprise', 'Wink', 'Cheeky', 'Joy', 'Clever', 'Wild', 'Chill',
      'Star', 'Vibe', 'Laugh', 'Grin', 'Smile', 'Silly', 'Dizzy', 'Wonder', 'Party', 'Fiesta',
      'Love', 'Blush', 'Angel', 'Devil', 'Rock', 'Music', 'Magic', 'Spark', 'Fire', 'Sun',
      'Moon', 'Rainbow', 'Boom', 'Zap', 'Sweet', 'Dream', 'Giggle', 'Chuckle', 'Blink', 'Pop',
      'Zen', 'Brave', 'Hero', 'Ace', 'Champ', 'Lucky', 'Winner', 'Bright', 'Glow', 'Shine'
    ],
  },
  {
    id: 'personas',
    name: 'Estilosos',
    style: 'personas',
    seeds: [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Harper', 'Skyler',
      'Charlie', 'Dakota', 'Reese', 'Rowan', 'Finley', 'Hayden', 'Emerson', 'Kendall', 'Peyton', 'Sawyer',
      'Eden', 'Elliot', 'Amari', 'Kai', 'River', 'Sage', 'Phoenix', 'Shiloh', 'Remy', 'Milan',
      'Tatum', 'Dallas', 'Ellis', 'Rory', 'Lennon', 'Oakley', 'Sloan', 'Harley', 'Marley', 'Jesse',
      'Drew', 'Sidney', 'Jamie', 'Angel', 'Cameron', 'Corey', 'Frankie', 'Alexis', 'Adrian', 'Paris'
    ],
  },
  {
    id: 'pixel-art',
    name: 'Pixel Art',
    style: 'pixel-art',
    seeds: [
      'Mario', 'Luigi', 'Peach', 'Bowser', 'Yoshi', 'Link', 'Zelda', 'Ganon', 'Samus', 'Kirby',
      'Fox', 'Falcon', 'Donkey', 'Diddy', 'Sonic', 'Tails', 'Knuckles', 'Shadow', 'Mega', 'Zero',
      'Proto', 'Pacman', 'Ghost', 'Ryu', 'Ken', 'Chunli', 'Guile', 'Blanka', 'Zangief', 'Dhalsim',
      'Cloud', 'Sephiroth', 'Tifa', 'Aerith', 'Squall', 'Zidane', 'Tidus', 'Cronos', 'Ness', 'Lucas'
    ],
  },
  {
    id: 'lorelei',
    name: 'Ilustrados',
    style: 'lorelei',
    seeds: [
      'Aria', 'Seraphina', 'Celeste', 'Aurelia', 'Evangeline', 'Genevieve', 'Ophelia', 'Cordelia', 'Isolde', 'Gwendolyn',
      'Penelope', 'Beatrix', 'Calliope', 'Daphne', 'Elysia', 'Flora', 'Iris', 'Juno', 'Kallisto', 'Leona',
      'Minerva', 'Naiad', 'Olympia', 'Pandora', 'Rhea', 'Selene', 'Thalia', 'Urania', 'Vespera', 'Zephyr',
      'Althea', 'Blythe', 'Cressida', 'Delphine', 'Elspeth', 'Fiona', 'Gemma', 'Halia', 'Ianthe', 'Jessamine'
    ],
  },
  {
    id: 'big-smile',
    name: 'Sorrisos',
    style: 'big-smile',
    seeds: [
      'Sunny', 'Breeze', 'Pip', 'Bubbles', 'Cookie', 'Peanut', 'Muffin', 'Cupcake', 'Jelly', 'Donut',
      'Boba', 'Pancake', 'Waffle', 'Honey', 'Sugar', 'Butter', 'Candy', 'Marshmallow', 'Caramel', 'Berry',
      'Peach', 'Mango', 'Kiwi', 'Cherry', 'Lemon', 'Lime', 'Apple', 'Banana', 'Plum', 'Grape',
      'Sparkle', 'Twinkle', 'Shimmer', 'Glint', 'Beam', 'Flash', 'Radiance', 'Cheer', 'Bliss', 'Delight'
    ],
  },
];

export function parseAvatar(avatarString: string): { style: string; seed: string } {
  if (!avatarString) {
    return { style: 'avataaars', seed: 'default' };
  }
  if (avatarString.includes(':')) {
    const [style, ...rest] = avatarString.split(':');
    return { style: style || 'avataaars', seed: rest.join(':') || 'default' };
  }
  return { style: 'avataaars', seed: avatarString };
}

export function getAvatarUrl(avatarOrName: string, customAvatar?: string): string {
  const target = customAvatar || avatarOrName || 'player';
  const { style, seed } = parseAvatar(target);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export function getRandomAvatar(): string {
  const cat = AVATAR_CATEGORIES[Math.floor(Math.random() * AVATAR_CATEGORIES.length)];
  const randomSeed = cat.seeds[Math.floor(Math.random() * cat.seeds.length)];
  return `${cat.style}:${randomSeed}`;
}

const STORAGE_KEY = 'ito_player_avatars';

export function getSavedAvatars(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPlayerAvatar(playerName: string): string {
  if (!playerName) return 'avataaars:default';
  const saved = getSavedAvatars();
  return saved[playerName] || `avataaars:${playerName}`;
}

export function savePlayerAvatar(playerName: string, avatarId: string): void {
  if (!playerName) return;
  try {
    const current = getSavedAvatars();
    current[playerName] = avatarId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Erro ao salvar avatar:', err);
  }
}
