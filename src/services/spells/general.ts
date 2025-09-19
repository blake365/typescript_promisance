import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { calcSizeFactors } from '../actions/actions'

export function randomIntFromInterval(min, max) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const baseCost = (empire: Empire) => {
	// Use combat readiness for spell costs (magic is affected by empire size/readiness)
	const sizeFactors = calcSizeFactors(empire, 10000000, 0) // Default values
	return (
		empire.land * 0.1 +
		100 +
		empire.bldWiz *
			0.35 *
			((100 - raceArray[empire.race].mod_magic) / 100) *
			sizeFactors.combatReadiness  // Use combat readiness for spell costs
	)
}

export const getPower_self = (empire: Empire) => {
	return Math.min(
		Math.round(
			(empire.trpWiz * ((100 + raceArray[empire.race].mod_magic) / 100)) /
				Math.max(empire.bldWiz, 1)
		),
		100 + raceArray[empire.race].mod_magic
	)
}

// getPower_enemy
// Determine wizard power when casting spells on an enemy
export const getPower_enemy = (yourEmpire: Empire, enemyEmpire: Empire) => {
	const uratio =
		(yourEmpire.trpWiz / ((yourEmpire.land + enemyEmpire.land) / 2)) *
		((100 + raceArray[yourEmpire.race].mod_magic) / 100)

	const eratio =
		(Math.max(enemyEmpire.trpWiz, 1) / enemyEmpire.land) *
		1.05 *
		((100 + raceArray[enemyEmpire.race].mod_magic) / 100)

	return uratio / eratio
}

// TODO: getPower_friend

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

// TODO: wizloss friend

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
