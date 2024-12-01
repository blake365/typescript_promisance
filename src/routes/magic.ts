import type { Request, Response } from "express"
import { Router } from "express"
import { eraArray } from "../config/eras"
import Empire from "../entity/Empire"
import Clan from "../entity/Clan"
import { useTurnInternal } from "./useturns"
import { baseCost } from "../services/spells/general"
import {
	regress_allow,
	regress_cast,
	regress_cost,
} from "../services/spells/regress"
import {
	advance_allow,
	advance_cast,
	advance_cost,
} from "../services/spells/advance"
import { food_cast, food_cost } from "../services/spells/food"
import { cash_cast, cash_cost } from "../services/spells/cash"
import auth from "../middleware/auth"
import user from "../middleware/user"
import { shield_cast, shield_cost } from "../services/spells/shield"
import { gate_cast, gate_cost } from "../services/spells/gate"
import { ungate_cast, ungate_cost } from "../services/spells/ungate"
import EmpireEffect from "../entity/EmpireEffect"
import { blast_cast, blast_cost } from "../services/spells/blast"
import { struct_cast, struct_cost } from "../services/spells/struct"
import { storm_cast, storm_cost } from "../services/spells/storm"
import { steal_cast, steal_cost } from "../services/spells/steal"
import { runes_cast, runes_cost } from "../services/spells/runes"
import { fight_cast, fight_cost } from "../services/spells/fight"
import { spy_cast, spy_cost } from "../services/spells/spy"

import { updateEmpire } from "../services/actions/updateEmpire"
import { takeSnapshot } from "../services/actions/snaps"
import { attachGame } from "../middleware/game"
import type Game from "../entity/Game"
import { language } from "../middleware/language"
import { translate, sendError } from "../util/translation"
// FIXED: internal turns not working

const spellCheck = (
	empire: Empire,
	cost: number,
	turns: number,
	language: string,
) => {
	if (empire.food <= 0) {
		return {
			error: translate("errors:magic.notEnoughFood", language),
		}
	}
	if (empire.cash <= 0) {
		return {
			error: translate("errors:magic.notEnoughCash", language),
		}
	}

	if (empire.runes < cost) {
		return {
			error: translate("errors:magic.notEnoughRunes", language, {
				resource: eraArray[empire.era].runes,
			}),
		}
	}
	if (empire.turns < turns) {
		return {
			error: translate("errors:magic.notEnoughTurns", language),
		}
	}
	if (empire.health < 20) {
		return {
			error: translate("errors:magic.notEnoughHealth", language),
		}
	}
	return "passed"
}

interface Cast {
	result?: string
	message?: string
	wizloss?: number
	food?: number
	cash?: number
	descriptor?: string
}

const magic = async (req: Request, res: Response) => {
	// request will have object with type of spell as a number and number of times to cast spell
	const { type, empireId, spell, number } = req.body
	const game: Game = res.locals.game
	const language = res.locals.language

	if (type !== "magic") {
		return sendError(res, 400)("generic", language)
	}

	const empire = await Empire.findOne({ id: empireId })

	let clan = null
	if (empire.clanId !== 0) {
		clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ["relation"],
		})
	}

	// console.log('food:', empire.food, 'cash:', empire.cash, empire.turns, empire.runes)
	if (empire.trpWiz === 0) {
		return res.json({
			error: `You must have ${eraArray[empire.era].trpwiz} to cast spells`,
		})
	}

	const base = baseCost(empire)

	// handle errors
	// add break if spell check is false

	let resultArray = []
	if (spell === 0) {
		// shield
		const cost = shield_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						"magic",
						turns,
						empire,
						clan,
						true,
						game,
					)
					let spellRes = spellTurns[0]
					// console.log('spell res', spellRes)
					spellTurns = spellTurns[0]
					// console.log(empire.turns);
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns["cast"] = {
							result: "desertion",
							message: translate("responses:spells.desertion", language),
						}
						resultArray.push(spellTurns)
						break
					}

					let cast: Cast = await shield_cast(empire, language)
					// console.log(cast)
					if (cast.result === "fail") {
						empire.trpWiz -= cast.wizloss
						await empire.save()
					}
					await updateEmpire(empire, spellRes, turns, game)
					spellTurns["cast"] = cast

					// console.log(spellTurns)
					resultArray.push(spellTurns)
				} else {
					let spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 1) {
		// food
		const cost = food_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						"magic",
						turns,
						empire,
						clan,
						true,
						game,
					)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns["cast"] = {
							result: "desertion",
							message: translate("responses:spells.desertion", language),
						}
						resultArray.push(spellTurns)
						break
					}

					let cast: Cast = food_cast(empire, game.pvtmFood, language)
					// console.log(cast)
					if (cast.result === "success") {
						empire.food += cast.food
						empire.magicProd += cast.food * game.pvtmFood
					}
					if (cast.result === "fail") {
						empire.trpWiz -= cast.wizloss
					}
					spellTurns["cast"] = cast
					await updateEmpire(empire, spellRes, turns, game)

					// console.log(spellTurns)
					resultArray.push(spellTurns)
					// cast the spell and get result
					// compose turn result and food result into a single object, insert into array
				} else {
					let spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}

				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 2) {
		// cash
		const cost = cash_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < number; i++) {
				// console.log(i, spellCheck(empire, cost, turns))
				if (spellCheck(empire, cost, turns, language) === "passed") {
					console.log(empire.cash)
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						"magic",
						turns,
						empire,
						clan,
						true,
						game,
					)
					console.log(empire.cash)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns["cast"] = {
							result: "desertion",
							message: translate("responses:spells.desertion", language),
						}
						resultArray.push(spellTurns)
						break
					}

					let cast: Cast = cash_cast(empire, language)
					// console.log(cast)
					// console.log(empire.cash)
					if (cast.result === "success") {
						empire.cash += cast.cash
						empire.magicProd += cast.cash
					}
					if (cast.result === "fail") {
						empire.trpWiz -= cast.wizloss
					}
					await updateEmpire(empire, spellRes, turns, game)
					spellTurns["cast"] = cast

					resultArray.push(spellTurns)
					// compose turn result and food result into a single object, insert into array
					// console.log('cash:', empire.cash, empire.turns, empire.runes)
				} else {
					const spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}
				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			const spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 3) {
		// advance
		// only allow one at a time
		const cost = advance_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					let allowed = await advance_allow(empire, language)
					// console.log('advance allow', allowed)
					if (!allowed) {
						const spellTurns = {
							error: translate("responses:spells.noEraAdvance", language),
						}
						resultArray.push(spellTurns)
						break
					}

					if (typeof allowed === "string") {
						let spellTurns = { error: allowed }
						resultArray.push(spellTurns)
						break
					} else {
						empire.runes -= cost
						// use two turns to cast spell
						let spellTurns = useTurnInternal(
							"magic",
							turns,
							empire,
							clan,
							true,
							game,
						)
						let spellRes = spellTurns[0]
						spellTurns = spellTurns[0]
						if (spellRes?.messages?.desertion) {
							await updateEmpire(empire, spellRes, turns, game)
							console.log(spellRes.messages.desertion)
							spellTurns["cast"] = {
								result: "desertion",
								message: translate("responses:spells.desertion", language),
							}
							resultArray.push(spellTurns)
							break
						} else {
							let cast: Cast = advance_cast(empire, language)
							// console.log(cast)
							if (cast.result === "success") {
								empire.era += 1
							}
							if (cast.result === "fail") {
								empire.trpWiz -= cast.wizloss
							}
							spellTurns["cast"] = cast
						}

						resultArray.push(spellTurns)

						await updateEmpire(empire, spellRes, turns, game)
						// console.log(empire.era, empire.turns, empire.runes)
					}
				} else {
					const spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}

				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			const spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 4) {
		// regress
		// only allow one at a time
		const cost = regress_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					let allowed = await regress_allow(empire, language)
					// console.log('regress allow', allowed)
					if (!allowed) {
						let spellTurns = { error: "There is no era to regress to" }
						resultArray.push(spellTurns)
						break
					} else if (typeof allowed === "string") {
						let spellTurns = { error: allowed }
						resultArray.push(spellTurns)
						break
					} else {
						empire.runes -= cost
						// use two turns to cast spell
						let spellTurns = useTurnInternal(
							"magic",
							turns,
							empire,
							clan,
							true,
							game,
						)
						let spellRes = spellTurns[0]
						spellTurns = spellTurns[0]
						if (spellRes?.messages?.desertion) {
							await updateEmpire(empire, spellRes, turns, game)
							console.log(spellRes.messages.desertion)
							spellTurns["cast"] = {
								result: "desertion",
								message: translate("responses:spells.desertion", language),
							}
							resultArray.push(spellTurns)
							break
						} else {
							let cast: Cast = regress_cast(empire, language)
							// console.log(cast)
							if (cast.result === "success") {
								empire.era -= 1
							}
							if (cast.result === "fail") {
								empire.trpWiz -= cast.wizloss
							}
							spellTurns["cast"] = cast
						}

						resultArray.push(spellTurns)

						await updateEmpire(empire, spellRes, turns, game)
						// console.log(empire.era, empire.turns, empire.runes)
					}
				} else {
					let spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}
				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 5) {
		// open time gate
		const cost = gate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						"magic",
						turns,
						empire,
						clan,
						true,
						game,
					)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns["cast"] = {
							result: "desertion",
							message: translate("responses:spells.desertion", language),
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = await gate_cast(empire, language)
						// console.log(cast)

						if (cast.result === "fail") {
							empire.trpWiz -= cast.wizloss
						}
						spellTurns["cast"] = cast
					}

					resultArray.push(spellTurns)

					await updateEmpire(empire, spellRes, turns, game)
				} else {
					let spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 6) {
		// close time gate
		const cost = ungate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns, language) === "passed") {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns, language) === "passed") {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						"magic",
						turns,
						empire,
						clan,
						true,
						game,
					)
					const spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					// console.log(spellRes)
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns["cast"] = {
							result: "desertion",
							message: translate("responses:spells.desertion", language),
						}
						resultArray.push(spellTurns)
						break
					}
					const cast: Cast = await ungate_cast(empire, language)
					// console.log(cast)

					if (cast.result === "fail") {
						empire.trpWiz -= cast.wizloss
					}
					spellTurns["cast"] = cast

					resultArray.push(spellTurns)

					await updateEmpire(empire, spellRes, turns, game)
				} else {
					let spellTurns = spellCheck(empire, cost, turns, language)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns, language)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	}
	// console.log(resultArray)

	return res.json(resultArray)
}

const attackSpell = async (
	attacker: Empire,
	clan,
	spellCost: number,
	spell,
	game: Game,
	language: string,
) => {
	const cost = spellCost
	const turns = 2
	if (spellCheck(attacker, cost, turns, language) === "passed") {
		attacker.runes -= cost
		attacker.spells++
		attacker.health -= 8
		// use two turns to cast spell
		let spellTurns = useTurnInternal("magic", turns, attacker, clan, true, game)
		const spellRes = spellTurns[0]
		spellTurns = spellTurns[0]

		if (spellRes?.messages?.desertion) {
			console.log("desertion trigger")
			await updateEmpire(attacker, spellRes, turns, game)
			console.log(spellRes.messages.desertion)
			spellTurns["cast"] = {
				result: "desertion",
				message: translate("responses:spells.desertion", language),
			}
			return spellTurns
		}
		console.log("spell casting")
		const cast: Cast = await spell()
		// console.log(cast)
		if (cast.result === "fail") {
			attacker.trpWiz -= cast.wizloss
		}
		spellTurns["cast"] = cast
		// console.log('spellTurns', spellTurns)
		// cast the spell and get result
		// console.log('spellRes', spellRes)
		await updateEmpire(attacker, spellRes, turns, game)
		// console.log('returning with spellTurns')
		return spellTurns
	}
	const spellTurns = spellCheck(attacker, cost, turns, language)
	return spellTurns
}

// route to cast spells on enemy
const magicAttack = async (req: Request, res: Response) => {
	// request will have object with spell, attacker, defender
	const { attackerId, defenderId, spell } = req.body
	let { type } = req.body
	const game: Game = res.locals.game
	const language = res.locals.language
	if (type !== "magic attack") {
		return sendError(res, 400)("generic", language)
	}

	let canAttack = false

	let returnText = ""

	try {
		const attacker = await Empire.findOne({ id: attackerId })
		const defender = await Empire.findOne({ id: defenderId })

		if (attacker.game_id !== defender.game_id) {
			return sendError(res, 400)("unauthorized", language)
		}

		if (attacker.turns < 2) {
			return sendError(res, 400)("magic.notEnoughTurns", language)
		}

		let clan = null
		if (attacker.clanId !== 0) {
			clan = await Clan.findOneOrFail({
				where: { id: attacker.clanId },
				relations: ["relation"],
			})

			const relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === "war") {
					return relation.c_id2
				}
			})
			// check if clan is at war
			if (relations.includes(defender.clanId)) {
				console.log("clan is at war")
				// clan is at war with defender
				type = "war"
			}
		}

		// console.log('food:', empire.food, 'cash:', empire.cash, empire.turns, empire.runes)
		if (attacker.trpWiz === 0) {
			return res.json({
				error: translate("responses:spells.notEnoughWiz", language, {
					trpwiz: eraArray[attacker.era].trpwiz,
				}),
			})
		}

		const base = baseCost(attacker)

		if (attacker.spells >= game.maxSpells) {
			canAttack = false
			returnText = translate("responses:spells.maxSpells", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.clanId !== 0 && attacker.clanId === defender.clanId) {
			canAttack = false
			returnText = translate("responses:spells.clanFriendlyFire", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = translate("responses:spells.protection", language)
			return res.json({
				error: returnText,
			})
		}

		if (defender.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = translate("responses:spells.enemyProtection", language)
			return res.json({
				error: returnText,
			})
		}

		if (defender.land <= 1000) {
			canAttack = false
			returnText = translate("responses:spells.smallEmpire", language)
			return res.json({
				error: returnText,
			})
		}

		if (attacker.era === defender.era && attacker.turns >= 2) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			const effect = await EmpireEffect.findOne({
				where: { effectOwnerId: attacker.id, empireEffectName: "time gate" },
				order: { createdAt: "DESC" },
			})

			if (effect) {
				const now = new Date()

				const effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				const timeLeft = effect.empireEffectValue - effectAge

				if (timeLeft > 0) {
					canAttack = true
					returnText = translate("responses:spells.timeGate", language)
				} else {
					// try defender time gate
					const defEffect = await EmpireEffect.findOne({
						where: {
							effectOwnerId: defender.empireId,
							empireEffectName: "time gate",
						},
						order: { createdAt: "DESC" },
					})

					if (defEffect) {
						const now = new Date()
						const effectAge =
							(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
						const timeLeft = defEffect.empireEffectValue - effectAge
						if (timeLeft > 0) {
							canAttack = true
							returnText = translate(
								"responses:spells.opponentTimeGate",
								language,
							)
						} else {
							returnText = translate("responses:spells.noTimeGate", language)
							return res.json({
								error: returnText,
							})
						}
					} else {
						canAttack = false
						returnText = translate("responses:spells.noTimeGate", language)
						return res.json({
							error: returnText,
						})
					}
				}
			} else {
				// try defender time gate
				const defEffect = await EmpireEffect.findOne({
					where: {
						effectOwnerId: defender.empireId,
						empireEffectName: "time gate",
					},
					order: { createdAt: "DESC" },
				})

				if (defEffect) {
					const now = new Date()
					const effectAge =
						(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
					const timeLeft = defEffect.empireEffectValue - effectAge
					if (timeLeft > 0) {
						canAttack = true
						returnText = translate(
							"responses:spells.opponentTimeGate",
							language,
						)
					} else {
						returnText = translate("responses:spells.noTimeGate", language)
						return res.json({
							error: returnText,
						})
					}
				} else {
					canAttack = false
					returnText = translate("responses:spells.noTimeGate", language)
					return res.json({
						error: returnText,
					})
				}
			}
		}

		// console.log('can attack', canAttack)
		// handle errors
		// add break if spell check is false
		let spellTurns: any = {}
		let desertions = null

		if (canAttack) {
			let points = 1
			const ratio = defender.networth / Math.max(1, attacker.networth)
			if (ratio > 1) {
				points = 1 + Math.floor((ratio - 1) * 2)
			}

			if (spell !== "spy") {
				if (attacker.networth > defender.networth * 2.5 && type !== "war") {
					// the attacker is ashamed for attacking a smaller empire, troops desert
					console.log("attacker is ashamed")
					desertions = translate("responses:attack.shame", language)
					attacker.trpArm = Math.round(0.98 * attacker.trpArm)
					attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
					attacker.trpFly = Math.round(0.98 * attacker.trpFly)
					attacker.trpSea = Math.round(0.98 * attacker.trpSea)
					attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
				}

				if (attacker.networth < defender.networth * 0.2 && type !== "war") {
					// the attacker is fearful of large empire, troops desert
					console.log("attacker is fearful")
					desertions = translate("responses:attack.fear", language)
					attacker.trpArm = Math.round(0.98 * attacker.trpArm)
					attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
					attacker.trpFly = Math.round(0.98 * attacker.trpFly)
					attacker.trpSea = Math.round(0.98 * attacker.trpSea)
					attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
				}
			}
			if (spell === "blast") {
				// blast
				console.log("blast start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					blast_cost(base),
					() => blast_cast(attacker, defender, game, points, language),
					game,
					language,
				)
				// console.log(spellTurns)
			} else if (spell === "struct") {
				// struct
				console.log("struct start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					struct_cost(base),
					() => struct_cast(attacker, defender, game, points, language),
					game,
					language,
				)
				// console.log(spellTurns)
			} else if (spell === "storm") {
				console.log("storm start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					storm_cost(base),
					() => storm_cast(attacker, defender, game, points, language),
					game,
					language,
				)
			} else if (spell === "steal") {
				console.log("steal start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					steal_cost(base),
					() => steal_cast(attacker, defender, game, points, language),
					game,
					language,
				)
			} else if (spell === "runes") {
				console.log("runes start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					runes_cost(base),
					() => runes_cast(attacker, defender, game, points, language),
					game,
					language,
				)
			} else if (spell === "fight") {
				console.log("fight start")
				if (attacker.attacks >= game.maxAttacks) {
					returnText = translate("responses:attack.maxAttacks", language)
					return res.json({
						error: returnText,
					})
				}

				spellTurns = await attackSpell(
					attacker,
					clan,
					fight_cost(base),
					() =>
						fight_cast(
							attacker,
							defender,
							clan,
							game.turnsProtection,
							game.drRate,
							game,
							points,
							language,
						),
					game,
					language,
				)
			} else if (spell === "spy") {
				console.log("spy start")
				spellTurns = await attackSpell(
					attacker,
					clan,
					spy_cost(base),
					() => spy_cast(attacker, defender, language),
					game,
					language,
				)
			}
		} else {
			// console.log('not allowed')
			return sendError(res, 400)("tryAgain", language)
		}

		// await awardAchievements(attacker)
		await takeSnapshot(attacker, game.turnsProtection)
		await takeSnapshot(defender, game.turnsProtection)
		// console.log('test', spellTurns)
		if (desertions) {
			spellTurns.messages.desertion = desertions
		}
		return res.json(spellTurns)
	} catch (e) {
		console.log(e)
		return sendError(res, 400)("generic", language)
	}
}

const router = Router()

router.post("/", user, auth, language, attachGame, magic)
router.post("/attack", user, auth, language, attachGame, magicAttack)
// router.post('/spell', magic)

export default router
