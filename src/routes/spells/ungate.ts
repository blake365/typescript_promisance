import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const ungate_cost = (baseCost: number) => {
	return Math.ceil(14.5 * baseCost)
}

interface recentObject {
	empireEffectName?: string
	empireEffectValue?: number
	createdAt?: Date
	empireOwnerId?: number
}

export const ungate_cast = async (empire: Empire) => {
	let now = new Date()
	let recent: recentObject
	const effects = await EmpireEffect.find({
		where: { empireOwnerId: empire.id, empireEffectName: 'time gate' },
		order: { createdAt: 'DESC' },
	})

	if (effects.length > 0) {
		recent = effects[0]
	}
	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let effectAge = (now.valueOf() - new Date(recent.createdAt).getTime()) / 60000
	// age in minutes
	console.log(effectAge)
	effectAge = Math.floor(effectAge)

	console.log(recent)

	if (getPower_self(empire) >= 80) {
		if (recent) {
			if (effectAge < recent.empireEffectValue) {
				effects[0].empireEffectValue = 0
				await effects[0].save()

				let result = {
					result: 'success',
					message: `You closed your ${eraArray[empire.era].spell_gate}`,
				}
				return result
			}
		}
	} else {
		let wizloss = getWizLoss_self(empire)
		let result = {
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
