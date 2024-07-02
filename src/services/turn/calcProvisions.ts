import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'

export function calcProvisions(empire: Empire, size: number) {
	let production =
		10 * empire.freeLand +
		empire.bldFood *
			70 *
			Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1)) *
			Math.max(0.8, size * 1.25)

	production *=
		(100 +
			raceArray[empire.race].mod_foodpro +
			eraArray[empire.era].mod_foodpro) /
		100

	// production *= Math.max(0.8, calcSizeBonus(empire))
	const foodpro = Math.round(production)

	let consumption =
		empire.trpArm * 0.0166 +
		empire.trpLnd * 0.025 +
		empire.trpFly * 0.0333 +
		empire.trpSea * 0.025 +
		empire.trpWiz * 0.17

	consumption *= (100 - raceArray[empire.race].mod_foodcon) / 100

	const foodcon = Math.round(consumption)

	return { foodpro: foodpro, foodcon: foodcon }
}
