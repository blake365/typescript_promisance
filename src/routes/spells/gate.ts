import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import EmpireEffect from '../../entity/EmpireEffect'
import { getPower_self, getWizLoss_self } from './general'

export const gate_cost = (baseCost: number) => {
	return Math.ceil(20.0 * baseCost)
}

export const gate_cast = async (empire: Empire) => {
	let now = new Date()
	const effect = await EmpireEffect.findOne({
		where: { effectOwnerId: empire.id, empireEffectName: 'time gate' },
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

	if (getPower_self(empire) >= 75) {
		if (effect) {
			if (timeLeft <= 0) {
				effect.remove()
				console.log('expired')
				// create effect
				let empireEffectName = 'time gate'
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
						eraArray[empire.era].spell_gate
					}. /n Your time gate is now active for 12 hours.`,
					wizloss: 0,
					descriptor: eraArray[empire.era].trpwiz,
				}
				return result
			} else if (timeLeft < 9 * 60) {
				console.log('renew')
				// renew effect
				effect.empireEffectValue = 12 * 60

				// console.log(effect)
				await effect.save()

				let result = {
					result: 'success',
					message: `Your ${eraArray[empire.era].trpwiz} cast ${
						eraArray[empire.era].spell_gate
					}. /n Your time gate is has been renewed to 12 hours.`,
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
						eraArray[empire.era].spell_gate
					}. /n Your time gate has been extended by 3 hours.`,
				}
				return result
			}
		} else {
			console.log('create')
			// create effect
			let empireEffectName = 'time gate'
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
					eraArray[empire.era].spell_gate
				}. /n Your time gate is now active for 12 hours.`,
			}
			return result
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
