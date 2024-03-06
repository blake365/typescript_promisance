import { Request, Response, Router } from 'express'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { takeSnapshot } from './actions/snaps'
import { attachGame } from '../middleware/game'
import Game from '../entity/Game'

const getCost = (empire: Empire, base: number, shopBonus: number) => {
	let cost = base
	let costBonus =
		1 -
		((1 - shopBonus) * (empire.bldCost / empire.land) +
			shopBonus * (empire.bldCash / empire.land))

	cost *= costBonus
	cost *= 2 - (100 + raceArray[empire.race].mod_market) / 100

	if (cost < base * 0.6) {
		cost = base * 0.6
	}

	return Math.round(cost)
}

// : subtract amount bought from mktArm etc. so you can't buy more than is available
const buy = async (req: Request, res: Response) => {
	// request will have object with number of each unit to purchase
	const { type, empireId, buyArm, buyLnd, buyFly, buySea, buyFood, buyRunes } =
		req.body

	const game: Game = res.locals.game

	if (type !== 'buy') {
		return res.json({ error: 'Something went wrong' })
	}

	const empire = await Empire.findOne({ id: empireId })

	let priceArray = [
		getCost(empire, game.pvtmTrpArm, game.pvtmShopBonus),
		getCost(empire, game.pvtmTrpLnd, game.pvtmShopBonus),
		getCost(empire, game.pvtmTrpFly, game.pvtmShopBonus),
		getCost(empire, game.pvtmTrpSea, game.pvtmShopBonus),
		game.pvtmFood,
		game.pvtmRunes,
	]

	console.log(priceArray)

	let buyArray = [buyArm, buyLnd, buyFly, buySea, buyFood, buyRunes]

	const spendArray = buyArray.map((value, index) => {
		value = value * priceArray[index]
		return value
	})

	let totalPrice = spendArray
		.filter(Number)
		.reduce((partialSum, a) => partialSum + a, 0)

	// console.log(totalPrice)

	if (totalPrice > empire.cash) {
		return res.json({ error: 'Not enough money' })
	} else {
		empire.trpArm += buyArm
		empire.trpLnd += buyLnd
		empire.trpFly += buyFly
		empire.trpSea += buySea
		empire.food += buyFood
		empire.runes += buyRunes
		empire.cash -= totalPrice
		empire.mktArm -= buyArm
		empire.mktLnd -= buyLnd
		empire.mktFly -= buyFly
		empire.mktSea -= buySea
		empire.mktFood -= buyFood
		empire.mktRunes -= buyRunes
	}

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

	await empire.save()
	// await awardAchievements(empire)
	await takeSnapshot(empire)

	let resultBuyArm = { amount: buyArm, price: spendArray[0] }
	let resultBuyLnd = { amount: buyLnd, price: spendArray[1] }
	let resultBuyFly = { amount: buyFly, price: spendArray[2] }
	let resultBuySea = { amount: buySea, price: spendArray[3] }
	let resultBuyFood = { amount: buyFood, price: spendArray[4] }
	let resultBuyRunes = { amount: buyRunes, price: spendArray[5] }

	let shoppingResult = {
		resultBuyArm,
		resultBuyLnd,
		resultBuyFly,
		resultBuySea,
		resultBuyFood,
		resultBuyRunes,
	}

	console.log(shoppingResult)

	return res.json(shoppingResult)
}

const getValue = (
	emp: Empire,
	base: number,
	multiplier: number,
	shopBonus: number
) => {
	let cost = base * multiplier
	let costBonus =
		1 +
		((1 - shopBonus) * (emp.bldCost / emp.land) +
			shopBonus * (emp.bldCash / emp.land))

	cost *= costBonus
	cost /= 2 - (100 + raceArray[emp.race].mod_market) / 100

	if (cost > base * 0.5) {
		cost = base * 0.5
	}

	return Math.round(cost)
}

const sell = async (req: Request, res: Response) => {
	// request will have object with number of each unit to sell
	const {
		type,
		empireId,
		sellArm,
		sellLnd,
		sellFly,
		sellSea,
		sellFood,
		sellRunes,
	} = req.body

	if (type !== 'sell') {
		return res.json({ error: 'Something went wrong' })
	}

	const game: Game = res.locals.game

	const empire = await Empire.findOne({ id: empireId })

	let priceArray = [
		getValue(empire, game.pvtmTrpArm, 0.38, game.pvtmShopBonus),
		getValue(empire, game.pvtmTrpLnd, 0.4, game.pvtmShopBonus),
		getValue(empire, game.pvtmTrpFly, 0.42, game.pvtmShopBonus),
		getValue(empire, game.pvtmTrpSea, 0.44, game.pvtmShopBonus),
		game.pvtmFood * 0.3,
		game.pvtmRunes * 0.2,
	]

	let sellArray = [sellArm, sellLnd, sellFly, sellSea, sellFood, sellRunes]

	// console.log(sellArray)
	// console.log(priceArray)

	const spendArray = sellArray.map((value, index) => {
		value = value * priceArray[index]
		return value
	})

	let totalPrice = spendArray
		.filter(Number)
		.reduce((partialSum, a) => partialSum + a, 0)

	if (
		sellArm > (empire.trpArm * game.pvtmMaxSell) / 10000 ||
		sellLnd > (empire.trpLnd * game.pvtmMaxSell) / 10000 ||
		sellFly > (empire.trpFly * game.pvtmMaxSell) / 10000 ||
		sellSea > (empire.trpSea * game.pvtmMaxSell) / 10000 ||
		sellFood > empire.food ||
		sellRunes > empire.runes
	) {
		return res.status(500).json({ error: "Can't sell that many!" })
	} else {
		empire.trpArm -= sellArm
		empire.trpLnd -= sellLnd
		empire.trpFly -= sellFly
		empire.trpSea -= sellSea
		empire.food -= sellFood
		empire.runes -= sellRunes
		empire.cash += totalPrice
	}

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

	await empire.save()

	// await awardAchievements(empire)
	await takeSnapshot(empire)

	let resultSellArm = { amount: sellArm, price: spendArray[0] }
	let resultSellLnd = { amount: sellLnd, price: spendArray[1] }
	let resultSellFly = { amount: sellFly, price: spendArray[2] }
	let resultSellSea = { amount: sellSea, price: spendArray[3] }
	let resultSellFood = { amount: sellFood, price: spendArray[4] }
	let resultSellRunes = { amount: sellRunes, price: spendArray[5] }

	let shoppingResult = {
		resultSellArm,
		resultSellLnd,
		resultSellFly,
		resultSellSea,
		resultSellFood,
		resultSellRunes,
	}

	console.log(shoppingResult)

	return res.json(shoppingResult)
}

const router = Router()

router.post('/buy', user, auth, attachGame, buy)
router.post('/sell', user, auth, attachGame, sell)

export default router
