import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import { getNetworth } from './actions/actions'
import Market from '../entity/Market'
import { eraArray } from '../config/eras'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not, Raw } from 'typeorm'
import { createNewsEvent } from '../util/helpers'
import User from '../entity/User'
import { takeSnapshot } from './actions/snaps'
import { attachGame } from '../middleware/game'
import Game from '../entity/Game'

interface ReturnObject {
	amount: number
	price: number
	error?: string
}

const pubBuyTwo = async (req: Request, res: Response) => {
	const { empireId, action, type, buy, item } = req.body

	const game: Game = res.locals.game

	try {
		// console.log(req.body)
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
			return res
				.status(500)
				.json({ error: 'Not enough money to make purchase' })
		}
		if (type !== itemBought.type) {
			return res.status(500).json({ error: 'Invalid purchase' })
		}
		if (amount > itemBought.amount) {
			itemBought.remove()
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

		buyer.networth = getNetworth(buyer, game)
		// seller.networth = getNetworth(seller)

		buyer.lastAction = new Date()

		if (buyer.peakFood < buyer.food) {
			buyer.peakFood = buyer.food
		}
		if (buyer.peakRunes < buyer.runes) {
			buyer.peakRunes = buyer.runes
		}
		if (buyer.peakNetworth < buyer.networth) {
			buyer.peakNetworth = buyer.networth
		}
		if (buyer.peakTrpArm < buyer.trpArm) {
			buyer.peakTrpArm = buyer.trpArm
		}
		if (buyer.peakTrpLnd < buyer.trpLnd) {
			buyer.peakTrpLnd = buyer.trpLnd
		}
		if (buyer.peakTrpFly < buyer.trpFly) {
			buyer.peakTrpFly = buyer.trpFly
		}
		if (buyer.peakTrpSea < buyer.trpSea) {
			buyer.peakTrpSea = buyer.trpSea
		}

		if (seller.peakCash < seller.cash + seller.bank) {
			seller.peakCash = seller.cash + seller.bank
		}

		await buyer.save()
		await seller.save()
		await itemBought.save()

		// await awardAchievements(buyer)
		await takeSnapshot(buyer)
		await takeSnapshot(seller)

		// create news entry
		let content: string = `You sold ${amount.toLocaleString()} ${itemName} for $${cost.toLocaleString()}. The money was deposited into the bank.`
		let pubContent: string = `${buyer.name} purchased ${itemName} from the public market.`

		// create news event for seller that goods have been purchased
		await createNewsEvent(
			content,
			pubContent,
			buyer.id,
			buyer.name,
			seller.id,
			seller.name,
			'market',
			'success',
			buyer.game_id
		)

		if (item.amount - buy <= 0) {
			await Market.delete({ id: item.id })
		}
		if (itemBought.amount <= 0) {
			await itemBought.remove()
		}

		return res.json({
			success: `Purchased ${amount.toLocaleString()} ${itemName} for $${cost.toLocaleString()}`,
		})
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'Something went wrong' })
	}
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

	const game: Game = res.locals.game

	console.log('public market sale')
	const basePrices = [
		game.pvtmTrpArm,
		game.pvtmTrpLnd,
		game.pvtmTrpFly,
		game.pvtmTrpSea,
		game.pvtmFood,
		game.pvtmRunes,
	]

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

	priceArray.forEach((price, index) => {
		if (price < basePrices[index] * 0.33 || price > basePrices[index] * 2) {
			return res.status(500).json({ error: 'Invalid price' })
		}
	})

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
		// console.log(item)
		// console.log(index)
		if (item < 1) {
			console.log('no items for sale')
		} else if (
			index === 4 &&
			item > Math.floor((trpArray[index] * game.pubMktMaxFood) / 100)
		) {
			console.log('too much food for sale')
			returnArray[
				index
			].error = `You can't sell that many ${itemsEraArray[index]}.`
		} else if (
			index === 5 &&
			item > Math.floor((trpArray[index] * game.pubMktMaxRunes) / 100)
		) {
			console.log('too much runes for sale')
			returnArray[
				index
			].error = `You can't sell that many ${itemsEraArray[index]}.`
		} else if (
			index !== 4 &&
			index !== 5 &&
			item > (trpArray[index] * game.pubMktMaxSell) / 100
		) {
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
			// console.log(index)
			// console.log(price)
			// console.log(amount)
			let game_id = game.game_id
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
			marketItem = new Market({ type, amount, price, empire_id, game_id })
			await marketItem.save()
			// console.log(marketItem)
			// console.log(returnArray)
		}
	}

	empire.networth = getNetworth(empire, game)
	empire.lastAction = new Date()

	await empire.save()
	// await awardAchievements(empire)
	await takeSnapshot(empire)

	// console.log(returnArray)
	// console.log(empire.networth)
	return res.json(returnArray)
}

const getMyItems = async (req: Request, res: Response) => {
	// console.log(res.locals.user)
	// console.log(empire_id)
	const { empireId } = req.body
	// console.log(req.body)

	const myItems = await Market.find({
		where: { empire_id: empireId },
		order: {
			createdAt: 'DESC',
		},
	})
	// console.log(typeof myItems[0].price)
	return res.json(myItems)
}

const getOtherItems = async (req: Request, res: Response) => {
	// console.log(res.locals.user)
	// console.log(empire_id)
	const { empireId } = req.body
	console.log(req.body)
	const game: Game = res.locals.game

	let returnObject = {
		arm: null,
		lnd: null,
		fly: null,
		sea: null,
		food: null,
		runes: null,
	}

	const interval = `${game.pubMktStart} hours`
	console.log(interval)

	returnObject.arm = await Market.find({
		where: {
			type: 0,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.lnd = await Market.find({
		where: {
			type: 1,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.fly = await Market.find({
		where: {
			type: 2,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.sea = await Market.find({
		where: {
			type: 3,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.food = await Market.find({
		where: {
			type: 4,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
		},
		order: {
			price: 'ASC',
		},
		take: 1,
	})

	returnObject.runes = await Market.find({
		where: {
			type: 5,
			game_id: game.game_id,
			empire_id: Not(empireId),
			amount: Not(0),
			createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${interval}'`),
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

const recallItem = async (req: Request, res: Response) => {
	// return 75% of the items to the empire
	const { itemId, empireId } = req.body

	const game: Game = res.locals.game

	const itemArray = ['trpArm', 'trpLnd', 'trpFly', 'trpSea', 'food', 'runes']

	try {
		const item = await Market.findOne({ id: itemId })
		const empire = await Empire.findOne({ id: empireId })

		if (item.empire_id !== empire.id) {
			return res.status(500).json({ error: 'Empire ID mismatch' })
		}

		empire[itemArray[item.type]] += Math.round(item.amount * 0.75)
		empire.networth = getNetworth(empire, game)
		await item.remove()

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
		return res.json({ success: 'Item recalled' })
	} catch (e) {
		console.log(e)
		return res.status(500).json({ error: 'Something went wrong' })
	}
}

const editPrice = async (req: Request, res: Response) => {
	// change the price of an item but decrease the amount by 10%
	const { itemId, empireId, price } = req.body

	const game: Game = res.locals.game

	const prices = [
		game.pvtmTrpArm,
		game.pvtmTrpLnd,
		game.pvtmTrpFly,
		game.pvtmTrpSea,
		game.pvtmFood,
		game.pvtmRunes,
	]

	try {
		const item = await Market.findOne({ id: itemId })
		const empire = await Empire.findOne({ id: empireId })

		if (item.empire_id !== empire.id) {
			return res.status(500).json({ error: 'Empire ID mismatch' })
		}

		if (price < prices[item.type] * 0.33 || price > prices[item.type] * 2) {
			return res.status(500).json({ error: 'Invalid price' })
		}

		item.amount = Math.round(item.amount * 0.9)
		item.price = price
		await item.save()

		return res.json({ success: 'Price changed' })
	} catch (e) {
		console.log(e)
		return res.status(500).json({ error: 'Something went wrong' })
	}
}

const router = Router()

// needs user and auth middleware
// router.post('/pubBuy', user, auth, pubBuy)
router.post('/pubBuy2', user, auth, attachGame, pubBuyTwo)
router.post('/pubSell', user, auth, attachGame, pubSell)
router.post('/pubSellMine', user, auth, getMyItems)
router.post('/pubSellOthers', user, auth, attachGame, getOtherItems)
router.post('/pubRecall', user, auth, attachGame, recallItem)
router.post('/pubEditPrice', user, auth, attachGame, editPrice)

export default router
