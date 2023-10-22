import { AsyncTask, Task } from 'toad-scheduler'
import { getConnection, getRepository } from 'typeorm'
import ClanInvite from '../entity/ClanInvite'
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
} from '../config/conifg'
import EmpireEffect from '../entity/EmpireEffect'
import User from '../entity/User'
import { getNetworth } from '../routes/actions/actions'

// perform standard turn update events
export const promTurns = new AsyncTask('prom turns', async () => {
	// max turns 500, max stored turns 250
	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update turns
			turns: () =>
				`turns + ${TURNS_COUNT} + LEAST(storedTurns, ${TURNS_UNSTORE}), storedTurns = storedTurns - LEAST(storedTurns, ${TURNS_UNSTORE})`,
		})
		.where('vacation = 0 AND id != 0 AND mode != :mode', { mode: 'demo' })
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update stored turns
			storedturns: () =>
				`LEAST(${TURNS_STORED}, storedTurns + turns - ${TURNS_MAXIMUM}), turns = ${TURNS_MAXIMUM} `,
		})
		.where('turns > :turnsMax AND id != 0 AND mode != :mode', {
			mode: 'demo',
			turnsMax: TURNS_MAXIMUM,
		})
		.execute()

	// Reduce maximum private market sell percentage (by 1% base, up to 2% if the player has nothing but bldcash)
	// TODO: can't figure out what this is doing...
	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			mktPerArm: () =>
				'mkt_per_arm - LEAST(mkt_per_arm, 100 * (1 + bld_cash / land))',
			mktPerLnd: () =>
				'mkt_per_lnd - LEAST(mkt_per_lnd, 100 * (1 + bld_cash / land))',
			mktPerFly: () =>
				'mkt_per_fly - LEAST(mkt_per_fly, 100 * (1 + bld_cash / land))',
			mktPerSea: () =>
				'mkt_per_sea - LEAST(mkt_per_sea, 100 * (1 + bld_cash / land))',
		})
		.where('land != 0 AND id != 0')
		.execute()

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
		.where('mkt_arm / 250 < land + 2 * bld_cost AND id != 0')
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update available quantity on market
			mktLnd: () => 'mkt_lnd + (5 * (land + bld_cost)*0.75)',
		})
		.where('mkt_lnd / 250 < land + 2 * bld_cost AND id != 0')
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update available quantity on market
			mktFly: () => 'mkt_fly + (3 * (land + bld_cost)*0.75)',
		})
		.where('mkt_fly / 250 < land + 2 * bld_cost AND id != 0')
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update available quantity on market
			mktSea: () => 'mkt_sea + (2 * (land + bld_cost)*0.75)',
		})
		.where('mkt_sea / 250 < land + 2 * bld_cost AND id != 0')
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update available quantity on market
			mktFood: () => 'mkt_food + 50 * (land + bld_food)',
		})
		.where('mkt_food / 2000 < land + 2 * bld_food AND id != 0')
		.execute()

	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update available quantity on market
			mktRunes: () => 'mkt_runes + (2 * (land + bld_cost)*0.75)',
		})
		.where('mkt_food / 250 < land + 2 * bld_cost AND id != 0')
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

	//TODO: clean up expired clan invites

	console.log('Turns update', new Date())
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
	console.log('30 minute update')
})

export const hourlyUpdate = new AsyncTask('hourly update', async () => {
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

	// add aid credits
	await getConnection()
		.createQueryBuilder()
		.update(Empire)
		.set({
			// update number of credits
			aidCredits: () => 'aid_credits + 1',
		})
		.where('id != 0 AND aid_credits < 4 AND mode != :mode', { mode: 'demo' })
		.execute()
})

export const cleanMarket = new AsyncTask('clean market', async () => {
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

	// console.log(items)

	let itemsArray = ['trpArm', 'trpLnd', 'trpFly', 'trpSea', 'food', 'runes']

	for (let i = 0; i < items.length; i++) {
		//return unsold goods
		let item = items[i]
		let empire = await Empire.findOne({ id: items[i].empire_id })
		empire[itemsArray[item.type]] += Math.round(item.amount * 0.75)
		empire.networth = getNetworth(empire)
		await empire.save()
		await item.remove()
	}
})

export const updateRanks = new AsyncTask('update ranks', async () => {
	const empires = await Empire.find({ order: { networth: 'DESC' } })
	let uRank = 0

	for (let i = 0; i < empires.length; i++) {
		uRank++
		let id = empires[i].id
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
})

export const cleanDemoAccounts = new AsyncTask(
	'clean demo accounts and effects',
	async () => {
		console.log('cleaning demo accounts and effects')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(Empire)
			.where('mode = :gamemode AND turnsUsed < 1', { gamemode: 'demo' })
			.execute()

		// let emptyUsers = await User.find({
		// 	relations: ['empires'],
		// 	where: { empires: [] },
		// })

		// emptyUsers.forEach(async (user) => {
		// 	await user.remove()
		// })

		let effects = await EmpireEffect.find()

		function isOld(createdAt, effectValue) {
			let effectAge =
				(Date.now().valueOf() - new Date(createdAt).getTime()) / 60000
			effectAge = Math.floor(effectAge)

			// console.log(effectAge)
			// console.log(effectValue)

			if (effectAge > effectValue) {
				return true
			} else {
				return false
			}
		}

		effects.forEach(async (effect) => {
			let old = isOld(effect.createdAt, effect.empireEffectValue)
			if (old) {
				effect.remove()
			}
		})
	}
)
