import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
import {
	getPower_enemy,
	getWizLoss_enemy,
	randomIntFromInterval,
} from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import type Game from '../../entity/Game'

export const steal_cost = (baseCost: number) => {
	return Math.ceil(25.75 * baseCost)
}

export const steal_cast = async (
	empire: Empire,
	enemyEmpire: Empire,
	game: Game
) => {
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
				message: `The spell was successful, but the enemy has a spell shield. /n You stole $${cash.toLocaleString()} from the enemy. `,
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
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
				'shielded',
				empire.game_id
			)
		} else {
			let cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(10000, 15000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'success',
				message: `The spell was successful! /n You stole $${cash.toLocaleString()} from the enemy.`,
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
				eraArray[empire.era].spell_steal
			} against you and stole $${cash.toLocaleString()} from you.`

			await createNewsEvent(
				content,
				pubContent,
				empire.id,
				empire.name,
				enemyEmpire.id,
				enemyEmpire.name,
				'spell',
				'fail',
				empire.game_id
			)
		}

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)

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

		let content = `${empire.name} attempted to cast ${
			eraArray[empire.era].spell_steal
		} against you and failed. `

		let pubContent = `${empire.name} attempted to cast ${
			eraArray[empire.era].spell_steal
		} on ${enemyEmpire.name} and failed.`

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			'spell',
			'success',
			empire.game_id
		)

		return result
	}
}
