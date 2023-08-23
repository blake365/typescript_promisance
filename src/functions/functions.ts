// functions that are shared between frontend and backend

import Empire from './../entity/Empire'
import { raceArray } from './../config/races'

// math
export function randomIntFromInterval(min, max) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export function generalLog(number, base) {
	return Math.log(base) / Math.log(number)
}

// general
export function calcSizeBonus({ networth }) {
	let net = Math.max(networth, 1)
	let size = Math.atan(generalLog(net, 1000) - 1) * 2.1 - 0.65
	size = Math.round(Math.min(Math.max(0.5, size), 1.7) * 1000) / 1000
	return size
}

// build

// attacks

// explore

// food

// money

// Magic
export const baseCost = (empire: Empire) => {
	return (
		empire.land * 0.1 +
		100 +
		empire.bldWiz *
			0.2 *
			((100 + raceArray[empire.race].mod_magic) / 100) *
			calcSizeBonus(empire)
	)
}

export const getPower_self = (empire: Empire) => {
	return (
		(empire.trpWiz * ((100 + raceArray[empire.race].mod_magic) / 100)) /
		Math.max(empire.bldWiz, 1)
	)
}

// getPower_enemy
// Determine wizard power when casting spells on an enemy
export const getPower_enemy = (yourEmpire: Empire, enemyEmpire: Empire) => {
	let uratio =
		(yourEmpire.trpWiz / ((yourEmpire.land + enemyEmpire.land) / 2)) *
		((100 + raceArray[yourEmpire.race].mod_magic) / 100)

	let eratio = Math.max(
		(enemyEmpire.trpWiz / enemyEmpire.land) *
			1.05 *
			((100 + raceArray[enemyEmpire.race].mod_magic) / 100)
	)

	return uratio / eratio
}

// Determine wizard loss when failing to cast a spell on an yourself
export const getWizLoss_self = (empire: Empire) => {
	let wizLoss = randomIntFromInterval(
		Math.ceil(empire.trpWiz * 0.01),
		Math.ceil(empire.trpWiz * 0.05 + 1)
	)

	if (wizLoss > empire.trpWiz) {
		wizLoss = empire.trpWiz
	}

	return wizLoss
}

// wizloss enemy
// Determine wizard loss when failing to cast a spell on an enemy
export const getWizLoss_enemy = (empire: Empire) => {
	let wizLoss = randomIntFromInterval(
		Math.ceil(empire.trpWiz * 0.01),
		Math.ceil(empire.trpWiz * 0.05 + 1)
	)

	if (wizLoss > empire.trpWiz) {
		wizLoss = empire.trpWiz
	}

	return wizLoss
}
