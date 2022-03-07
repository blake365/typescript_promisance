import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import Empire from '../entity/Empire'


import { useTurn } from './useturns'
import { baseCost } from './spells/general'
import { regress_allow, regress_cast, regress_cost } from './spells/regress'
import { advance_allow, advance_cast, advance_cost } from './spells/advance'
import { food_cast, food_cost } from './spells/food'
import { cash_cast, cash_cost } from './spells/cash'

const magic = async (req: Request, res: Response) => {
	// request will have object with type of spell as a number and number of times to cast spell
	const {
		type,
		empireId,
		spell, 
		number
	} = req.body

	if (type !== 'magic') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })
	console.log('food:', empire.food, 'cash:', empire.cash, empire.turns, empire.runes)
	if (empire.trpWiz === 0) {
		return res.json({error: `You must have ${eraArray[empire.era].trpwiz} to cast spells`})
	}

	const base = baseCost(empire)

	// TODO: handle errors

	const spellCheck = (empire: Empire, cost: number, turns: number) => {
			if (empire.runes < cost) {
				return res.json({ error: `You do not have enough ${eraArray[empire.era].runes} to cast this spell` })
			}
			if (empire.turns < turns) {
				return res.json({ error: 'You do not have enough turns to cast this spell'})
			}
			if (empire.health < 20) {
				return res.json({ error: 'You do not have enough health to cast this spell'})
			}
	}

	let resultArray = []

	if (spell === 1) {
		// food
		const cost = food_cost(base)
		const turns = 2
		spellCheck(empire, cost, turns)
		for (let i = 0; i < number; i++) {
			spellCheck(empire, cost, turns)
			empire.runes -= cost
			// use two turns to cast spell
			let spellTurns = await useTurn('magic', turns, empireId, true)
			spellTurns = spellTurns[0]
			let cast = food_cast(empire)
			console.log(cast)
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
			empire.turns -= turns
			empire.turnsUsed += turns

			await empire.save()
			console.log('food:', empire.food, empire.turns, empire.runes)
		}
	} else if (spell === 2) {
		// cash
		const cost = cash_cost(base)
		const turns = 2
		spellCheck(empire, cost, turns)
		for (let i = 0; i < number; i++) {
			spellCheck(empire, cost, turns)
			empire.runes -= cost
			// use two turns to cast spell
			let spellTurns = await useTurn('magic', turns, empireId, true)
			spellTurns = spellTurns[0]
			

			// cast the spell and get result
			let cast = cash_cast(empire)
			console.log(cast)
			if (cast.result === 'success') {
				empire.cash += cast.cash
			}
			if (cast.result === 'fail') {
				empire.trpWiz -= cast.wizloss
			}
			spellTurns['cast'] = cast
			resultArray.push(spellTurns)
			// compose turn result and food result into a single object, insert into array
			empire.turns -= turns
			empire.turnsUsed += turns

			await empire.save()
			console.log('cash:', empire.cash, empire.turns, empire.runes)
		}
	} else if (spell === 3) {
		// advance
		// only allow one at a time
		// TODO: figure out how to best send result back
		const cost = advance_cost(base)
		const turns = 2
		spellCheck(empire, cost, turns)
		for (let i = 0; i < number; i++) {
			if (!advance_allow(empire)) {
				return res.json({ error: 'There is no era to advance to' })
			}
			spellCheck(empire, cost, turns)
			empire.runes -= cost
			// use two turns to cast spell
			let spellTurns = await useTurn('magic', turns, empireId, true)
			spellTurns = spellTurns[0]

			// cast the spell and get result
			let cast = advance_cast(empire)
			console.log(cast)
			if (cast.result === 'success') {
				empire.era += 1
			}
			if (cast.result === 'fail') {
				empire.trpWiz -= cast.wizloss
			}

			spellTurns['cast'] = cast
			resultArray.push(spellTurns)
			empire.turns -= turns
			empire.turnsUsed += turns

			await empire.save()
			// console.log(empire.era, empire.turns, empire.runes)
		}
	} else if (spell === 4) {
		// regress
		// only allow one at a time
		// TODO: figure out how to best send result back
		const cost = regress_cost(base)
		const turns = 2
		spellCheck(empire, cost, turns)
		for (let i = 0; i < number; i++){
			if (!regress_allow(empire)) {
				return res.json({ error: 'There is no era to regress to'})
			}
			spellCheck(empire, cost, turns)
			empire.runes -= cost
			// use two turns to cast spell
			let spellTurns = await useTurn('magic', turns, empireId, true)
			spellTurns = spellTurns[0]

			let cast = regress_cast(empire)
			console.log(cast)
			if (cast.result === 'success') {
				empire.era -= 1
			}
			if (cast.result === 'fail') {
				empire.trpWiz -= cast.wizloss
			}

			spellTurns['cast'] = cast
			resultArray.push(spellTurns)

			empire.turns -= turns
			empire.turnsUsed += turns

			await empire.save()
			// console.log(empire.era, empire.turns, empire.runes)
		}
	}
	console.log(resultArray)

	return res.json(resultArray)
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', magic)

export default router
