import { getConnection, getRepository } from 'typeorm'
import Empire from '../entity/Empire'
import Market from '../entity/Market'
import EmpireEffect from '../entity/EmpireEffect'
import { getNetworth } from '../services/actions/actions'
import Session from '../entity/Session'
import { eraArray } from '../config/eras'
import { createNewsEvent } from '../util/helpers'
import Lottery from '../entity/Lottery'
import type { Request, Response } from 'express'
import { Router } from 'express'
import EmpireSnapshot from '../entity/EmpireSnapshot'
import User from '../entity/User'
import Game from '../entity/Game'

// perform standard turn update events
const promTurns = async (req: Request, res: Response) => {
	// max turns 500, max stored turns 250
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).end('Unauthorized')
	}

	const now = new Date()
	const bufferTime = 5000 // 5 seconds
	// get active games, loop over each game and update turns and other items
	const games = await Game.find({ where: { isActive: true } })
	for (let i = 0; i < games.length; i++) {
		const game = games[i]
		// check when game was last updated
		const lastUpdate = new Date(game.lastTurnsUpdate)
		console.log('last update', lastUpdate.getTime())
		const timeDiff = now.getTime() - lastUpdate.getTime() + bufferTime
		console.log('time diff', timeDiff)
		// if time difference is greater than or equal to turnsFrequency, run updates
		// check if round has started or ended
		if (now < new Date(game.roundStart) || now > new Date(game.roundEnd)) {
			console.log('Round is not in progress')
		} else if (timeDiff < game.turnsFreq * 60000) {
			console.log('Turns not ready to be updated')
		} else {
			game.lastTurnsUpdate = now
			await game.save()
			try {
				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update turns
						turns: () =>
							`turns + ${game.turnsCount} + LEAST(storedTurns, ${game.turnsUnstore}), storedTurns = storedTurns - LEAST(storedTurns, ${game.turnsUnstore})`,
					})
					.where(
						'vacation = 0 AND id != 0 AND mode != :mode AND game_id = :game_id',
						{ mode: 'demo', game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update stored turns
						storedturns: () =>
							`LEAST(${game.turnsStored}, storedTurns + turns - ${game.turnsMax}), turns = ${game.turnsMax} `,
					})
					.where(
						'turns > :turnsMax AND id != 0 AND mode != :mode AND game_id = :game_id',
						{
							mode: 'demo',
							turnsMax: game.turnsMax,
							game_id: game.game_id,
						}
					)
					.execute()

				// Reduce maximum private market sell percentage (by 1% base, up to 2% if the player has nothing but bldcash)
				// TODO: can't figure out what this is doing...
				// await getConnection()
				// 	.createQueryBuilder()
				// 	.update(Empire)
				// 	.set({
				// 		mktPerArm: () =>
				// 			'mkt_per_arm - LEAST(mkt_per_arm, 100 * (1 + bld_cash / land))',
				// 		mktPerLnd: () =>
				// 			'mkt_per_lnd - LEAST(mkt_per_lnd, 100 * (1 + bld_cash / land))',
				// 		mktPerFly: () =>
				// 			'mkt_per_fly - LEAST(mkt_per_fly, 100 * (1 + bld_cash / land))',
				// 		mktPerSea: () =>
				// 			'mkt_per_sea - LEAST(mkt_per_sea, 100 * (1 + bld_cash / land))',
				// 	})
				// 	.where('land != 0 AND id != 0')
				// 	.execute()

				// await getConnection()
				// 	.createQueryBuilder()
				// 	.update(Empire)
				// 	.set({
				// 		// update price on private market
				// 		mktPerLnd: () =>
				// 			'mkt_Per_Lnd - LEAST(mkt_Per_Lnd, 100 * (1 + bld_Cash / land))',
				// 	})
				// 	.where('land != 0 AND id != 0')
				// 	.execute()

				// await getConnection()
				// 	.createQueryBuilder()
				// 	.update(Empire)
				// 	.set({
				// 		// update price on private market
				// 		mktPerFly: () =>
				// 			'mkt_Per_Fly - LEAST(mkt_Per_Fly, 100 * (1 + bld_Cash / land))',
				// 	})
				// 	.where('land != 0 AND id != 0')
				// 	.execute()

				// await getConnection()
				// 	.createQueryBuilder()
				// 	.update(Empire)
				// 	.set({
				// 		// update price on private market
				// 		mktPerSea: () =>
				// 			'mkt_Per_Sea - LEAST(mkt_Per_Sea, 100 * (1 + bld_Cash / land))',
				// 	})
				// 	.where('land != 0 AND id != 0')
				// 	.execute()

				// refill private market based on bldCost, except for food bldFood
				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktArm: () => 'mkt_arm + (8 * (land + bld_cost)*0.75)',
					})
					.where(
						'mkt_arm / 250 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktLnd: () => 'mkt_lnd + (5 * (land + bld_cost)*0.75)',
					})
					.where(
						'mkt_lnd / 250 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktFly: () => 'mkt_fly + (3 * (land + bld_cost)*0.75)',
					})
					.where(
						'mkt_fly / 250 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktSea: () => 'mkt_sea + (2 * (land + bld_cost)*0.75)',
					})
					.where(
						'mkt_sea / 250 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktFood: () => 'mkt_food + (50 * (land + bld_cost) * 0.8)',
					})
					.where(
						'mkt_food / 3500 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						// update available quantity on market
						mktRunes: () => 'mkt_runes + (6 * (land + bld_cost)*0.8)',
					})
					.where(
						'mkt_runes / 100 < land + 2 * bld_cost AND id != 0 AND game_id = :game_id',
						{ game_id: game.game_id }
					)
					.execute()

				// clan troop sharing
				// await getConnection()
				// 	.createQueryBuilder()
				// 	.update(Empire)
				// 	.set({
				// 		// update available quantity on market
				// 		sharing: () => 'sharing - 1',
				// 	})
				// 	.where('sharing > 0 AND id != 0')
				// 	.execute()

				// leak out excess cash from the bank
				await getConnection()
					.createQueryBuilder()
					.update(Empire)
					.set({
						bank: () => 'bank + (networth*100 - bank) * 0.015',
						cash: () => 'cash - (networth*100 - bank) * 0.015',
					})
					.where('bank > networth*100 AND id != 0')
					.execute()

				console.log('updating ranks')
				let empires = []
				let uRank = 0
				if (game.scoreEnabled) {
					empires = await Empire.find({
						where: { game_id: game.game_id },
						order: { score: 'DESC' },
					})
				} else {
					empires = await Empire.find({
						where: { game_id: game.game_id },
						order: { networth: 'DESC' },
					})
				}
				for (let i = 0; i < empires.length; i++) {
					uRank++
					const id = empires[i].id
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update rank
							rank: uRank,
						})
						.where('id = :id', { id: id })
						.execute()
				}

				const snapEmpires = empires.filter(
					(emp) => emp.turnsUsed >= game.turnsProtection && emp.mode !== 'demo'
				)

				for (let i = 0; i < snapEmpires.length; i++) {
					console.log('taking snapshot')
					const empire = snapEmpires[i]
					const snapshot = new EmpireSnapshot(empire)
					// console.log(empire)
					snapshot.e_id = empire.id
					snapshot.createdAt = new Date()
					await snapshot.save()
				}

				console.log(`Turns updated for ${game.name + '-' + game.game_id}`, now)
			} catch (err) {
				console.log(err)
				// return res.status(500).json({
				// 	message: `Something went wrong in turn update for ${
				// 		game.name + '-' + game.game_id
				// 	}`,
				// })
			}
		}
	}
	return res.status(200).json({ message: 'Turns updated' })
}

const thirtyMinUpdate = async (req: Request, res: Response) => {
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).end('Unauthorized')
	}

	// get active games, loop over each game and update turns and other items
	const games = await Game.find({ where: { isActive: true } })

	for (let i = 0; i < games.length; i++) {
		const game = games[i]

		// check when game was last updated
		const now = new Date()
		// check if round has started or ended
		if (now < new Date(game.roundStart) || now > new Date(game.roundEnd)) {
			console.log('Round is not in progress')
		} else {
			try {
				// max attack counter
				if (game.maxAttacks > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of attacks
							attacks: () => 'attacks - 1',
						})
						.where('attacks > 0 AND id != 0 AND game_id = :game_id', {
							game_id: game.game_id,
						})
						.execute()
				}

				if (game.maxSpells > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of spells
							spells: () => 'spells - 1',
						})
						.where('spells > 0 AND id != 0 AND game_id = :game_id', {
							game_id: game.game_id,
						})
						.execute()
				}

				if (game.drRate > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							diminishingReturns: () =>
								`diminishing_returns - ${game.drRate / 2}`,
						})
						.where(
							'diminishing_returns > 0 AND id != 0 AND game_id = :game_id',
							{
								game_id: game.game_id,
							}
						)
						.execute()
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							diminishingReturns: () => '0',
						})
						.where(
							'diminishing_returns < 0 AND id != 0 AND game_id = :game_id',
							{
								game_id: game.game_id,
							}
						)
						.execute()
				}
				// max time on market typically 72 hours
				console.log('cleaning market')
				// take unsold market items and return them to the empire
				const now = new Date()
				const maxTime = (game.pubMktStart + game.pubMktMaxTime) * 60 * 60 * 1000 // 78 hours in milliseconds
				const oldestDate = new Date(now.getTime() - maxTime)

				const items = await getRepository(Market)
					.createQueryBuilder('market')
					.where('market.createdAt <= :oldestDate', { oldestDate })
					.getMany()

				console.log(items)

				const itemsArray = [
					'trpArm',
					'trpLnd',
					'trpFly',
					'trpSea',
					'food',
					'runes',
				]

				for (let i = 0; i < items.length; i++) {
					//return unsold goods
					const item = items[i]
					console.log(item)
					const itemName = itemsArray[item.type]
					console.log(itemName)
					const empire = await Empire.findOne({ id: item.empire_id })
					empire[itemName] += Math.round(item.amount * 0.75)
					empire.networth = getNetworth(empire, game)

					// news event for expired market item
					// create news entry
					const sourceId = empire.id
					const sourceName = empire.name
					const destinationId = empire.id
					const destinationName = empire.name
					const content = `Your ${
						eraArray[empire.era][itemName.toLowerCase()]
					} on the public market have expired and 75% have been returned to you.`
					const pubContent = `${empire.name} failed to sell their items on the public market.`

					// create news event for seller that goods have been purchased
					await createNewsEvent(
						content,
						pubContent,
						sourceId,
						sourceName,
						destinationId,
						destinationName,
						'market',
						'fail',
						empire.game_id
					)

					await empire.save()
					await item.remove()
				}
				console.log('30 minute update')
			} catch (err) {
				console.log(err)
				// return res
				// 	.status(500)
				// 	.json({ message: 'Something went wrong in 30 minute update' })
			}
		}
	}
	return res.status(200).json({ message: '30 minute update' })
}

const hourlyUpdate = async (req: Request, res: Response) => {
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).end('Unauthorized')
	}

	const games = await Game.find({ where: { isActive: true } })

	for (let i = 0; i < games.length; i++) {
		const game = games[i]

		// check when game was last updated
		const now = new Date()
		const bufferTime = 50000 // 50 seconds
		// check if round has started or ended
		if (now < new Date(game.roundStart) || now > new Date(game.roundEnd)) {
			console.log('Round is not in progress')
		} else {
			try {
				console.log('performing hourly update')
				if (game.maxAttacks > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of attacks
							attacks: () => 'attacks + 1',
						})
						.where('attacks < 0 AND id != 0 AND game_id = :game_id', {
							game_id: game.game_id,
						})
						.execute()
				}

				if (game.maxSpells > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of spells
							spells: () => 'spells + 1',
						})
						.where('spells < 0 AND id != 0 AND game_id = :game_id', {
							game_id: game.game_id,
						})
						.execute()
				}

				const lastAidUpdateTime = new Date(game.lastAidUpdate)
				const timeDiff =
					now.getTime() - lastAidUpdateTime.getTime() + bufferTime

				if (timeDiff >= game.aidDelay * 60000 * 60) {
					console.log('adding aid credits')
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of credits
							aidCredits: () => 'aid_credits + 1',
						})
						.where(
							'id != 0 AND aid_credits < :max AND mode != :mode AND game_id = :game_id',
							{
								mode: 'demo',
								max: game.aidMaxCredits,
								game_id: game.game_id,
							}
						)
						.execute()
				}

				game.lastAidUpdate = now
				await game.save()
			} catch (err) {
				console.log(err)
				// return res
				// 	.status(500)
				// 	.json({ message: 'Something went wrong in hourly update' })
			}
		}
	}
	return res.status(200).json({ message: 'Hourly update' })
}

// function isOld(updatedAt, effectValue) {
// 	let effectAge = (Date.now().valueOf() - new Date(updatedAt).getTime()) / 60000
// 	effectAge = Math.floor(effectAge)

// 	// console.log(effectAge)
// 	// console.log(effectValue)

// 	if (effectAge > effectValue) {
// 		return true
// 	}
// 	return false
// }

// runs once a day
const cleanDemoAccounts = async (req: Request, res: Response) => {
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).end('Unauthorized')
	}

	const games = await Game.find({ where: { isActive: true } })

	for (let i = 0; i < games.length; i++) {
		const game = games[i]

		const now = new Date()

		if (now < new Date(game.roundStart) || now > new Date(game.roundEnd)) {
			console.log('Round is not in progress')
		} else {
			try {
				if (game.scoreEnabled) {
					console.log('give score based on networth')
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update score
							score: () => 'score + 2 * (networth / 10000000)',
						})
						.where('id != 0 AND mode != :mode AND game_id = :game_id', {
							mode: 'demo',
							game_id: game.game_id,
						})
						.execute()
				}

				console.log('cleaning demo accounts and effects')
				await getConnection()
					.createQueryBuilder()
					.delete()
					.from(Empire)
					.where('mode = :gamemode AND turnsUsed < :protection', {
						gamemode: 'demo',
						protection: game.turnsProtection,
					})
					.execute()
				console.log('demo accounts cleaned')

				await getConnection()
					.createQueryBuilder()
					.delete()
					.from(EmpireEffect)
					.where(
						'EXTRACT(EPOCH FROM (NOW() - "updated_at")) / 60 > "empire_effect_value"'
					)
					.execute()
				console.log('effects cleaned')
				// clear old sessions
				// if createdAt date is older than 1 day, delete
				await getConnection()
					.createQueryBuilder()
					.delete()
					.from(Session)
					.where('createdAt < :date', { date: new Date(Date.now() - 86400000) })
					.execute()
				console.log('sessions cleaned')

				// determine how to pick a winner
				// get total number of tickets, multiply by 1.25, round up, that is the number of tickets to draw
				// pick a random number between 1 and the total number of tickets
				// find the ticket with that number
				// that empire wins the prize
				console.log('checking lottery')

				const allTickets = await Lottery.find({
					where: { game_id: game.game_id },
				})
				console.log(allTickets)
				let jackpot = 0
				const jackpotTracker = await Lottery.findOne({
					ticket: 0,
					game_id: game.game_id,
				})
				console.log(jackpotTracker)
				if (!jackpotTracker) {
					for (let i = 0; i < allTickets.length; i++) {
						jackpot += Number(allTickets[i].cash)
					}
					jackpot += game.lotteryJackpot
				} else {
					for (let i = 0; i < allTickets.length; i++) {
						if (allTickets[i].ticket != 0) {
							jackpot += Number(allTickets[i].cash)
						}
					}
					jackpot += Number(jackpotTracker.cash)
				}

				// console.log('jackpot', jackpot)

				const totalTickets = allTickets.length
				if (totalTickets > 1) {
					console.log('total tickets', totalTickets)
					let ticketsToDraw = Math.ceil(totalTickets * 1.35)
					if (ticketsToDraw < 15) ticketsToDraw = 15
					console.log('tickets to draw', ticketsToDraw)
					const winningTicket = Math.ceil(Math.random() * ticketsToDraw)
					console.log('winning ticket', winningTicket)

					// check if all tickets contains a ticket with the winning number
					// console.log(allTickets)
					const winner = allTickets.find(
						({ ticket }) => ticket == winningTicket
					)
					console.log('winner', winner)

					if (!winner || totalTickets < 1 || winningTicket < 1) {
						console.log('no winner')
						// remove old tickets
						await getConnection()
							.createQueryBuilder()
							.delete()
							.from(Lottery)
							.where('game_id = :game_id', { game_id: game.game_id })
							.execute()

						// create jackpot entry as ticket 0
						const ticket = new Lottery()
						ticket.empire_id = 0
						ticket.cash = jackpot
						ticket.ticket = 0
						ticket.game_id = game.game_id
						await ticket.save()

						// news event for no lottery winner
						// create news entry
						const sourceId = 0
						const sourceName = ''
						const destinationId = 0
						const destinationName = ''
						const content: string = ''
						const pubContent: string = `No one won the lottery. The base jackpot has increased to $${jackpot.toLocaleString()}.`

						// create news event
						await createNewsEvent(
							content,
							pubContent,
							sourceId,
							sourceName,
							destinationId,
							destinationName,
							'lottery',
							'fail',
							game.game_id
						)
					} else {
						console.log('winner', winner)
						// console.log(jackpot)
						const empire = await Empire.findOne({ id: winner.empire_id })
						// console.log(empire)
						empire.cash += jackpot
						await empire.save()

						// news event for lottery winner
						// create news entry
						const sourceId = empire.id
						const sourceName = empire.name
						const destinationId = empire.id
						const destinationName = empire.name
						const content: string = `You won $${jackpot.toLocaleString()} in the lottery!`
						const pubContent: string = `${
							empire.name
						} won $${jackpot.toLocaleString()} in the lottery!`

						// create news event
						await createNewsEvent(
							content,
							pubContent,
							sourceId,
							sourceName,
							destinationId,
							destinationName,
							'lottery',
							'success',
							game.game_id
						)

						// remove all tickets
						await getConnection()
							.createQueryBuilder()
							.delete()
							.from(Lottery)
							.where('game_id = :game_id', { game_id: game.game_id })
							.execute()
					}
				}
				console.log('lottery checked')
				// sync achievements to user
				try {
					const empires = await Empire.find({
						select: ['id', 'achievements'],
						relations: ['user'],
					})

					// loop through empires, sync achievements to user
					for (let i = 0; i < empires.length; i++) {
						const empire = empires[i]
						const user = await User.findOne({ id: empire.user.id })

						// compare empire achievements to user achievements
						// if an achievement was earned on the empire, add it to the user

						let newUserAchievements
						if (Object.keys(user.achievements).length === 0) {
							newUserAchievements = empire.achievements
						} else {
							newUserAchievements = user.achievements
						}

						Object.keys(empire.achievements).forEach((key) => {
							// console.log(empire.achievements[key])
							// console.log(newUserAchievements[key])
							if (
								empire.achievements[key].awarded === true &&
								newUserAchievements[key].awarded === false
							) {
								newUserAchievements[key].awarded = true
								newUserAchievements[key].timeAwarded =
									empire.achievements[key].timeAwarded
							}
						})

						user.achievements = newUserAchievements
						await user.save()
					}
				} catch (err) {
					console.log(err)
				}
				console.log('achievements synced')
			} catch (err) {
				console.log(err)
			}
		}
	}
	return res
		.status(200)
		.json({ message: 'Demo accounts cleaned, Lottery, achievements sync' })
}

const test = async (req: Request, res: Response) => {
	console.log(req.headers)
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).end('Unauthorized')
	}

	try {
		console.log('test')
		return res.status(200).json({ message: 'test' })
	} catch (err) {
		console.log(err)
		return res.status(500).json({ message: 'Something went wrong in test' })
	}
}

const router = Router()

router.get('/test', test)
router.get('/turns', promTurns)
router.get('/thirty', thirtyMinUpdate)
router.get('/hourly', hourlyUpdate)
router.get('/daily', cleanDemoAccounts)

export default router
