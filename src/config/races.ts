// const human = 0
// const elf = 1
// const dwarf = 2
// const troll = 3
// const gnome = 4
// const gremlin = 5
// const orc = 6
// const drow = 7
// const goblin = 8

const RACE_HUMAN = {
	name: 'Human',
	mod_offense: 0,
	mod_defense: 0,
	mod_buildrate: 0,
	mod_expenses: 0,
	mod_magic: 0,
	mod_industry: 0,
	mod_income: 0,
	mod_explore: 0,
	mod_market: 0,
	mod_foodcon: 0,
	mod_runepro: 0,
	mod_foodpro: 0,
}

const RACE_ELF = {
	name: 'Elf',
	mod_offense: -14,
	mod_defense: -2,
	mod_buildrate: -10,
	mod_expenses: 0,
	mod_magic: 18,
	mod_industry: -12,
	mod_income: 2,
	mod_explore: 12,
	mod_market: 0,
	mod_foodcon: 0,
	mod_runepro: 12,
	mod_foodpro: -6,
}

const RACE_DWARF = {
	name: 'Dwarf',
	mod_offense: 6,
	mod_defense: 16,
	mod_buildrate: 16,
	mod_expenses: -8,
	mod_magic: -16,
	mod_industry: 12,
	mod_income: 0,
	mod_explore: -18,
	mod_market: -8,
	mod_foodcon: 0,
	mod_runepro: 0,
	mod_foodpro: 0,
}
const RACE_TROLL = {
	name: 'Troll',
	mod_offense: 24,
	mod_defense: -10,
	mod_buildrate: 8,
	mod_expenses: 0,
	mod_magic: -12,
	mod_industry: 0,
	mod_income: 4,
	mod_explore: 14,
	mod_market: -12,
	mod_foodcon: 0,
	mod_runepro: -8,
	mod_foodpro: -8,
}
const RACE_GNOME = {
	name: 'Gnome',
	mod_offense: -16,
	mod_defense: 10,
	mod_buildrate: 0,
	mod_expenses: 6,
	mod_magic: 0,
	mod_industry: -10,
	mod_income: 10,
	mod_explore: -12,
	mod_market: 24,
	mod_foodcon: 0,
	mod_runepro: -12,
	mod_foodpro: 0,
}
const RACE_GREMLIN = {
	name: 'Gremlin',
	mod_offense: 10,
	mod_defense: 6,
	mod_buildrate: 0,
	mod_expenses: 0,
	mod_magic: -10,
	mod_industry: -14,
	mod_income: -20,
	mod_explore: -6,
	mod_market: 8,
	mod_foodcon: 14,
	mod_runepro: -6,
	mod_foodpro: 18,
}
const RACE_ORC = {
	name: 'Orc',
	mod_offense: 16,
	mod_defense: 0,
	mod_buildrate: 4,
	mod_expenses: -14,
	mod_magic: -4,
	mod_industry: 8,
	mod_income: 0,
	mod_explore: 22,
	mod_market: 0,
	mod_foodcon: -10,
	mod_runepro: -14,
	mod_foodpro: -8,
}
const RACE_DROW = {
	name: 'Drow',
	mod_offense: 14,
	mod_defense: 6,
	mod_buildrate: -12,
	mod_expenses: -10,
	mod_magic: 18,
	mod_industry: 0,
	mod_income: 0,
	mod_explore: -16,
	mod_market: 0,
	mod_foodcon: 0,
	mod_runepro: 6,
	mod_foodpro: -6,
}
const RACE_GOBLIN = {
	name: 'Goblin',
	mod_offense: -18,
	mod_defense: -16,
	mod_buildrate: 0,
	mod_expenses: 18,
	mod_magic: 0,
	mod_industry: 14,
	mod_income: 0,
	mod_explore: 0,
	mod_market: -6,
	mod_foodcon: 8,
	mod_runepro: 0,
	mod_foodpro: 0,
}

const RACE_HOBBIT = {
	name: 'Hobbit',
	mod_offense: -6,
	mod_defense: 10,
	mod_buildrate: -6,
	mod_expenses: 6,
	mod_magic: 0,
	mod_industry: -8,
	mod_income: -4,
	mod_explore: -8,
	mod_market: 8,
	mod_foodcon: -8,
	mod_runepro: 0,
	mod_foodpro: 16,
}

const RACE_GHOUL = {
	name: 'Ghoul',
	mod_offense: 0,
	mod_defense: 8,
	mod_buildrate: -8,
	mod_expenses: 10,
	mod_magic: -12,
	mod_industry: 10,
	mod_income: 0,
	mod_explore: -6,
	mod_market: -8,
	mod_foodcon: 4,
	mod_runepro: -6,
	mod_foodpro: 8,
}

const RACE_MINOTAUR = {
	name: 'Minotaur',
	mod_offense: 18,
	mod_defense: 12,
	mod_buildrate: -4,
	mod_expenses: -14,
	mod_magic: -16,
	mod_industry: 6,
	mod_income: 14,
	mod_explore: 12,
	mod_market: -11,
	mod_foodcon: -12,
	mod_runepro: -10,
	mod_foodpro: 5,
}

const RACE_VAMPIRE = {
	name: 'Vampire',
	mod_offense: 12,
	mod_defense: -8,
	mod_buildrate: -4,
	mod_expenses: 11,
	mod_magic: 0,
	mod_industry: 12,
	mod_income: 9,
	mod_explore: -16,
	mod_market: -4,
	mod_foodcon: -10,
	mod_runepro: 0,
	mod_foodpro: -2,
}

const RACE_PIXIE = {
	name: 'Pixie',
	mod_offense: -18,
	mod_defense: -15,
	mod_buildrate: -15,
	mod_expenses: 6,
	mod_magic: 10,
	mod_industry: -10,
	mod_income: 12,
	mod_explore: 0,
	mod_market: 2,
	mod_foodcon: 16,
	mod_runepro: 10,
	mod_foodpro: -10,
}

export const raceArray = [
	RACE_HUMAN,
	RACE_ELF,
	RACE_DWARF,
	RACE_TROLL,
	RACE_GNOME,
	RACE_GREMLIN,
	RACE_ORC,
	RACE_DROW,
	RACE_GOBLIN,
	RACE_HOBBIT,
	RACE_GHOUL,
	RACE_MINOTAUR,
	RACE_VAMPIRE,
	RACE_PIXIE,
]
