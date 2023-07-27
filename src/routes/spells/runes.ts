import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'

export const runes_cost = (baseCost: number) => {
	return Math.ceil(9.5 * baseCost)
}

export const runes_cast = async (empire: Empire, enemyEmpire: Empire) => {
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

	if (getPower_enemy(empire, enemyEmpire) > 1.3) {
		let result = {}
		if (timeLeft > 0) {
			let rune = Math.ceil(enemyEmpire.runes * 0.01)
			enemyEmpire.runes -= rune

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy had a spell shield up. /n You eliminated 1% of the enemy ${
					eraArray[enemyEmpire.era].runes
				}. `,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_runes
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded and eliminated 1% of their ${
				eraArray[enemyEmpire.era].runes
			}.`

			let content = `${empire.name}(#${empire.id}) cast ${
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
				'shielded'
			)
		} else {
			let runes = Math.ceil(enemyEmpire.runes * 0.03)
			enemyEmpire.runes -= runes

			result = {
				result: 'success',
				message: `The spell was successful! /n You eliminated 3% of the enemy ${
					eraArray[enemyEmpire.era].runes
				}.`,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_runes
			} on ${enemyEmpire.name}(#${enemyEmpire.id}) and eliminated 3% of their ${
				eraArray[enemyEmpire.era].runes
			}.`

			let content = `${empire.name}(#${empire.id}) cast ${
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
				eraArray[empire.era].spell_runes
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
			eraArray[empire.era].spell_runes
		} against you and failed. `

		let pubContent = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_runes
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
