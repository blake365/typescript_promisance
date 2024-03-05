import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import Game from '../../entity/Game'

export const blast_cost = (baseCost: number) => {
	return Math.ceil(2.75 * baseCost)
}

export const blast_cast = async (
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
		// console.log(effectAge)
		effectAge = Math.floor(effectAge)

		// console.log(enemyEffect)
	}

	if (getPower_enemy(empire, enemyEmpire) >= 1.2) {
		let result = {}
		if (timeLeft > 0) {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.0075)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.0075)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.0075)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.0075)

			result = {
				result: 'shielded',
				message:
					'The spell was successful, but the enemy has a spell shield. /n You eliminated 0.75% of the enemy forces. ',
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} against you. /n Your shield protected you. They eliminated 0.75% of your forces.`

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

			return result
		} else {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.015)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.015)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.015)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.015)
			enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.005)

			result = {
				result: 'success',
				message:
					'The spell was successful! /n You eliminated 1.5% of the enemy forces. ',
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} against you and eliminated 1.5% of your forces.`

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
		// console.log(result)
		return result
	} else {
		let wizloss = getWizLoss_enemy(empire)
		let result = {
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

		await empire.save()
		await enemyEmpire.save()

		let content = `${empire.name} attempted to cast ${
			eraArray[empire.era].spell_blast
		} against you and failed. `

		let pubContent = `${empire.name} attempted to cast ${
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
}
