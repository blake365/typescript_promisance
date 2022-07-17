import { Request, Response, Router } from 'express'
import { PUBMKT_MAXSELL } from '../config/conifg'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'
import Market from '../entity/Market'
import { eraArray } from '../config/eras'
import auth from '../middleware/auth'
import user from '../middleware/user'

import { Not } from 'typeorm'

interface ReturnObject {
	amount: number
	price: number
	error?: string
}

// FIXME: subtract amount bought from mktArm etc. so you can't buy more than is available
// const buy = async (req: Request, res: Response) => {
// 	// request will have object with number of each unit to purchase
// 	const { type, empireId, buyArm, buyLnd, buyFly, buySea, buyFood } = req.body

// 	if (type !== 'buy') {
// 		return res.json({ error: 'Something went wrong' })
// 	}

// 	const empire = await Empire.findOne({ id: empireId })

// 	let priceArray = [
// 		getCost(empire, PVTM_TRPARM),
// 		getCost(empire, PVTM_TRPLND),
// 		getCost(empire, PVTM_TRPFLY),
// 		getCost(empire, PVTM_TRPSEA),
// 		PVTM_FOOD,
// 	]

// 	console.log(priceArray)

// 	let buyArray = [buyArm, buyLnd, buyFly, buySea, buyFood]

// 	const spendArray = buyArray.map((value, index) => {
// 		value = value * priceArray[index]
// 		return value
// 	})

// 	let totalPrice = spendArray
// 		.filter(Number)
// 		.reduce((partialSum, a) => partialSum + a, 0)

// 	// console.log(totalPrice)

// 	if (totalPrice > empire.cash) {
// 		return res.json({ error: 'Not enough money' })
// 	} else {
// 		empire.trpArm += buyArm
// 		empire.trpLnd += buyLnd
// 		empire.trpFly += buyFly
// 		empire.trpSea += buySea
// 		empire.food += buyFood
// 		empire.cash -= totalPrice
// 		empire.mktArm -= buyArm
// 		empire.mktLnd -= buyLnd
// 		empire.mktFly -= buyFly
// 		empire.mktSea -= buySea
// 		empire.mktFood -= buyFood
// 	}

// 	empire.networth = getNetworth(empire)
// 	await empire.save()

// 	let resultBuyArm = { amount: buyArm, price: spendArray[0] }
// 	let resultBuyLnd = { amount: buyLnd, price: spendArray[1] }
// 	let resultBuyFly = { amount: buyFly, price: spendArray[2] }
// 	let resultBuySea = { amount: buySea, price: spendArray[3] }
// 	let resultBuyFood = { amount: buyFood, price: spendArray[4] }

// 	let shoppingResult = {
// 		resultBuyArm,
// 		resultBuyLnd,
// 		resultBuyFly,
// 		resultBuySea,
// 		resultBuyFood,
// 	}

// 	console.log(shoppingResult)

// 	return res.json(shoppingResult)
// }

const pubSell = async (req: Request, res: Response) => {
	// request will have object with number of each unit to sell and price
	const {
		type,
		empireId,
		sellArm,
		priceArm,
		sellLnd,
		priceLnd,
		sellFly,
		priceFly,
		sellSea,
		priceSea,
		sellFood,
		priceFood,
	} = req.body

	if (type !== 'sell') {
		return res.json({ error: 'Something went wrong' })
	}

	console.log('public market sale')

	const empire = await Empire.findOne({ id: empireId })
	console.log(empire.networth)
	let priceArray = [priceArm, priceLnd, priceFly, priceSea, priceFood]

	let sellArray = [sellArm, sellLnd, sellFly, sellSea, sellFood]
	let trpArray = [
		empire.trpArm,
		empire.trpLnd,
		empire.trpFly,
		empire.trpSea,
		empire.food,
	]
	let itemsEraArray = [
		eraArray[empire.era].trparm,
		eraArray[empire.era].trplnd,
		eraArray[empire.era].trpfly,
		eraArray[empire.era].trpsea,
		eraArray[empire.era].food,
	]

	// console.log(sellArray)
	// console.log(priceArray)

	let resultSellArm: ReturnObject = { amount: null, price: null }
	let resultSellLnd: ReturnObject = { amount: null, price: null }
	let resultSellFly: ReturnObject = { amount: null, price: null }
	let resultSellSea: ReturnObject = { amount: null, price: null }
	let resultSellFood: ReturnObject = { amount: null, price: null }

	let returnArray = [
		resultSellArm,
		resultSellLnd,
		resultSellFly,
		resultSellSea,
		resultSellFood,
	]

	for (let index = 0; index < sellArray.length; index++) {
		let item: number = sellArray[index]
		console.log(item)
		if (item < 1) {
			console.log('no items for sale')
		} else if (item > (trpArray[index] * PUBMKT_MAXSELL) / 100) {
			console.log('too many items for sale')
			returnArray[
				index
			].error = `You can't sell that many ${itemsEraArray[index]}.`
		} else if (item > 0 && priceArray[index] < 1) {
			console.log('invalid price')
			returnArray[
				index
			].error = `A price for the ${itemsEraArray[index]} must be entered.`
		} else {
			console.log('making sale')
			let marketItem: Market = null
			let type: number = index
			let amount: number = item
			let price: number = priceArray[index]
			console.log(index)
			console.log(price)
			console.log(amount)
			let empire_id = empire.id
			returnArray[index].amount = amount
			returnArray[index].price = price
			// trpArray[index] -= amount
			if (index === 0) {
				empire.trpArm -= amount
			} else if (index === 1) {
				empire.trpLnd -= amount
			} else if (index === 2) {
				empire.trpFly -= amount
			} else if (index === 3) {
				empire.trpSea -= amount
			} else if (index === 4) {
				empire.food -= amount
			}
			await empire.save()
			marketItem = new Market({ type, amount, price, empire_id })
			await marketItem.save()
			// console.log(marketItem)
			// console.log(returnArray)
		}
	}

	empire.networth = getNetworth(empire)
	await empire.save()

	// resultSellLnd = { amount: sellLnd, price: priceArray[1] }
	// resultSellFly = { amount: sellFly, price: priceArray[2] }
	// resultSellSea = { amount: sellSea, price: priceArray[3] }
	// resultSellFood = { amount: sellFood, price: priceArray[4] }

	console.log(returnArray)
	console.log(empire.networth)
	return res.json(returnArray)
}

const getMyItems = async (req: Request, res: Response) => {
	const empire_id = res.locals.user.empires[0].id
	// console.log(res.locals.user)
	console.log(empire_id)
	const { empireId } = req.body
	console.log(req.body)

	if (empire_id !== empireId) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	const myItems = await Market.find({
		where: { empire_id: empire_id },
		order: {
			createdAt: 'DESC',
		},
	})
	// console.log(typeof myItems[0].price)
	return res.json(myItems)
}

const getOtherItems = async (req: Request, res: Response) => {
	const empire_id = res.locals.user.empires[0].id
	// console.log(res.locals.user)
	console.log(empire_id)
	const { empireId } = req.body
	console.log(req.body)

	if (empire_id !== empireId) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	const otherItems = await Market.find({
		where: { empire_id: Not(empire_id) },
		order: {
			type: 'ASC',
			price: 'ASC',
		},
	})

	// console.log(otherItems)
	return res.json(otherItems)
}

const router = Router()

//TODO: needs user and auth middleware
// router.post('/pubBuy', buy)
router.post('/pubSell', user, auth, pubSell)
router.post('/pubSellMine', user, auth, getMyItems)
router.post('/pubSellOthers', user, auth, getOtherItems)

export default router
