import type { Request, Response } from 'express'
import { Router } from 'express'
import { eraArray } from '../config/eras'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'

import { useTurnInternal } from './useturns'
import { baseCost } from './spells/general'
import { regress_allow, regress_cast, regress_cost } from './spells/regress'
import { advance_allow, advance_cast, advance_cost } from './spells/advance'
import { food_cast, food_cost } from './spells/food'
import { cash_cast, cash_cost } from './spells/cash'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { shield_cast, shield_cost } from './spells/shield'
import { gate_cast, gate_cost } from './spells/gate'
import { ungate_cast, ungate_cost } from './spells/ungate'
import EmpireEffect from '../entity/EmpireEffect'
import { blast_cast, blast_cost } from './spells/blast'
import { struct_cast, struct_cost } from './spells/struct'
import { storm_cast, storm_cost } from './spells/storm'
import { steal_cast, steal_cost } from './spells/steal'
import { runes_cast, runes_cost } from './spells/runes'
import { fight_cast, fight_cost } from './spells/fight'
import { spy_cast, spy_cost } from './spells/spy'

import { updateEmpire } from './actions/updateEmpire'
import { takeSnapshot } from './actions/snaps'
import { attachGame } from '../middleware/game'
import type Game from '../entity/Game'
// FIXED: internal turns not working

const spellCheck = (empire: Empire, cost: number, turns: number) => {
	if (empire.food <= 0) {
		return {
			error:
				'You have run out of food! Spells cannot be cast during this crisis!',
		}
	}
	if (empire.cash <= 0) {
		return {
			error:
				'You have run out of cash! Spells cannot be cast during this crisis!',
		}
	}

	if (empire.runes < cost) {
		return {
			error: `You do not have enough ${
				eraArray[empire.era].runes
			} to cast this spell.`,
		}
	} else if (empire.turns < turns) {
		return { error: 'You do not have enough turns to cast this spell.' }
	} else if (empire.health < 20) {
		return { error: 'You do not have enough health to cast this spell.' }
	} else return 'passed'
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
	if (type !== 'magic') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })

	let clan = null
	if (empire.clanId !== 0) {
		clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ['relation'],
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
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						'magic',
						turns,
						empire,
						clan,
						true,
						game
					)
					let spellRes = spellTurns[0]
					// console.log('spell res', spellRes)
					spellTurns = spellTurns[0]
					console.log(empire.turns)
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns['cast'] = {
							result: 'desertion',
							message: 'The spell could not be cast.',
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = await shield_cast(empire)
						// console.log(cast)
						if (cast.result === 'fail') {
							empire.trpWiz -= cast.wizloss
							await empire.save()
						}
						await updateEmpire(empire, spellRes, turns, game)
						spellTurns['cast'] = cast
					}
					// console.log(spellTurns)
					resultArray.push(spellTurns)
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 1) {
		// food
		const cost = food_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						'magic',
						turns,
						empire,
						clan,
						true,
						game
					)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns['cast'] = {
							result: 'desertion',
							message: 'The spell could not be cast.',
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = food_cast(empire, game.pvtmFood)
						// console.log(cast)
						if (cast.result === 'success') {
							empire.food += cast.food
							empire.magicProd += cast.food * game.pvtmFood
						}
						if (cast.result === 'fail') {
							empire.trpWiz -= cast.wizloss
						}
						spellTurns['cast'] = cast
						await updateEmpire(empire, spellRes, turns, game)
					}
					// console.log(spellTurns)
					resultArray.push(spellTurns)
					// cast the spell and get result
					// compose turn result and food result into a single object, insert into array
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}

				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 2) {
		// cash
		const cost = cash_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				// console.log(i, spellCheck(empire, cost, turns))
				if (spellCheck(empire, cost, turns) === 'passed') {
					console.log(empire.cash)
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						'magic',
						turns,
						empire,
						clan,
						true,
						game
					)
					console.log(empire.cash)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns['cast'] = {
							result: 'desertion',
							message: 'The spell could not be cast.',
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = cash_cast(empire)
						// console.log(cast)
						// console.log(empire.cash)
						if (cast.result === 'success') {
							empire.cash += cast.cash
							empire.magicProd += cast.cash
						}
						if (cast.result === 'fail') {
							empire.trpWiz -= cast.wizloss
						}
						await updateEmpire(empire, spellRes, turns, game)
						spellTurns['cast'] = cast
					}

					resultArray.push(spellTurns)
					// compose turn result and food result into a single object, insert into array
					// console.log('cash:', empire.cash, empire.turns, empire.runes)
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}
				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 3) {
		// advance
		// only allow one at a time
		const cost = advance_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					let allowed = await advance_allow(empire)
					// console.log('advance allow', allowed)
					if (!allowed) {
						let spellTurns = { error: 'There is no era to advance to' }
						resultArray.push(spellTurns)
						break
					} else if (typeof allowed === 'string') {
						let spellTurns = { error: allowed }
						resultArray.push(spellTurns)
						break
					} else {
						empire.runes -= cost
						// use two turns to cast spell
						let spellTurns = useTurnInternal(
							'magic',
							turns,
							empire,
							clan,
							true,
							game
						)
						let spellRes = spellTurns[0]
						spellTurns = spellTurns[0]
						if (spellRes?.messages?.desertion) {
							await updateEmpire(empire, spellRes, turns, game)
							console.log(spellRes.messages.desertion)
							spellTurns['cast'] = {
								result: 'desertion',
								message: 'The spell could not be cast.',
							}
							resultArray.push(spellTurns)
							break
						} else {
							let cast: Cast = advance_cast(empire)
							// console.log(cast)
							if (cast.result === 'success') {
								empire.era += 1
							}
							if (cast.result === 'fail') {
								empire.trpWiz -= cast.wizloss
							}
							spellTurns['cast'] = cast
						}

						resultArray.push(spellTurns)

						await updateEmpire(empire, spellRes, turns, game)
						// console.log(empire.era, empire.turns, empire.runes)
					}
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}

				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 4) {
		// regress
		// only allow one at a time
		const cost = regress_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					let allowed = await regress_allow(empire)
					// console.log('regress allow', allowed)
					if (!allowed) {
						let spellTurns = { error: 'There is no era to regress to' }
						resultArray.push(spellTurns)
						break
					} else if (typeof allowed === 'string') {
						let spellTurns = { error: allowed }
						resultArray.push(spellTurns)
						break
					} else {
						empire.runes -= cost
						// use two turns to cast spell
						let spellTurns = useTurnInternal(
							'magic',
							turns,
							empire,
							clan,
							true,
							game
						)
						let spellRes = spellTurns[0]
						spellTurns = spellTurns[0]
						if (spellRes?.messages?.desertion) {
							await updateEmpire(empire, spellRes, turns, game)
							console.log(spellRes.messages.desertion)
							spellTurns['cast'] = {
								result: 'desertion',
								message: 'The spell could not be cast.',
							}
							resultArray.push(spellTurns)
							break
						} else {
							let cast: Cast = regress_cast(empire)
							// console.log(cast)
							if (cast.result === 'success') {
								empire.era -= 1
							}
							if (cast.result === 'fail') {
								empire.trpWiz -= cast.wizloss
							}
							spellTurns['cast'] = cast
						}

						resultArray.push(spellTurns)

						await updateEmpire(empire, spellRes, turns, game)
						// console.log(empire.era, empire.turns, empire.runes)
					}
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}
				// console.log('food:', empire.food, empire.turns, empire.runes)
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 5) {
		// open time gate
		const cost = gate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						'magic',
						turns,
						empire,
						clan,
						true,
						game
					)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns['cast'] = {
							result: 'desertion',
							message: 'The spell could not be cast.',
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = await gate_cast(empire)
						// console.log(cast)

						if (cast.result === 'fail') {
							empire.trpWiz -= cast.wizloss
						}
						spellTurns['cast'] = cast
					}

					resultArray.push(spellTurns)

					await updateEmpire(empire, spellRes, turns, game)
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
			resultArray.push(spellTurns)
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)
	} else if (spell === 6) {
		// close time gate
		const cost = ungate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal(
						'magic',
						turns,
						empire,
						clan,
						true,
						game
					)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					if (spellRes?.messages?.desertion) {
						await updateEmpire(empire, spellRes, turns, game)
						console.log(spellRes.messages.desertion)
						spellTurns['cast'] = {
							result: 'desertion',
							message: 'The spell could not be cast.',
						}
						resultArray.push(spellTurns)
						break
					} else {
						let cast: Cast = await ungate_cast(empire)
						// console.log(cast)

						if (cast.result === 'fail') {
							empire.trpWiz -= cast.wizloss
						}
						spellTurns['cast'] = cast
					}

					resultArray.push(spellTurns)

					await updateEmpire(empire, spellRes, turns, game)
				} else {
					let spellTurns = spellCheck(empire, cost, turns)
					resultArray.push(spellTurns)
					break
				}
			}
		} else {
			let spellTurns = spellCheck(empire, cost, turns)
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
	game: Game
) => {
	const cost = spellCost
	const turns = 2
	if (spellCheck(attacker, cost, turns) === 'passed') {
		attacker.runes -= cost
		// use two turns to cast spell
		let spellTurns = useTurnInternal('magic', turns, attacker, clan, true, game)
		let spellRes = spellTurns[0]
		spellTurns = spellTurns[0]

		if (spellRes?.messages?.desertion) {
			console.log('desertion trigger')
			await updateEmpire(attacker, spellRes, turns, game)
			console.log(spellRes.messages.desertion)
			spellTurns['cast'] = {
				result: 'desertion',
				message: 'The spell could not be cast.',
			}
			return spellTurns
		} else {
			console.log('spell casting')
			let cast: Cast = await spell()
			// console.log(cast)
			if (cast.result === 'fail') {
				attacker.trpWiz -= cast.wizloss
			}
			spellTurns['cast'] = cast
			// console.log('spellTurns', spellTurns)
			// cast the spell and get result
			// console.log('spellRes', spellRes)
			await updateEmpire(attacker, spellRes, turns, game)
			// console.log('returning with spellTurns')
			return spellTurns
		}
	} else {
		let spellTurns = spellCheck(attacker, cost, turns)
		return spellTurns
	}
}

// route to cast spells on enemy
const magicAttack = async (req: Request, res: Response) => {
	// request will have object with spell, attacker, defender
	const { attackerId, defenderId, spell } = req.body
	let { type } = req.body
	const game: Game = res.locals.game
	if (type !== 'magic attack') {
		return res.json({ error: 'Something went wrong' })
	}

	let canAttack = false

	let returnText = ''

	try {
		const attacker = await Empire.findOne({ id: attackerId })
		const defender = await Empire.findOne({ id: defenderId })

		if (attacker.game_id !== defender.game_id) {
			return res.status(400).json({ error: 'Unauthorized' })
		}

		let clan = null
		if (attacker.clanId !== 0) {
			clan = await Clan.findOneOrFail({
				where: { id: attacker.clanId },
				relations: ['relation'],
			})

			const relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === 'war') {
					return relation.c_id2
				}
			})
			// check if clan is at war
			if (relations.includes(defender.clanId)) {
				console.log('clan is at war')
				// clan is at war with defender
				type = 'war'
			}
		}

		// console.log('food:', empire.food, 'cash:', empire.cash, empire.turns, empire.runes)
		if (attacker.trpWiz === 0) {
			return res.json({
				error: `You must have ${eraArray[attacker.era].trpwiz} to cast spells`,
			})
		}

		const base = baseCost(attacker)

		if (attacker.spells >= game.maxSpells) {
			canAttack = false
			returnText =
				'You have cast the max number of offensive spells. Wait a while before casting another.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.clanId !== 0 && attacker.clanId === defender.clanId) {
			canAttack = false
			returnText = 'You cannot cast spells on your own clan.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = 'You cannot cast attack spells while in protection.'
			return res.json({
				error: returnText,
			})
		}

		if (defender.turnsUsed <= game.turnsProtection) {
			canAttack = false
			returnText = 'You cannot cast spells against such a young empire.'
			return res.json({
				error: returnText,
			})
		}

		if (defender.land <= 1000) {
			canAttack = false
			returnText =
				'You cannot cast spells on an empire with such a small amount of land.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.era === defender.era && attacker.turns > 2) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			const effect = await EmpireEffect.findOne({
				where: { effectOwnerId: attacker.id, empireEffectName: 'time gate' },
				order: { createdAt: 'DESC' },
			})

			if (effect) {
				const now = new Date()

				const effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				const timeLeft = effect.empireEffectValue - effectAge

				if (timeLeft > 0) {
					canAttack = true
					returnText = 'Your spell travels through your Time Gate...'
				} else {
					// try defender time gate
					const defEffect = await EmpireEffect.findOne({
						where: {
							effectOwnerId: defender.empireId,
							empireEffectName: 'time gate',
						},
						order: { createdAt: 'DESC' },
					})

					if (defEffect) {
						const now = new Date()
						const effectAge =
							(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
						const timeLeft = defEffect.empireEffectValue - effectAge
						if (timeLeft > 0) {
							canAttack = true
							returnText =
								'Your spell travels through your opponents Time Gate...'
						} else {
							returnText =
								'You must open a Time Gate to cast spells on players in another Era'
							return res.json({
								error: returnText,
							})
						}
					} else {
						canAttack = false
						returnText =
							'You must open a Time Gate to cast spells on players in another Era'
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
						empireEffectName: 'time gate',
					},
					order: { createdAt: 'DESC' },
				})

				if (defEffect) {
					const now = new Date()
					const effectAge =
						(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
					const timeLeft = defEffect.empireEffectValue - effectAge
					if (timeLeft > 0) {
						canAttack = true
						returnText =
							'Your spell travels through your opponents Time Gate...'
					} else {
						returnText =
							'You must open a Time Gate to cast spells on players in another Era'
						return res.json({
							error: returnText,
						})
					}
				} else {
					canAttack = false
					returnText =
						'You must open a Time Gate to cast spells on players in another Era'
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
			if (spell !== 'spy') {
				if (attacker.networth > defender.networth * 2.5 && type !== 'war') {
					// the attacker is ashamed for attacking a smaller empire, troops desert
					console.log('attacker is ashamed')
					desertions =
						'Your army is ashamed to fight such a weak opponent, many desert... '
					attacker.trpArm = Math.round(0.98 * attacker.trpArm)
					attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
					attacker.trpFly = Math.round(0.98 * attacker.trpFly)
					attacker.trpSea = Math.round(0.98 * attacker.trpSea)
					attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
				}

				if (attacker.networth < defender.networth * 0.2 && type !== 'war') {
					// the attacker is fearful of large empire, troops desert
					console.log('attacker is fearful')
					desertions =
						'Your army is fearful of fighting such a strong opponent, many desert... '
					attacker.trpArm = Math.round(0.98 * attacker.trpArm)
					attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
					attacker.trpFly = Math.round(0.98 * attacker.trpFly)
					attacker.trpSea = Math.round(0.98 * attacker.trpSea)
					attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
				}
			}
			if (spell === 'blast') {
				// blast
				console.log('blast start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					blast_cost(base),
					() => blast_cast(attacker, defender, game),
					game
				)
				// console.log(spellTurns)
			} else if (spell === 'struct') {
				// struct
				console.log('struct start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					struct_cost(base),
					() => struct_cast(attacker, defender, game),
					game
				)
				console.log(spellTurns)
			} else if (spell === 'storm') {
				console.log('storm start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					storm_cost(base),
					() => storm_cast(attacker, defender, game),
					game
				)
			} else if (spell === 'steal') {
				console.log('steal start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					steal_cost(base),
					() => steal_cast(attacker, defender, game),
					game
				)
			} else if (spell === 'runes') {
				console.log('runes start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					runes_cost(base),
					() => runes_cast(attacker, defender, game),
					game
				)
			} else if (spell === 'fight') {
				console.log('fight start')
				if (attacker.attacks >= game.maxAttacks) {
					returnText =
						'You have reached the max number of attacks. Wait a while before attacking.'
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
							game
						),
					game
				)
			} else if (spell === 'spy') {
				console.log('spy start')
				spellTurns = await attackSpell(
					attacker,
					clan,
					spy_cost(base),
					() => spy_cast(attacker, defender),
					game
				)
			}
		} else {
			// console.log('not allowed')
			return res.json({
				error: `${
					eraArray[attacker.era].effectname_gate
				} is required to cast a spell on this empire.`,
			})
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
		return res.json({ error: 'Something went wrong' })
	}
}

const router = Router()

router.post('/', user, auth, attachGame, magic)
router.post('/attack', user, auth, attachGame, magicAttack)
// router.post('/spell', magic)

export default router
