import { Request, Response, Router } from 'express'
import { BUILD_COST } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'

import { useTurnInternal } from './useturns'
import user from '../middleware/user'
import auth from '../middleware/auth'
import { calcSizeBonus } from './actions/actions'

// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

const getBuildAmounts = (empire: Empire) => {
	let size = calcSizeBonus(empire)
	let buildCost = Math.round((BUILD_COST + empire.land * 0.2) * (size / 3))

	let buildRate = Math.round(empire.land * 0.015 + 4)

	buildRate = Math.round(
		((100 + raceArray[empire.race].mod_buildrate) / 100) * buildRate
	)

	let canBuild = Math.min(
		Math.floor(empire.cash / buildCost),
		buildRate * empire.turns,
		empire.freeLand
	)

	return { canBuild, buildRate, buildCost }
}

const build = async (req: Request, res: Response) => {
	// request will have object with type of building and number to build
	const {
		type,
		empireId,
		bldCash,
		bldPop,
		bldCost,
		bldDef,
		bldFood,
		bldTroop,
		bldWiz,
	} = req.body

	if (type !== 'build') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })

	let clan = null
	if (empire.clanId !== 0) {
		clan = await Clan.findOne({ id: empire.clanId })
	}

	const { canBuild, buildRate, buildCost } = getBuildAmounts(empire)

	let buildTotal =
		bldCash + bldPop + bldCost + bldDef + bldFood + bldTroop + bldWiz

	if (buildTotal > canBuild) {
		return res.json({ error: "Can't build that many structures" })
	}

	// console.log(buildRate)
	// console.log(buildTotal)

	let buildArray = [
		{ bldCash: bldCash },
		{ bldPop: bldPop },
		{ bldCost: bldCost },
		{ bldDef: bldDef },
		{ bldFood: bldFood },
		{ bldTroop: bldTroop },
		{ bldWiz: bldWiz },
	]

	// console.log(buildArray)
	buildArray = buildArray.filter((object) => Object.values(object)[0] > 0)

	// let totalTurns = buildTotal / buildRate

	const buildLoop = async () => {
		let resultArray = []
		for (let i = 0; i < buildArray.length; i++) {
			// console.log(buildArray[i])
			let key: string = Object.keys(buildArray[i])[0]
			let value: number = Object.values(buildArray[i])[0]
			let turns = 0
			if (value < buildRate) {
				turns = 1
			} else {
				turns = Math.ceil(value / buildRate)
			}
			// console.log(turns)
			let leftToBuild = value
			for (let i = 0; i < turns; i++) {
				// console.log(`build ${value} of ${key}s`)
				let buildAmount: number
				if (leftToBuild < buildRate) {
					buildAmount = leftToBuild
				} else {
					buildAmount = buildRate
				}
				// use one turn
				let oneTurn = useTurnInternal('build', 1, empire, clan, true)
				// console.log(oneTurn)
				let turnRes = oneTurn[0]
				if (!turnRes?.messages?.desertion) {
					empire.cash =
						empire.cash +
						turnRes.withdraw +
						turnRes.money -
						turnRes.loanpayed -
						buildAmount * buildCost

					if (empire.cash < 0) {
						empire.cash = 0
					}

					empire[key] += buildAmount
					empire.freeLand -= buildAmount
					// empire.cash -= buildAmount * buildCost
					leftToBuild -= buildAmount
					// extract turn info from result and put individual object in result array
					resultArray.push(turnRes)
					// add value to empire.key
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
				} else {
					resultArray.push(turnRes)
					// add value to empire.key
					empire.cash =
						empire.cash + turnRes.withdraw + turnRes.money - turnRes.loanpayed

					if (empire.cash < 0) {
						empire.cash = 0
					}

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

	let returnArray = await buildLoop()

	return res.json(returnArray)
}

const router = Router()

// needs user and auth middleware
router.post('/', user, auth, build)

export default router
