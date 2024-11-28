import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_enemy, getWizLoss_enemy } from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { createNewsEvent } from "../../util/helpers"
import { getNetworth } from "../actions/actions"
import type Game from "../../entity/Game"
import { translate } from "../../util/translation"

export const blast_cost = (baseCost: number) => {
	return Math.ceil(25 * baseCost)
}

export const blast_cast = async (
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
		// console.log(effectAge)
		effectAge = Math.floor(effectAge)

		// console.log(enemyEffect)
	}

	let pubContent: any = {}
	let content: any = {}

	let score = 0

	if (getPower_enemy(empire, enemyEmpire) >= 1.5) {
		let result = {}
		if (timeLeft > 0) {
			enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.01)
			enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.01)
			enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.01)
			enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.01)

			result = {
				result: "shielded",
				message: translate("responses:spells.shielded", language),
			}

			pubContent = {
				key: "news:spells.blast.shieldedPublic",
				params: {
					caster: empire.name,
					spell: eraArray[empire.era].spell_blast,
					target: enemyEmpire.name,
				},
			}

			content = {
				key: "news:spells.blast.shieldedPrivate",
				params: {
					caster: empire.name,
					spell: eraArray[empire.era].spell_blast,
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

			empire.offSucc++
			empire.offTotal++
			enemyEmpire.defTotal++
			enemyEmpire.networth = getNetworth(enemyEmpire, game)

			score = Math.ceil(points * 0.2)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}

			await empire.save()
			await enemyEmpire.save()

			return result
		}

		enemyEmpire.trpArm -= Math.ceil(enemyEmpire.trpArm * 0.02)
		enemyEmpire.trpLnd -= Math.ceil(enemyEmpire.trpLnd * 0.02)
		enemyEmpire.trpFly -= Math.ceil(enemyEmpire.trpFly * 0.02)
		enemyEmpire.trpSea -= Math.ceil(enemyEmpire.trpSea * 0.02)
		enemyEmpire.trpWiz -= Math.ceil(enemyEmpire.trpWiz * 0.01)

		result = {
			result: "success",
			message: translate("responses:spells.blastSuccess", language),
		}

		pubContent = {
			key: "news:spells.blast.successPublic",
			params: {
				caster: empire.name,
				spell: eraArray[empire.era].spell_blast,
				target: enemyEmpire.name,
			},
		}

		content = {
			key: "news:spells.blast.successPrivate",
			params: {
				caster: empire.name,
				spell: eraArray[empire.era].spell_blast,
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

		// console.table({
		// 	trpArm: enemyEmpire.trpArm,
		// 	trpLnd: enemyEmpire.trpLnd,
		// 	trpFly: enemyEmpire.trpFly,
		// 	trpSea: enemyEmpire.trpSea,
		// 	trpWiz: enemyEmpire.trpWiz,
		// })

		empire.offSucc++
		empire.offTotal++
		enemyEmpire.defTotal++
		enemyEmpire.networth = getNetworth(enemyEmpire, game)

		score = Math.ceil(points * 0.2)
		if (score > 0) {
			empire.score += points
		}

		await empire.save()
		await enemyEmpire.save()
		// console.log(result)
		return result
	}

	const wizloss = getWizLoss_enemy(empire)
	const result = {
		result: "fail",
		message: translate("responses:spells.fail", language, {
			trpwiz: eraArray[empire.era].trpwiz,
			spell: eraArray[empire.era].spell_blast,
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
			spell: eraArray[empire.era].spell_blast,
		},
	}

	pubContent = {
		key: "news:spells.general.failPublic",
		params: {
			caster: empire.name,
			spell: eraArray[empire.era].spell_blast,
			target: enemyEmpire.name,
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
