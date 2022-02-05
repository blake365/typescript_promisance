import { min } from 'class-validator'
import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import {
	calcPCI,
	calcSizeBonus,
	explore,
	exploreAlt,
	getNetworth,
} from './actions/actions'

import useTurns from './useturns'

const getBuildAmounts = (empire: Empire) => {
	let buildCost = Math.round(3500 + empire.land * 0.1)

	let buildRate = empire.land * 0.015 + 4

	//TODO: buildrate race bonus

	let canBuild = Math.min(
		Math.floor(empire.cash / buildCost),
		buildRate * empire.turns,
		empire.freeLand
	)

	return { canBuild, buildRate, buildCost }
}

const buildRequest = {
	bldCash: 10,
	bldCost: 10,
	bldDef: 0,
	bldFood: 10,
	bldPop: 10,
	bldTroop: 10,
	bldWiz: 10,
	empireId: 2,
	type: 'build',
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
		return
	}

	const empire = await Empire.findOne({ empireId })

	const { canBuild, buildRate, buildCost } = getBuildAmounts(empire)

	let buildTotal =
		bldCash + bldPop + bldCost + bldDef + bldFood + bldTroop + bldWiz

	if (buildTotal > canBuild) {
		return res.json({ error: "Can't build that many structures" })
	}

	console.log(buildRate)

	console.log(buildTotal)

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

	let totalTurns = buildTotal / buildRate

	buildArray.forEach((building) => {
		console.log(building)
		let key: string = Object.keys(building)[0]
		let value: number = Object.values(building)[0]
		let turns = 0
		if (value < buildRate) {
			turns = 1
		} else {
			turns = Math.round(value / buildRate)
		}

		for (let i = 0; i < turns; i++) {
			console.log(`build ${value} of ${key}s`)
			// use one turn
			// add value to empire.key
		}
	})

	return res.json({ test: 'test completed' })
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', build)

export default router
