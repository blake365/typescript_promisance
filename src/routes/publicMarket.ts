import { Request, Response, Router } from 'express'
import { PUBMKT_MAXSELL } from '../config/conifg'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'
import Market from '../entity/Market'
import { eraArray } from '../config/eras'
import auth from '../middleware/auth'
import user from '../middleware/user'

import { Not, Raw } from 'typeorm'
import { createNewsEvent } from '../util/helpers'

interface ReturnObject {
	amount: number
	price: number
	error?: string
}

const pubBuyTwo = async (req: Request, res: Response) => {
	const { empireId, action, type, buy, item } = req.body

	console.log(req.body)
	if (action !== 'buy') {
		return res.json({ error: 'Something went wrong' })
	}

	if (buy < 1) {
		return res.status(500).json({ error: 'Invalid purchase amount' })
	}

	const buyer = await Empire.findOne({ id: empireId })
	const seller = await Empire.findOne({ id: item.empire_id })
	const itemBought = await Market.findOne({ id: item.id })

	let amount: number = buy
	let cost: number = item.price * buy

	if (cost > buyer.cash) {
		return res.status(500).json({ error: 'Not enough money to make purchase' })
	}
	if (type !== itemBought.type) {
		return res.status(500).json({ error: 'Invalid purchase' })
	}

	let itemName: string
	// add bought item to empire
	if (itemBought.type === 0) {
		buyer.trpArm += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].trparm
	} else if (itemBought.type === 1) {
		buyer.trpLnd += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].trplnd
	} else if (itemBought.type === 2) {
		buyer.trpFly += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].trpfly
	} else if (itemBought.type === 3) {
		buyer.trpSea += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].trpsea
	} else if (itemBought.type === 4) {
		buyer.food += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].food
	} else if (itemBought.type === 5) {
		buyer.runes += amount
		itemBought.amount -= amount
		itemName = eraArray[seller.era].runes
	}

	// deduct cost from buyer cash
	buyer.cash -= cost

	// add cost to seller cash
	seller.bank += cost

	buyer.networth = getNetworth(buyer)
	// seller.networth = getNetworth(seller)

	buyer.lastAction = new Date()

	await buyer.save()
	await seller.save()
	await itemBought.save()

	// create news entry
	let content: string = `You sold ${amount.toLocaleString()} ${itemName} for $${cost.toLocaleString()}`
	let pubContent: string = `${buyer.name} (#${
		buyer.id
	}) purchased ${amount.toLocaleString()} ${itemName} for $${cost.toLocaleString()} from ${
		seller.name
	} (#${seller.id}) `

	// create news event for seller that goods have been purchased
	await createNewsEvent(
		content,
		pubContent,
		buyer.id,
		buyer.name,
		seller.id,
		seller.name,
		'market',
		'success'
	)

	if (item.amount - buy <= 0) {
		await Market.delete({ id: item.id })
	}

	return res.json({ success: 'item purchased' })
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
	seller.bank += cost

	buyer.networth = getNetworth(buyer)
	seller.networth = getNetworth(seller)

	await buyer.save()
	await seller.save()

	// create news entry
	let content: string = `You sold ${amount.toLocaleString()} ${item} for $${cost}`
	let pubContent: string = `${
		buyer.name
	} (#{buyerId}) purchased ${amount.toLocaleString()} ${item} for $${cost} from ${
		seller.name
	} (#{sellerId}) `

	// create news event for seller that goods have been purchased
	await createNewsEvent(
		content,
		pubContent,
		buyerId,
		buyer.name,
		sellerId,
		seller.name,
		'market',
		'success'
	)

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
		sellRunes,
		priceRunes,
	} = req.body

	if (type !== 'sell') {
		return res.json({ error: 'Something went wrong' })
	}

	console.log('public market sale')

	const empire = await Empire.findOne({ id: empireId })
	// console.log(empire.networth)
	let priceArray = [
		priceArm,
		priceLnd,
		priceFly,
		priceSea,
		priceFood,
		priceRunes,
	]

	let sellArray = [sellArm, sellLnd, sellFly, sellSea, sellFood, sellRunes]
	let trpArray = [
		empire.trpArm,
		empire.trpLnd,
		empire.trpFly,
		empire.trpSea,
		empire.food,
		empire.runes,
	]

	let itemsEraArray = [
		eraArray[empire.era].trparm,
		eraArray[empire.era].trplnd,
		eraArray[empire.era].trpfly,
		eraArray[empire.era].trpsea,
		eraArray[empire.era].food,
		eraArray[empire.era].runes,
	]

	// console.log(sellArray)
	// console.log(priceArray)

	let resultSellArm: ReturnObject = { amount: null, price: null }
	let resultSellLnd: ReturnObject = { amount: null, price: null }
	let resultSellFly: ReturnObject = { amount: null, price: null }
	let resultSellSea: ReturnObject = { amount: null, price: null }
	let resultSellFood: ReturnObject = { amount: null, price: null }
	let resultSellRunes: ReturnObject = { amount: null, price: null }

	let returnArray = [
		resultSellArm,
		resultSellLnd,
		resultSellFly,
		resultSellSea,
		resultSellFood,
		resultSellRunes,
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
			} else if (index === 5) {
				empire.runes -= amount
			}
			await empire.save()
			marketItem = new Market({ type, amount, price, empire_id })
			await marketItem.save()
			// console.log(marketItem)
			// console.log(returnArray)
		}
	}

	empire.networth = getNetworth(empire)
	empire.lastAction = new Date()

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
	let returnObject = {
		arm: null,
		lnd: null,
		fly: null,
		sea: null,
		food: null,
		runes: null,
	}

	returnObject.arm = await Market.find({
		where: {
			type: 0,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.lnd = await Market.find({
		where: {
			type: 1,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.fly = await Market.find({
		where: {
			type: 2,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.sea = await Market.find({
		where: {
			type: 3,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.food = await Market.find({
		where: {
			type: 4,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.runes = await Market.find({
		where: {
			type: 5,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	if (returnObject.arm.length < 1) {
		returnObject.arm.push({ price: 0, amount: 0, type: 0 })
	}
	if (returnObject.lnd.length < 1) {
		returnObject.lnd.push({ price: 0, amount: 0, type: 1 })
	}
	if (returnObject.fly.length < 1) {
		returnObject.fly.push({ price: 0, amount: 0, type: 2 })
	}
	if (returnObject.sea.length < 1) {
		returnObject.sea.push({ price: 0, amount: 0, type: 3 })
	}
	if (returnObject.food.length < 1) {
		returnObject.food.push({ price: 0, amount: 0, type: 4 })
	}
	if (returnObject.runes.length < 1) {
		returnObject.runes.push({ price: 0, amount: 0, type: 5 })
	}
	// console.log(returnObject)
	return res.json(returnObject)
}

const router = Router()

// needs user and auth middleware
router.post('/pubBuy', user, auth, pubBuy)
router.post('/pubBuy2', user, auth, pubBuyTwo)
router.post('/pubSell', user, auth, pubSell)
router.post('/pubSellMine', user, auth, getMyItems)
router.post('/pubSellOthers', user, auth, getOtherItems)

export default router
