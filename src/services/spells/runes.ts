import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_enemy, getWizLoss_enemy } from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { createNewsEvent } from "../../util/helpers"
import { getNetworth } from "../actions/actions"
import type Game from "../../entity/Game"
import { translate } from "../../util/translation"

export const runes_cost = (baseCost: number) => {
	return Math.ceil(24.5 * baseCost)
}

export const runes_cast = async (
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

	if (getPower_enemy(empire, enemyEmpire) > 1.3) {
		let result = {}
		if (timeLeft > 0) {
			const rune = Math.ceil(enemyEmpire.runes * 0.01)
			enemyEmpire.runes -= rune

			result = {
				result: "shielded",
				message: translate("responses:spells.runesShield", language, {
					runes: eraArray[enemyEmpire.era].runes,
				}),
			}

			pubContent = {
				key: "news:spells.runes.shieldedPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_runes,
				},
			}

			content = {
				key: "news:spells.runes.shieldedPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_runes,
					runes: Math.ceil(enemyEmpire.runes * 0.01).toLocaleString(),
					runeType: eraArray[enemyEmpire.era].runes,
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

			score = Math.ceil(points * 0.2)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}
		} else {
			const runes = Math.ceil(enemyEmpire.runes * 0.03)
			enemyEmpire.runes -= runes

			result = {
				result: "success",
				message: translate("responses:spells.runesSuccess", language, {
					runes: eraArray[enemyEmpire.era].runes,
				}),
			}

			pubContent = {
				key: "news:spells.runes.successPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_runes,
				},
			}

			content = {
				key: "news:spells.runes.successPrivate",
				params: {
					attacker: empire.name,
					spell: eraArray[empire.era].spell_runes,
					runes: Math.ceil(enemyEmpire.runes * 0.03).toLocaleString(),
					runeType: eraArray[enemyEmpire.era].runes,
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

			score = Math.ceil(points * 0.4)
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
			spell: eraArray[empire.era].spell_runes,
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
			spell: eraArray[empire.era].spell_runes,
		},
	}

	pubContent = {
		key: "news:spells.general.failPublic",
		params: {
			caster: empire.name,
			target: enemyEmpire.name,
			spell: eraArray[empire.era].spell_runes,
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
