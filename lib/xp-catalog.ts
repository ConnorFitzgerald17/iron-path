import { itemIcon } from "./icons";
import type { XpActivity } from "./types";

export interface XpMethodDefinition extends Omit<XpActivity, "quantity"> {
  skill: "Herblore" | "Prayer" | "Construction" | "Crafting" | "Smithing" | "Fletching";
}

export const XP_METHODS: XpMethodDefinition[] = [
  { id: "clean-ranarr", skill: "Herblore", label: "Clean herb", inputItemId: 207, inputName: "Grimy ranarr weed", inputIcon: itemIcon("Grimy ranarr weed.png"), xpEach: 7.5, requiredLevel: 25 },
  { id: "prayer-potion", skill: "Herblore", label: "Prayer potion", inputItemId: 257, inputName: "Ranarr weed", inputIcon: itemIcon("Ranarr weed.png"), xpEach: 87.5, requiredLevel: 38, secondary: "Snape grass", secondaryQuantity: 1 },
  { id: "super-restore", skill: "Herblore", label: "Super restore", inputItemId: 3000, inputName: "Snapdragon", inputIcon: itemIcon("Snapdragon.png"), xpEach: 142.5, requiredLevel: 63, secondary: "Red spiders' eggs", secondaryQuantity: 1 },
  { id: "dragon-bones-bury", skill: "Prayer", label: "Bury", inputItemId: 536, inputName: "Dragon bones", inputIcon: itemIcon("Dragon bones.png"), xpEach: 72, requiredLevel: 1 },
  { id: "dragon-bones-altar", skill: "Prayer", label: "Gilded altar", inputItemId: 536, inputName: "Dragon bones", inputIcon: itemIcon("Dragon bones.png"), xpEach: 252, requiredLevel: 1 },
  { id: "superior-bones-altar", skill: "Prayer", label: "Gilded altar", inputItemId: 22124, inputName: "Superior dragon bones", inputIcon: itemIcon("Superior dragon bones.png"), xpEach: 525, requiredLevel: 70 },
  { id: "oak-planks", skill: "Construction", label: "Oak furniture", inputItemId: 8778, inputName: "Oak plank", inputIcon: itemIcon("Oak plank.png"), xpEach: 60, requiredLevel: 15 },
  { id: "teak-planks", skill: "Construction", label: "Teak furniture", inputItemId: 8780, inputName: "Teak plank", inputIcon: itemIcon("Teak plank.png"), xpEach: 90, requiredLevel: 35 },
  { id: "mahogany-planks", skill: "Construction", label: "Mahogany furniture", inputItemId: 8782, inputName: "Mahogany plank", inputIcon: itemIcon("Mahogany plank.png"), xpEach: 140, requiredLevel: 40 },
  { id: "cut-sapphire", skill: "Crafting", label: "Cut gem", inputItemId: 1623, inputName: "Uncut sapphire", inputIcon: itemIcon("Uncut sapphire.png"), xpEach: 50, requiredLevel: 20 },
  { id: "cut-diamond", skill: "Crafting", label: "Cut gem", inputItemId: 1617, inputName: "Uncut diamond", inputIcon: itemIcon("Uncut diamond.png"), xpEach: 107.5, requiredLevel: 43 },
  { id: "glass-orb", skill: "Crafting", label: "Glassblow orb", inputItemId: 1775, inputName: "Molten glass", inputIcon: itemIcon("Molten glass.png"), xpEach: 52.5, requiredLevel: 46 },
  { id: "smelt-steel", skill: "Smithing", label: "Smelt steel bar", inputItemId: 440, inputName: "Iron ore", inputIcon: itemIcon("Iron ore.png"), xpEach: 17.5, requiredLevel: 30, secondary: "Coal", secondaryQuantity: 2 },
  { id: "smith-mithril", skill: "Smithing", label: "Standard smithing", inputItemId: 2359, inputName: "Mithril bar", inputIcon: itemIcon("Mithril bar.png"), xpEach: 50, requiredLevel: 50 },
  { id: "smith-adamant", skill: "Smithing", label: "Standard smithing", inputItemId: 2361, inputName: "Adamantite bar", inputIcon: itemIcon("Adamantite bar.png"), xpEach: 62.5, requiredLevel: 70 },
  { id: "yew-longbow-u", skill: "Fletching", label: "Yew longbow (u)", inputItemId: 1515, inputName: "Yew logs", inputIcon: itemIcon("Yew logs.png"), xpEach: 75, requiredLevel: 70 },
  { id: "magic-longbow-u", skill: "Fletching", label: "Magic longbow (u)", inputItemId: 1513, inputName: "Magic logs", inputIcon: itemIcon("Magic logs.png"), xpEach: 91.5, requiredLevel: 85 },
  { id: "string-yew-longbow", skill: "Fletching", label: "String longbow", inputItemId: 66, inputName: "Yew longbow (u)", inputIcon: itemIcon("Yew longbow (u).png"), xpEach: 75, requiredLevel: 70, secondary: "Bow string", secondaryQuantity: 1 }
];

export function methodsForSkill(skill: XpMethodDefinition["skill"]) {
  return XP_METHODS.filter((method) => method.skill === skill);
}
