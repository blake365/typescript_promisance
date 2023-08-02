import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import Empire from '../entity/Empire'

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
// FIXED: internal turns not working

const spellCheck = (empire: Empire, cost: number, turns: number) => {
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

	if (type !== 'magic') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })
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
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					let cast: Cast = await shield_cast(empire)
					// console.log(cast)

					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}
					spellTurns['cast'] = cast
					// console.log(spellTurns)
					resultArray.push(spellTurns)
					// cast the spell and get result
					// compose turn result and food result into a single object, insert into array
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
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
	} else if (spell === 1) {
		// food
		const cost = food_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]
					let cast = food_cast(empire)
					// console.log(cast)
					if (cast.result === 'success') {
						empire.food += cast.food
					}
					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}
					spellTurns['cast'] = cast
					// console.log(spellTurns)
					resultArray.push(spellTurns)
					// cast the spell and get result
					// compose turn result and food result into a single object, insert into array
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
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
	} else if (spell === 2) {
		// cash
		const cost = cash_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < number; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]

					// cast the spell and get result
					let cast = cash_cast(empire)
					// console.log(cast)
					if (cast.result === 'success') {
						empire.cash += cast.cash
					}
					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}
					spellTurns['cast'] = cast
					resultArray.push(spellTurns)
					// compose turn result and food result into a single object, insert into array
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz

					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
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
	} else if (spell === 3) {
		// advance
		// only allow one at a time
		const cost = advance_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					if (!advance_allow(empire)) {
						let spellTurns = { error: 'There is no era to advance to' }
						resultArray.push(spellTurns)
						break
					}

					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]

					// cast the spell and get result
					let cast = advance_cast(empire)
					// console.log(cast)
					if (cast.result === 'success') {
						empire.era += 1
					}
					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}

					spellTurns['cast'] = cast
					resultArray.push(spellTurns)
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
					// console.log(empire.era, empire.turns, empire.runes)
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
	} else if (spell === 4) {
		// regress
		// only allow one at a time
		const cost = regress_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					if (!regress_allow(empire)) {
						let spellTurns = { error: 'There is no era to regress to' }
						resultArray.push(spellTurns)
						break
					}
					spellCheck(empire, cost, turns)
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]

					let cast = regress_cast(empire)
					// console.log(cast)
					if (cast.result === 'success') {
						empire.era -= 1
					}
					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}

					spellTurns['cast'] = cast
					resultArray.push(spellTurns)
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
					// console.log(empire.era, empire.turns, empire.runes)
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
	} else if (spell === 5) {
		// open time gate
		const cost = gate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]

					let cast: Cast = await gate_cast(empire)
					// console.log(cast)

					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}

					spellTurns['cast'] = cast
					resultArray.push(spellTurns)
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
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
	} else if (spell === 6) {
		// close time gate
		const cost = ungate_cost(base)
		const turns = 2
		if (spellCheck(empire, cost, turns) === 'passed') {
			for (let i = 0; i < 1; i++) {
				if (spellCheck(empire, cost, turns) === 'passed') {
					empire.runes -= cost
					// use two turns to cast spell
					let spellTurns = useTurnInternal('magic', turns, empire, true)
					let spellRes = spellTurns[0]
					spellTurns = spellTurns[0]

					let cast: Cast = await ungate_cast(empire)
					// console.log(cast)

					if (cast.result === 'fail') {
						empire.trpWiz -= cast.wizloss
					}

					spellTurns['cast'] = cast
					resultArray.push(spellTurns)
					empire.cash =
						empire.cash +
						spellRes.withdraw +
						spellRes.money -
						spellRes.loanpayed

					empire.loan -= spellRes.loanpayed + spellRes.loanInterest
					empire.trpArm += spellRes.trpArm
					empire.trpLnd += spellRes.trpLnd
					empire.trpFly += spellRes.trpFly
					empire.trpSea += spellRes.trpSea
					empire.food += spellRes.food
					empire.peasants += spellRes.peasants
					empire.runes += spellRes.runes
					empire.trpWiz += spellRes.trpWiz
					empire.turns -= turns
					empire.turnsUsed += turns

					await empire.save()
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
	}
	// console.log(resultArray)

	return res.json(resultArray)
}

const attackSpell = async (attacker: Empire, spellCost: number, spell) => {
	const cost = spellCost
	const turns = 2
	if (spellCheck(attacker, cost, turns) === 'passed') {
		attacker.runes -= cost
		// use two turns to cast spell
		let spellTurns = useTurnInternal('magic', turns, attacker, true)
		let spellRes = spellTurns[0]
		spellTurns = spellTurns[0]
		let cast: Cast = await spell
		// console.log(cast)

		if (cast.result === 'fail') {
			attacker.trpWiz -= cast.wizloss
		}
		spellTurns['cast'] = cast
		// console.log(spellTurns)
		// cast the spell and get result

		attacker.cash =
			attacker.cash + spellRes.withdraw + spellRes.money - spellRes.loanpayed

		attacker.loan -= spellRes.loanpayed + spellRes.loanInterest
		attacker.trpArm += spellRes.trpArm
		attacker.trpLnd += spellRes.trpLnd
		attacker.trpFly += spellRes.trpFly
		attacker.trpSea += spellRes.trpSea
		attacker.food += spellRes.food
		attacker.peasants += spellRes.peasants
		attacker.runes += spellRes.runes
		attacker.trpWiz += spellRes.trpWiz
		attacker.turns -= turns
		attacker.turnsUsed += turns
		attacker.health -= 6

		await attacker.save()

		console.log('returning with spellTurns')
		return spellTurns
	} else {
		let spellTurns = spellCheck(attacker, cost, turns)
		return spellTurns
	}
}

// route to cast spells on enemy
const magicAttack = async (req: Request, res: Response) => {
	// request will have object with spell, attacker, defender
	const { type, attackerId, defenderId, spell } = req.body

	if (type !== 'magic attack') {
		return res.json({ error: 'Something went wrong' })
	}

	let canAttack = false

	let returnText = ''
	let attackDescription = {}

	try {
		const attacker = await Empire.findOne({ id: attackerId })
		const defender = await Empire.findOne({ id: defenderId })
		// console.log('food:', empire.food, 'cash:', empire.cash, empire.turns, empire.runes)
		if (attacker.trpWiz === 0) {
			return res.json({
				error: `You must have ${eraArray[attacker.era].trpwiz} to cast spells`,
			})
		}

		const base = baseCost(attacker)

		if (attacker.era === defender.era && attacker.turns > 2) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			const effect = await EmpireEffect.findOneOrFail({
				where: { effectOwnerId: attacker.id, empireEffectName: 'time gate' },
				order: { createdAt: 'DESC' },
			})

			if (effect) {
				let now = new Date()

				let effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				let timeLeft = effect.empireEffectValue - effectAge

				if (timeLeft > 0) {
					canAttack = true
					returnText = 'Your army travels through your Time Gate...'
				}
			} else {
				// try defender time gate
				const defEffect = await EmpireEffect.findOneOrFail({
					where: {
						effectOwnerId: defender.empireId,
						empireEffectName: 'time gate',
					},
					order: { createdAt: 'DESC' },
				})

				if (defEffect) {
					let now = new Date()
					let effectAge =
						(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
					let timeLeft = defEffect.empireEffectValue - effectAge
					if (timeLeft > 0) {
						canAttack = true
						returnText = 'Your army travels through your opponents Time Gate...'
					} else {
						returnText =
							'You must open a Time Gate to attack players in another Era'
					}
				} else {
					canAttack = false
					returnText =
						'You must open a Time Gate to attack players in another Era'
				}
			}
		}

		console.log('can attack', canAttack)
		// handle errors
		// add break if spell check is false
		let spellTurns = {}

		if (canAttack) {
			if (spell === 'blast') {
				// blast
				console.log('blast start')
				spellTurns = await attackSpell(
					attacker,
					blast_cost(base),
					blast_cast(attacker, defender)
				)
				// console.log(spellTurns)
			} else if (spell === 'struct') {
				// struct
				console.log('struct start')
				spellTurns = await attackSpell(
					attacker,
					struct_cost(base),
					struct_cast(attacker, defender)
				)
				console.log(spellTurns)
			} else if (spell === 'storm') {
				console.log('storm start')
				spellTurns = await attackSpell(
					attacker,
					storm_cost(base),
					storm_cast(attacker, defender)
				)
			} else if (spell === 'steal') {
				console.log('steal start')
				spellTurns = await attackSpell(
					attacker,
					steal_cost(base),
					steal_cast(attacker, defender)
				)
			} else if (spell === 'runes') {
				console.log('runes start')
				spellTurns = await attackSpell(
					attacker,
					runes_cost(base),
					runes_cast(attacker, defender)
				)
			} else if (spell === 'fight') {
				console.log('fight start')
				spellTurns = await attackSpell(
					attacker,
					fight_cost(base),
					fight_cast(attacker, defender)
				)
			} else if (spell === 'spy') {
				console.log('spy start')
				spellTurns = await attackSpell(
					attacker,
					spy_cost(base),
					spy_cast(attacker, defender)
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

		console.log('test', spellTurns)
		return res.json(spellTurns)
	} catch (e) {
		console.log(e)
		return res.json({ error: 'Something went wrong' })
	}
}

const router = Router()

router.post('/', user, auth, magic)
router.post('/attack', user, auth, magicAttack)
// router.post('/spell', magic)

export default router
