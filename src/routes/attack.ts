import type { Request, Response } from "express"
import { Router } from "express"
import Empire from "../entity/Empire"
import EmpireEffect from "../entity/EmpireEffect"
import auth from "../middleware/auth"
import user from "../middleware/user"
import { useTurnInternal } from "./useturns"
import { eraArray } from "../config/eras"
import { raceArray } from "../config/races"
import { createNewsEvent } from "../util/helpers"
import { getNetworth } from "../services/actions/actions"
import Clan from "../entity/Clan"
// import { awardAchievements } from './actions/achievements'
import { takeSnapshot } from "../services/actions/snaps"
import { getRepository } from "typeorm"
import { attachGame } from "../middleware/game"
import { calcUnitPower } from "../services/attacking/calcUnitPower"
import { calcUnitLosses } from "../services/attacking/calcUnitLosses"
import { destroyBuildings } from "../services/attacking/destroyBuildings"
import { translate, sendError } from "../util/translation"
import { language } from "../middleware/language"

const troopTypes = ["trparm", "trplnd", "trpfly", "trpsea"]

interface UnitLoss {
	attackLosses: number
	defendLosses: number
}

interface attackLosses {
	[key: string]: number
}

interface defendLosses {
	[key: string]: number
}

interface buildGain {
	[key: string]: number
}

interface buildLoss {
	[key: string]: number
}

const attack = async (req: Request, res: Response) => {
	// use two turns for attacks
	// only send troops relevant to the attack type
	// console.log(req.body)
	// console.log(req.params)
	const { attackType, defenderId, number, empireId } = req.body
	const game = res.locals.game
	const language = res.locals.language

	let { type } = req.body

	if (type !== "attack") {
		return sendError(res, 500)("generic", language)
	}

	let offPower = 0
	let defPower = 0
	let canAttack = false

	let returnText = ""
	let attackDescription = {}
	const resultArray = []
	const now = new Date()

	try {
		const attacker = await Empire.findOneOrFail({ id: empireId })
		// console.log(attacker)
		const defender = await Empire.findOneOrFail({ id: defenderId })

		if (attacker.game_id !== defender.game_id) {
			return sendError(res, 401)("unauthorized", language)
		}

		let avgLand = 1
		if (!game.scoreEnabled) {
			const { totalLand, empireCount } = await getRepository(Empire)
				.createQueryBuilder("empire")
				.select("SUM(empire.land)", "totalLand")
				.addSelect("COUNT(empire.id)", "empireCount")
				.where("empire.turnsUsed > :turnsUsed AND empire.mode != :demo", {
					turnsUsed: game.turnsProtection,
					demo: "demo",
				})
				.getRawOne()

			// console.log(totalLand, empireCount)
			avgLand = totalLand / empireCount
		}

		const landCutoff = 10000
		let aboveCutoff = false
		let defeated = false
		if (game.scoreEnabled) {
			if (defender.land >= landCutoff) {
				aboveCutoff = true
			}

			const effect = await EmpireEffect.findOne({
				where: { effectOwnerId: defender.id, empireEffectName: "defeated" },
				order: { updatedAt: "DESC" },
			})

			let timeLeft = 0
			if (effect) {
				let effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				timeLeft = effect.empireEffectValue - effectAge
				// age in minutes
				effectAge = Math.floor(effectAge)
				if (timeLeft > 0) {
					aboveCutoff = false
					defeated = true
					returnText += translate("responses:attack.empireDefeated", language)
				}
			}
		}

		// console.log(avgLand)

		if (attacker.attacks >= game.maxAttacks) {
			canAttack = false
			returnText = translate("responses:attack.maxAttacks", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.clanId !== 0 && attacker.clanId === defender.clanId) {
			canAttack = false
			returnText = translate("errors:attack.clanMate", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = translate(
				"errors:attack.cannotAttackWhileInProtection",
				language,
			)
			return res.json({
				error: returnText,
			})
		}

		if (defender.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = translate("errors:attack.cannotAttackYoungEmpire", language)
			return res.json({
				error: returnText,
			})
		}

		if (defender.land <= 1000) {
			canAttack = false
			returnText = translate("errors:attack.cannotAttackSmallEmpire", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turns < 2) {
			canAttack = false
			returnText = translate("errors:attack.notEnoughTurns", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.health < 10) {
			canAttack = false
			returnText = translate("errors:attack.notEnoughHealth", language)
			return res.json({
				error: returnText,
			})
		}
		// check eras and time gates
		let defenderTimegate = false
		if (attacker.era === defender.era) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			const effect = await EmpireEffect.findOne({
				where: { effectOwnerId: attacker.id, empireEffectName: "time gate" },
				order: { createdAt: "DESC" },
			})

			if (effect) {
				// console.log('found effect on your empire')
				const effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				const timeLeft = effect.empireEffectValue - effectAge

				if (timeLeft > 0) {
					canAttack = true
					returnText = translate("responses:attack.timeGateTravel", language)
				} else {
					// try defender time gate
					const defEffect = await EmpireEffect.findOne({
						where: {
							effectOwnerId: defender.id,
							empireEffectName: "time gate",
						},
						order: { createdAt: "DESC" },
					})

					// console.log(defEffect)

					if (defEffect) {
						const effectAge =
							(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
						const timeLeft = defEffect.empireEffectValue - effectAge
						if (timeLeft > 0) {
							canAttack = true
							defenderTimegate = true
							returnText = translate(
								"responses:attack.opponentTimeGate",
								language,
							)
						} else {
							returnText = translate("responses:attack.noTimeGate", language)
							return res.json({
								error: returnText,
							})
						}
					} else {
						canAttack = false
						returnText = translate("responses:attack.noTimeGate", language)
						return res.json({
							error: returnText,
						})
					}
				}
			} else {
				// try defender time gate
				const defEffect = await EmpireEffect.findOne({
					where: {
						effectOwnerId: defender.id,
						empireEffectName: "time gate",
					},
					order: { createdAt: "DESC" },
				})

				// console.log(defEffect)

				if (defEffect) {
					const effectAge =
						(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
					const timeLeft = defEffect.empireEffectValue - effectAge
					if (timeLeft > 0) {
						canAttack = true
						defenderTimegate = true
						returnText = translate(
							"responses:attack.opponentTimeGate",
							language,
						)
					} else {
						returnText = translate("responses:attack.noTimeGate", language)
						return res.json({
							error: returnText,
						})
					}
				} else {
					canAttack = false
					returnText = translate("responses:attack.noTimeGate", language)
					return res.json({
						error: returnText,
					})
				}
			}
		}

		// calculate power levels
		if (
			attackType === "standard" ||
			attackType === "surprise" ||
			attackType === "pillage"
		) {
			// console.log(troopTypes);
			for (const type of troopTypes) {
				offPower += calcUnitPower(attacker, type, "o")
			}

			for (const type of troopTypes) {
				defPower += calcUnitPower(defender, type, "d")
				// console.log(defPower)
			}
		} else {
			offPower = calcUnitPower(attacker, attackType, "o")
			defPower = calcUnitPower(defender, attackType, "d")
		}

		// apply race bonus
		offPower *= (100 + raceArray[attacker.race].mod_offense) / 100
		defPower *= (100 + raceArray[defender.race].mod_defense) / 100

		// reduce power level based on health
		offPower *= attacker.health / 100
		defPower *= defender.health / 100

		// war flag +20% when at war with other clan
		let clan = null
		if (attacker.clanId !== 0) {
			// attacker is in a clan

			// get attacker clan
			clan = await Clan.findOneOrFail({
				where: { id: attacker.clanId },
				relations: ["relation"],
			})

			// console.log(clan)
			const relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === "war") {
					return relation.c_id2
				}
			})
			// check if clan is at war
			if (relations.includes(defender.clanId)) {
				console.log("clan is at war")
				// clan is at war with defender
				offPower *= 1.2
				type = "war"
			}
		}

		if (attackType === "surprise") {
			offPower *= 1.25
		}

		// clan shared defense
		if (defender.clanId !== 0 && attackType !== "surprise") {
			// defender is in a clan

			// get defender clan
			// let clan = await Clan.findOne({ id: defender.clanId })

			// get clan members
			const clanMembers = await Empire.find({ clanId: defender.clanId })
			// console.log(clanMembers)

			let defBonus = 0

			// calculate clan defense
			for (const member of clanMembers) {
				if (member.id === defender.id) {
					return
				}
				if (member.era !== defender.era && !defenderTimegate) {
					// check for member time gate
					const effect = await EmpireEffect.findOne({
						where: { effectOwnerId: member.id, empireEffectName: "time gate" },
						order: { createdAt: "DESC" },
					})

					if (effect) {
						// console.log('found effect on your empire')

						let effectAge =
							(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
						let timeLeft = effect.empireEffectValue - effectAge

						if (timeLeft > 0) {
							let allyDef = 0
							// time gate is active
							if (attackType === "standard" || attackType === "surprise") {
								for (const type of troopTypes) {
									allyDef += calcUnitPower(defender, type, "d") * 0.1
									// console.log(defPower)
								}
							} else {
								allyDef = calcUnitPower(member, attackType, "d") * 0.1
							}
							allyDef *= member.health / 100
							allyDef *= (100 + raceArray[member.race].mod_defense) / 100
							defBonus += allyDef
						}
					}
				} else {
					let allyDef = 0
					// time gate is active
					if (attackType === "standard" || attackType === "surprise") {
						for (const type of troopTypes) {
							allyDef += calcUnitPower(defender, type, "d") * 0.1
							// console.log(defPower)
						}
					} else {
						allyDef = calcUnitPower(member, attackType, "d") * 0.1
					}
					allyDef *= member.health / 100
					allyDef *= (100 + raceArray[member.race].mod_defense) / 100
					defBonus += allyDef
				}
			}

			// console.log('defBonus', defBonus)
			// console.log('defPower', defPower)
			if (defBonus > defPower) {
				defBonus = defPower
			}

			defPower += defBonus

			// console.log('defPower', defPower)/
			if (defBonus > 0) {
				returnText += "The defender's clan comes to their aid..."
			}
		}

		// console.log('can attack', canAttack)
		if (canAttack) {
			if (attacker.networth > defender.networth * 2.5 && type !== "war") {
				// the attacker is ashamed for attacking a smaller empire, troops desert
				returnText +=
					"Your army is ashamed to fight such a weak opponent, many desert... "
				attacker.trpArm = Math.round(0.98 * attacker.trpArm)
				attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
				attacker.trpFly = Math.round(0.98 * attacker.trpFly)
				attacker.trpSea = Math.round(0.98 * attacker.trpSea)
				attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
			}

			if (attacker.networth < defender.networth * 0.2 && type !== "war") {
				// the attacker is fearful of large empire, troops desert
				returnText +=
					"Your army is fearful of fighting such a strong opponent, many desert... "
				attacker.trpArm = Math.round(0.98 * attacker.trpArm)
				attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
				attacker.trpFly = Math.round(0.98 * attacker.trpFly)
				attacker.trpSea = Math.round(0.98 * attacker.trpSea)
				attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
			}

			attacker.health -= 8
			if (attackType === "surprise") {
				attacker.health -= 5
			}

			let attackTurns = useTurnInternal(type, 2, attacker, clan, true, game)

			const attackRes = attackTurns[0]
			attackTurns = attackTurns[0]
			// console.log(attackRes)

			// console.log('error', attackRes?.messages?.error)
			// console.log('desertion', attackRes?.messages?.desertion)

			attacker.cash = attacker.cash + attackRes.money

			attacker.income += attackRes.income
			attacker.expenses +=
				attackRes.expenses + attackRes.wartax + attackRes.corruption

			// attacker.bank -= Math.round(attackRes.withdraw / 2)
			attacker.bank += attackRes.bankInterest
			attacker.loan += attackRes.loanInterest
			attacker.loan -= attackRes.loanpayed

			attacker.trpArm += attackRes.trpArm
			attacker.trpLnd += attackRes.trpLnd
			attacker.trpFly += attackRes.trpFly
			attacker.trpSea += attackRes.trpSea

			attacker.indyProd +=
				attackRes.trpArm * game.pvtmTrpArm +
				attackRes.trpLnd * game.pvtmTrpLnd +
				attackRes.trpFly * game.pvtmTrpFly +
				attackRes.trpSea * game.pvtmTrpSea

			attacker.food += attackRes.food
			if (attacker.food < 0) {
				attacker.food = 0
			}

			attacker.foodpro += attackRes.foodpro
			attacker.foodcon += attackRes.foodcon

			attacker.peasants += attackRes.peasants
			attacker.runes += attackRes.runes
			attacker.trpWiz += attackRes.trpWiz

			attacker.turns -= 2
			attacker.turnsUsed += 2

			if (attackRes?.messages?.desertion) {
				console.log("desertion triggered")

				attacker.networth = getNetworth(attacker, game)
				attacker.lastAction = new Date()
				// save updated attacker and defender
				await attacker.save()
				await takeSnapshot(attacker, game.turnsProtection)
				attackDescription = {
					result: "desertion",
					message: "The attack was not attempted due to the crisis.",
				}
				attackTurns["attack"] = attackDescription
				resultArray.push(attackTurns)
				return res.json(resultArray)
			}

			if (type !== "war") {
				attacker.attacks++
			}
			attacker.offTotal++
			defender.defTotal++

			let newTowerDef =
				// percent land as GTs
				1 + defender.bldDef / defender.land

			if (newTowerDef > 1.5) {
				newTowerDef = 1.5
			}

			// console.log(newTowerDef)
			// console.log('tower def', towerDef)
			defPower *= newTowerDef
			defPower = Math.round(defPower)

			// console.log('off power', offPower)
			// console.log('def power', defPower)
			// determine how many units each empire is about to lose in battle

			// modification to attacker losses (towers excluded)
			// let omod = Math.sqrt((defPower - towerDef) / (offPower + 1))
			console.log("offPower", offPower)
			console.log("defPower", defPower)
			let omod = Math.sqrt(defPower / (offPower + 1))
			// modification to enemy losses
			const dmod = Math.sqrt(offPower / (defPower + 1))

			const attackLosses: attackLosses = {}
			const defenseLosses: defendLosses = {}
			let result: UnitLoss

			switch (attackType) {
				case "trparm":
					result = calcUnitLosses(
						attacker.trpArm,
						defender.trpArm,
						0.1155,
						0.0705,
						omod,
						dmod,
					)
					attackLosses["trparm"] = result.attackLosses
					defenseLosses["trparm"] = result.defendLosses
					break
				case "trplnd":
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.0985,
						0.053,
						omod,
						dmod,
					)
					attackLosses["trplnd"] = result.attackLosses
					defenseLosses["trplnd"] = result.defendLosses
					break
				case "trpfly":
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.0688,
						0.0445,
						omod,
						dmod,
					)
					attackLosses["trpfly"] = result.attackLosses
					defenseLosses["trpfly"] = result.defendLosses
					break
				case "trpsea":
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.045,
						0.0355,
						omod,
						dmod,
					)
					attackLosses["trpsea"] = result.attackLosses
					defenseLosses["trpsea"] = result.defendLosses
					break
				//surprise attack and standard attack losses
				case "surprise":
					// console.log('surprise attack')
					omod *= 1.2
					console.log("omod", omod)
				case "pillage":
					// console.log('pillage attack')
					omod *= 1.2
					console.log("omod", omod)
				case "standard":
					// console.log('omod', omod)
					// console.log('standard attack')
					result = calcUnitLosses(
						attacker.trpArm,
						defender.trpArm,
						0.1455,
						0.0695,
						omod,
						dmod,
					)
					// console.log(result)
					attackLosses["trparm"] = result.attackLosses
					defenseLosses["trparm"] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.1285,
						0.052,
						omod,
						dmod,
					)
					// console.log(result)
					attackLosses["trplnd"] = result.attackLosses
					defenseLosses["trplnd"] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.0788,
						0.0435,
						omod,
						dmod,
					)
					// console.log(result)
					attackLosses["trpfly"] = result.attackLosses
					defenseLosses["trpfly"] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.065,
						0.0345,
						omod,
						dmod,
					)
					// console.log(result)
					attackLosses["trpsea"] = result.attackLosses
					defenseLosses["trpsea"] = result.defendLosses
			}

			if (attackType === "trparm") {
				attacker.trpArm -= attackLosses.trparm
				defender.trpArm -= defenseLosses.trparm
			} else if (attackType === "trplnd") {
				attacker.trpLnd -= attackLosses.trplnd
				defender.trpLnd -= defenseLosses.trplnd
			} else if (attackType === "trpfly") {
				attacker.trpFly -= attackLosses.trpfly
				defender.trpFly -= defenseLosses.trpfly
			} else if (attackType === "trpsea") {
				attacker.trpSea -= attackLosses.trpsea
				defender.trpSea -= defenseLosses.trpsea
			} else if (
				attackType === "surprise" ||
				attackType === "standard" ||
				attackType === "pillage"
			) {
				// console.log('surprise, standard, pillage attack')
				// console.log(attackLosses)
				// console.log(defenseLosses)
				attacker.trpArm -= attackLosses.trparm
				defender.trpArm -= defenseLosses.trparm
				attacker.trpLnd -= attackLosses.trplnd
				defender.trpLnd -= defenseLosses.trplnd
				attacker.trpFly -= attackLosses.trpfly
				defender.trpFly -= defenseLosses.trpfly
				attacker.trpSea -= attackLosses.trpsea
				defender.trpSea -= defenseLosses.trpsea
			}

			// let won: boolean
			let lowLand = 1
			// console.log('type', attackType)
			// console.log('normal attack ratio', offPower > defPower * 1.05)
			// console.log('pillage ratio', offPower > defPower * 1.33)

			if (
				(attackType !== "pillage" && offPower > defPower * 1.05) ||
				(attackType === "pillage" && offPower > defPower * 1.33)
			) {
				// attacker wins
				if (
					defender.land < avgLand * 0.75 &&
					attacker.land > defender.land * 2 &&
					attacker.land > avgLand &&
					type !== "war"
				) {
					// the defender is being "low landed"
					returnText += translate("responses:attack.smallEmpire", language)
					lowLand = 0.5
				}
				// won = true
				const buildLoss: buildLoss = {}
				const buildGain: buildGain = {}

				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					"bldCash",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					"bldPop",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.5 * lowLand,
					"bldTroop",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					"bldCost",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.3 * lowLand,
					"bldFood",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.6 * lowLand,
					"bldWiz",
					defender,
					attacker,
					buildLoss,
					buildGain,
				)
				destroyBuildings(
					attackType,
					0.11 * lowLand,
					0.6 * lowLand,
					"bldDef",
					defender,
					attacker,
					buildLoss,
					buildGain,
				) // towers more likely to be taken, since they are encountered first
				destroyBuildings(
					attackType,
					0.1 * lowLand,
					0.0 * lowLand,
					"freeLand",
					defender,
					attacker,
					buildLoss,
					buildGain,
				) // 3rd argument MUST be 0 (for Standard attacks)

				const sumBuildGain = (buildGain: { [key: string]: number }): number => {
					let sum = 0
					for (const key in buildGain) {
						if (Object.prototype.hasOwnProperty.call(buildGain, key)) {
							sum += buildGain[key]
						}
					}
					return sum
				}

				let totalBuildGain = sumBuildGain(buildGain)
				// console.log('buildGain', buildGain)
				// console.log('buildLoss', buildLoss)
				// create return text for captured buildings

				let food = 0
				let cash = 0
				if (attackType === "pillage") {
					// steal food and cash
					food = Math.ceil(defender.food * 0.025)
					cash = Math.ceil(defender.cash * 0.025)
					defender.food -= food
					attacker.food += food
					defender.cash -= cash
					attacker.cash += cash
				}

				// take enemy land
				// attacker.land += buildGain.freeLand
				if (attackType === "pillage") {
					returnText += translate("responses:attack.pillageGain", language, {
						amount: totalBuildGain.toLocaleString(),
						food: food.toLocaleString(),
						foodUnit: eraArray[attacker.era].food,
						cash: cash.toLocaleString(),
						defenderName: defender.name,
					})

					attackDescription = {
						result: "success",
						attackType: attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				} else if (attackType !== "surprise" && attackType !== "standard") {
					returnText += translate("responses:attack.attackGain", language, {
						amount: buildGain.freeLand.toLocaleString(),
						defenderName: defender.name,
					})

					attackDescription = {
						result: "success",
						attackType: attackType,
						troopType: eraArray[attacker.era][attackType],
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				} else {
					returnText += translate("responses:attack.standardGain", language, {
						amount: totalBuildGain.toLocaleString(),
						defenderName: defender.name,
					})

					attackDescription = {
						result: "success",
						attackType: attackType === "standard" ? "all out" : attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				}

				// attacker off success
				attacker.offSucc++

				// give points to attacker
				if (game.scoreEnabled) {
					const ratio = defender.networth / Math.max(1, attacker.networth)
					if (ratio <= 1) {
						attacker.score += 1
					} else {
						attacker.score += 1 + Math.floor((ratio - 1) * 2)
					}

					if (defender.land < landCutoff && aboveCutoff && !defeated) {
						attacker.score += 100

						let effect: EmpireEffect = null
						effect = new EmpireEffect({
							effectOwnerId: defender.id,
							empireEffectName: "defeated",
							empireEffectValue: 12960,
						})
						await effect.save()
					}
				}
				// console.log(defenseLosses)
				// console.log(attackLosses)
				// console.log(buildGain)

				let content: any = {}
				let pubContent: any = {}

				if (attackType === "pillage") {
					content = {
						key: "news.attack.pillage.private",
						params: {
							attacker: attacker.name,
							landCaptured: totalBuildGain,
							food: food,
							foodType: eraArray[defender.era].food,
							cash: cash,
							losses: {
								trparm: defenseLosses.trparm,
								trplnd: defenseLosses.trplnd,
								trpfly: defenseLosses.trpfly,
								trpsea: defenseLosses.trpsea,
								unitTypes: {
									trparm: eraArray[defender.era].trparm,
									trplnd: eraArray[defender.era].trplnd,
									trpfly: eraArray[defender.era].trpfly,
									trpsea: eraArray[defender.era].trpsea,
								},
							},
							kills: {
								trparm: attackLosses.trparm,
								trplnd: attackLosses.trplnd,
								trpfly: attackLosses.trpfly,
								trpsea: attackLosses.trpsea,
								unitTypes: {
									trparm: eraArray[attacker.era].trparm,
									trplnd: eraArray[attacker.era].trplnd,
									trpfly: eraArray[attacker.era].trpfly,
									trpsea: eraArray[attacker.era].trpsea,
								},
							},
						},
					}

					pubContent = {
						key: "news.attack.pillage.public",
						params: {
							attacker: attacker.name,
							defender: defender.name,
							landCaptured: totalBuildGain,
							food: food,
							foodType: eraArray[defender.era].food,
							cash: cash,
							defenderLosses: {
								trparm: defenseLosses.trparm,
								trplnd: defenseLosses.trplnd,
								trpfly: defenseLosses.trpfly,
								trpsea: defenseLosses.trpsea,
								unitTypes: {
									trparm: eraArray[defender.era].trparm,
									trplnd: eraArray[defender.era].trplnd,
									trpfly: eraArray[defender.era].trpfly,
									trpsea: eraArray[defender.era].trpsea,
								},
							},
							attackerLosses: {
								trparm: attackLosses.trparm,
								trplnd: attackLosses.trplnd,
								trpfly: attackLosses.trpfly,
								trpsea: attackLosses.trpsea,
								unitTypes: {
									trparm: eraArray[attacker.era].trparm,
									trplnd: eraArray[attacker.era].trplnd,
									trpfly: eraArray[attacker.era].trpfly,
									trpsea: eraArray[attacker.era].trpsea,
								},
							},
						},
					}
				} else if (attackType !== "surprise" && attackType !== "standard") {
					// Single unit type attacks
					content = {
						key: "news.attack.single.private",
						params: {
							attacker: attacker.name,
							landCaptured: buildGain.freeLand,
							unitType: eraArray[attacker.era][attackType],
							losses: defenseLosses[attackType],
							defenderUnitType: eraArray[defender.era][attackType],
							kills: attackLosses[attackType],
							attackerUnitType: eraArray[attacker.era][attackType],
						},
					}

					pubContent = {
						key: "news.attack.single.public",
						params: {
							attacker: attacker.name,
							defender: defender.name,
							landCaptured: buildGain.freeLand,
							unitType: eraArray[attacker.era][attackType],
							defenderLosses: defenseLosses[attackType],
							defenderUnitType: eraArray[defender.era][attackType],
							attackerLosses: attackLosses[attackType],
							attackerUnitType: eraArray[attacker.era][attackType],
						},
					}
				} else {
					// Standard or surprise attack
					content = {
						key: `news.attack.${
							attackType === "standard" ? "allout" : "surprise"
						}.private`,
						params: {
							attacker: attacker.name,
							landCaptured: totalBuildGain,
							losses: {
								trparm: defenseLosses.trparm,
								trplnd: defenseLosses.trplnd,
								trpfly: defenseLosses.trpfly,
								trpsea: defenseLosses.trpsea,
								unitTypes: {
									trparm: eraArray[defender.era].trparm,
									trplnd: eraArray[defender.era].trplnd,
									trpfly: eraArray[defender.era].trpfly,
									trpsea: eraArray[defender.era].trpsea,
								},
							},
							kills: {
								trparm: attackLosses.trparm,
								trplnd: attackLosses.trplnd,
								trpfly: attackLosses.trpfly,
								trpsea: attackLosses.trpsea,
								unitTypes: {
									trparm: eraArray[attacker.era].trparm,
									trplnd: eraArray[attacker.era].trplnd,
									trpfly: eraArray[attacker.era].trpfly,
									trpsea: eraArray[attacker.era].trpsea,
								},
							},
						},
					}

					pubContent = {
						key: `news.attack.${
							attackType === "standard" ? "allout" : "surprise"
						}.public`,
						params: {
							attacker: attacker.name,
							defender: defender.name,
							landCaptured: totalBuildGain,
							defenderLosses: {
								trparm: defenseLosses.trparm,
								trplnd: defenseLosses.trplnd,
								trpfly: defenseLosses.trpfly,
								trpsea: defenseLosses.trpsea,
								unitTypes: {
									trparm: eraArray[defender.era].trparm,
									trplnd: eraArray[defender.era].trplnd,
									trpfly: eraArray[defender.era].trpfly,
									trpsea: eraArray[defender.era].trpsea,
								},
							},
							attackerLosses: {
								trparm: attackLosses.trparm,
								trplnd: attackLosses.trplnd,
								trpfly: attackLosses.trpfly,
								trpsea: attackLosses.trpsea,
								unitTypes: {
									trparm: eraArray[attacker.era].trparm,
									trplnd: eraArray[attacker.era].trplnd,
									trpfly: eraArray[attacker.era].trpfly,
									trpsea: eraArray[attacker.era].trpsea,
								},
							},
						},
					}
				}

				await createNewsEvent(
					content,
					pubContent,
					attacker.id,
					attacker.name,
					defender.id,
					defender.name,
					"attack",
					"fail",
					attacker.game_id,
				)

				// check for kill
			} else {
				// defender wins
				if (
					attackType !== "surprise" &&
					attackType !== "standard" &&
					attackType !== "pillage"
				) {
					attackDescription = {
						result: "fail",
						attackType: attackType,
						troopType: eraArray[attacker.era][attackType],
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: null,
					}
				} else {
					attackDescription = {
						result: "fail",
						attackType: attackType === "standard" ? "all out" : attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: null,
					}
				}
				// defender def success
				defender.defSucc++
				// give points to defender
				const ratio = attacker.networth / Math.max(1, defender.networth)
				if (ratio <= 1) {
					defender.score += 1
				} else {
					defender.score += 1 + Math.floor((ratio - 1) * 2)
				}

				let content: any = {}
				let pubContent: any = {}

				if (
					attackType !== "surprise" &&
					attackType !== "standard" &&
					attackType !== "pillage"
				) {
					// Single unit type attacks
					content = {
						key: "news.defense.single.private",
						params: {
							attacker: attacker.name,
							unitType: eraArray[attacker.era][attackType],
							losses: {
								value: defenseLosses[attackType],
								unitType: eraArray[defender.era][attackType],
							},
							kills: {
								value: attackLosses[attackType],
								unitType: eraArray[attacker.era][attackType],
							},
						},
					}

					pubContent = {
						key: "news.defense.single.public",
						params: {
							defender: defender.name,
							attacker: attacker.name,
							unitType: eraArray[attacker.era][attackType],
							defenderLosses: {
								value: defenseLosses[attackType],
								unitType: eraArray[defender.era][attackType],
							},
							attackerLosses: {
								value: attackLosses[attackType],
								unitType: eraArray[attacker.era][attackType],
							},
						},
					}
				} else {
					content = {
						key: `news.defense.${
							attackType === "standard" ? "allout" : attackType
						}.private`,
						params: {
							attacker: attacker.name,
							attackType: attackType === "standard" ? "all out" : attackType,
							losses: {
								trparm: {
									value: defenseLosses.trparm,
									unitType: eraArray[defender.era].trparm,
								},
								trplnd: {
									value: defenseLosses.trplnd,
									unitType: eraArray[defender.era].trplnd,
								},
								trpfly: {
									value: defenseLosses.trpfly,
									unitType: eraArray[defender.era].trpfly,
								},
								trpsea: {
									value: defenseLosses.trpsea,
									unitType: eraArray[defender.era].trpsea,
								},
							},
							kills: {
								trparm: {
									value: attackLosses.trparm,
									unitType: eraArray[attacker.era].trparm,
								},
								trplnd: {
									value: attackLosses.trplnd,
									unitType: eraArray[attacker.era].trplnd,
								},
								trpfly: {
									value: attackLosses.trpfly,
									unitType: eraArray[attacker.era].trpfly,
								},
								trpsea: {
									value: attackLosses.trpsea,
									unitType: eraArray[attacker.era].trpsea,
								},
							},
						},
					}

					pubContent = {
						key: `news.defense.${
							attackType === "standard" ? "allout" : attackType
						}.public`,
						params: {
							defender: defender.name,
							attacker: attacker.name,
							attackType: attackType === "standard" ? "all out" : attackType,
							defenderLosses: {
								trparm: {
									value: defenseLosses.trparm,
									unitType: eraArray[defender.era].trparm,
								},
								trplnd: {
									value: defenseLosses.trplnd,
									unitType: eraArray[defender.era].trplnd,
								},
								trpfly: {
									value: defenseLosses.trpfly,
									unitType: eraArray[defender.era].trpfly,
								},
								trpsea: {
									value: defenseLosses.trpsea,
									unitType: eraArray[defender.era].trpsea,
								},
							},
							attackerLosses: {
								trparm: {
									value: attackLosses.trparm,
									unitType: eraArray[attacker.era].trparm,
								},
								trplnd: {
									value: attackLosses.trplnd,
									unitType: eraArray[attacker.era].trplnd,
								},
								trpfly: {
									value: attackLosses.trpfly,
									unitType: eraArray[attacker.era].trpfly,
								},
								trpsea: {
									value: attackLosses.trpsea,
									unitType: eraArray[attacker.era].trpsea,
								},
							},
						},
					}
				}

				await createNewsEvent(
					content,
					pubContent,
					attacker.id,
					attacker.name,
					defender.id,
					defender.name,
					"attack",
					"success",
					attacker.game_id,
				)
			}

			const adjustedDR =
				game.drRate + Math.round((defender.bldDef / defender.land) * 100) / 100

			// console.log('adjusted DR', adjustedDR)
			defender.diminishingReturns =
				defender.diminishingReturns + adjustedDR / lowLand

			if (attacker.diminishingReturns > 0) {
				attacker.diminishingReturns -= game.drRate
			}

			if (attacker.diminishingReturns < 0) {
				attacker.diminishingReturns = 0
			}

			attackTurns["attack"] = attackDescription
			resultArray.push(attackTurns)
			attacker.networth = getNetworth(attacker, game)
			defender.networth = getNetworth(defender, game)

			if (attacker.peakCash < attacker.cash + attacker.bank) {
				attacker.peakCash = attacker.cash + attacker.bank
			}
			if (attacker.peakFood < attacker.food) {
				attacker.peakFood = attacker.food
			}
			if (attacker.peakRunes < attacker.runes) {
				attacker.peakRunes = attacker.runes
			}
			if (attacker.peakPeasants < attacker.peasants) {
				attacker.peakPeasants = attacker.peasants
			}
			if (attacker.peakLand < attacker.land) {
				attacker.peakLand = attacker.land
			}
			if (attacker.peakNetworth < attacker.networth) {
				attacker.peakNetworth = attacker.networth
			}
			if (attacker.peakTrpArm < attacker.trpArm) {
				attacker.peakTrpArm = attacker.trpArm
			}
			if (attacker.peakTrpLnd < attacker.trpLnd) {
				attacker.peakTrpLnd = attacker.trpLnd
			}
			if (attacker.peakTrpFly < attacker.trpFly) {
				attacker.peakTrpFly = attacker.trpFly
			}
			if (attacker.peakTrpSea < attacker.trpSea) {
				attacker.peakTrpSea = attacker.trpSea
			}
			if (attacker.peakTrpWiz < attacker.trpWiz) {
				attacker.peakTrpWiz = attacker.trpWiz
			}

			attacker.lastAction = new Date()
			// save updated attacker and defender
			await attacker.save()
			await defender.save()

			// await awardAchievements(attacker)
			await takeSnapshot(attacker, game.turnsProtection)
			await takeSnapshot(defender, game.turnsProtection)
		} else {
			// console.log('not allowed')
			return sendError(res, 400)("errors.generic", language)
		}

		// console.log('resultArray', resultArray)
		return res.json(resultArray)
	} catch (err) {
		console.log(err)
	}
}

const router = Router()

router.post("/", user, auth, language, attachGame, attack)

export default router
