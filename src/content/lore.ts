export interface LoreEntry {
  term: string;
  brief: string;
  lore: string;
  category: "spirits" | "artifacts" | "states" | "concepts";
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

  // States
  {
    term: "pending",
    brief: "Dormant, awaiting spiritual awakening",
    category: "states",
    lore: `Before a spirit can act, it must first be awakened. A fuda in the pending state lies dormant, its potential unrealized. Like a talisman stored in a shrine's inner sanctum, it waits for the conditions of its activation to be met.

In practical terms, a pending fuda has unresolved dependencies—other tasks that must complete before this one can begin. The fuda exists, its purpose is inscribed, but the cosmic alignment is not yet favorable for its execution.

The system watches over pending fuda with patient vigilance. When their blocking dependencies resolve, the fuda transitions to ready, emerging from dormancy like a spirit at dawn.`,
  },
  {
    term: "ready",
    brief: "Awakened and available for spirit binding",
    category: "states",
    lore: `When the stars align and all prerequisites are met, a fuda awakens to the ready state. Its ink glows with latent power; it calls out to passing spirits, seeking one worthy to carry its mandate.

A ready fuda has no unfinished dependencies blocking it. Any available spirit may claim it, binding themselves to the task until completion or failure. The fuda does not choose its spirit—rather, spirits choose which fuda to bind, typically selecting the highest priority tasks first.

This is the liminal moment: between dormancy and action, between potential and manifestation. The fuda is prepared; it requires only a willing servant to transform intention into reality.`,
  },
  {
    term: "in_progress",
    brief: "Spirit-bound, actively being fulfilled",
    category: "states",
    aliases: ["in-progress", "active"],
    lore: `When a spirit claims a fuda, a binding forms—invisible threads of obligation that tie servant to task. The fuda enters the in_progress state, its power now channeled through the claiming spirit.

During this phase, the spirit labors: reading code, making changes, running tests, and building toward the fuda's stated goal. The fuda records which spirit has claimed it and tracks the duration of their bond.

This is the state of action, of transformation, of work-in-motion. The spirit may discover subtasks and spawn new fuda; it may encounter obstacles and seek guidance. But until it declares completion or failure, the binding holds, and the work continues.`,
  },
  {
    term: "done",
    brief: "Fulfilled, the talisman's purpose complete",
    category: "states",
    aliases: ["completed", "finished"],
    lore: `When a spirit fulfills its contract, the fuda achieves completion. The done state represents the natural conclusion of a successful task—the talisman's purpose realized, its power expended in worthy service.

A completed fuda often carries an artifact of its labor: a commit hash, pointing to the changes wrought in the codebase. This record proves that the work was done and allows others to trace the spirit's contribution.

Completed fuda are not destroyed but preserved—a record of work accomplished, a monument to spirits who served faithfully. They also unlock downstream tasks: other fuda that depended on this one may now awaken and seek their own spirits.`,
  },
  {
    term: "failed",
    brief: "The spirit could not fulfill its obligation",
    category: "states",
    lore: `Not all bindings end in triumph. Sometimes a spirit encounters obstacles it cannot overcome: tests that refuse to pass, errors beyond comprehension, or requirements that contradict reality. When this happens, the fuda enters the failed state.

Failure is not shameful—it is information. The fuda records the spirit's failure_context: an explanation of what went wrong and why completion proved impossible. This knowledge serves future attempts, allowing other spirits to approach the problem with greater wisdom.

A failed fuda may be retried. The retry_count increments, the status resets to ready, and a new spirit may attempt what its predecessor could not. Some tasks require multiple attempts; some require different approaches. The system remembers each failure, building toward eventual success.`,
  },
  {
    term: "blocked",
    brief: "Halted by external impediments",
    category: "states",
    lore: `Sometimes a spirit begins work only to discover that progress requires something beyond the fuda's scope: a decision from the onmyoji, resources from external systems, or answers to questions not yet asked. The blocked state captures this suspended animation.

Unlike pending (which awaits other fuda), a blocked task has encountered an unexpected impediment. The spirit cannot continue, yet the work is not failed—merely paused, waiting for the obstacle to clear.

When you see a blocked fuda, investigate. Something requires your attention: a clarification, a decision, an external action. Once you resolve the impediment, the spirit can resume its labor.`,
  },

  // Concepts
  {
    term: "dependency",
    brief: "Sacred bonds between fuda that control execution order",
    category: "concepts",
    aliases: ["deps", "blocks"],
    lore: `In the spirit realm, not all work can proceed in parallel. Some fuda must wait for others—a foundation before walls, walls before a roof. Dependencies are the sacred bonds that encode this ordering.

When fuda A blocks fuda B, B cannot enter the ready state until A reaches done. This creates a directed flow of work, ensuring that prerequisites complete before their dependents begin.

Dependencies come in several forms: blocking (hard requirements), parent-child (hierarchical relationships), related (informational links), and discovered-from (tasks found during other work). Each type encodes a different relationship, but all serve the same purpose: bringing order to the chaos of parallel work.`,
  },
  {
    term: "priority",
    brief: "The urgency with which a fuda calls to spirits",
    category: "concepts",
    lore: `When multiple fuda await claiming, how does a spirit choose? The answer lies in priority—a numeric value that represents the urgency and importance of each task.

Higher numbers indicate greater priority. A fuda with priority 10 calls out more urgently than one with priority 1. When spirits survey the available work, they typically claim the highest priority task they are capable of handling.

Priority is a tool for the onmyoji to express intent. Critical path work receives high priority; speculative improvements receive low. By adjusting these numbers, you guide the spirits toward the work that matters most.`,
  },
  {
    term: "spirit-type",
    brief: "The nature and specialization of summoned spirits",
    category: "concepts",
    aliases: ["spiritType"],
    lore: `Not all spirits are alike. Just as an onmyoji would not send a messenger spirit to battle a demon, we must match spirit types to appropriate tasks.

Shikigami are general-purpose servants, suitable for most coding work. Tengu possess deeper wisdom, ideal for architecture and review. Kitsune bring creativity and cunning to problems that defy straightforward solutions.

When creating a fuda, specifying the spirit-type helps route tasks to appropriate agents. A testing task might call for a kitsune's tricky nature; a refactoring effort might benefit from a tengu's architectural vision. The system uses these hints to optimize task assignment.`,
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
