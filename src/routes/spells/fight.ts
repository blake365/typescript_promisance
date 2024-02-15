import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import {
	getPower_enemy,
	getWizLoss_enemy,
	getPower_self,
	randomIntFromInterval,
} from './general'
import { createNewsEvent } from '../../util/helpers'
import { getNetworth } from '../actions/actions'
import { getRepository } from 'typeorm'
import { DR_RATE, TURNS_PROTECTION } from '../../config/conifg'

export const fight_cost = (baseCost: number) => {
	return Math.ceil(22.5 * baseCost)
}

const destroyBuildings = async (
	type: string,
	pcloss: number,
	enemyEmpire: Empire
) => {
	pcloss *= 0.66
	let loss = 0

	if (enemyEmpire[type] > 0) {
		console.log(enemyEmpire[type])
		loss = randomIntFromInterval(
			enemyEmpire[type] * 0.01,
			Math.ceil(pcloss * enemyEmpire[type] + 2)
		)
		if (loss > enemyEmpire[type]) {
			loss = enemyEmpire[type]
		}
	}

	enemyEmpire[type] -= loss
	await enemyEmpire.save()

	return loss
}

export const fight_cast = async (
	empire: Empire,
	enemyEmpire: Empire,
	clan: any
) => {
	const { totalLand, empireCount } = await getRepository(Empire)
		.createQueryBuilder('empire')
		.select('SUM(empire.land)', 'totalLand')
		.addSelect('COUNT(empire.id)', 'empireCount')
		.where('empire.turnsUsed > :turnsUsed AND empire.mode != :demo', {
			turnsUsed: TURNS_PROTECTION,
			demo: 'demo',
		})
		.getRawOne()

	let war = false
	if (clan) {
		let relations = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === 'war') {
				return relation.c_id2
			}
		})
		// check if clan is at war
		if (relations.includes(enemyEmpire.clanId)) {
			console.log('clan is at war')
			// clan is at war with defender
			war = true
		}
	}

	console.log(totalLand, empireCount)
	const avgLand = totalLand / empireCount
	console.log(avgLand)

	if (getPower_self(empire) < 50) {
		// spell failed to cast
		let wizloss = getWizLoss_enemy(empire)
		let result = {
			result: 'fail',
			message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
				eraArray[empire.era].spell_fight
			}.`,
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}

		empire.offTotal++
		await empire.save()

		return result
	}

	if (getPower_enemy(empire, enemyEmpire) >= 2.2) {
		let returnText = ''
		if (empire.networth > enemyEmpire.networth * 2 && !war) {
			// the attacker is ashamed, troops desert
			returnText +=
				'Your army is ashamed to fight such a weak opponent, many desert... '
			empire.trpArm = Math.round(0.97 * empire.trpArm)
			empire.trpLnd = Math.round(0.97 * empire.trpLnd)
			empire.trpFly = Math.round(0.97 * empire.trpFly)
			empire.trpSea = Math.round(0.97 * empire.trpSea)
			empire.trpWiz = Math.round(0.97 * empire.trpWiz)
		}

		if (empire.networth < enemyEmpire.networth * 0.2 && !war) {
			// the empire is fearful, troops desert
			returnText +=
				'Your army is fearful of fighting such a strong opponent, many desert... '
			empire.trpArm = Math.round(0.98 * empire.trpArm)
			empire.trpLnd = Math.round(0.98 * empire.trpLnd)
			empire.trpFly = Math.round(0.98 * empire.trpFly)
			empire.trpSea = Math.round(0.98 * empire.trpSea)
			empire.trpWiz = Math.round(0.98 * empire.trpWiz)
		}
		// spell casts successfully

		let uloss = randomIntFromInterval(0, Math.round(empire.trpWiz * 0.05 + 1))
		let eloss = randomIntFromInterval(
			0,
			Math.round(enemyEmpire.trpWiz * 0.07 + 1)
		)

		if (uloss > empire.trpWiz) {
			uloss = empire.trpWiz
		}
		if (eloss > 50 * uloss) {
			eloss = randomIntFromInterval(0, 50 * uloss + 1)
		}
		if (eloss > enemyEmpire.trpWiz) {
			eloss = enemyEmpire.trpWiz
		}

		empire.trpWiz -= uloss
		enemyEmpire.trpWiz -= eloss

		let lowLand = 1
		if (
			enemyEmpire.land < avgLand * 0.75 &&
			empire.land > enemyEmpire.land * 2 &&
			empire.land > avgLand &&
			!war
		) {
			// the defender is being "low landed"
			returnText += `Your ${
				eraArray[empire.era].trpwiz
			} are ashamed to attack an opponent with so little land, their effectiveness dropped... `
			lowLand = 0.5
		}

		let bldLoss = 0
		bldLoss += await destroyBuildings('bldCash', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldPop', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldTroop', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldCost', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldFood', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldWiz', 0.07 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('bldDef', 0.11 * lowLand, enemyEmpire)
		bldLoss += await destroyBuildings('freeLand', 0.1 * lowLand, enemyEmpire)

		enemyEmpire.land -= bldLoss
		empire.land += bldLoss
		empire.freeLand += bldLoss
		empire.attackGains += bldLoss
		enemyEmpire.attackLosses += bldLoss
		empire.attacks++
		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.diminishingReturns =
			enemyEmpire.diminishingReturns + DR_RATE / lowLand
		enemyEmpire.networth = getNetworth(enemyEmpire)

		if (empire.diminishingReturns > 0) {
			empire.diminishingReturns -= DR_RATE
		}

		if (empire.diminishingReturns < 0) {
			empire.diminishingReturns = 0
		}

		returnText += `${bldLoss.toLocaleString()} acres of land were captured from ${
			enemyEmpire.name
		}. /n 
			You killed ${eloss.toLocaleString()} ${eraArray[enemyEmpire.era].trpwiz}. /n
			You lost ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let attackDescription = {
			result: 'success',
			message: returnText,
			wizloss: uloss,
			fight: true,
		}

		let content = `${empire.name} attacked you with ${
			eraArray[empire.era].trpwiz
		} and captured ${bldLoss.toLocaleString()} acres of land. /n In the battle you lost: ${eloss.toLocaleString()} ${
			eraArray[enemyEmpire.era].trpwiz
		} /n You killed: ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let pubContent = `${empire.name} attacked ${enemyEmpire.name} with ${
			eraArray[empire.era].trpwiz
		} and captured ${bldLoss.toLocaleString()} acres of land. /n In the battle ${
			enemyEmpire.name
		} lost: ${eloss.toLocaleString()} ${eraArray[enemyEmpire.era].trpwiz} /n ${
			empire.name
		} lost: ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			'spell',
			'fail' // defense fails
		)

		await empire.save()
		await enemyEmpire.save()

		return attackDescription
	} else {
		// spell casts but attack fails
		let uloss = randomIntFromInterval(0, Math.round(empire.trpWiz * 0.08 + 1))
		let eloss = randomIntFromInterval(
			0,
			Math.round(enemyEmpire.trpWiz * 0.04 + 1)
		)

		if (uloss > empire.trpWiz) {
			uloss = empire.trpWiz
		}
		if (eloss > 50 * uloss) {
			eloss = randomIntFromInterval(0, 50 * uloss + 1)
		}
		if (eloss > enemyEmpire.trpWiz) {
			eloss = enemyEmpire.trpWiz
		}

		empire.trpWiz -= uloss
		enemyEmpire.trpWiz -= eloss

		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.defSucc++
		enemyEmpire.diminishingReturns = enemyEmpire.diminishingReturns + DR_RATE
		if (empire.diminishingReturns > 0) {
			empire.diminishingReturns -= DR_RATE
		}

		if (empire.diminishingReturns < 0) {
			empire.diminishingReturns = 0
		}

		let returnText = `Your attack was repelled by ${enemyEmpire.name}. /n 
			You killed ${eloss.toLocaleString()} ${eraArray[enemyEmpire.era].trpwiz}. /n
			You lost ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let attackDescription = {
			result: 'fail',
			message: returnText,
			wizloss: uloss,
			fight: true,
		}

		let content = `
		You successfully defended your empire. /n
		${empire.name} attacked you with ${
			eraArray[empire.era].trpwiz
		}. /n In the battle you lost: ${eloss.toLocaleString()} ${
			eraArray[enemyEmpire.era].trpwiz
		} /n You killed: ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let pubContent = `
		${enemyEmpire.name} successfully defended their empire against ${empire.name}.
			 /n In the battle ${enemyEmpire.name} lost: ${eloss.toLocaleString()} ${
			eraArray[enemyEmpire.era].trpwiz
		} /n ${empire.name} lost: ${uloss.toLocaleString()} ${
			eraArray[empire.era].trpwiz
		}.`

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			'spell',
			'success' // defense succeeds
		)

		enemyEmpire.networth = getNetworth(enemyEmpire)

		await empire.save()
		await enemyEmpire.save()

		return attackDescription
	}
}
