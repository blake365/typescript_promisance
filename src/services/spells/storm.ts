import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import type Game from '../../entity/Game'

export const storm_cost = (baseCost: number) => {
	return Math.ceil(7.25 * baseCost)
}

export const storm_cast = async (
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

	if (getPower_enemy(empire, enemyEmpire) > 1.21) {
		let result = {}
		if (timeLeft > 0) {
			const food = Math.ceil(enemyEmpire.food * 0.0304)
			const cash = Math.ceil(enemyEmpire.cash * 0.0422)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy has a spell shield. /n You destroyed $${cash.toLocaleString()} and ${food.toLocaleString()} ${
					eraArray[enemyEmpire.era].food
				}. `,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_storm
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
				eraArray[empire.era].spell_storm
			} against you. /n Your shield protected you but they destroyed $${cash.toLocaleString()} and ${food.toLocaleString()} ${
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
				'shielded',
				empire.game_id
			)

			score = Math.ceil(points * 0.3)
			if (score > 0) {
				empire.score += points / 2
			}
		} else {
			const food = Math.ceil(enemyEmpire.food * 0.0912)
			const cash = Math.ceil(enemyEmpire.cash * 0.1266)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: 'success',
				message: `The spell was successful! /n You destroyed $${cash.toLocaleString()} and ${food.toLocaleString()} ${
					eraArray[enemyEmpire.era].food
				}.`,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_storm
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
				eraArray[empire.era].spell_storm
			} against you and destroyed $${cash.toLocaleString()} and ${food.toLocaleString()} ${
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
				'fail',
				empire.game_id
			)

			score = Math.ceil(points * 0.3)
			if (score > 0) {
				empire.score += points
			}
		}

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)

		await empire.save()
		await enemyEmpire.save()
		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
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
	enemyEmpire.score += 1

	await empire.save()
	await enemyEmpire.save()

	content = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_storm
	} against you and failed. `

	pubContent = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_storm
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
