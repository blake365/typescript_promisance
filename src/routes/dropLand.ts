import { Request, Response, Router } from 'express'
import { BUILD_COST } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'

import { useTurnInternal } from './useturns'

// FIXME: result of turns is not being saved to empire
// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

interface oneTurn {
	withdraw?: number
	income?: number
	expenses?: number
	wartax?: number
	loanpayed?: number
	loanInterest?: number
	money?: number
	trpArm?: number
	trpLnd?: number
	trpFly?: number
	trpSea?: number
	foodpro?: number
	foodcon?: number
	food?: number
	peasants?: number
	runes?: number
	trpWiz?: number
}

const getDropAmounts = (empire) => {
	let dropRate = Math.max(
		Math.ceil(
			((empire.land * 0.02 + 2) *
				((100 + raceArray[empire.race].mod_buildrate) / 100)) /
				10
		),
		50
	)

	// TODO: empire effect to restrict land dropping
	let canDrop = Math.min(
		dropRate * empire.turns,
		empire.freeLand,
		Math.max(0, empire.land - 1000)
	)

	return { dropRate, canDrop }
}

const drop = async (req: Request, res: Response) => {
	// request will have object with type of building and number to build
	const { type, empireId, drop } = req.body

	if (type !== 'drop') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })

	const { dropRate, canDrop } = getDropAmounts(empire)

	if (drop > canDrop) {
		return res.json({ error: "Can't drop that much land" })
	}

	let turns = Math.ceil(drop / dropRate)
	if (drop <= dropRate) {
		turns = 1
	}

	const dropLoop = async () => {
		let resultArray = []
		for (let i = 0; i < turns; i++) {
			console.log(turns)
			let value = drop
			let leftToDrop = value

			let dropAmount: number
			if (leftToDrop < dropRate) {
				dropAmount = leftToDrop
			} else {
				dropAmount = dropRate
			}
			// use one turn
			let oneTurn = useTurnInternal('drop', 1, empire, true)
			// console.log(oneTurn)
			let turnRes: oneTurn = oneTurn[0]
			// extract turn info from result and put individual object in result array
			resultArray.push(turnRes)
			// add value to empire.key
			empire.cash =
				empire.cash + turnRes.withdraw + turnRes.money - turnRes.loanpayed
			empire.loan -= turnRes.loanpayed + turnRes.loanInterest
			empire.trpArm += turnRes.trpArm
			empire.trpLnd += turnRes.trpLnd
			empire.trpFly += turnRes.trpFly
			empire.trpSea += turnRes.trpSea
			empire.food += turnRes.food
			empire.peasants += turnRes.peasants
			empire.runes += turnRes.runes
			empire.trpWiz += turnRes.trpWiz

			empire.freeLand -= dropAmount
			leftToDrop -= dropAmount
			empire.turns--
			empire.turnsUsed++

			await empire.save()
		}
		// console.log(resultArray)
		return resultArray
	}

	let returnArray = await dropLoop()

	return res.json(returnArray)
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', drop)

export default router
