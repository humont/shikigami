export interface LoreEntry {
  term: string;
  brief: string;
  lore: string;
  category: "spirits" | "artifacts";
  aliases?: string[];
}

export const LORE_ENTRIES: LoreEntry[] = [
  // Spirits
  {
    term: "shikigami",
    brief: "Spirit servants summoned and controlled by onmyoji",
    category: "spirits",
    aliases: ["shiki"],
    lore: `Shikigami (式神, "ceremonial spirits") are supernatural beings from Japanese folklore, summoned and controlled by onmyoji—practitioners of onmyodo. The belief originates from the Heian period (794-1185). Shikigami have no stable physical form; they may appear as animals, shadows, or animated paper talismans. Their power is directly connected to their master's spiritual force. A skilled onmyoji can command shikigami to possess animals or people, while a careless practitioner risks losing control—legends warn that uncontrolled shikigami may turn on their masters.

Shikigami serve as charms for good fortune, amulets for protection, or instruments of curses. They are often compared to the Western concept of a wizard's familiar. In the Izanagi-ryu folk religion, elite onmyoji could summon an exceptionally powerful variant called shikioji to ward off disasters and demons.

In Shikigami, the general-purpose AI agents are named after these spirits. Like their mythological counterparts, they are summoned to execute tasks on behalf of their master (the developer). They handle the bulk of coding work—writing functions, fixing bugs, implementing features—serving faithfully until their task is complete.`,
  },
  {
    term: "tengu",
    brief: "Mountain spirits of martial wisdom",
    category: "spirits",
    lore: `Tengu (天狗, "heavenly dogs") are supernatural creatures from Japanese folklore, originally depicted as disruptive demons and harbingers of war. Over centuries, their image evolved into protective—if still dangerous—spirits of mountains and forests. They are one of the best-known yokai, yet are sometimes worshipped as Shinto kami.

Early tengu appeared as kite-like beings with avian wings, heads, or beaks. The iconic long red nose emerged in the 14th century as a humanization of the original bird's bill. There are two types: kotengu (lesser tengu with bird forms) and daitengu (great tengu with human forms, long noses, and greater wisdom). The king of tengu, Sojobo, famously taught the warrior Minamoto no Yoshitsune the arts of swordsmanship, tactics, and magic—transforming a fugitive prince into an undefeated general.

Tengu represent ultimate mastery and hidden wisdom in martial arts tradition. In Shikigami, tengu-type agents are reserved for tasks requiring deep expertise: architecture decisions, complex refactoring, and code review. Like the mountain spirits who trained legendary warriors, they bring exacting standards and piercing insight to work that demands wisdom beyond mere execution.`,
  },
  {
    term: "kitsune",
    brief: "Fox spirits of cunning and transformation",
    category: "spirits",
    lore: `Kitsune (狐) are fox spirits from Japanese folklore, noted for their paranormal abilities, particularly shapeshifting. Stories depict them as intelligent beings whose powers increase with age and wisdom. The more tails a kitsune possesses—up to nine—the older and more powerful it is. A fox grows additional tails after living 100 years; nine-tailed kitsune turn white or gold and acquire abilities beyond comprehension, including bending time and space, eventually attaining omniscience.

There are two primary types: zenko ("good foxes") who serve the Shinto deity Inari as divine messengers and guardians, and nogitsune ("field foxes") who follow their own whims—mischievous, malevolent, or simply indifferent. Good kitsune are white, a color of good omen, and possess power to ward off evil. The legendary onmyoji Abe no Seimei was said to be the son of the fox spirit Kuzunoha.

In Shikigami, kitsune-type agents handle tasks that confound straightforward approaches: elusive bugs, creative challenges, and problems requiring lateral thinking. Like the foxes who solve riddles and find paths where none exist, they bring cunning and unconventional wisdom to work that defies standard solutions.`,
  },
  {
    term: "onmyoji",
    brief: "Practitioners of the Way of Yin and Yang",
    category: "spirits",
    aliases: ["onmyouji", "master"],
    lore: `Onmyoji (陰陽師) were court officials in ancient Japan who practiced onmyodo—the Way of Yin and Yang. This system combined astronomy, calendrics, divination, and magic, evolving from Chinese yin-yang philosophy introduced in the 6th century and influenced by Taoism, Buddhism, and Confucianism. Onmyoji analyzed strange events, conducted exorcisms, warded against evil spirits, and performed rites of geomancy.

The most famous onmyoji was Abe no Seimei (921-1005 AD), whose legendary abilities included predicting Emperor Kazan's abdication through celestial observation. According to legend, Seimei was half-kitsune—his mother, Kuzunoha, was a fox spirit. His symbol, the five-pointed star (Seimei-mon), embodies the Five Elements: wood, fire, earth, metal, and water. From the late 10th century, the government ministry of onmyodo was controlled by the Abe clan.

In Shikigami, you—the developer—are the onmyoji. You define tasks, set priorities, and orchestrate the spirits that labor on your behalf. The fuda you inscribe become commands, and the agents you summon—shikigami, tengu, kitsune—become extensions of your will.`,
  },

  // Artifacts
  {
    term: "fuda",
    brief: "Sacred talismans inscribed with spiritual power",
    category: "artifacts",
    aliases: ["ofuda", "talisman"],
    lore: `Ofuda (お札/御札, honorific form of fuda, "slip of paper") are talismans found in Shinto shrines and Buddhist temples throughout Japan. They are made from paper, wood, cloth, or metal, and are considered imbued with the power of kami (deities) or Buddhist figures. Paper ofuda are called kamifuda; wooden ones are kifuda.

Ofuda serve various purposes: protection against calamity, safety within the home, or finding love. Unlike omamori (portable amulets for individuals), ofuda protect an entire household. Most families place them on kamidana (household altars) or high on north or west-facing walls. The origins of ofuda trace to both Taoist lingfu talismans (introduced via onmyodo) and woodblock prints from the Nara and Heian periods.

In Shikigami, a fuda is a unit of work—a task inscribed with title, description, and intent. Like sacred talismans, each fuda carries purpose and power. When an agent claims a fuda, it accepts a contract: fulfill the inscribed task or report why it could not. The system tracks this covenant through the fuda's lifecycle, from creation to completion.`,
  },
];

export function findLoreEntry(term: string): LoreEntry | undefined {
  const normalizedTerm = term.toLowerCase();

  // Exact match first
  let entry = LORE_ENTRIES.find((e) => e.term.toLowerCase() === normalizedTerm);
  if (entry) return entry;

  // Check aliases
  entry = LORE_ENTRIES.find((e) =>
    e.aliases?.some((a) => a.toLowerCase() === normalizedTerm)
  );
  if (entry) return entry;

  // Prefix match
  entry = LORE_ENTRIES.find((e) =>
    e.term.toLowerCase().startsWith(normalizedTerm)
  );
  if (entry) return entry;

  // Alias prefix match
  entry = LORE_ENTRIES.find((e) =>
    e.aliases?.some((a) => a.toLowerCase().startsWith(normalizedTerm))
  );
  if (entry) return entry;

  return undefined;
}
