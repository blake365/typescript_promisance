import { eraArray } from '../../config/eras'
import type Empire from '../../entity/Empire'
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
		const ownerId = empire.id
		const spiedEmpireId = enemyEmpire.id
		const shared = true
		const cash = enemyEmpire.cash
		const era = enemyEmpire.era
		const food = enemyEmpire.food
		const trpArm = enemyEmpire.trpArm
		const trpLnd = enemyEmpire.trpLnd
		const trpFly = enemyEmpire.trpFly
		const trpSea = enemyEmpire.trpSea
		const trpWiz = enemyEmpire.trpWiz
		const name = enemyEmpire.name
		const land = enemyEmpire.land
		const networth = enemyEmpire.networth
		const health = enemyEmpire.health
		const clanId = enemyEmpire.clanId
		const peasants = enemyEmpire.peasants
		const race = enemyEmpire.race
		const rank = enemyEmpire.rank
		const tax = enemyEmpire.tax
		const turns = enemyEmpire.turns
		const storedturns = enemyEmpire.storedturns
		const game_id = empire.game_id

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
			game_id,
		})

		await intel.save()

		const result = {
			result: 'success',
			message: `Your ${eraArray[empire.era].trpwiz} successfully cast ${
				eraArray[empire.era].spell_spy
			} on your opponent.`,
			wizloss: 0,
			descriptor: eraArray[empire.era].trpwiz,
			intel: intel,
		}

		const content = `${empire.name} cast ${
			eraArray[empire.era].spell_spy
		} against you and viewed your empire information. `

		const pubContent = `${empire.name} cast ${
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
			'fail',
			empire.game_id
		)

		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: 'fail',
		message: `Your ${eraArray[empire.era].trpwiz} failed to cast ${
			eraArray[empire.era].spell_spy
		} on your opponent.`,
		wizloss: wizloss,
		descriptor: eraArray[empire.era].trpwiz,
	}

	const content = `${empire.name} attempted to cast ${
		eraArray[empire.era].spell_spy
	} against you and failed. `

	const pubContent = `${empire.name} attempted to cast ${
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
		'success',
		empire.game_id
	)

	return result
}
