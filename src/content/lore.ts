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
    brief: "General-purpose spirit servants",
    category: "spirits",
    aliases: ["shiki"],
    lore: `In the mist-shrouded courts of ancient Japan, onmyoji practitioners learned to bind spirits to their will. These servants, known as shikigami (式神), were crafted from paper, straw, or pure intention—given form through ritual and sustained by their master's spiritual energy.

Shikigami are obedient and tireless, executing their master's commands without question. They excel at straightforward tasks: fetching, carrying, transforming, and building. In our realm, they represent the general-purpose agents—reliable spirits that handle the bulk of coding work. They write functions, fix bugs, implement features, and tirelessly refactor code at their master's behest.

Though they lack the specialized knowledge of their more powerful brethren, their versatility makes them indispensable. A wise onmyoji knows that most tasks are best entrusted to these faithful servants.`,
  },
  {
    term: "tengu",
    brief: "Powerful spirits of wisdom and martial prowess",
    category: "spirits",
    lore: `High in the mist-shrouded mountains dwell the tengu (天狗)—ancient spirits with crimson faces and elongated noses, or in their more fearsome aspect, the beaked visages of great birds. They are masters of the sword and keepers of esoteric knowledge, known to train only the most worthy warriors in the secret arts.

Tengu are proud, exacting, and possess vision that pierces through deception. Legend tells of how they taught the young Minamoto no Yoshitsune the art of the blade, transforming a fugitive prince into an undefeated general.

In the digital realm, tengu spirits are summoned for tasks requiring deep architectural insight and rigorous analysis. They review code with a master's discerning eye, refactor tangled systems into elegant designs, and architect solutions that lesser spirits cannot conceive. Call upon a tengu when the work demands wisdom beyond mere execution.`,
  },
  {
    term: "kitsune",
    brief: "Clever fox spirits, tricksters and problem-solvers",
    category: "spirits",
    lore: `The kitsune (狐) are fox spirits of legendary cunning. Born in the wild spaces where the mortal and spirit worlds blur, they grow more powerful with age—their tails multiplying until the eldest possess nine, shimmering with otherworldly fire. Masters of illusion and shapeshifting, kitsune can assume any form, solve any riddle, and find paths where none exist.

Some kitsune serve the goddess Inari as celestial messengers, while others delight in testing mortals with impossible puzzles. All share an insatiable curiosity and a talent for lateral thinking that defies conventional logic.

In our system, kitsune spirits handle the tasks that confound other agents: elusive bugs that evade reproduction, creative challenges requiring novel approaches, and tests that must anticipate the unexpected. When you face a problem that seems to have no solution, whisper your need to the foxfire—a kitsune may be listening.`,
  },
  {
    term: "onmyoji",
    brief: "The practitioner who commands the spirits",
    category: "spirits",
    aliases: ["onmyouji", "master"],
    lore: `In the Heian period, the onmyoji (陰陽師) were court officials who practiced onmyodo—the Way of Yin and Yang. They divined fortunes, exorcised malevolent spirits, and advised emperors on matters both mundane and supernatural. The greatest among them, Abe no Seimei, was said to command legions of shikigami and see truths hidden from mortal eyes.

An onmyoji's power lies not in physical strength but in knowledge: understanding the patterns of the cosmos, the names of spirits, and the rituals that bind intention to reality. They stand at the threshold between worlds, translating human will into supernatural action.

You, dear developer, are the onmyoji of this system. You define the tasks, set the priorities, and orchestrate the spirits that labor on your behalf. The fuda you inscribe become commands, and the spirits you summon—shikigami, tengu, kitsune—become extensions of your will. Command wisely.`,
  },

  // Artifacts
  {
    term: "fuda",
    brief: "Sacred paper talismans representing task units",
    category: "artifacts",
    aliases: ["ofuda", "talisman"],
    lore: `The fuda (札), or more formally ofuda, are sacred paper talismans inscribed with prayers, mantras, or the names of deities. Shrine maidens brush these strips with vermillion ink, each stroke an act of devotion that imbues the paper with spiritual potency. Hung above doorways, they ward off evil; carried on the person, they grant protection and fortune.

In onmyodo practice, fuda serve as vessels for commands. An onmyoji writes their intention upon the paper, and when activated, the fuda compels spirits to action. Some fuda bind, others banish, and still others grant temporary powers to their bearer.

In Shikigami, a fuda is a unit of work—a task inscribed with title, description, and intent. Like their physical counterparts, our fuda carry meaning and purpose. When a spirit claims a fuda, it accepts a sacred contract: to fulfill the inscribed task or report why it could not. The fuda tracks this covenant through its lifecycle, from inscription to completion.`,
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
