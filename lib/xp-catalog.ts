import { itemIcon } from "./icons";
import type { XpActivity } from "./types";

export const BANKABLE_SKILLS = [
  "Herblore", "Prayer", "Construction", "Crafting", "Smithing",
  "Fletching", "Cooking", "Firemaking", "Farming", "Runecraft",
] as const;

export type BankableSkill = typeof BANKABLE_SKILLS[number];

export interface XpResourceDefinition {
  itemId: number;
  name: string;
  quantity: number;
}

export interface BankedXpMethodDefinition {
  id: string;
  skill: BankableSkill;
  label: string;
  requiredLevel: number;
  xpEach: number;
  family: string;
  stage: number;
  inputs: XpResourceDefinition[];
  outputs?: XpResourceDefinition[];
}

const input = (itemId: number, name: string, quantity = 1): XpResourceDefinition => ({ itemId, name, quantity });

export const BANKED_XP_METHODS: BankedXpMethodDefinition[] = [
  { id: "clean-ranarr", skill: "Herblore", label: "Clean ranarr", requiredLevel: 25, xpEach: 7.5, family: "ranarr-clean", stage: 0, inputs: [input(207, "Grimy ranarr weed")], outputs: [input(257, "Ranarr weed")] },
  { id: "clean-snapdragon", skill: "Herblore", label: "Clean snapdragon", requiredLevel: 59, xpEach: 11.8, family: "snapdragon-clean", stage: 0, inputs: [input(3051, "Grimy snapdragon")], outputs: [input(3000, "Snapdragon")] },
  { id: "prayer-potion", skill: "Herblore", label: "Prayer potion", requiredLevel: 38, xpEach: 87.5, family: "ranarr-use", stage: 1, inputs: [input(257, "Ranarr weed"), input(227, "Vial of water"), input(231, "Snape grass")], outputs: [input(139, "Prayer potion(3)")] },
  { id: "super-restore", skill: "Herblore", label: "Super restore", requiredLevel: 63, xpEach: 142.5, family: "snapdragon-use", stage: 1, inputs: [input(3000, "Snapdragon"), input(227, "Vial of water"), input(223, "Red spiders' eggs")], outputs: [input(3026, "Super restore(3)")] },

  { id: "dragon-bones-bury", skill: "Prayer", label: "Bury dragon bones", requiredLevel: 1, xpEach: 72, family: "dragon-bones", stage: 0, inputs: [input(536, "Dragon bones")] },
  { id: "dragon-bones-altar", skill: "Prayer", label: "Dragon bones at gilded altar", requiredLevel: 1, xpEach: 252, family: "dragon-bones", stage: 0, inputs: [input(536, "Dragon bones")] },
  { id: "superior-bones-altar", skill: "Prayer", label: "Superior bones at gilded altar", requiredLevel: 70, xpEach: 525, family: "superior-bones", stage: 0, inputs: [input(22124, "Superior dragon bones")] },

  { id: "oak-planks", skill: "Construction", label: "Oak furniture", requiredLevel: 15, xpEach: 60, family: "oak-plank", stage: 0, inputs: [input(8778, "Oak plank")] },
  { id: "teak-planks", skill: "Construction", label: "Teak furniture", requiredLevel: 35, xpEach: 90, family: "teak-plank", stage: 0, inputs: [input(8780, "Teak plank")] },
  { id: "mahogany-planks", skill: "Construction", label: "Mahogany furniture", requiredLevel: 40, xpEach: 140, family: "mahogany-plank", stage: 0, inputs: [input(8782, "Mahogany plank")] },

  { id: "spin-flax", skill: "Crafting", label: "Spin flax", requiredLevel: 10, xpEach: 15, family: "flax", stage: 0, inputs: [input(1779, "Flax")], outputs: [input(1777, "Bow string")] },
  { id: "cut-sapphire", skill: "Crafting", label: "Cut sapphire", requiredLevel: 20, xpEach: 50, family: "sapphire", stage: 0, inputs: [input(1623, "Uncut sapphire")], outputs: [input(1607, "Sapphire")] },
  { id: "cut-diamond", skill: "Crafting", label: "Cut diamond", requiredLevel: 43, xpEach: 107.5, family: "diamond", stage: 0, inputs: [input(1617, "Uncut diamond")], outputs: [input(1601, "Diamond")] },
  { id: "glass-orb", skill: "Crafting", label: "Glassblow orb", requiredLevel: 46, xpEach: 52.5, family: "molten-glass", stage: 0, inputs: [input(1775, "Molten glass")], outputs: [input(567, "Unpowered orb")] },

  { id: "smelt-iron", skill: "Smithing", label: "Smelt iron bar", requiredLevel: 15, xpEach: 12.5, family: "iron-ore", stage: 0, inputs: [input(440, "Iron ore")], outputs: [input(2351, "Iron bar")] },
  { id: "smelt-steel", skill: "Smithing", label: "Smelt steel bar", requiredLevel: 30, xpEach: 17.5, family: "iron-ore", stage: 0, inputs: [input(440, "Iron ore"), input(453, "Coal", 2)], outputs: [input(2353, "Steel bar")] },
  { id: "smelt-mithril", skill: "Smithing", label: "Smelt mithril bar", requiredLevel: 50, xpEach: 30, family: "mithril-ore", stage: 0, inputs: [input(447, "Mithril ore"), input(453, "Coal", 4)], outputs: [input(2359, "Mithril bar")] },
  { id: "smith-mithril", skill: "Smithing", label: "Smith mithril bars", requiredLevel: 50, xpEach: 50, family: "mithril-bar", stage: 1, inputs: [input(2359, "Mithril bar")] },
  { id: "smith-adamant", skill: "Smithing", label: "Smith adamantite bars", requiredLevel: 70, xpEach: 62.5, family: "adamant-bar", stage: 1, inputs: [input(2361, "Adamantite bar")] },

  { id: "yew-longbow-u", skill: "Fletching", label: "Fletch yew longbow (u)", requiredLevel: 70, xpEach: 75, family: "yew-log", stage: 0, inputs: [input(1515, "Yew logs")], outputs: [input(66, "Yew longbow (u)")] },
  { id: "magic-longbow-u", skill: "Fletching", label: "Fletch magic longbow (u)", requiredLevel: 85, xpEach: 91.5, family: "magic-log", stage: 0, inputs: [input(1513, "Magic logs")], outputs: [input(70, "Magic longbow (u)")] },
  { id: "string-yew-longbow", skill: "Fletching", label: "String yew longbow", requiredLevel: 70, xpEach: 75, family: "yew-bow-u", stage: 1, inputs: [input(66, "Yew longbow (u)"), input(1777, "Bow string")], outputs: [input(855, "Yew longbow")] },
  { id: "string-magic-longbow", skill: "Fletching", label: "String magic longbow", requiredLevel: 85, xpEach: 91.5, family: "magic-bow-u", stage: 1, inputs: [input(70, "Magic longbow (u)"), input(1777, "Bow string")], outputs: [input(859, "Magic longbow")] },

  { id: "cook-lobster", skill: "Cooking", label: "Cook lobster", requiredLevel: 40, xpEach: 120, family: "raw-lobster", stage: 0, inputs: [input(377, "Raw lobster")], outputs: [input(379, "Lobster")] },
  { id: "cook-swordfish", skill: "Cooking", label: "Cook swordfish", requiredLevel: 45, xpEach: 140, family: "raw-swordfish", stage: 0, inputs: [input(371, "Raw swordfish")], outputs: [input(373, "Swordfish")] },
  { id: "cook-karambwan", skill: "Cooking", label: "Cook karambwan", requiredLevel: 30, xpEach: 190, family: "raw-karambwan", stage: 0, inputs: [input(3142, "Raw karambwan")], outputs: [input(3144, "Cooked karambwan")] },
  { id: "cook-shark", skill: "Cooking", label: "Cook shark", requiredLevel: 80, xpEach: 210, family: "raw-shark", stage: 0, inputs: [input(383, "Raw shark")], outputs: [input(385, "Shark")] },

  { id: "burn-maple", skill: "Firemaking", label: "Burn maple logs", requiredLevel: 45, xpEach: 135, family: "maple-log", stage: 0, inputs: [input(1517, "Maple logs")] },
  { id: "burn-yew", skill: "Firemaking", label: "Burn yew logs", requiredLevel: 60, xpEach: 202.5, family: "yew-log", stage: 0, inputs: [input(1515, "Yew logs")] },
  { id: "burn-magic", skill: "Firemaking", label: "Burn magic logs", requiredLevel: 75, xpEach: 303.8, family: "magic-log", stage: 0, inputs: [input(1513, "Magic logs")] },

  { id: "plant-oak", skill: "Farming", label: "Plant and check oak", requiredLevel: 15, xpEach: 481.3, family: "oak-sapling", stage: 0, inputs: [input(5370, "Oak sapling")] },
  { id: "plant-willow", skill: "Farming", label: "Plant and check willow", requiredLevel: 30, xpEach: 1481.5, family: "willow-sapling", stage: 0, inputs: [input(5371, "Willow sapling")] },
  { id: "plant-maple", skill: "Farming", label: "Plant and check maple", requiredLevel: 45, xpEach: 3448.4, family: "maple-sapling", stage: 0, inputs: [input(5372, "Maple sapling")] },
  { id: "plant-yew", skill: "Farming", label: "Plant and check yew", requiredLevel: 60, xpEach: 7150.9, family: "yew-sapling", stage: 0, inputs: [input(5373, "Yew sapling")] },
  { id: "plant-magic", skill: "Farming", label: "Plant and check magic", requiredLevel: 75, xpEach: 13913.8, family: "magic-sapling", stage: 0, inputs: [input(5374, "Magic sapling")] },

  { id: "craft-air-runes", skill: "Runecraft", label: "Craft air runes", requiredLevel: 1, xpEach: 5, family: "rune-essence", stage: 0, inputs: [input(1436, "Rune essence")], outputs: [input(556, "Air rune")] },
  { id: "craft-nature-runes", skill: "Runecraft", label: "Craft nature runes", requiredLevel: 44, xpEach: 9, family: "pure-essence", stage: 0, inputs: [input(7936, "Pure essence")], outputs: [input(561, "Nature rune")] },
  { id: "craft-blood-runes", skill: "Runecraft", label: "Craft blood runes", requiredLevel: 77, xpEach: 10.5, family: "pure-essence", stage: 0, inputs: [input(7936, "Pure essence")], outputs: [input(565, "Blood rune")] },
];

export interface XpMethodDefinition extends Omit<XpActivity, "quantity"> {
  skill: BankableSkill;
}

// Compatibility projection used by existing saved goals and the compact goal builder.
export const XP_METHODS: XpMethodDefinition[] = BANKED_XP_METHODS.map((method) => ({
  id: method.id,
  skill: method.skill,
  label: method.label,
  inputItemId: method.inputs[0].itemId,
  inputName: method.inputs[0].name,
  inputIcon: itemIcon(`${method.inputs[0].name}.png`),
  xpEach: method.xpEach,
  requiredLevel: method.requiredLevel,
  secondary: method.inputs[1]?.name,
  secondaryQuantity: method.inputs[1]?.quantity,
}));

export function methodsForSkill(skill: BankableSkill) {
  return XP_METHODS.filter((method) => method.skill === skill);
}

export function bankedMethodsForSkill(skill: string) {
  return BANKED_XP_METHODS.filter((method) => method.skill === skill);
}

export function defaultMethodIds(skill: string, level = 99) {
  const families = new Map<string, BankedXpMethodDefinition[]>();
  for (const method of bankedMethodsForSkill(skill)) families.set(method.family, [...(families.get(method.family) ?? []), method]);
  return [...families.values()].map((methods) => {
    const unlocked = methods.filter((method) => method.requiredLevel <= level);
    return (unlocked.length ? unlocked : methods).sort((a, b) => b.xpEach - a.xpEach)[0].id;
  });
}
