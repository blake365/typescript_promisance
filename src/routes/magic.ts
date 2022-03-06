import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import Empire from '../entity/Empire'


import { useTurn } from './useturns'
import { baseCost } from './spells/general'
import { regress_allow, regress_cast, regress_cost } from './spells/regress'
import { advance_allow, advance_cast, advance_cost } from './spells/advance'

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
	// console.log(empire.era, empire.turns, empire.runes)
	if (empire.trpWiz === 0) {
		return res.json({error: `You must have ${eraArray[empire.era].trpwiz} to cast spells`})
	}

	const base = baseCost(empire)

	const spellCheck = (empire: Empire, cost: number, turns: number) => {
			if (empire.runes < cost) {
				return res.json({ error: `You do not have enough ${eraArray[empire.era].runes} to cast this spell`})
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
	} else if (spell === 2) {
		// cash
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
			console.log(spellTurns)
			resultArray.push(spellTurns[0])

			// cast the spell and get result
			let cast = advance_cast(empire)
			console.log(cast)
			if (cast.result === 'success') {
				empire.era += 1
			}
			if (cast.result === 'fail') {
				empire.trpWiz -= cast.wizloss
			}
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
			console.log(spellTurns)
			resultArray.push(spellTurns[0])
			let cast = regress_cast(empire)
			console.log(cast)
			if (cast.result === 'success') {
				empire.era -= 1
			}
			if (cast.result === 'fail') {
				empire.trpWiz -= cast.wizloss
			}
			empire.turns -= turns
			empire.turnsUsed += turns

			await empire.save()
			// console.log(empire.era, empire.turns, empire.runes)
		}
	}
	console.log(resultArray)

	return res.json({message: 'test complete'})
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', magic)

export default router
