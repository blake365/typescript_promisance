import type { Request, Response } from 'express'
import { Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import EmpireNews from '../entity/EmpireNews'
import Market from '../entity/Market'
import EmpireMessage from '../entity/EmpireMessage'
import Clan from '../entity/Clan'
import ClanHistory from '../entity/ClanHistory'
import EmpireHistory from '../entity/EmpireHistory'
import Game from '../entity/Game'
import auth from '../middleware/auth'
import user from '../middleware/user'
import RoundHistory from '../entity/RoundHistory'
import { makeId } from '../util/helpers'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import ClanRelation from '../entity/ClanRelation'
import Session from '../entity/Session'
import EmpireSnapshot from '../entity/EmpireSnapshot'
import Lottery from '../entity/Lottery'
import { getConnection } from 'typeorm'
import ClanMessage from '../entity/ClanMessage'
import EmpireIntel from '../entity/EmpireIntel'
import { attachGame } from '../middleware/game'

// READ
const getEmpires = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const empires = await Empire.find({
			where: { game_id: req.query.gameId },
			order: {
				createdAt: 'DESC',
			},
		})
		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getUsers = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const users = await User.find({
			relations: ['empires'],
			order: {
				createdAt: 'DESC',
			},
		})

		const filteredUsers = users.filter((user) => {
			user.empires = user.empires.filter((empire) => {
				return empire.game_id === Number(req.query.gameId)
			})
			return user.empires.length !== 0
		})

		return res.json(filteredUsers)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getNews = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const news = await EmpireNews.find({
			where: { game_id: req.query.gameId },
			order: {
				createdAt: 'DESC',
			},
		})
		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getMarkets = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const markets = await Market.find({
			where: { game_id: req.query.gameId },
			order: {
				createdAt: 'DESC',
			},
		})
		return res.json(markets)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getMails = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const mail = await EmpireMessage.find({
			where: { game_id: req.query.gameId },
			order: {
				createdAt: 'DESC',
			},
		})
		return res.json(mail)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getClanMails = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	try {
		const mail = await ClanMessage.find({
			where: { game_id: req.query.gameId },
			order: {
				createdAt: 'DESC',
			},
		})
		return res.json(mail)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countUsers = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const users = await User.count()
		return res.json(users)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countEmpires = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const empires = await Empire.count()
		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countNews = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const news = await EmpireNews.count()
		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countMarkets = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const markets = await Market.count()
		return res.json(markets)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countMails = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const mail = await EmpireMessage.count()
		return res.json(mail)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateEmpire = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params
	const body = req.body

	try {
		await Empire.update({ uuid: uuid }, body)
		return res.json({ message: 'Empire updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteEmpire = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		if (empire.clanId !== 0) {
			const clan = await Clan.findOne({ id: empire.clanId })
			if (clan.empireIdLeader === empire.id) {
				clan.empireIdLeader = 0
				if (clan.empireIdAssistant) {
					clan.empireIdLeader = clan.empireIdAssistant
					clan.empireIdAssistant = 0
				} else {
					let members = await Empire.find({ clanId: clan.id })
					if (members.length > 1) {
						members = members.filter((member) => member.id !== empire.id)
						members = members.sort((a, b) => b.networth - a.networth)
						clan.empireIdLeader = members[0].id
					}
				}
			} else if (clan.empireIdAssistant === empire.id) {
				clan.empireIdAssistant = 0
			}

			clan.clanMembers -= 1

			if (clan.clanMembers < 1) {
				const relations = await ClanRelation.find({
					where: [{ c_id1: clan.id }, { c_id2: clan.id }],
				})
				if (relations) {
					relations.forEach(async (relation) => {
						await relation.remove()
					})
				}

				const messages = await ClanMessage.find({ clanId: clan.id })
				if (messages) {
					messages.forEach(async (message) => {
						await message.remove()
					})
				}

				await clan.remove()
			} else {
				await clan.save()
			}
		}
		// delete market items
		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(Market)
			.where('empire_id = :empire_id', { empire_id: empire.id })
			.execute()
		// delete snapshots
		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(EmpireSnapshot)
			.where('empire_id = :empire_id', { empire_id: empire.id })
			.execute()

		await empire.remove()
		return res.json({ message: 'empire deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const disableEmpire = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params

	try {
		const empire = await Empire.findOne({ uuid: uuid })
		if (empire.flags === 0) {
			empire.flags = 1
		} else if (empire.flags === 1) {
			empire.flags = 0
		}
		await empire.save()
		return res.json({ message: 'Empire disabled status changed' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateUser = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params
	const body = req.body

	try {
		await User.update({ uuid: uuid }, body)
		return res.json({ message: 'User updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const loadOneUser = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		const user = await User.findOneOrFail({ uuid })
		return res.json(user)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const loadOneEmpire = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const loadOneMessage = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		const message = await EmpireMessage.findOneOrFail({ uuid })
		return res.json(message)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const loadOneMarket = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		const market = await Market.findOneOrFail({ uuid })
		return res.json(market)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const loadOneNews = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		const news = await EmpireNews.findOneOrFail({ uuid })
		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteUser = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		await User.delete({ uuid: uuid })
		return res.json({ message: 'User deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateNews = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params
	const body = req.body

	try {
		await EmpireNews.update({ uuid: uuid }, body)
		return res.json({ message: 'News updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteNews = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params

	try {
		await EmpireNews.delete({ uuid: uuid })
		return res.json({ message: 'News deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateMarket = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params
	const body = req.body

	try {
		await Market.update({ uuid: uuid }, body)
		return res.json({ message: 'Market updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteMarket = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params

	try {
		await Market.delete({ uuid: uuid })
		return res.json({ message: 'Market deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateMail = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params
	const body = req.body

	try {
		await EmpireMessage.update({ uuid: uuid }, body)
		return res.json({ message: 'Mail updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteMail = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const { uuid } = req.params

	try {
		await EmpireMessage.delete({ uuid: uuid })
		return res.json({ message: 'Mail deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const updateClanMail = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params
	const body = req.body

	try {
		await ClanMessage.update({ uuid: uuid }, body)
		return res.json({ message: 'Clan Mail updated' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const deleteClanMail = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}
	const { uuid } = req.params

	try {
		await ClanMessage.delete({ uuid: uuid })
		return res.json({ message: 'Clan Mail deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countEverything = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const users = await User.count()
		const empires = await Empire.count()
		const news = await EmpireNews.count()
		const markets = await Market.count()
		const mail = await EmpireMessage.count()
		const mailReports = await EmpireMessage.count({
			where: { messageFlags: 1 },
		})
		return res.json({
			users: users,
			empires: empires,
			news: news,
			markets: markets,
			mail: mail,
			reports: mailReports,
		})
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countAll = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	const game: Game = res.locals.game

	// console.log(game.game_id)

	try {
		let userCount = 0
		let empires = 0
		let news = 0
		let markets = 0
		let mail = 0
		let mailReports = 0

		let users = await User.find({ relations: ['empires'] })
		users = users.filter((user) => {
			user.empires = user.empires.filter((empire) => {
				return empire.game_id === Number(game.game_id)
			})
			return user.empires.length !== 0
		})
		userCount = users.length
		empires = await Empire.count({ where: { game_id: game.game_id } })
		news = await EmpireNews.count({ where: { game_id: game.game_id } })
		markets = await Market.count({ where: { game_id: game.game_id } })
		mail = await EmpireMessage.count({ where: { game_id: game.game_id } })
		mailReports = await EmpireMessage.count({
			where: { messageFlags: 1, game_id: game.game_id },
		})

		return res.json({
			users: userCount,
			empires: empires,
			news: news,
			markets: markets,
			mail: mail,
			reports: mailReports,
		})
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// reset game and round
const resetGame = async (req: Request, res: Response) => {
	const { code } = req.body
	const game: Game = res.locals.game

	if (!res.locals.user || res.locals.user.role !== 'admin') {
		return res.status(401).json({
			error: 'Not authorized',
		})
	}

	if (code !== process.env.GAME_RESET) {
		return res.status(401).json({
			error: 'Not authorized',
		})
	}

	try {
		// create round history
		const round_h_id = makeId(10)
		const name: string = game.roundName
		const description: string = game.roundDescription
		const startDate = game.roundStart
		const stopDate = game.roundEnd

		// save empire data into empire history table
		// save clan data into clan history
		// delete empires, intel, clans, clan relations, messages, clan messages, news, market, sessions, lottery, etc...
		// update user stats
		let users = await User.find()

		// filter out users with no empires in this game
		users = users.filter((user) => {
			user.empires = user.empires.filter((empire) => {
				return empire.game_id === Number(game.game_id)
			})
			return user.empires.length !== 0
		})

		// biome-ignore lint/complexity/noForEach: <explanation>
		users.forEach(async (user) => {
			// console.log(user)
			const empire = await Empire.findOne({
				where: { id: user.empires[0].id, game_id: game.game_id },
			})

			if (empire.rank > user.bestRank) {
				user.bestRank = empire.rank
			}

			user.defSucc += empire.defSucc
			user.defTotal += empire.defTotal
			user.offSucc += empire.offSucc
			user.offTotal += empire.offTotal
			user.numPlays += 1

			if (user.avgRank === 0) {
				user.avgRank = empire.rank
			} else {
				user.avgRank = (user.avgRank + empire.rank) / user.numPlays
			}

			user.totalProduction +=
				empire.income +
				empire.foodpro * (game.pvtmFood / game.pvtmTrpArm) +
				empire.indyProd +
				empire.magicProd

			user.totalConsumption +=
				empire.expenses + empire.foodcon * (game.pvtmFood / game.pvtmTrpArm)

			await user.save()
		})

		console.log('user stats updated')

		// get clans
		const clans = await Clan.find({ where: { game_id: game.game_id } })
		// biome-ignore lint/complexity/noForEach: <explanation>
		clans.forEach(async (clan) => {
			// create clan history
			const roundHistory_id = round_h_id
			const clanHistoryName = clan.clanName
			const clanHistoryMembers = clan.clanMembers
			let totalNetworth = 0
			const clan_id = clan.id
			const clanHistoryLeader = clan.empireIdLeader
			const clanHistoryAssistant = clan.empireIdAssistant

			const empires = await Empire.find({
				where: { clanId: clan.id },
			})

			// biome-ignore lint/complexity/noForEach: <explanation>
			empires.forEach((empire) => {
				totalNetworth += empire.networth
			})
			const clanHistoryTotalNet = totalNetworth

			// create clan history
			await new ClanHistory({
				roundHistory_id,
				clanHistoryName,
				clanHistoryMembers,
				clanHistoryTotalNet,
				clanHistoryLeader,
				clanHistoryAssistant,
				clan_id,
			}).save()
			await clan.remove()
		})

		console.log('clan history added and clans removed')

		// get empires
		const empires = await Empire.find({
			relations: ['user'],
			where: { game_id: game.game_id },
		})

		// biome-ignore lint/complexity/noForEach: <explanation>
		empires.forEach(async (empire) => {
			if (empire.turnsUsed > game.turnsProtection) {
				// console.log(empire.user)
				const roundHistory_id = round_h_id
				const u_id = empire.user.id
				const empireHistoryName = empire.name
				const empireHistoryId = empire.id
				const empireHistoryRace = raceArray[empire.race].name
				const empireHistoryEra = eraArray[empire.era].name
				const clanHistory_id = empire.clanId
				const empireHistoryOffSucc = empire.offSucc
				const empireHistoryOffTotal = empire.offTotal
				const empireHistoryDefSucc = empire.defSucc
				const empireHistoryDefTotal = empire.defTotal
				const empireHistoryNetworth = empire.networth
				const empireHistoryLand = empire.land
				const empireHistoryRank = empire.rank
				const empireHistoryAttackGain = empire.attackGains
				const empireHistoryAttackLoss = empire.attackLosses
				const empireHistoryExpenses = empire.expenses
				const empireHistoryIncome = empire.income
				const empireHistoryFoodCon = empire.foodcon
				const empireHistoryFoodPro = empire.foodpro
				const empireHistoryIndyProd = empire.indyProd
				const empireHistoryMagicProd = empire.magicProd
				const profile = empire.profile
				const profileIcon = empire.profileIcon
				const turnsUsed = empire.turnsUsed
				const finalTrpArm = empire.trpArm
				const finalTrpLnd = empire.trpLnd
				const finalTrpFly = empire.trpFly
				const finalTrpSea = empire.trpSea
				const finalTrpWiz = empire.trpWiz
				const peakCash = empire.peakCash
				const peakLand = empire.peakLand
				const peakNetworth = empire.peakNetworth
				const peakFood = empire.peakFood
				const peakRunes = empire.peakRunes
				const peakPeasants = empire.peakPeasants
				const peakTrpArm = empire.peakTrpArm
				const peakTrpLnd = empire.peakTrpLnd
				const peakTrpFly = empire.peakTrpFly
				const peakTrpSea = empire.peakTrpSea
				const peakTrpWiz = empire.peakTrpWiz

				// create empire history
				await new EmpireHistory({
					roundHistory_id,
					u_id,
					empireHistoryName,
					empireHistoryId,
					empireHistoryRace,
					empireHistoryEra,
					clanHistory_id,
					empireHistoryOffSucc,
					empireHistoryOffTotal,
					empireHistoryDefSucc,
					empireHistoryDefTotal,
					empireHistoryNetworth,
					empireHistoryLand,
					empireHistoryRank,
					empireHistoryAttackGain,
					empireHistoryAttackLoss,
					empireHistoryExpenses,
					empireHistoryIncome,
					empireHistoryFoodCon,
					empireHistoryFoodPro,
					empireHistoryIndyProd,
					empireHistoryMagicProd,
					profile,
					profileIcon,
					turnsUsed,
					finalTrpArm,
					finalTrpLnd,
					finalTrpFly,
					finalTrpSea,
					finalTrpWiz,
					peakCash,
					peakLand,
					peakNetworth,
					peakFood,
					peakRunes,
					peakPeasants,
					peakTrpArm,
					peakTrpLnd,
					peakTrpFly,
					peakTrpSea,
					peakTrpWiz,
				}).save()
			}
			await empire.remove()
		})

		console.log('empire history added and empires removed')

		const allClans = clans.length
		const allEmpires = empires.length
		const gameVersion = String(game.version)
		const countUnclanned = empires.filter((empire) => {
			return empire.clanId === 0
		})
		const nonClanEmpires = countUnclanned.length
		const icon = game.icon
		const color = game.color
		const type = game.type

		await new RoundHistory({
			round_h_id,
			name,
			description,
			startDate,
			stopDate,
			allClans,
			allEmpires,
			nonClanEmpires,
			gameVersion,
			icon,
			color,
			type,
		}).save()

		console.log('round history added')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(ClanMessage)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()

		console.log('clan messages removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(EmpireMessage)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()

		console.log('empire messages removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(Market)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()

		console.log('market items removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(EmpireNews)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()

		console.log('news removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(ClanRelation)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()

		console.log('clan relations removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(EmpireIntel)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()
		console.log('empire intel removed')

		await getConnection().createQueryBuilder().delete().from(Session).execute()
		console.log('sessions removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(EmpireSnapshot)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()
		console.log('snapshots removed')

		await getConnection()
			.createQueryBuilder()
			.delete()
			.from(Lottery)
			.where('game_id = :game_id', { game_id: game.game_id })
			.execute()
		console.log('lottery tickets removed')

		console.log('game reset')
		return res.json({ message: 'Game reset' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const createGame = async (req: Request, res: Response) => {
	if (!res.locals.user || res.locals.user.role !== 'admin') {
		return res.status(401).json({
			error: 'Not authorized',
		})
	}

	// console.log(req.body)
	// request body should have game details object from form
	const game = {
		name: req.body.name,
		version: req.body.version,
		roundName: req.body.roundName,
		roundStart: req.body.roundStart,
		roundEnd: req.body.roundEnd,
		type: req.body.type,
		icon: req.body.icon,
		color: req.body.color,
		isActive: req.body.isActive,
		roundDescription: req.body.description,
		empiresPerUser: req.body.empiresPerUser,
		turnsProtection: req.body.turnsProtection,
		turnsInitial: req.body.turnsInitial,
		turnsMax: req.body.turnsMax,
		turnsStored: req.body.turnsStored,
		turnsDemo: req.body.turnsDemo,
		turnsFreq: req.body.turnsFreq,
		turnsCount: req.body.turnsCount,
		turnsUnstore: req.body.turnsUnstore,
		lotteryMaxTickets: req.body.lotteryMaxTickets,
		lotteryJackpot: req.body.lotteryJackpot,
		buildCost: req.body.buildCost,
		bankSaveRate: req.body.bankSaveRate,
		bankLoanRate: req.body.bankLoanRate,
		pubMktStart: req.body.pubMktStart,
		pubMktMaxTime: req.body.pubMktMaxTime,
		pubMktMinSell: req.body.pubMktMinSell,
		pubMktMaxSell: req.body.pubMktMaxSell,
		pubMktMinFood: req.body.pubMktMinFood,
		pubMktMaxFood: req.body.pubMktMaxFood,
		pubMktMinRunes: req.body.pubMktMinRunes,
		pubMktMaxRunes: req.body.pubMktMaxRunes,
		clanEnable: req.body.clanEnable,
		clanSize: req.body.clanSize,
		clanMinJoin: req.body.clanMinJoin,
		clanMinRejoin: req.body.clanMinRejoin,
		clanMaxWar: req.body.clanMaxWar,
		pvtmMaxSell: req.body.pvtmMaxSell,
		pvtmShopBonus: req.body.pvtmShopBonus,
		pvtmTrpArm: req.body.pvtmTrpArm,
		pvtmTrpLnd: req.body.pvtmTrpLnd,
		pvtmTrpFly: req.body.pvtmTrpFly,
		pvtmTrpSea: req.body.pvtmTrpSea,
		pvtmFood: req.body.pvtmTrpWiz,
		pvtmRunes: req.body.pvtmRunes,
		industryMult: req.body.industryMult,
		maxAttacks: req.body.maxAttacks,
		maxSpells: req.body.maxSpells,
		drRate: req.body.drRate,
		baseLuck: req.body.baseLuck,
		aidEnable: req.body.aidEnable,
		aidMaxCredits: req.body.aidMaxCredits,
		aidDelay: req.body.aidDelay,
		allowMagicRegress: req.body.allowMagicRegress,
		lastTurnsUpdate: req.body.roundStart,
		lastAidUpdate: req.body.roundStart,
	}

	try {
		const newGame = new Game(game)
		await newGame.save()
		return res.json({ message: 'Game created' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const editGame = async (req: Request, res: Response) => {
	if (!res.locals.user || res.locals.user.role !== 'admin') {
		return res.status(401).json({
			error: 'Not authorized',
		})
	}

	console.log(req.body)

	try {
		// console.log(req.body)
		const game: Game = await Game.findOne({
			where: { game_id: Number(req.query.gameId) },
		})

		console.log(game)
		// request body should have game details object from form

		game.name = req.body.name
		game.version = req.body.version
		game.roundName = req.body.roundName
		game.roundStart = req.body.roundStart
		game.roundEnd = req.body.roundEnd
		game.isActive = req.body.isActive
		game.type = req.body.type
		game.icon = req.body.icon
		game.color = req.body.color
		game.roundDescription = req.body.description
		game.empiresPerUser = req.body.empiresPerUser
		game.turnsProtection = req.body.turnsProtection
		game.turnsInitial = req.body.turnsInitial
		game.turnsMax = req.body.turnsMax
		game.turnsStored = req.body.turnsStored
		game.turnsDemo = req.body.turnsDemo
		game.turnsFreq = req.body.turnsFreq
		game.turnsCount = req.body.turnsCount
		game.turnsUnstore = req.body.turnsUnstore
		game.lotteryMaxTickets = req.body.lotteryMaxTickets
		game.lotteryJackpot = req.body.lotteryJackpot
		game.buildCost = req.body.buildCost
		game.bankSaveRate = req.body.bankSaveRate
		game.bankLoanRate = req.body.bankLoanRate
		game.pubMktStart = req.body.pubMktStart
		game.pubMktMaxTime = req.body.pubMktMaxTime
		game.pubMktMinSell = req.body.pubMktMinSell
		game.pubMktMaxSell = req.body.pubMktMaxSell
		game.pubMktMinFood = req.body.pubMktMinFood
		game.pubMktMaxFood = req.body.pubMktMaxFood
		game.pubMktMinRunes = req.body.pubMktMinRune
		game.pubMktMaxRunes = req.body.pubMktMaxRune
		game.clanEnable = req.body.clanEnable
		game.clanSize = req.body.clanSize
		game.clanMinJoin = req.body.clanMinJoin
		game.clanMinRejoin = req.body.clanMinRejoin
		game.clanMaxWar = req.body.clanMaxWar
		game.pvtmMaxSell = req.body.pvtmMaxSell
		game.pvtmShopBonus = req.body.pvtmShopBonus
		game.pvtmTrpArm = req.body.pvtmTrpArm
		game.pvtmTrpLnd = req.body.pvtmTrpLnd
		game.pvtmTrpFly = req.body.pvtmTrpFly
		game.pvtmTrpSea = req.body.pvtmTrpSea
		game.pvtmFood = req.body.pvtmFood
		game.pvtmRunes = req.body.pvtmRunes
		game.industryMult = req.body.industryMult
		game.maxAttacks = req.body.maxAttacks
		game.maxSpells = req.body.maxSpells
		game.drRate = req.body.drRate
		game.baseLuck = req.body.baseLuck
		game.aidEnable = req.body.aidEnable
		game.aidMaxCredits = req.body.aidMaxCredits
		game.aidDelay = req.body.aidDelay
		game.allowMagicRegress = req.body.allowMagicRegress

		console.log(game)
		await game.save()
		return res.json({ message: 'Game Edited' })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/empires', user, auth, getEmpires)
router.get('/users', user, auth, getUsers)
router.get('/news', user, auth, getNews)
router.get('/markets', user, auth, getMarkets)
router.get('/mail', user, auth, getMails)
router.get('/clanMail', user, auth, getClanMails)

router.get('/countusers', user, auth, countUsers)
router.get('/countempires', user, auth, countEmpires)
router.get('/countnews', user, auth, countNews)
router.get('/countmarkets', user, auth, countMarkets)
router.get('/countmail', user, auth, countMails)
router.get('/countall', user, auth, attachGame, countAll)
router.get('/counteverything', user, auth, countEverything)

router.get('/users/:uuid', user, auth, loadOneUser)
router.get('/empires/:uuid', user, auth, loadOneEmpire)
router.get('/news/:uuid', user, auth, loadOneNews)
router.get('/markets/:uuid', user, auth, loadOneMarket)
router.get('/mail/:uuid', user, auth, loadOneMessage)

router.post('/updateempire/:uuid', user, auth, updateEmpire)
router.delete('/deleteempire/:uuid', user, auth, deleteEmpire)
router.post('/disableempire/:uuid', user, auth, disableEmpire)
router.post('/updateuser/:uuid', user, auth, updateUser)
router.delete('/deleteuser/:uuid', user, auth, deleteUser)
router.post('/updatenews/:uuid', user, auth, updateNews)
router.delete('/deletenews/:uuid', user, auth, deleteNews)
router.post('/updatemarket/:uuid', user, auth, updateMarket)
router.delete('/deletemarket/:uuid', user, auth, deleteMarket)
router.post('/updatemail/:uuid', user, auth, updateMail)
router.delete('/deletemail/:uuid', user, auth, deleteMail)
router.post('/updateClanMail/:uuid', user, auth, updateClanMail)
router.delete('/deleteClanMail/:uuid', user, auth, deleteClanMail)

router.post('/resetgame', user, auth, attachGame, resetGame)
router.post('/creategame', user, auth, createGame)
router.post('/edit', user, auth, editGame)

export default router
