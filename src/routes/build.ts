import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'
import { useTurnInternal } from './useturns'
import user from '../middleware/user'
import auth from '../middleware/auth'
import { calcSizeBonus, getNetworth } from './actions/actions'
import User from '../entity/User'
import { takeSnapshot } from './actions/snaps'
import { attachGame } from '../middleware/game'
import Game from '../entity/Game'
import { updateEmpire } from './actions/updateEmpire'

// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

const getBuildAmounts = (empire: Empire, cost: number) => {
	let size = calcSizeBonus(empire)
	let buildCost = Math.round((cost + empire.land * 0.2) * (size / 3))

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

	const game: Game = res.locals.game

	if (type !== 'build') {
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

	const { canBuild, buildRate, buildCost } = getBuildAmounts(
		empire,
		game.buildCost
	)

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

	let totalTurns = buildTotal / buildRate

	const buildLoop = async () => {
		try {
			if (totalTurns > empire.turns) {
				return res.json({ error: 'Not enough turns' })
			}
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
					let oneTurn = useTurnInternal('build', 1, empire, clan, true, game)
					// console.log(oneTurn)
					let turnRes = oneTurn[0]
					if (turnRes?.messages?.error) {
						resultArray.push(turnRes)
						break
					} else if (!turnRes?.messages?.desertion) {
						// console.log(turnRes)

						empire.cash -= buildAmount * buildCost
						empire[key] += buildAmount
						empire.freeLand -= buildAmount
						leftToBuild -= buildAmount

						await updateEmpire(empire, turnRes, 1)
						// extract turn info from result and put individual object in result array
						resultArray.push(turnRes)
					} else {
						// add value to empire.key
						await updateEmpire(empire, turnRes, 1)
						resultArray.push(turnRes)

						break
					}
				}
			}
			// console.log(resultArray)
			// await awardAchievements(empire)
			// console.log(achievementResult)
			await takeSnapshot(empire)
			return resultArray
		} catch (err) {
			console.log(err)
		}
	}

	let returnArray = await buildLoop()

	return res.json(returnArray)
}

const router = Router()

// needs user and auth middleware
router.post('/', user, auth, attachGame, build)

export default router
