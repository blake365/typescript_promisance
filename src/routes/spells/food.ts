import { PVTM_FOOD } from '../../config/conifg'
import { eraArray } from '../../config/eras'
import { raceArray } from '../../config/races'
import Empire from '../../entity/Empire'
import { calcSizeBonus } from '../actions/actions'
import { getPower_self, getWizLoss_self } from './general'

export const food_cost = (baseCost: number) => {
	return Math.ceil(17.0 * baseCost)
}

export const food_cast = (empire: Empire) => {
	if (getPower_self(empire) >= 30) {
		let food = Math.round(
			(empire.trpWiz *
				(empire.health / 100) *
				40 *
				(0.78 + Math.sqrt(empire.bldWiz / empire.land) / 2) *
				((100 + raceArray[empire.race].mod_magic) / 100)) /
				(calcSizeBonus(empire) * calcSizeBonus(empire)) /
				PVTM_FOOD
		)

		let result = {
			result: 'success',
			message: `The spell was successful, your ${
				eraArray[empire.era].trpwiz
			} created`,
			wizloss: 0,
			food: food,
			descriptor: eraArray[empire.era].food,
		}
		return result
	} else {
		let wizloss = getWizLoss_self(empire)
		let result = {
			result: 'fail',
			message: 'Spell failed',
			wizloss: wizloss,
			food: 0,
			descriptor: eraArray[empire.era].trpwiz,
		}
		return result
	}
}
