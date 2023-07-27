import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import {
	getPower_enemy,
	getWizLoss_enemy,
	randomIntFromInterval,
} from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'

export const storm_cost = (baseCost: number) => {
	return Math.ceil(7.25 * baseCost)
}

export const storm_cast = async (empire: Empire, enemyEmpire: Empire) => {
	const enemyEffect = await EmpireEffect.findOne({
		where: { effectOwnerId: enemyEmpire.id, empireEffectName: 'spell shield' },
		order: { updatedAt: 'DESC' },
	})

	let timeLeft = 0

	if (enemyEffect) {
		let now = new Date()

		let effectAge =
			(now.valueOf() - new Date(enemyEffect.updatedAt).getTime()) / 60000
		timeLeft = enemyEffect.empireEffectValue - effectAge
		// age in minutes
		console.log(effectAge)
		effectAge = Math.floor(effectAge)

		console.log(enemyEffect)
	}

	if (getPower_enemy(empire, enemyEmpire) > 1.21) {
		let result = {}
		if (timeLeft > 0) {
			let food = Math.ceil(enemyEmpire.food * 0.0304)
			let cash = Math.ceil(enemyEmpire.cash * 0.0422)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy had a spell shield up. /n You destroyed $${cash} and ${food} ${
					eraArray[enemyEmpire.era].food
				}. `,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_storm
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded but $${cash} and ${food} ${
				eraArray[enemyEmpire.era].food
			} were destroyed.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_storm
			} against you. /n Your shield protected you but they stole $${cash} and ${food} ${
				eraArray[enemyEmpire.era].food
			} were destroyed.`

			await createNewsEvent(
				content,
				pubContent,
				empire.id,
				empire.name,
				enemyEmpire.id,
				enemyEmpire.name,
				'spell',
				'shielded'
			)
		} else {
			let food = Math.ceil(enemyEmpire.food * 0.0912)
			let cash = Math.ceil(enemyEmpire.cash * 0.1266)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: 'success',
				message: `The spell was successful! /n You destroyed $${cash} and ${food} ${
					eraArray[enemyEmpire.era].food
				}.`,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_storm
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}) and destroyed $${cash} and ${food} ${eraArray[enemyEmpire.era].food}.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_storm
			} against you and destroyed $${cash} and ${food} ${
				eraArray[enemyEmpire.era].food
			}.`

			await createNewsEvent(
				content,
				pubContent,
				empire.id,
				empire.name,
				enemyEmpire.id,
				enemyEmpire.name,
				'spell',
				'fail'
			)
		}

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++

		await empire.save()
		await enemyEmpire.save()
		return result
	} else {
		let wizloss = getWizLoss_enemy(empire)
		let result = {
			result: 'fail',
			message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
				eraArray[empire.era].spell_storm
			} on your opponent.`,
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}

		empire.offTotal++
		enemyEmpire.defSucc++
		enemyEmpire.defTotal++

		await empire.save()
		await enemyEmpire.save()

		let content = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_storm
		} against you and failed. `

		let pubContent = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_storm
		} on ${enemyEmpire.name}(#${enemyEmpire.id}) and failed.`

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			'spell',
			'success'
		)

		return result
	}
}
