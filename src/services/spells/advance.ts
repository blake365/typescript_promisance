import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const advance_cost = (baseCost: number) => {
	return Math.ceil(47.5 * baseCost)
}

export const advance_allow = async ({ era, id }) => {
	console.log('casting advance')

	let now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: id, empireEffectName: 'era delay' },
		order: { updatedAt: 'DESC' },
	})

	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let timeLeft = 0

	if (effect) {
		let effectAge =
			(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
		timeLeft = effect.empireEffectValue - effectAge
		// age in minutes
		console.log(effectAge)
		effectAge = Math.floor(effectAge)

		console.log(effect)
	}

	let errorMessage = null // Initialize the error message to null

	if (timeLeft <= 0 && effect) {
		effect.remove()
		console.log('expired')
	} else if (timeLeft > 0) {
		// convert timeLeft to hours and minutes
		let hours = Math.floor(timeLeft / 60)
		let minutes = Math.round(timeLeft % 60)

		errorMessage = `You must wait ${hours} hours and ${minutes} minutes before changing eras again.`
	}

	// console.log(errorMessage)

	if (eraArray[era].era_next < 0) {
		return false
	} else if (errorMessage !== null) {
		return errorMessage
	} else {
		return true
	}
}

export const advance_cast = (empire: Empire) => {
	if (getPower_self(empire) >= 80) {
		let effect: EmpireEffect = null
		effect = new EmpireEffect({
			effectOwnerId: empire.id,
			empireEffectName: 'era delay',
			empireEffectValue: 4320,
		})
		effect.save()

		let result = {
			result: 'success',
			message: 'You have advanced to the next era.',
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
