import { itemIcon } from "./icons";
import type { CharacterProfile } from "./types";

export const demoProfile: CharacterProfile = {
  id: "char-ironvale",
  name: "Iron Vale",
  slug: "iron-vale",
  accountType: "Ironman",
  combatLevel: 104,
  totalLevel: 1874,
  visibility: "private",
  lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  skills: [
    { skill: "Agility", level: 66, xp: 537000 },
    { skill: "Construction", level: 74, xp: 1185000 },
    { skill: "Crafting", level: 72, xp: 992895 },
    { skill: "Herblore", level: 77, xp: 1475581 },
    { skill: "Hitpoints", level: 86, xp: 3597792 },
    { skill: "Magic", level: 82, xp: 2421087 },
    { skill: "Mining", level: 71, xp: 899257 },
    { skill: "Prayer", level: 70, xp: 737627 },
    { skill: "Smithing", level: 69, xp: 668051 },
    { skill: "Thieving", level: 72, xp: 992895 },
    { skill: "Fletching", level: 78, xp: 1629200 }
  ],
  items: [
    { itemId: 8778, name: "Oak plank", quantity: 124, icon: itemIcon("Oak plank.png"), container: "bank" },
    { itemId: 1941, name: "Swamp paste", quantity: 42, icon: itemIcon("Swamp paste.png"), container: "bank" },
    { itemId: 2347, name: "Hammer", quantity: 1, icon: itemIcon("Hammer.png"), container: "bank" },
    { itemId: 946, name: "Knife", quantity: 1, icon: itemIcon("Knife.png"), container: "bank" },
    { itemId: 1515, name: "Yew logs", quantity: 812, icon: itemIcon("Yew logs.png"), container: "bank" },
    { itemId: 1777, name: "Bow string", quantity: 463, icon: itemIcon("Bow string.png"), container: "bank" },
    { itemId: 536, name: "Dragon bones", quantity: 286, icon: itemIcon("Dragon bones.png"), container: "bank" },
    { itemId: 5295, name: "Ranarr seed", quantity: 18, icon: itemIcon("Ranarr seed.png"), container: "bank" },
    { itemId: 257, name: "Ranarr weed", quantity: 196, icon: itemIcon("Ranarr weed.png"), container: "bank" },
    { itemId: 231, name: "Snape grass", quantity: 144, icon: itemIcon("Snape grass.png"), container: "bank" },
    { itemId: 1617, name: "Uncut diamond", quantity: 68, icon: itemIcon("Uncut diamond.png"), container: "bank" }
  ],
  goals: [
    {
      id: "quest-ds2",
      kind: "quest",
      title: "Dragon Slayer II",
      description: "Uncover the dragonkin conspiracy and earn access to the Myths' Guild.",
      wikiUrl: "https://oldschool.runescape.wiki/w/Dragon_Slayer_II",
      state: "not_started",
      public: true,
      requirements: [
        { skill: "Magic", level: 75 }, { skill: "Smithing", level: 70 },
        { skill: "Mining", level: 68 }, { skill: "Crafting", level: 62 },
        { skill: "Agility", level: 60 }, { skill: "Thieving", level: 60 },
        { skill: "Construction", level: 50 }, { skill: "Hitpoints", level: 50 }
      ],
      prerequisites: [
        { name: "Legends' Quest", state: "finished" },
        { name: "Dream Mentor", state: "finished" },
        { name: "A Tail of Two Cats", state: "finished" },
        { name: "Animal Magnetism", state: "finished" },
        { name: "Bone Voyage", state: "finished" },
        { name: "Client of Kourend", state: "finished" }
      ],
      items: [
        { id: "oak-plank", itemId: 8778, name: "Oak plank", quantity: 8, icon: itemIcon("Oak plank.png") },
        { id: "swamp-paste", itemId: 1941, name: "Swamp paste", quantity: 10, icon: itemIcon("Swamp paste.png") },
        { id: "hammer", itemId: 2347, name: "Hammer", quantity: 1, icon: itemIcon("Hammer.png") },
        { id: "goutweed", itemId: 3261, name: "Goutweed", quantity: 1, icon: itemIcon("Goutweed.png") },
        { id: "fire-wave", name: "Runes for 3 Fire Wave spells", quantity: 1, manual: true, note: "Or 3 Fire Surge spells" }
      ]
    },
    {
      id: "grind-dwh",
      kind: "grind",
      title: "The red hammer",
      monster: "Lizardman shaman",
      npcIds: [6766, 6767, 6768, 7744, 8565],
      targetItemId: 13576,
      targetItemName: "Dragon warhammer",
      targetIcon: itemIcon("Dragon warhammer.png"),
      dropRate: 3000,
      startingKc: 2148,
      observedKc: 319,
      public: true,
      drops: [
        { itemId: 13576, name: "Dragon warhammer", quantity: 0, rarity: "1/3,000", icon: itemIcon("Dragon warhammer.png"), public: true, source: "runelite" },
        { itemId: 10976, name: "Long bone", quantity: 2, rarity: "1/400", icon: itemIcon("Long bone.png"), public: true, source: "runelite" },
        { itemId: 12073, name: "Clue scroll (hard)", quantity: 7, rarity: "1/100", icon: itemIcon("Clue scroll (hard).png"), public: false, source: "runelite" }
      ]
    },
    {
      id: "xp-prayer",
      kind: "banked_xp",
      title: "Bank 77 Prayer",
      skill: "Prayer",
      targetLevel: 77,
      currentLevel: 70,
      currentXp: 737627,
      public: true,
      includeOutputs: true,
      respectLevels: true,
      showSecondaries: true,
      activities: [
        { id: "dragon-bones-altar", label: "Gilded altar", inputItemId: 536, inputName: "Dragon bones", inputIcon: itemIcon("Dragon bones.png"), quantity: 286, xpEach: 252, requiredLevel: 1 },
        { id: "wyrm-bones-altar", label: "Gilded altar", inputItemId: 22780, inputName: "Wyrm bones", inputIcon: itemIcon("Wyrm bones.png"), quantity: 442, xpEach: 175, requiredLevel: 1 }
      ]
    }
  ]
};

export const quickAddGoals: CharacterProfile["goals"] = [
  {
    id: "quest-sote",
    kind: "quest",
    title: "Song of the Elves",
    description: "Complete the elven quest line and unlock Prifddinas.",
    wikiUrl: "https://oldschool.runescape.wiki/w/Song_of_the_Elves",
    state: "not_started",
    public: false,
    requirements: [
      { skill: "Agility", level: 70 }, { skill: "Construction", level: 70 },
      { skill: "Farming", level: 70 }, { skill: "Herblore", level: 70 },
      { skill: "Hunter", level: 70 }, { skill: "Mining", level: 70 },
      { skill: "Smithing", level: 70 }, { skill: "Woodcutting", level: 70 }
    ],
    prerequisites: [{ name: "Mourning's End Part II", state: "finished" }],
    items: [{ id: "sote-items", name: "Quest item set", quantity: 1, manual: true, note: "Review Wiki checklist" }]
  },
  {
    id: "grind-bowfa",
    kind: "grind",
    title: "Red prison",
    monster: "Corrupted Gauntlet",
    npcIds: [],
    targetItemId: 25859,
    targetItemName: "Enhanced crystal weapon seed",
    targetIcon: itemIcon("Enhanced crystal weapon seed.png"),
    dropRate: 400,
    startingKc: 0,
    observedKc: 0,
    public: false,
    drops: [{ itemId: 25859, name: "Enhanced crystal weapon seed", quantity: 0, rarity: "1/400", icon: itemIcon("Enhanced crystal weapon seed.png"), public: true, source: "runelite" }]
  },
  {
    id: "xp-herblore",
    kind: "banked_xp",
    title: "Bank 80 Herblore",
    skill: "Herblore",
    targetLevel: 80,
    currentLevel: 77,
    currentXp: 1475581,
    public: false,
    includeOutputs: true,
    respectLevels: true,
    showSecondaries: true,
    activities: [
      { id: "prayer-potion", label: "Prayer potion", inputItemId: 257, inputName: "Ranarr weed", inputIcon: itemIcon("Ranarr weed.png"), quantity: 196, xpEach: 87.5, requiredLevel: 38, secondary: "Snape grass", secondaryQuantity: 196 },
      { id: "super-restore", label: "Super restore", inputItemId: 3000, inputName: "Snapdragon", inputIcon: itemIcon("Snapdragon.png"), quantity: 84, xpEach: 142.5, requiredLevel: 63, secondary: "Red spiders' eggs", secondaryQuantity: 84 }
    ]
  }
];
