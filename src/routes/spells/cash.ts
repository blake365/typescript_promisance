import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { calcSizeBonus } from '../actions/actions'
import { getPower_self, getWizLoss_self } from './general'

export const cash_cost = (baseCost: number) => {
	return Math.ceil(17.5 * baseCost)
}

export const cash_cast = (empire: Empire) => {
	if (getPower_self(empire) >= 30) {
		let cash = Math.round(
			(empire.trpWiz *
				(empire.health / 100) *
				64 *
				(1 + Math.sqrt(empire.bldWiz / empire.land) / 2) *
				((100 + raceArray[empire.race].mod_magic) / 100)) /
				(calcSizeBonus(empire) * calcSizeBonus(empire))
		)

		let result = {
			result: 'success',
			message: `The spell was successful, your ${
				eraArray[empire.era].trpwiz
			} created`,
			wizloss: 0,
			cash: cash,
			descriptor: null,
		}
		return result
	} else {
		let wizloss = getWizLoss_self(empire)
		let result = {
			result: 'fail',
			message: 'Spell failed',
			wizloss: wizloss,
			cash: 0,
			descriptor: eraArray[empire.era].trpwiz,
		}
		return result
	}
}
