import { AsyncTask, Task } from 'toad-scheduler'
import { getConnection, getRepository } from 'typeorm'
// import ClanInvite from '../entity/ClanInvite'
import Empire from '../entity/Empire'
import Market from '../entity/Market'
import {
	TURNS_COUNT,
	TURNS_MAXIMUM,
	TURNS_STORED,
	TURNS_UNSTORE,
	MAX_ATTACKS,
	MAX_SPELLS,
	DR_RATE,
	PUBMKT_MAXTIME,
	PUBMKT_START,
	AID_MAXCREDITS,
	LOTTERY_JACKPOT,
	TURNS_PROTECTION,
} from '../config/oldConifg'
import EmpireEffect from '../entity/EmpireEffect'
// import User from '../entity/User'
import { getNetworth } from '../services/actions/actions'
import Session from '../entity/Session'
import { eraArray } from '../config/eras'
import { createNewsEvent } from '../util/helpers'
import Lottery from '../entity/Lottery'
import EmpireSnapshot from '../entity/EmpireSnapshot'
import User from '../entity/User'
import Game from '../entity/Game'

// perform standard turn update events
export const promTurns = new AsyncTask('prom turns', async () => {
	// max turns 500, max stored turns 250
	const games = await Game.find({ where: { isActive: true } })

	for (let i = 0; i < games.length; i++) {
		const game = games[i]
		console.log(game.game_id)
		const now = new Date()

		if (now < new Date(game.roundStart) || now > new Date(game.roundEnd)) {
			console.log('Round is not in progress')
		} else {
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

				// Reduce maximum private market sell percentage (by 1% base, up to 2% if the player has nothing but bldcash)
				// TODO: can't figure out what this is doing...

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

				console.log('Turns update', new Date())
			} catch (err) {
				console.log(err)
			}
		}
	}
})

export const thirtyMinUpdate = new AsyncTask('30 min update', async () => {
	// max attack counter
	if (MAX_ATTACKS > 0) {
		await getConnection()
			.createQueryBuilder()
			.update(Empire)
			.set({
				// update number of attacks
				attacks: () => 'attacks - 1',
			})
			.where('attacks > 0 AND id != 0')
			.execute()
	}

	if (MAX_SPELLS > 0) {
		await getConnection()
			.createQueryBuilder()
			.update(Empire)
			.set({
				// update number of spells
				spells: () => 'spells - 1',
			})
			.where('spells > 0 AND id != 0')
			.execute()
	}

	if (DR_RATE > 0) {
		await getConnection()
			.createQueryBuilder()
			.update(Empire)
			.set({
				diminishingReturns: () => `diminishing_returns - ${DR_RATE / 2}`,
			})
			.where('diminishing_returns > 0 AND id != 0')
			.execute()
		await getConnection()
			.createQueryBuilder()
			.update(Empire)
			.set({
				diminishingReturns: () => '0',
			})
			.where('diminishing_returns < 0 AND id != 0')
			.execute()
	}
	// max time on market 72 hours
	console.log('cleaning market')
	// take unsold market items and return them to the empire
	const now = new Date()
	const maxTime = (PUBMKT_START + PUBMKT_MAXTIME) * 60 * 60 * 1000 // 78 hours in milliseconds
	const oldestDate = new Date(now.getTime() - maxTime)

	const items = await getRepository(Market)
		.createQueryBuilder('market')
		.where('market.createdAt <= :oldestDate', { oldestDate })
		.getMany()

	console.log(items)

	let itemsArray = ['trpArm', 'trpLnd', 'trpFly', 'trpSea', 'food', 'runes']

	for (let i = 0; i < items.length; i++) {
		//return unsold goods
		let item = items[i]
		console.log(item)
		const itemName = itemsArray[item.type]
		console.log(itemName)
		const empire = await Empire.findOne({ id: item.empire_id })
		empire[itemName] += Math.round(item.amount * 0.75)
		// empire.networth = getNetworth(empire, game)

		// news event for expired market item
		// create news entry
		let sourceId = empire.id
		let sourceName = empire.name
		let destinationId = empire.id
		let destinationName = empire.name
		let content: string = `You're ${
			eraArray[empire.era][itemName.toLowerCase()]
		} on the public market have expired and 75% have been returned to you.`
		let pubContent: string = `${empire.name} failed to sell their items on the public market.`

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
})

export const hourlyUpdate = new AsyncTask('hourly update', async () => {
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
				if (MAX_ATTACKS > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of attacks
							attacks: () => 'attacks + 1',
						})
						.where('attacks < 0 AND id != 0')
						.execute()
				}

				if (MAX_SPELLS > 0) {
					await getConnection()
						.createQueryBuilder()
						.update(Empire)
						.set({
							// update number of spells
							spells: () => 'spells + 1',
						})
						.where('spells < 0 AND id != 0')
						.execute()
				}

				const lastAidUpdateTime = new Date(game.lastAidUpdate)
				console.log(lastAidUpdateTime)
				const timeDiff =
					now.getTime() - lastAidUpdateTime.getTime() + bufferTime
				console.log(timeDiff)
				console.log(game.aidDelay * 60000 * 60)
				console.log(game.aidDelay * 60 * 60 * 1000)
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
							'id != 0 AND aid_credits <= :max AND mode != :mode AND game_id = :game_id',
							{
								mode: 'demo',
								max: game.aidMaxCredits,
								game_id: game.game_id,
							}
						)
						.execute()
					game.lastAidUpdate = now
					await game.save()
				}
			} catch (err) {
				console.log(err)
				// return res
				// 	.status(500)
				// 	.json({ message: 'Something went wrong in hourly update' })
			}
		}
	}
})

export const snapshot = new AsyncTask('snapshot', async () => {
	console.log('taking snapshots')
	try {
		// loop over empires, save each empire to separate snapshot row
		const empires = await Empire.find()

		for (let i = 0; i < empires.length; i++) {
			console.log('taking snapshot')
			const empire = empires[i]
			const snapshot = new EmpireSnapshot(empire)
			// console.log(empire)
			snapshot.e_id = empire.id
			snapshot.createdAt = new Date()
			await snapshot.save()
		}
	} catch (err) {
		console.log(err)
	}
})

export const aidCredits = new AsyncTask('aid credits', async () => {
	// add aid credits
	console.log('adding aid credits')
	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update number of credits
			aidCredits: () => 'aid_credits + 1',
		})
		.where('id != 0 AND aid_credits < :max AND mode != :mode', {
			mode: 'demo',
			max: AID_MAXCREDITS,
		})
		.execute()
})

// export const cleanMarket = new AsyncTask('clean market', async () => {})

// export const updateRanks = new AsyncTask('update ranks', async () => {

// })

function isOld(updatedAt, effectValue) {
	let effectAge = (Date.now().valueOf() - new Date(updatedAt).getTime()) / 60000
	effectAge = Math.floor(effectAge)

	// console.log(effectAge)
	// console.log(effectValue)

	if (effectAge > effectValue) {
		return true
	}
	return false
}

export const cleanDemoAccounts = new AsyncTask(
	'clean demo accounts and effects',
	async () => {
		console.log('cleaning demo accounts and effects')

		const games = await Game.find({ where: { isActive: true } })

		for (let i = 0; i < games.length; i++) {
			const game = games[i]
			console.log(game.game_id)
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
								score: () => 'score + (networth / 10000000)',
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

					// let emptyUsers = await User.find({
					// 	relations: ['empires'],
					// 	where: { empires: [] },
					// })

					// emptyUsers.forEach(async (user) => {
					// 	await user.remove()
					// })

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
						.where('createdAt < :date', {
							date: new Date(Date.now() - 86400000),
						})
						.execute()

					// determine how to pick a winner
					// get total number of tickets, multiply by 1.25, round up, that is the number of tickets to draw
					// pick a random number between 1 and the total number of tickets
					// find the ticket with that number
					// that empire wins the prize
					console.log('checking lottery')

					const allTickets = await Lottery.find({
						where: { game_id: game.game_id },
					})

					let jackpot = 0
					const jackpotTracker = await Lottery.findOne({
						ticket: 0,
						game_id: game.game_id,
					})
					// console.log(jackpotTracker)
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
						// console.log('total tickets', totalTickets)
						let ticketsToDraw = Math.ceil(totalTickets * 1.35)
						if (ticketsToDraw < 15) ticketsToDraw = 15
						// console.log('tickets to draw', ticketsToDraw)
						const winningTicket = Math.ceil(Math.random() * ticketsToDraw)
						// console.log('winning ticket', winningTicket)

						// check if all tickets contains a ticket with the winning number
						// console.log(allTickets)
						const winner = allTickets.find(
							({ ticket }) => ticket === winningTicket
						)
						// console.log('winner', winner)

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
								ticket.game_id
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
								empire.game_id
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
				} catch (err) {
					console.log(err)
				}
			}
		}
		console.log('Demo accounts cleaned, Lottery, achievements sync')
	}
)

// // lottery
// export const lotteryCheck = new AsyncTask('lottery', async () => {

// })
