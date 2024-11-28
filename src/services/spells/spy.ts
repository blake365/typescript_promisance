import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_enemy, getWizLoss_enemy } from "./general"
import EmpireIntel from "../../entity/EmpireIntel"
import { createNewsEvent } from "../../util/helpers"
import { translate } from "../../util/translation"

export const spy_cost = (baseCost: number) => {
	return Math.ceil(1 * baseCost)
}

export const spy_cast = async (
	empire: Empire,
	enemyEmpire: Empire,
	language: string,
) => {
	console.log("spy cast")
	if (getPower_enemy(empire, enemyEmpire) >= 1) {
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
			result: "success",
			message: translate("responses:spells.spySuccess", language, {
				trpwiz: eraArray[empire.era].trpwiz,
				spell: eraArray[empire.era].spell_spy,
			}),
			wizloss: 0,
			descriptor: eraArray[empire.era].trpwiz,
			intel: intel,
		}

		const pubContent = {
			key: "news:spells.spy.successPublic",
			params: {
				attacker: empire.name,
				defender: enemyEmpire.name,
				spell: eraArray[empire.era].spell_spy,
			},
		}

		const content = {
			key: "news:spells.spy.successPrivate",
			params: {
				attacker: empire.name,
				spell: eraArray[empire.era].spell_spy,
			},
		}

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			"spell",
			"fail",
			empire.game_id,
		)

		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.fail", language, {
			trpwiz: eraArray[empire.era].trpwiz,
			spell: eraArray[empire.era].spell_spy,
		}),
		wizloss: wizloss,
		descriptor: eraArray[empire.era].trpwiz,
	}

	const content = {
		key: "news:spells.general.failPrivate",
		params: {
			caster: empire.name,
			spell: eraArray[empire.era].spell_spy,
		},
	}

	const pubContent = {
		key: "news:spells.general.failPublic",
		params: {
			caster: empire.name,
			target: enemyEmpire.name,
			spell: eraArray[empire.era].spell_spy,
		},
	}

	await createNewsEvent(
		content,
		pubContent,
		empire.id,
		empire.name,
		enemyEmpire.id,
		enemyEmpire.name,
		"spell",
		"success",
		empire.game_id,
	)

	return result
}
