import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import {
	getPower_enemy,
	getWizLoss_enemy,
	randomIntFromInterval,
} from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { createNewsEvent } from "../../util/helpers"
import { getNetworth } from "../actions/actions"
import type Game from "../../entity/Game"
import { translate } from "../../util/translation"

export const steal_cost = (baseCost: number) => {
	return Math.ceil(30.75 * baseCost)
}

export const steal_cast = async (
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

	if (getPower_enemy(empire, enemyEmpire) > 1.75) {
		let result = {}
		if (timeLeft > 0) {
			const cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(3000, 5000),
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: "shielded",
				message: translate("responses:spells.stealShield", language, {
					cash: cash.toLocaleString(),
				}),
			}

			pubContent = {
				key: "news:spells.steal.shieldedPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_steal,
				},
			}

			content = {
				key: "news:spells.steal.shieldedPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_steal,
					cash: cash.toLocaleString(),
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

			score = Math.ceil(points * 0.15)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}
		} else {
			const cash = Math.round(
				(enemyEmpire.cash / 100000) * randomIntFromInterval(10000, 15000),
			)
			enemyEmpire.cash -= cash
			empire.cash += cash

			result = {
				result: "success",
				message: translate("responses:spells.stealSuccess", language, {
					cash: cash.toLocaleString(),
				}),
			}

			pubContent = {
				key: "news:spells.steal.successPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_steal,
				},
			}

			content = {
				key: "news:spells.steal.successPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_steal,
					cash: cash.toLocaleString(),
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
		}

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)
		score = Math.ceil(points * 0.15)
		if (score > 0) {
			empire.score += points
		}

		await empire.save()
		await enemyEmpire.save()
		return result
	}
	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.fail", language, {
			trpwiz: eraArray[empire.era].trpwiz,
			spell: eraArray[empire.era].spell_steal,
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
			spell: eraArray[empire.era].spell_steal,
		},
	}

	pubContent = {
		key: "news:spells.general.failPublic",
		params: {
			caster: empire.name,
			target: enemyEmpire.name,
			spell: eraArray[empire.era].spell_steal,
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
