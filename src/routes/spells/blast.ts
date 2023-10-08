import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'

export const blast_cost = (baseCost: number) => {
	return Math.ceil(2.5 * baseCost)
}

export const blast_cast = async (empire: Empire, enemyEmpire: Empire) => {
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

	if (getPower_enemy(empire, enemyEmpire) >= 1.15) {
		let result = {}
		if (timeLeft > 0) {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.01)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.01)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.01)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.01)
			enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.01)

			result = {
				result: 'shielded',
				message:
					'The spell was successful, but the enemy has a spell shield. /n You eliminated 1% of the enemy forces. ',
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
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
				'shielded'
			)

			return result
		} else {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.03)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.03)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.03)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.03)
			enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.03)

			result = {
				result: 'success',
				message:
					'The spell was successful! /n You eliminated 3% of the enemy forces. ',
			}

			let pubContent = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}.`

			let content = `${empire.name} cast ${
				eraArray[empire.era].spell_blast
			} against you and eliminated 3% of your forces.`

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
		enemyEmpire.networth = getNetworth(enemyEmpire)

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
			'success'
		)

		return result
	}
}
