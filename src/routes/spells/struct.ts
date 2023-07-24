import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireEffect from '../../entity/EmpireEffect'
import { createNewsEvent } from '../../util/helpers'

export const struct_cost = (baseCost: number) => {
	return Math.ceil(18.0 * baseCost)
}

interface recentObject {
	empireEffectName?: string
	empireEffectValue?: number
	createdAt?: Date
	empireOwnerId?: number
}

const destroyBuildings = async (
	type: string,
	percent: number,
	min: number,
	enemyEmpire: Empire
) => {
	let loss = Math.ceil(enemyEmpire[type] * percent)
	if (enemyEmpire[type] > enemyEmpire.land / min) {
		enemyEmpire[type] -= loss
		enemyEmpire.freeLand += loss
		await enemyEmpire.save()
		return loss
	} else return 0
}

export const struct_cast = async (empire: Empire, enemyEmpire: Empire) => {
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

	if (getPower_enemy(empire, enemyEmpire) > 1.7) {
		let result = {}
		if (effectAge < recent.empireEffectValue) {
			let build = 0
			build += await destroyBuildings('bldCash', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldPop', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldTrp', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldCost', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldFood', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldWiz', 0.01, 100, enemyEmpire)
			build += await destroyBuildings('bldDef', 0.01, 150, enemyEmpire)

			result = {
				result: 'shielded',
				message: `The spell was successful, but the enemy had a spell shield up. /n You destroyed ${build} buildings. `,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_struct
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}). /n The spell was shielded but ${build} buildings were destroyed.`
			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_struct
			} against you. /n Your shield protected you but ${build} buildings were destroyed.`

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
			let build = 0
			build += await destroyBuildings('bldCash', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldPop', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldTrp', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldCost', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldFood', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldWiz', 0.03, 100, enemyEmpire)
			build += await destroyBuildings('bldDef', 0.03, 150, enemyEmpire)

			result = {
				result: 'success',
				message: `The spell was successful! /n You destroyed ${build} buildings.`,
			}

			let pubContent = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_struct
			} on ${enemyEmpire.name}(#${
				enemyEmpire.id
			}) and destroyed ${build} buildings.`

			let content = `${empire.name}(#${empire.id}) cast ${
				eraArray[empire.era].spell_struct
			} against you and destroyed ${build} buildings.`

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
				eraArray[empire.era].spell_struct
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
			eraArray[empire.era].spell_struct
		} against you and failed. `

		let pubContent = `${empire.name}(#${empire.id}) attempted to cast ${
			eraArray[empire.era].spell_struct
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
