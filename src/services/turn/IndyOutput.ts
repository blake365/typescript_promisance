import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'

export function IndyOutput(
	empire: Empire,
	indMultiplier: number,
	configMultiplier: number,
	size: number
) {
	const sizeMultiplier = 1

	// Math.max(0.8, size)
	const trparm = Math.ceil(
		empire.bldTroop *
			(empire.indArmy / 100) *
			1.2 *
			sizeMultiplier *
			configMultiplier *
			indMultiplier *
			((100 +
				raceArray[empire.race].mod_industry +
				eraArray[empire.era].mod_industry) /
				100)
	)
	const trplnd = Math.ceil(
		empire.bldTroop *
			(empire.indLnd / 100) *
			0.6 *
			sizeMultiplier *
			configMultiplier *
			indMultiplier *
			((100 +
				raceArray[empire.race].mod_industry +
				eraArray[empire.era].mod_industry) /
				100)
	)
	const trpfly = Math.ceil(
		empire.bldTroop *
			(empire.indFly / 100) *
			0.3 *
			sizeMultiplier *
			configMultiplier *
			indMultiplier *
			((100 +
				raceArray[empire.race].mod_industry +
				eraArray[empire.era].mod_industry) /
				100)
	)
	const trpsea = Math.ceil(
		empire.bldTroop *
			(empire.indSea / 100) *
			0.2 *
			sizeMultiplier *
			configMultiplier *
			indMultiplier *
			((100 +
				raceArray[empire.race].mod_industry +
				eraArray[empire.era].mod_industry) /
				100)
	)

	return { trparm: trparm, trplnd: trplnd, trpfly: trpfly, trpsea: trpsea }
}
