import { Request, Response, Router } from 'express'
import { PUBMKT_MAXSELL } from '../config/conifg'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'
import Market from '../entity/Market'
import { eraArray } from '../config/eras'
import auth from '../middleware/auth'
import user from '../middleware/user'

import { Not } from 'typeorm'
import EmpireNews from '../entity/EmpireNews'

interface ReturnObject {
	amount: number
	price: number
	error?: string
}

const pubBuy = async (req: Request, res: Response) => {
	const { buyerId, sellerId, id, amount, cost } = req.body

	const empire_id = res.locals.user.empires[0].id
	if (empire_id !== buyerId) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	console.log('attempting purchase')

	let item: string

	// get db entries
	let itemBought = await Market.findOneOrFail({ id })
	let buyer = await Empire.findOneOrFail({ where: { id: buyerId } })
	let seller = await Empire.findOneOrFail({ where: { id: sellerId } })

	if (cost > buyer.cash) {
		return res.status(500).json({ error: 'Not enough money to make purchase' })
	}

	// add bought item to empire
	if (itemBought.type === 0) {
		buyer.trpArm += amount
		item = eraArray[seller.era].trparm
	} else if (itemBought.type === 1) {
		buyer.trpLnd += amount
		item = eraArray[seller.era].trplnd
	} else if (itemBought.type === 2) {
		buyer.trpFly += amount
		item = eraArray[seller.era].trpfly
	} else if (itemBought.type === 3) {
		buyer.trpSea += amount
		item = eraArray[seller.era].trpsea
	} else if (itemBought.type === 4) {
		buyer.food += amount
		item = eraArray[seller.era].food
	}

	// deduct cost from buyer cash
	buyer.cash -= cost

	// add cost to seller cash
	seller.cash += cost

	buyer.networth = getNetworth(buyer)
	seller.networth = getNetworth(seller)

	await buyer.save()
	await seller.save()

	// create news entry
	let content: string = `You sold ${amount.toLocaleString()} ${item} for $${cost}`

	// create news event for seller that goods have been purchased
	let newsItem = new EmpireNews()
	newsItem.content = content
	newsItem.empireIdSource = buyerId
	newsItem.sourceName = buyer.name
	newsItem.empireIdDestination = sellerId
	newsItem.destinationName = seller.name
	newsItem.type = 'market'
	newsItem.result = 'success'
	console.log(newsItem)
	await newsItem.save()

	// delete market entry
	await Market.delete({ market_id: itemBought.id })

	return res.json({ success: 'item purchased' })
}

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

	console.log(returnArray)
	console.log(empire.networth)
	return res.json(returnArray)
}

const getMyItems = async (req: Request, res: Response) => {
	const empire_id = res.locals.user.empires[0].id
	// console.log(res.locals.user)
	// console.log(empire_id)
	const { empireId } = req.body
	// console.log(req.body)

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
	// console.log(empire_id)
	const { empireId } = req.body
	// console.log(req.body)

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
router.post('/pubBuy', user, auth, pubBuy)
router.post('/pubSell', user, auth, pubSell)
router.post('/pubSellMine', user, auth, getMyItems)
router.post('/pubSellOthers', user, auth, getOtherItems)

export default router
