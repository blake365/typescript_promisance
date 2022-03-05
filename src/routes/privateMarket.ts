import { Request, Response, Router } from 'express'
import { PVTM_FOOD, PVTM_SHOPBONUS, PVTM_TRPARM, PVTM_TRPFLY, PVTM_TRPLND, PVTM_TRPSEA } from '../config/conifg'
import { raceArray } from '../config/races'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'

const getCost = (empire: Empire, base) => {
    	let cost = base
		let costBonus = 1 - ((1 - PVTM_SHOPBONUS) * (empire.bldCost / empire.land) + PVTM_SHOPBONUS * (empire.bldCost / empire.land))

		cost *= costBonus
		cost *= (2 - ((100 + raceArray[empire.race].mod_market)/100))

		if (cost < base * 0.6) {
			cost = base * 0.6
		}

		return Math.round(cost)
}


const buy = async (req: Request, res: Response) => {
	// request will have object with number of each unit to purchase
	const { type, empireId, buyArm, buyLnd, buyFly, buySea, buyFood } = req.body
	
	if (type !== 'buy') {
		return res.json({error: 'Something went wrong'})
	}

	const empire = await Empire.findOne({ id: empireId })

	let priceArray = [getCost(empire, PVTM_TRPARM), getCost(empire, PVTM_TRPLND), getCost(empire, PVTM_TRPFLY), getCost(empire, PVTM_TRPSEA), PVTM_FOOD]

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
	empire.save()

	let resultBuyArm = {amount: buyArm, price: spendArray[0]}
	let resultBuyLnd = {amount: buyLnd, price: spendArray[1]}
	let resultBuyFly = {amount: buyFly, price: spendArray[2]}
	let resultBuySea = {amount: buySea, price: spendArray[3]}
	let resultBuyFood = { amount: buyFood, price: spendArray[4] }
	
	let shoppingResult = {resultBuyArm, resultBuyLnd, resultBuyFly, resultBuySea, resultBuyFood}

	// console.log(shoppingResult)

	return res.json(shoppingResult)
}

const router = Router()

//TODO: needs user and auth middleware
router.post('/', buy)

export default router
