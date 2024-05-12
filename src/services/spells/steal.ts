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
	game: Game,
	points: number
) => {
	const enemyEffect = await EmpireEffect.findOne({
		where: { effectOwnerId: enemyEmpire.id, empireEffectName: 'spell shield' },
		order: { updatedAt: 'DESC' },
	})

	let timeLeft = 0

	if (enemyEffect) {
		const now = new Date()

		let effectAge =
			(now.valueOf() - new Date(enemyEffect.updatedAt).getTime()) / 60000
		timeLeft = enemyEffect.empireEffectValue - effectAge
		// age in minutes
		console.log(effectAge)
		effectAge = Math.floor(effectAge)

		console.log(enemyEffect)
	}

	let pubContent = ''
	let content = ''

	let score = 0

	if (getPower_enemy(empire, enemyEmpire) > 1.75) {
		let result = {}
		if (timeLeft > 0) {
			const cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(3000, 5000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy has a spell shield. /n You stole $${cash.toLocaleString()} from the enemy. `,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
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

			score = Math.ceil(points * 0.15)
			if (score > 0) {
				empire.score += points / 2
			}
		} else {
			const cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(10000, 15000)
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: 'success',
				message: `The spell was successful! /n You stole $${cash.toLocaleString()} from the enemy.`,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_steal
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
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
		score = Math.ceil(points * 0.15)
		if (score > 0) {
			empire.score += points
		}

		await empire.save()
		await enemyEmpire.save()
		return result
	}
	const wizloss = getWizLoss_enemy(empire)
	const result = {
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
	enemyEmpire.score += 1

	await empire.save()
	await enemyEmpire.save()

	content = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_steal
	} against you and failed. `

	pubContent = `${empire.name} attempted to cast ${
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
