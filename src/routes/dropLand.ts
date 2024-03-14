import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'
import { useTurnInternal } from './useturns'
import user from '../middleware/user'
import auth from '../middleware/auth'
import User from '../entity/User'
import { takeSnapshot } from './actions/snaps'
import { updateEmpire } from './actions/updateEmpire'
import Game from '../entity/Game'
import { attachGame } from '../middleware/game'
import { getNetworth } from './actions/actions'

const getDropAmounts = (empire: Empire) => {
	let dropRate = Math.max(
		Math.ceil(
			((empire.land * 0.02 + 2) *
				((100 + raceArray[empire.race].mod_buildrate) / 100)) /
				10
		),
		50
	)

	if (empire.attacks !== 0) {
		dropRate = Math.round(dropRate / empire.attacks)
	}

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
	const game: Game = res.locals.game
	if (type !== 'drop') {
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
			let oneTurn = useTurnInternal('drop', 1, empire, clan, true, game)
			// console.log(oneTurn)
			let turnRes = oneTurn[0]
			// extract turn info from result and put individual object in result array
			if (!turnRes?.messages?.desertion) {
				resultArray.push(turnRes)
				// add value to empire.key
				empire.freeLand -= dropAmount
				leftToDrop -= dropAmount
				await updateEmpire(empire, turnRes, 1, game)
			} else {
				resultArray.push(turnRes)
				await updateEmpire(empire, turnRes, 1, game)
				break
			}
		}
		// console.log(resultArray)
		// await awardAchievements(empire)
		await takeSnapshot(empire)
		return resultArray
	}

	let returnArray = await dropLoop()

	return res.json(returnArray)
}

const router = Router()

router.post('/', user, auth, attachGame, drop)

export default router
