import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const shield_cost = (baseCost: number) => {
	return Math.ceil(4.9 * baseCost)
}

export const shield_cast = async (empire: Empire) => {
	console.log('casting shield')

	let now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: empire.id, empireEffectName: 'spell shield' },
		order: { createdAt: 'DESC' },
	})

	// figure out age of effect and see if it is expired
	// if expired, create new effect
	// if not expired, renew or extend effect
	let effectAge = (now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
	let timeLeft = effect.empireEffectValue - effectAge
	// age in minutes
	console.log(effectAge)
	effectAge = Math.floor(effectAge)

	console.log(effect)

	if (getPower_self(empire) >= 15) {
		if (effect) {
			if (timeLeft <= 0) {
				effect.softRemove()
				console.log('expired')
				// create effect
				let empireEffectName = 'spell shield'
				let empireEffectValue = 12 * 60
				let effectOwnerId = empire.id

				let newEffect: EmpireEffect
				newEffect = new EmpireEffect({
					effectOwnerId,
					empireEffectName,
					empireEffectValue,
				})
				// console.log(effect)
				await newEffect.save()

				let result = {
					result: 'success',
					message: `Your ${eraArray[empire.era].trpwiz} cast ${
						eraArray[empire.era].spell_shield
					}. /n Your spell shield is now active for 12 hours.`,
					wizloss: 0,
					descriptor: eraArray[empire.era].trpwiz,
				}
				return result
			}
			if (timeLeft < 9 * 60) {
				console.log('renew')
				// renew effect
				effect.empireEffectValue = 12 * 60
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
				effect.empireEffectValue += 3 * 60

				// console.log(effect)
				await effect.save()

				let result = {
					result: 'success',
					message: `Your ${eraArray[empire.era].trpwiz} cast ${
						eraArray[empire.era].spell_shield
					}. /n Your spell shield has been extended by 3 hours.`,
					wizloss: 0,
					descriptor: eraArray[empire.era].trpwiz,
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
				wizloss: 0,
				descriptor: eraArray[empire.era].trpwiz,
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
