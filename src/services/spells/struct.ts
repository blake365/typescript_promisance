import { eraArray } from "../../config/eras"
import type Empire from "../../entity/Empire"
import { getPower_enemy, getWizLoss_enemy } from "./general"
import EmpireEffect from "../../entity/EmpireEffect"
import { createNewsEvent } from "../../util/helpers"
import { getNetworth } from "../actions/actions"
import type Game from "../../entity/Game"
import { translate } from "../../util/translation"

export const struct_cost = (baseCost: number) => {
	return Math.ceil(23.0 * baseCost)
}

const destroyBuildings = async (
	type: string,
	percent: number,
	min: number,
	enemyEmpire: Empire,
) => {
	const loss = Math.ceil(enemyEmpire[type] * percent)
	if (enemyEmpire[type] > enemyEmpire.land / min) {
		enemyEmpire[type] -= loss
		enemyEmpire.freeLand += loss
		await enemyEmpire.save()
		return loss
	}
	return 0
}

export const struct_cast = async (
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

	if (getPower_enemy(empire, enemyEmpire) > 1.7) {
		let result = {}
		if (timeLeft > 0) {
			let build = 0
			build += await destroyBuildings("bldCash", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldPop", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldTrp", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldCost", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldFood", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldWiz", 0.01, 100, enemyEmpire)
			build += await destroyBuildings("bldDef", 0.01, 150, enemyEmpire)

			result = {
				result: "shielded",
				message: translate("responses:spells.structShielded", language, {
					buildings: build.toLocaleString(),
				}),
			}

			pubContent = {
				key: "news:spells.struct.shieldedPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_struct,
				},
			}

			content = {
				key: "news:spells.struct.shieldedPrivate",
				params: {
					attacker: empire.name,
					buildings: build.toLocaleString(),
					spell: eraArray[empire.era].spell_struct,
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

			score = Math.ceil(points * 0.5)
			if (score > 0) {
				empire.score += Math.round(points / 2)
			}
		} else {
			let build = 0
			build += await destroyBuildings("bldCash", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldPop", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldTrp", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldCost", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldFood", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldWiz", 0.03, 100, enemyEmpire)
			build += await destroyBuildings("bldDef", 0.03, 150, enemyEmpire)

			result = {
				result: "success",
				message: translate("responses:spells.structSuccess", language, {
					buildings: build.toLocaleString(),
				}),
			}

			pubContent = {
				key: "news:spells.struct.successPublic",
				params: {
					attacker: empire.name,
					defender: enemyEmpire.name,
					spell: eraArray[empire.era].spell_struct,
				},
			}

			content = {
				key: "news:spells.struct.successPrivate",
				params: {
					attacker: empire.name,
					buildings: build.toLocaleString(),
					spell: eraArray[empire.era].spell_struct,
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

			score = Math.ceil(points * 0.5)
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
			spell: eraArray[empire.era].spell_struct,
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
		key: "news:spells.struct.failPrivate",
		params: {
			caster: empire.name,
			spell: eraArray[empire.era].spell_struct,
		},
	}

	pubContent = {
		key: "news:spells.struct.failPublic",
		params: {
			caster: empire.name,
			target: enemyEmpire.name,
			spell: eraArray[empire.era].spell_struct,
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
