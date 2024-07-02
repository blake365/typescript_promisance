import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'
import { getRandomInt } from '../../routes/useturns'

export function calculateRunes(empire: Empire, runeMultiplier: number): number {
	let runes: number
	if (empire.bldWiz / empire.land > 0.15) {
		runes = Math.round(
			getRandomInt(
				Math.round(empire.bldWiz * 1.1),
				Math.round(empire.bldWiz * 1.4)
			) * runeMultiplier
		)
	} else {
		runes = Math.round(empire.bldWiz * 1.1 * runeMultiplier)
	}
	runes = Math.round(
		runes *
			((100 +
				raceArray[empire.race].mod_runepro +
				eraArray[empire.era].mod_runepro) /
				100)
	)
	return runes
}
