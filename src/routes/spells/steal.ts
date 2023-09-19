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

export const steal_cast = async (empire: Empire, enemyEmpire: Empire) => {
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

	if (getPower_enemy(empire, enemyEmpire) > 1.75) {
		let result = {}
		if (timeLeft > 0) {
			let cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(3000, 5000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy had a spell shield up. /n You stole $${cash.toLocaleString()} from the enemy. `,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded and $${cash.toLocaleString()} was stolen.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_steal
			} against you. /n Your shield protected you but they stole $${cash.toLocaleString()} from you.`

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
