import { Request, Response, Router } from 'express'
import { BUILD_COST } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'

import { useTurnInternal } from './useturns'
import auth from '../middleware/auth'
import user from '../middleware/user'

// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

const getDemolishAmounts = (empire) => {
	let demolishCost = Math.round((BUILD_COST + empire.land * 0.1) / 5)

	let demolishRate = Math.round(
		Math.min(
			Math.floor(empire.land * 0.02 + 2) *
				((100 + raceArray[empire.race].mod_buildrate) / 100),
			200
		)
	)

	let canDemolish = Math.min(
		demolishRate * empire.turns,
		empire.land - empire.freeLand
	)

	return { canDemolish, demolishRate, demolishCost }
}

const demolish = async (req: Request, res: Response) => {
	// request will have object with type of building and number to build
	const {
		type,
		empireId,
		demoCash,
		demoPop,
		demoCost,
		demoDef,
		demoFood,
		demoTroop,
		demoWiz,
	} = req.body

	if (type !== 'demolish') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })

	const { canDemolish, demolishRate, demolishCost } = getDemolishAmounts(empire)

	let demoTotal =
		demoCash + demoPop + demoCost + demoDef + demoFood + demoTroop + demoWiz

	if (demoTotal > canDemolish) {
		return res.json({ error: "Can't build that many structures" })
	}

	// console.log(buildRate)
	// console.log(buildTotal)

	let demoArray = [
		{ bldCash: demoCash },
		{ bldPop: demoPop },
		{ bldCost: demoCost },
		{ bldDef: demoDef },
		{ bldFood: demoFood },
		{ bldTroop: demoTroop },
		{ bldWiz: demoWiz },
	]

	// console.log(buildArray)
	demoArray = demoArray.filter((object) => Object.values(object)[0] > 0)

	// let totalTurns = buildTotal / buildRate

	const demoLoop = async () => {
		let resultArray = []
		for (let i = 0; i < demoArray.length; i++) {
			// console.log(buildArray[i])
			let key: string = Object.keys(demoArray[i])[0]
			let value: number = Object.values(demoArray[i])[0]
			let turns = 0
			if (value < demolishRate) {
				turns = 1
			} else {
				turns = Math.ceil(value / demolishRate)
			}
			// console.log(turns)
			let leftToDemo = value
			for (let i = 0; i < turns; i++) {
				// console.log(`demo ${value} of ${key}s`)
				let demoAmount: number
				if (leftToDemo < demolishRate) {
					demoAmount = leftToDemo
				} else {
					demoAmount = demolishRate
				}
				// use one turn
				let oneTurn = useTurnInternal('demolish', 1, empire, true)
				// console.log(oneTurn)
				let turnRes = oneTurn[0]
				// extract turn info from result and put individual object in result array
				if (!turnRes?.messages?.desertion) {
					resultArray.push(turnRes)
					// add value to empire.key
					empire.cash =
						empire.cash +
						turnRes.withdraw +
						turnRes.money -
						turnRes.loanpayed +
						demoAmount * demolishCost
					empire.loan -= turnRes.loanpayed + turnRes.loanInterest
					empire.trpArm += turnRes.trpArm
					empire.trpLnd += turnRes.trpLnd
					empire.trpFly += turnRes.trpFly
					empire.trpSea += turnRes.trpSea
					empire.food += turnRes.food
					empire.peasants += turnRes.peasants
					empire.runes += turnRes.runes
					empire.trpWiz += turnRes.trpWiz
					empire[key] -= demoAmount
					empire.freeLand += demoAmount
					// empire.cash -= buildAmount * buildCost
					leftToDemo -= demoAmount
					empire.turns--
					empire.turnsUsed++

					empire.lastAction = new Date()
					await empire.save()
				} else {
					resultArray.push(turnRes)
					// add value to empire.key
					empire.cash =
						empire.cash +
						turnRes.withdraw +
						turnRes.money -
						turnRes.loanpayed +
						turnRes.loanInterest

					empire.loan -= turnRes.loanpayed + turnRes.loanInterest
					empire.trpArm += turnRes.trpArm
					empire.trpLnd += turnRes.trpLnd
					empire.trpFly += turnRes.trpFly
					empire.trpSea += turnRes.trpSea
					empire.food += turnRes.food
					empire.peasants += turnRes.peasants
					empire.runes += turnRes.runes
					empire.trpWiz += turnRes.trpWiz

					empire.turns--
					empire.turnsUsed++
					empire.lastAction = new Date()
					await empire.save()
					break
				}
			}
		}
		// console.log(resultArray)
		return resultArray
	}

	let returnArray = await demoLoop()

	return res.json(returnArray)
}

const router = Router()

router.post('/', user, auth, demolish)

export default router
