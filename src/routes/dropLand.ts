import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'
import { useTurnInternal } from './useturns'
import user from '../middleware/user'
import auth from '../middleware/auth'
import User from '../entity/User'
import { takeSnapshot } from './actions/snaps'
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

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.json({ error: 'unauthorized' })
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
				empire.cash = empire.cash + turnRes.money - turnRes.loanpayed

				empire.income += turnRes.income
				empire.expenses +=
					turnRes.expenses + turnRes.wartax + turnRes.corruption

				empire.loan -= turnRes.loanpayed + turnRes.loanInterest
				empire.trpArm += turnRes.trpArm
				empire.trpLnd += turnRes.trpLnd
				empire.trpFly += turnRes.trpFly
				empire.trpSea += turnRes.trpSea
				empire.indyProd +=
					turnRes.trpArm * game.pvtmTrpArm +
					turnRes.trpLnd * game.pvtmTrpLnd +
					turnRes.trpFly * game.pvtmTrpFly +
					turnRes.trpSea * game.pvtmTrpSea

				empire.food += turnRes.food
				empire.foodpro += turnRes.foodpro
				empire.foodcon += turnRes.foodcon

				if (empire.food < 0) {
					empire.food = 0
				}

				empire.peasants += turnRes.peasants
				empire.runes += turnRes.runes
				empire.trpWiz += turnRes.trpWiz
				empire.networth = getNetworth(empire, game)

				empire.freeLand -= dropAmount
				leftToDrop -= dropAmount

				if (empire.peakCash < empire.cash + empire.bank) {
					empire.peakCash = empire.cash + empire.bank
				}
				if (empire.peakFood < empire.food) {
					empire.peakFood = empire.food
				}
				if (empire.peakRunes < empire.runes) {
					empire.peakRunes = empire.runes
				}
				if (empire.peakPeasants < empire.peasants) {
					empire.peakPeasants = empire.peasants
				}
				if (empire.peakLand < empire.land) {
					empire.peakLand = empire.land
				}
				if (empire.peakNetworth < empire.networth) {
					empire.peakNetworth = empire.networth
				}
				if (empire.peakTrpArm < empire.trpArm) {
					empire.peakTrpArm = empire.trpArm
				}
				if (empire.peakTrpLnd < empire.trpLnd) {
					empire.peakTrpLnd = empire.trpLnd
				}
				if (empire.peakTrpFly < empire.trpFly) {
					empire.peakTrpFly = empire.trpFly
				}
				if (empire.peakTrpSea < empire.trpSea) {
					empire.peakTrpSea = empire.trpSea
				}
				if (empire.peakTrpWiz < empire.trpWiz) {
					empire.peakTrpWiz = empire.trpWiz
				}

				empire.turns--
				empire.turnsUsed++
				empire.lastAction = new Date()

				await empire.save()
			} else {
				resultArray.push(turnRes)
				empire.cash = empire.cash + turnRes.money - turnRes.loanpayed

				empire.income += turnRes.income
				empire.expenses +=
					turnRes.expenses + turnRes.wartax + turnRes.corruption

				empire.loan -= turnRes.loanpayed + turnRes.loanInterest
				empire.trpArm += turnRes.trpArm
				empire.trpLnd += turnRes.trpLnd
				empire.trpFly += turnRes.trpFly
				empire.trpSea += turnRes.trpSea

				empire.indyProd +=
					turnRes.trpArm * game.pvtmTrpArm +
					turnRes.trpLnd * game.pvtmTrpLnd +
					turnRes.trpFly * game.pvtmTrpFly +
					turnRes.trpSea * game.pvtmTrpSea

				empire.food += turnRes.food
				empire.foodpro += turnRes.foodpro
				empire.foodcon += turnRes.foodcon
				if (empire.food < 0) {
					empire.food = 0
				}
				empire.peasants += turnRes.peasants
				empire.runes += turnRes.runes
				empire.trpWiz += turnRes.trpWiz

				empire.networth = getNetworth(empire, game)

				if (empire.peakCash < empire.cash + empire.bank) {
					empire.peakCash = empire.cash + empire.bank
				}
				if (empire.peakFood < empire.food) {
					empire.peakFood = empire.food
				}
				if (empire.peakRunes < empire.runes) {
					empire.peakRunes = empire.runes
				}
				if (empire.peakPeasants < empire.peasants) {
					empire.peakPeasants = empire.peasants
				}
				if (empire.peakLand < empire.land) {
					empire.peakLand = empire.land
				}
				if (empire.peakNetworth < empire.networth) {
					empire.peakNetworth = empire.networth
				}
				if (empire.peakTrpArm < empire.trpArm) {
					empire.peakTrpArm = empire.trpArm
				}
				if (empire.peakTrpLnd < empire.trpLnd) {
					empire.peakTrpLnd = empire.trpLnd
				}
				if (empire.peakTrpFly < empire.trpFly) {
					empire.peakTrpFly = empire.trpFly
				}
				if (empire.peakTrpSea < empire.trpSea) {
					empire.peakTrpSea = empire.trpSea
				}
				if (empire.peakTrpWiz < empire.trpWiz) {
					empire.peakTrpWiz = empire.trpWiz
				}

				empire.turns--
				empire.turnsUsed++

				empire.lastAction = new Date()
				await empire.save()
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
