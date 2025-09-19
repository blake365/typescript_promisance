import type { Request, Response } from 'express'
import { Router } from 'express'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'
import { useTurnInternal } from './useturns'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { calcSizeBonus, calcSizeFactors } from '../services/actions/actions'
import { takeSnapshot } from '../services/actions/snaps'
import { attachGame } from '../middleware/game'
import type Game from '../entity/Game'
import { updateEmpire } from '../services/actions/updateEmpire'
import { getServerStats } from '../services/game/serverStats'

// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

const getDemolishAmounts = async (empire: Empire, cost: number, gameId: number) => {
	// Get server statistics for balanced calculations
	const serverStats = await getServerStats(gameId)
	const sizeFactors = calcSizeFactors(empire, serverStats.medianNetworth, serverStats.dayOfRound)

	// Apply expansion difficulty for demolish costs too
	const demolishCost = Math.round(((cost + empire.land * 0.3) * sizeFactors.expansionDifficulty) / 5)

	let demolishRate = Math.round(empire.land * 0.008 + 4)
	demolishRate = Math.round(
		((100 + raceArray[empire.race].mod_buildrate) / 100) * demolishRate
	)

	const canDemolish = Math.min(
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
	const game: Game = res.locals.game
	if (type !== 'demolish') {
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

	const { canDemolish, demolishRate, demolishCost } = await getDemolishAmounts(
		empire,
		game.buildCost,
		game.game_id
	)

	const demoTotal =
		demoCash + demoPop + demoCost + demoDef + demoFood + demoTroop + demoWiz

	if (demoTotal > canDemolish) {
		return res.json({ error: "Can't demolish that many structures" })
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

	demoArray = demoArray.filter((object) => Object.values(object)[0] > 0)

	for (const obj of demoArray) {
		if (Object.values(obj)[0] > empire[Object.keys(obj)[0]]) {
			console.log('not enough buildings')
			// skip this object
			demoArray = demoArray.filter(
				(object) => Object.keys(object)[0] !== Object.keys(obj)[0]
			)
		}
	}

	// console.log(buildArray)

	// let totalTurns = buildTotal / buildRate

	const demoLoop = async () => {
		const resultArray = []
		for (let i = 0; i < demoArray.length; i++) {
			// console.log(buildArray[i])
			const key: string = Object.keys(demoArray[i])[0]
			const value: number = Object.values(demoArray[i])[0]
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
				const oneTurn = useTurnInternal('demolish', 1, empire, clan, true, game)
				// console.log(oneTurn)
				const turnRes = oneTurn[0]
				// extract turn info from result and put individual object in result array
				if (!turnRes?.messages?.desertion) {
					resultArray.push(turnRes)
					// add value to empire.key
					empire.cash += demoAmount * demolishCost
					empire[key] -= demoAmount
					empire.freeLand += demoAmount
					// empire.cash -= buildAmount * buildCost
					leftToDemo -= demoAmount

					await updateEmpire(empire, turnRes, 1, game)
				} else {
					resultArray.push(turnRes)
					// add value to empire.key
					await updateEmpire(empire, turnRes, 1, game)
					break
				}
			}
		}

		// await awardAchievements(empire)
		await takeSnapshot(empire, game.turnsProtection)

		// console.log(resultArray)
		return resultArray
	}

	const returnArray = await demoLoop()

	return res.json(returnArray)
}

const router = Router()

router.post('/', user, auth, attachGame, demolish)

export default router
