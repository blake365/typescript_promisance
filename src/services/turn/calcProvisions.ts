import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'
import type { EmpireSizeFactors } from '../actions/actions'

export function calcProvisions(empire: Empire, size: number | EmpireSizeFactors) {
	// Support both legacy number and new factors object
	const economicEfficiency = typeof size === 'number'
		? Math.max(0.8, size * 1.25)
		: size.economicEfficiency

	let production =
		10 * empire.freeLand +
		empire.bldFood *
			70 *
			Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1)) *
			economicEfficiency

	production *=
		(100 +
			raceArray[empire.race].mod_foodpro +
			eraArray[empire.era].mod_foodpro) /
		100

	// production *= Math.max(0.8, calcSizeBonus(empire))
	const foodpro = Math.round(production)

	// Reduced food consumption by 35% to support sustained growth
	// with less land and tighter production bonuses
	let consumption =
		empire.trpArm * 0.011 +   // was 0.0166 (-34%)
		empire.trpLnd * 0.016 +   // was 0.025 (-36%)
		empire.trpFly * 0.022 +   // was 0.0333 (-34%)
		empire.trpSea * 0.016 +   // was 0.025 (-36%)
		empire.trpWiz * 0.11      // was 0.17 (-35%)

	consumption *= (100 - raceArray[empire.race].mod_foodcon) / 100

	const foodcon = Math.round(consumption)

	return { foodpro: foodpro, foodcon: foodcon }
}
