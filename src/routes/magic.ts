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
	result: string
	message?: string
	wizloss?: number
	food?: number
	cash?: number
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

	// TODO: handle errors
	// TODO: add break if spell check is false

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
	}
	// console.log(resultArray)

	return res.json(resultArray)
}

// route to cast spells on enemy

const router = Router()

router.post('/', user, auth, magic)
// router.post('/spell', magic)

export default router
