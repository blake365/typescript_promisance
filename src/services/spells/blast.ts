import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import type Game from '../../entity/Game'

export const blast_cost = (baseCost: number) => {
	return Math.ceil(2.75 * baseCost)
}

export const blast_cast = async (
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
		// console.log(effectAge)
		effectAge = Math.floor(effectAge)

		// console.log(enemyEffect)
	}

	let pubContent = ''
	let content = ''

	let score = 0

	if (getPower_enemy(empire, enemyEmpire) >= 1.5) {
		let result = {}
		if (timeLeft > 0) {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.01)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.01)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.01)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.01)

			result = {
				result: 'shielded',
				message:
					'The spell was successful, but the enemy has a spell shield. /n You eliminated 1% of the enemy forces. ',
			}

			pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}.`

			content = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} against you. /n Your shield protected you. They eliminated 1% of your forces.`

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

			empire.offSucc++
			empire.offTotal++
			enemyEmpire.defTotal++
			enemyEmpire.networth = getNetworth(enemyEmpire, game)

			score = Math.ceil(points * 0.2)
			if (score > 0) {
				empire.score += points / 2
			}

			await empire.save()
			await enemyEmpire.save()

			return result
		}

		enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.02)
		enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.02)
		enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.02)
		enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.02)
		enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.01)

		result = {
			result: 'success',
			message:
				'The spell was successful! /n You eliminated 2% of the enemy forces. ',
		}

		pubContent = `${empire.name} cast ${eraArray[empire.era].spell_blast} on ${
			enemyEmpire.name
		}.`

		content = `${empire.name} cast ${
			eraArray[empire.era].spell_blast
		} against you and eliminated 2% of your forces.`

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

		// console.table({
		// 	trpArm: enemyEmpire.trpArm,
		// 	trpLnd: enemyEmpire.trpLnd,
		// 	trpFly: enemyEmpire.trpFly,
		// 	trpSea: enemyEmpire.trpSea,
		// 	trpWiz: enemyEmpire.trpWiz,
		// })

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)

		score = Math.ceil(points * 0.2)
		if (score > 0) {
			empire.score += points
		}

		await empire.save()
		await enemyEmpire.save()
		// console.log(result)
		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: 'fail',
		message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
			eraArray[empire.era].spell_blast
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
		eraArray[empire.era].spell_blast
	} against you and failed. `

	pubContent = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_blast
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
