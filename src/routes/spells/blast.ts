import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'

export const blast_cost = (baseCost: number) => {
	return Math.ceil(2.5 * baseCost)
}

interface recentObject {
	empireEffectName?: string
	empireEffectValue?: number
	createdAt?: Date
	empireOwnerId?: number
}

export const blast_cast = async (empire: Empire, enemyEmpire: Empire) => {
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

	if (getPower_enemy(empire, enemyEmpire) >= 1.15) {
		let result = {}
		if (effectAge < recent.empireEffectValue) {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.01)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.01)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.01)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.01)
			enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.01)

			result = {
				result: 'shielded',
				message:
					'The spell was successful, but the enemy had a spell shield up. /n You eliminated 1% of the enemy forces. ',
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded and eliminated 1% of their forces.`

			let content = `${empire.name}(#${empire.id}) cast ${
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

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_blast
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}) and eliminated 3% of their forces.`

			let content = `${empire.name}(#${empire.id}) cast ${
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

		await empire.save()
		await enemyEmpire.save()
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

		let content = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_blast
		} against you and failed. `

		let pubContent = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_blast
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