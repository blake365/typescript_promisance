import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_enemy, getWizLoss_enemy } from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { createNewsEvent } from "../../util/helpers"
import { getNetworth } from "../actions/actions"
import type Game from "../../entity/Game"
import { translate } from "../../util/translation"

export const storm_cost = (baseCost: number) => {
	return Math.ceil(22.25 * baseCost)
}

export const storm_cast = async (
	empire: Empire,
	enemyEmpire: Empire,
	game: Game,
	points: number,
	language: string,
) => {
	const enemyEffect = await EmpireEffect.findOne({
		where: { effectOwnerId: enemyEmpire.id, empireEffectName: "spell shield" },
		order: { updatedAt: "DESC" },
	})

	let timeLeft = 0

	if (enemyEffect) {
		const now = new Date()

		let effectAge =
			(now.valueOf() - new Date(enemyEffect.updatedAt).getTime()) / 60000
		timeLeft = enemyEffect.empireEffectValue - effectAge
		// age in minutes
		console.log(effectAge)
		effectAge = Math.floor(effectAge)

		console.log(enemyEffect)
	}

	let pubContent: any = {}
	let content: any = {}

	let score = 0

	if (getPower_enemy(empire, enemyEmpire) > 1.21) {
		let result = {}
		if (timeLeft > 0) {
			const food = Math.ceil(enemyEmpire.food * 0.0304)
			const cash = Math.ceil(enemyEmpire.cash * 0.0422)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: "shielded",
				message: translate("responses:spells.stormShield", language, {
					cash: cash.toLocaleString(),
					food: food.toLocaleString(),
					foodUnit: eraArray[enemyEmpire.era].food,
				}),
			}

			pubContent = {
				key: "news:spells.storm.shieldedPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_storm,
				},
			}

			content = {
				key: "news:spells.storm.shieldedPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_storm,
					cash: cash.toLocaleString(),
					food: food.toLocaleString(),
					foodUnit: eraArray[enemyEmpire.era].food,
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
				"shielded",
				empire.game_id,
			)

			score = Math.ceil(points * 0.3)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}
		} else {
			const food = Math.ceil(enemyEmpire.food * 0.0912)
			const cash = Math.ceil(enemyEmpire.cash * 0.1266)
			enemyEmpire.food -= food
			enemyEmpire.cash -= cash

			result = {
				result: "success",
				message: translate("responses:spells.stormSuccess", language, {
					cash: cash.toLocaleString(),
					food: food.toLocaleString(),
					foodUnit: eraArray[enemyEmpire.era].food,
				}),
			}

			pubContent = {
				key: "news:spells.storm.successPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_storm,
				},
			}

			content = {
				key: "news:spells.storm.successPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_storm,
					cash: cash.toLocaleString(),
					food: food.toLocaleString(),
					foodUnit: eraArray[enemyEmpire.era].food,
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

			score = Math.ceil(points * 0.3)
			if (score > 0) {
				empire.score += points
			}
		}

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)

		await empire.save()
		await enemyEmpire.save()
		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.fail", language, {
			trpwiz: eraArray[empire.era].trpwiz,
			spell: eraArray[empire.era].spell_storm,
		}),
		wizloss: wizloss,
		descriptor: eraArray[empire.era].trpwiz,
	}

	empire.offTotal++
	enemyEmpire.defSucc++
	enemyEmpire.defTotal++
	enemyEmpire.score += 1

	await empire.save()
	await enemyEmpire.save()

	content = {
		key: "news:spells.general.failPrivate",
		params: {
			caster: empire.name,
			spell: eraArray[empire.era].spell_storm,
		},
	}

	pubContent = {
		key: "news:spells.general.failPublic",
		params: {
			caster: empire.name,
			target: enemyEmpire.name,
			spell: eraArray[empire.era].spell_storm,
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
