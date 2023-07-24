import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import {
	getPower_enemy,
	getWizLoss_enemy,
	randomIntFromInterval,
} from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'

export const steal_cost = (baseCost: number) => {
	return Math.ceil(25.75 * baseCost)
}

interface recentObject {
	empireEffectName?: string
	empireEffectValue?: number
	createdAt?: Date
	empireOwnerId?: number
}

export const steal_cast = async (empire: Empire, enemyEmpire: Empire) => {
	let now = new Date()
	let recent: recentObject
	const enemyEffects = await EmpireEffect.find({
		where: { effectOwnerId: enemyEmpire.id, empireEffectName: 'spell shield' },
		order: { createdAt: 'DESC' },
	})

	if (enemyEffects.length > 0) {
		recent = enemyEffects[0]
	}

	let effectAge = (now.valueOf() - new Date(recent.createdAt).getTime()) / 60000
	// age in minutes
	console.log(effectAge)
	effectAge = Math.floor(effectAge)

	if (getPower_enemy(empire, enemyEmpire) > 1.75) {
		let result = {}
		if (effectAge < recent.empireEffectValue) {
			let cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(3000, 5000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy had a spell shield up. /n You stole $${cash} from the enemy. `,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded and $${cash} was stolen.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} against you. /n Your shield protected you but they stole $${cash} from you.`

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
			let cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(10000, 15000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'success',
				message: `The spell was successful! /n You stole $${cash} from the enemy.`,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}(#${enemyEmpire.id}) and stole $${cash}.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} against you and stole $${cash} from you.`

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
				eraArray[empire.era].spell_steal
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
			eraArray[empire.era].spell_steal
		} against you and failed. `

		let pubContent = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_steal
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
