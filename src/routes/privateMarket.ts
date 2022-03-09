import { Request, Response, Router } from 'express'
import { PVTM_FOOD, PVTM_MAXSELL, PVTM_SHOPBONUS, PVTM_TRPARM, PVTM_TRPFLY, PVTM_TRPLND, PVTM_TRPSEA } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'

const getCost = (empire: Empire, base) => {
    	let cost = base
		let costBonus = 1 - ((1 - PVTM_SHOPBONUS) * (empire.bldCost / empire.land) + PVTM_SHOPBONUS * (empire.bldCash / empire.land))

		cost *= costBonus
		cost *= (2 - ((100 + raceArray[empire.race].mod_market)/100))

		if (cost < base * 0.6) {
			cost = base * 0.6
		}

		return Math.round(cost)
}

// FIXME: subtract amount bought from mktArm etc. so you can't buy more than is available
const buy = async (req: Request, res: Response) => {
	// request will have object with number of each unit to purchase
	const { type, empireId, buyArm, buyLnd, buyFly, buySea, buyFood } = req.body
	
	if (type !== 'buy') {
		return res.json({error: 'Something went wrong'})
	}

	const empire = await Empire.findOne({ id: empireId })

	let priceArray = [getCost(empire, PVTM_TRPARM), getCost(empire, PVTM_TRPLND), getCost(empire, PVTM_TRPFLY), getCost(empire, PVTM_TRPSEA), PVTM_FOOD]

	console.log(priceArray)

	let buyArray = [
		buyArm, buyLnd, buyFly, buySea, buyFood
	]

	const spendArray = buyArray.map((value, index) =>
    {
        value = value * priceArray[index]
        return value
	})
	
	let totalPrice = spendArray
	.filter(Number)
		.reduce((partialSum, a) => partialSum + a, 0)
	
	console.log(totalPrice)

	if (totalPrice > empire.cash ) {
		return res.json({error: 'Not enough money'})
	} else {
		empire.trpArm += buyArm
		empire.trpLnd += buyLnd
		empire.trpFly += buyFly
		empire.trpSea += buySea
		empire.food += buyFood
		empire.cash -= totalPrice
	}

	empire.networth = getNetworth(empire)
	await empire.save()

	let resultBuyArm = {amount: buyArm, price: spendArray[0]}
	let resultBuyLnd = {amount: buyLnd, price: spendArray[1]}
	let resultBuyFly = {amount: buyFly, price: spendArray[2]}
	let resultBuySea = {amount: buySea, price: spendArray[3]}
	let resultBuyFood = { amount: buyFood, price: spendArray[4] }
	
	let shoppingResult = {resultBuyArm, resultBuyLnd, resultBuyFly, resultBuySea, resultBuyFood}

	console.log(shoppingResult)

	return res.json(shoppingResult)
}

const getValue = (emp, base, multiplier) =>
{
	let cost = base * multiplier
	let costBonus = 1 + ((1 - PVTM_SHOPBONUS) * (emp.bldCost / emp.land) + PVTM_SHOPBONUS * (emp.bldCash / emp.land))

	cost *= costBonus
	cost /= (2 - ((100 + raceArray[emp.race].mod_market) / 100))

	if (cost > base * 0.5) {
		cost = base * 0.5
	}

	return Math.round(cost)
}

const sell = async (req: Request, res: Response) => {
	
	// request will have object with number of each unit to sell
	const { type, empireId, sellArm, sellLnd, sellFly, sellSea, sellFood } = req.body
	
	if (type !== 'sell') {
		return res.json({error: 'Something went wrong'})
	}

	const empire = await Empire.findOne({ id: empireId })

	let priceArray = [getValue(empire, PVTM_TRPARM, 0.32), getValue(empire, PVTM_TRPLND, 0.34), getValue(empire, PVTM_TRPFLY, 0.36), getValue(empire, PVTM_TRPSEA, 0.38), PVTM_FOOD * 0.40]

	let sellArray = [
		sellArm, sellLnd, sellFly, sellSea, sellFood
	]

	// console.log(sellArray)
	// console.log(priceArray)

	const spendArray = sellArray.map((value, index) =>
    {
        value = value * priceArray[index]
        return value
	})
	
	let totalPrice = spendArray
	.filter(Number)
	.reduce((partialSum, a) => partialSum + a, 0)

	if (sellArm > empire.trpArm * PVTM_MAXSELL/10000 || sellLnd > empire.trpLnd * PVTM_MAXSELL/10000 || sellFly > empire.trpFly * PVTM_MAXSELL/10000 || sellSea > empire.trpSea * PVTM_MAXSELL/10000 || sellFood > empire.food) {
		return res.status(500).json({error: "Can't sell that many!"})
	} else {
		empire.trpArm -= sellArm
		empire.trpLnd -= sellLnd
		empire.trpFly -= sellFly
		empire.trpSea -= sellSea
		empire.food -= sellFood
		empire.cash += totalPrice
	}

	empire.networth = getNetworth(empire)
	await empire.save()

	let resultSellArm = {amount: sellArm, price: spendArray[0]}
	let resultSellLnd = {amount: sellLnd, price: spendArray[1]}
	let resultSellFly = {amount: sellFly, price: spendArray[2]}
	let resultSellSea = {amount: sellSea, price: spendArray[3]}
	let resultSellFood = { amount: sellFood, price: spendArray[4] }
	
	let shoppingResult = {resultSellArm, resultSellLnd, resultSellFly, resultSellSea, resultSellFood}

	console.log(shoppingResult)

	return res.json(shoppingResult)
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/buy', buy)
router.post('/sell', sell)

export default router
