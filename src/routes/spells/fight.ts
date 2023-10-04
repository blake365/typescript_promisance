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

export const fight_cost = (baseCost: number) => {
	return Math.ceil(22.5 * baseCost)
}

const destroyBuildings = async (
	type: string,
	pcloss: number,
	enemyEmpire: Empire
) => {
	pcloss /= 3
	let loss = 0

	if (enemyEmpire[type] > 0) {
		loss = randomIntFromInterval(1, Math.ceil(pcloss * enemyEmpire[type] + 2))
		if (loss > enemyEmpire[type]) {
			loss = enemyEmpire[type]
		}
	}

	enemyEmpire[type] -= loss
	await enemyEmpire.save()

	return loss
}

export const fight_cast = async (empire: Empire, enemyEmpire: Empire) => {
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
		enemyEmpire.defTotal++

		await empire.save()
		await enemyEmpire.save()

		return result
	}

	if (getPower_enemy(empire, enemyEmpire) >= 2.2) {
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

		let bldLoss = 0
		bldLoss += await destroyBuildings('bldCash', 0.05, enemyEmpire)
		bldLoss += await destroyBuildings('bldPop', 0.07, enemyEmpire)
		bldLoss += await destroyBuildings('bldTrp', 0.07, enemyEmpire)
		bldLoss += await destroyBuildings('bldCost', 0.07, enemyEmpire)
		bldLoss += await destroyBuildings('bldFood', 0.08, enemyEmpire)
		bldLoss += await destroyBuildings('bldWiz', 0.07, enemyEmpire)
		bldLoss += await destroyBuildings('bldDef', 0.11, enemyEmpire)
		bldLoss += await destroyBuildings('freeLand', 0.1, enemyEmpire)

		enemyEmpire.land -= bldLoss
		empire.land += bldLoss
		empire.freeLand += bldLoss
		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire)

		let returnText = `${bldLoss.toLocaleString()} acres of land were captured from ${
			enemyEmpire.name
		}(#${enemyEmpire.id}). /n 
			You killed ${eloss.toLocaleString()} ${eraArray[enemyEmpire.era].trpwiz}. /n
			You lost ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let attackDescription = {
			result: 'success',
			message: returnText,
			wizloss: uloss,
		}

		let content = `${empire.name}(#${empire.id}) attacked you with ${
			eraArray[empire.era].trpwiz
		} and captured ${bldLoss.toLocaleString()} acres of land. /n In the battle you lost: ${eloss.toLocaleString()} ${
			eraArray[enemyEmpire.era].trpwiz
		} /n You killed: ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let pubContent = `${empire.name}(#${empire.id}) attacked ${
			enemyEmpire.name
		}(#${enemyEmpire.id}) with ${
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
			Math.round(enemyEmpire.trpWiz * 0.4 + 1)
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

		let returnText = `Your attack was repelled by ${enemyEmpire.name}(#${
			enemyEmpire.id
		}). /n 
			You killed ${eloss.toLocaleString()} ${eraArray[enemyEmpire.era].trpwiz}. /n
			You lost ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let attackDescription = {
			result: 'fail',
			message: returnText,
			wizloss: uloss,
		}

		let content = `
		You successfully defended your empire. /n
		${empire.name}(#${empire.id}) attacked you with ${
			eraArray[empire.era].trpwiz
		}. /n In the battle you lost: ${eloss.toLocaleString()} ${
			eraArray[enemyEmpire.era].trpwiz
		} /n You killed: ${uloss.toLocaleString()} ${eraArray[empire.era].trpwiz}.`

		let pubContent = `
		${enemyEmpire.name}(#${
			enemyEmpire.id
		}) successfully defended their empire against ${empire.name} (#${
			empire.id
		}).
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
