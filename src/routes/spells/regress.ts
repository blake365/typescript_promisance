import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_self, getWizLoss_self } from './general'
import EmpireEffect from '../../entity/EmpireEffect'

export const regress_cost = (baseCost: number) => {
	return Math.ceil(47.5 * baseCost)
}

export const regress_allow = ({ era }, effects) => {
	// TODO: implement empire effects
	// can't advance until acclimated to current era
	// console.log(effects)

	let errorMessage = null // Initialize the error message to null

	effects.forEach((effect) => {
		// console.log(effect)
		if (effect.empireEffectName === 'era delay') {
			errorMessage = 'You must wait a while before changing eras again.'
		}
	})

	// console.log(errorMessage)

	if (eraArray[era].era_next < 0) {
		return false
	} else if (errorMessage !== null) return errorMessage
	else {
		return true
	}
}

export const regress_cast = (empire: Empire) => {
	if (getPower_self(empire) >= 90) {
		let effect: EmpireEffect = null
		effect = new EmpireEffect({
			effectOwnerId: empire.id,
			empireEffectName: 'era delay',
			empireEffectValue: 5760,
		})
		effect.save()

		let result = {
			result: 'success',
			message: 'You have regressed to the previous era.',
			wizloss: 0,
			descriptor: null,
		}
		return result
	} else {
		let wizloss = getWizLoss_self(empire)
		let result = {
			result: 'fail',
			message: 'Spell failed',
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}
		return result
	}
}
