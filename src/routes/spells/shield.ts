import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const shield_cost = (baseCost: number) => {
	return Math.ceil(4.9 * baseCost)
}

interface recentObject {
	empireEffectName?: string
	empireEffectValue?: number
	createdAt?: Date
	empireOwnerId?: number
}

export const shield_cast = async (empire: Empire) => {
	let now = new Date()
	let recent: recentObject
	const effects = await EmpireEffect.find({
		where: { empireOwnerId: empire.id, empireEffectName: 'spell shield' },
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

	if (getPower_self(empire) >= 15) {
		if (recent) {
			if (effectAge < 9 * 60) {
				console.log('renew')
				// renew effect
				let empireEffectName = 'spell shield'
				let empireEffectValue = 12 * 60
				let effectOwnerId = empire.id

				let effect: EmpireEffect
				effect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await effect.save()

				let result = {
					result: 'success',
					message: `Your ${eraArray[empire.era].trpwiz} cast ${
						eraArray[empire.era].spell_shield
					}. /n Your shield is has been renewed to 12 hours.`,
				}
				return result
			} else {
				console.log('extend')
				// extend effect
				let empireEffectName = 'spell shield'
				let empireEffectValue = recent.empireEffectValue + 3 * 60
				let effectOwnerId = empire.id

				let effect: EmpireEffect
				effect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await effect.save()

				let result = {
					result: 'success',
					message: `Your ${eraArray[empire.era].trpwiz} cast ${
						eraArray[empire.era].spell_shield
					}. /n Your spell shield has been extended by 3 hours.`,
				}
				return result
			}
		} else {
			// expired
			console.log('create')
			// create effect
			let empireEffectName = 'spell shield'
			let empireEffectValue = 12 * 60
			let effectOwnerId = empire.id

			let effect: EmpireEffect
			effect = new EmpireEffect({
				effectOwnerId,
				empireEffectName,
				empireEffectValue,
			})
			// console.log(effect)
			await effect.save()

			let result = {
				result: 'success',
				message: `Your ${eraArray[empire.era].trpwiz} cast ${
					eraArray[empire.era].spell_shield
				}. /n Your spell shield is now active for 12 hours.`,
			}
			return result
		}
	} else {
		let wizloss = getWizLoss_self(empire)
		let result = {
			result: 'fail',
			message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
				eraArray[empire.era].spell_shield
			}`,
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}

		return result
	}
}
