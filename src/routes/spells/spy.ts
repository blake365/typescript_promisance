import { eraArray } from '../../config/eras'
import Empire from '../../entity/Empire'
import { getPower_enemy, getWizLoss_enemy } from './general'
import EmpireIntel from '../../entity/EmpireIntel'
import { createNewsEvent } from '../../util/helpers'

export const spy_cost = (baseCost: number) => {
	return Math.ceil(1 * baseCost)
}

export const spy_cast = async (empire: Empire, enemyEmpire: Empire) => {
	console.log('spy cast')
	if (getPower_enemy(empire, enemyEmpire) > 1) {
		// spy success
		// display enemy info and save to intel table
		let ownerId = empire.id
		let spiedEmpireId = enemyEmpire.id
		let shared = true
		let cash = enemyEmpire.cash
		let era = enemyEmpire.era
		let food = enemyEmpire.food
		let trpArm = enemyEmpire.trpArm
		let trpLnd = enemyEmpire.trpLnd
		let trpFly = enemyEmpire.trpFly
		let trpSea = enemyEmpire.trpSea
		let trpWiz = enemyEmpire.trpWiz
		let name = enemyEmpire.name
		let land = enemyEmpire.land
		let networth = enemyEmpire.networth
		let health = enemyEmpire.health
		let clanId = enemyEmpire.clanId
		let peasants = enemyEmpire.peasants
		let race = enemyEmpire.race
		let rank = enemyEmpire.rank
		let tax = enemyEmpire.tax
		let turns = enemyEmpire.turns
		let storedturns = enemyEmpire.storedturns

		let intel: EmpireIntel = null

		intel = new EmpireIntel({
			ownerId,
			spiedEmpireId,
			shared,
			cash,
			era,
			food,
			trpArm,
			trpLnd,
			trpFly,
			trpSea,
			trpWiz,
			name,
			land,
			networth,
			health,
			clanId,
			peasants,
			race,
			rank,
			turns,
			storedturns,
			tax,
		})

		await intel.save()

		let result = {
			result: 'success',
			message: `Your ${eraArray[empire.era].trpwiz} successfully cast ${
				eraArray[empire.era].spell_spy
			} on your opponent.`,
			wizloss: 0,
			descriptor: eraArray[empire.era].trpwiz,
			intel: intel,
		}

		let content = `${empire.name} cast ${
			eraArray[empire.era].spell_spy
		} against you and viewed your empire information. `

		let pubContent = `${empire.name} cast ${
			eraArray[empire.era].spell_spy
		} on ${enemyEmpire.name} and viewed their empire information.`

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

		return result
	} else {
		let wizloss = getWizLoss_enemy(empire)
		let result = {
			result: 'fail',
			message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
				eraArray[empire.era].spell_spy
			} on your opponent.`,
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		}

		let content = `${empire.name} attempted to cast ${
			eraArray[empire.era].spell_spy
		} against you and failed. `

		let pubContent = `${empire.name} attempted to cast ${
			eraArray[empire.era].spell_spy
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
