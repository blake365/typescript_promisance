import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import type Game from '../../entity/Game'

export const runes_cost = (baseCost: number) => {
	return Math.ceil(9.5 * baseCost)
}

export const runes_cast = async (
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

	if (getPower_enemy(empire, enemyEmpire) > 1.3) {
		let result = {}
		if (timeLeft > 0) {
			const rune = Math.ceil(enemyEmpire.runes * 0.01)
			enemyEmpire.runes -= rune

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy has a spell shield. /n You eliminated 1% of the enemy ${
					eraArray[enemyEmpire.era].runes
				}. `,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_runes
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
				eraArray[empire.era].spell_runes
			} against you. /n Your shield protected you. They eliminated 1% of your ${
				eraArray[enemyEmpire.era].runes
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

			score = Math.ceil(points * 0.2)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}
		} else {
			const runes = Math.ceil(enemyEmpire.runes * 0.03)
			enemyEmpire.runes -= runes

			result = {
				result: 'success',
				message: `The spell was successful! /n You eliminated 3% of the enemy ${
					eraArray[enemyEmpire.era].runes
				}.`,
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_runes
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
				eraArray[empire.era].spell_runes
			} against you and eliminated 3% of your ${
				eraArray[enemyEmpire.era].runes
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

			score = Math.ceil(points * 0.4)
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
			eraArray[empire.era].spell_runes
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
		eraArray[empire.era].spell_runes
	} against you and failed. `

	pubContent = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_runes
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
