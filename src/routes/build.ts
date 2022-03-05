import { Request, Response, Router } from 'express'
import { BUILD_COST } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'


import { useTurn } from './useturns'

const getBuildAmounts = (empire: Empire) => {
	let buildCost = Math.round(BUILD_COST + empire.land * 0.1)

	let buildRate = Math.round(empire.land * 0.015 + 4)

	buildRate = Math.round((100 + raceArray[empire.race].mod_buildrate) / 100 * buildRate)

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
				let oneTurn = await useTurn('build', 1, empireId, true)
				// console.log(oneTurn)
				// extract turn info from result and put individual object in result array
				resultArray.push(oneTurn[0])
				// add value to empire.key
				empire[key] += buildAmount
				empire.freeLand -= buildAmount
				empire.cash -= value * buildCost
				empire.turns--
				empire.turnsUsed++

				leftToBuild -= buildAmount
				await empire.save()
			}
		}
		// console.log(resultArray)
		return resultArray
	}

	let returnArray = await buildLoop()

	return res.json(returnArray)
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', build)

export default router
