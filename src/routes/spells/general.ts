import Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { calcSizeBonus } from '../actions/actions'

export function randomIntFromInterval(min, max) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const baseCost = (empire: Empire) => {
	return (
		empire.land * 0.1 +
		100 +
		empire.bldWiz *
			0.5 *
			((100 + raceArray[empire.race].mod_magic) / 100) *
			calcSizeBonus(empire)
	)
}

export const getPower_self = (empire: Empire) => {
	return Math.round(
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
