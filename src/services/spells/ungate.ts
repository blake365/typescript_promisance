import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const ungate_cost = (baseCost: number) => {
	return Math.ceil(14.5 * baseCost)
}

export const ungate_cast = async (empire: Empire) => {
	const now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: empire.id, empireEffectName: 'time gate' },
		order: { createdAt: 'DESC' },
	})

	// console.log(effect)
	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let timeLeft = 0
	if (effect) {
		let effectAge =
			(now.valueOf() - new Date(effect.createdAt).getTime()) / 60000
		timeLeft = effect.empireEffectValue - effectAge
		// age in minutes
		// console.log(effectAge)
		effectAge = Math.floor(effectAge)
	}

	if (getPower_self(empire) >= 75) {
		if (effect) {
			if (timeLeft < effect.empireEffectValue) {
				effect.remove()
				const result = {
					result: 'success',
					message: `You closed your ${eraArray[empire.era].spell_gate}`,
				}
				return result
			}
		} else {
			console.log('no effect found')
			const result = {
				result: 'fail',
				message: `You do not have a ${eraArray[empire.era].spell_gate} open`,
			}
			return result
		}
	} else {
		const wizloss = getWizLoss_self(empire)
		const result = {
			result: 'fail',
			message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
				eraArray[empire.era].spell_gate
			}`,
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}

		return result
	}
}
