import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import EmpireNews from '../entity/EmpireNews'
import Market from '../entity/Market'
import EmpireMessage from '../entity/EmpireMessage'
import Clan from '../entity/Clan'
import ClanHistory from '../entity/ClanHistory'
import EmpireHistory from '../entity/EmpireHistory'

import auth from '../middleware/auth'
import user from '../middleware/user'
import RoundHistory from '../entity/RoundHistory'
import {
	ROUND_DESCRIPTION,
	ROUND_NAME,
	ROUND_START,
	ROUND_END,
	PVTM_FOOD,
	PVTM_TRPARM,
} from '../config/conifg'
import { makeId } from '../util/helpers'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import ClanRelation from '../entity/ClanRelation'
import Session from '../entity/Session'

// READ
const getEmpires = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({ message: 'Not authorized' })
	}

	try {
		const empires = await Empire.find({
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
		return res.json(users)
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
		await Empire.delete({ uuid: uuid })
		return res.json({ message: 'Empire deleted' })
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

const countAll = async (req: Request, res: Response) => {
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

// reset game and round
const resetGame = async (req: Request, res: Response) => {
	const { code } = req.body

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
		let round_h_id = makeId(10)
		let name: string = ROUND_NAME
		let description: string = ROUND_DESCRIPTION
		let startDate = ROUND_START
		let stopDate = ROUND_END

		// save empire data into empire history table
		// save clan data into clan history
		// delete empires, intel, clans, clan relations, messages, clan messages, news, market, sessions, lottery, etc...
		// update user stats
		let users = await User.find()
		users.forEach(async (user) => {
			let empire = await Empire.findOne({
				where: { username: user.username },
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
				empire.foodpro * (PVTM_FOOD / PVTM_TRPARM) +
				empire.indyProd +
				empire.magicProd

			user.totalConsumption +=
				empire.expenses + empire.foodcon * (PVTM_FOOD / PVTM_TRPARM)

			await user.save()
		})

		// get clans
		let clans = await Clan.find()
		clans.forEach(async (clan) => {
			// create clan history
			let roundHistory_id = round_h_id
			let clanHistoryName = clan.clanName
			let clanHistoryMembers = clan.clanMembers
			let totalNetworth = 0
			const empires = await Empire.find({
				where: { clanId: clan.id },
			})

			empires.forEach((empire) => {
				totalNetworth += empire.networth
			})
			let clanHistoryTotalNet = totalNetworth

			// create clan history
			await new ClanHistory({
				roundHistory_id,
				clanHistoryName,
				clanHistoryMembers,
				clanHistoryTotalNet,
			}).save()
			clan.remove()
		})

		// get empires
		let empires = await Empire.find({
			relations: ['user'],
		})
		empires.forEach(async (empire) => {
			let roundHistory_id = round_h_id
			let u_id = empire.user.id
			let empireHistoryName = empire.name
			let empireHistoryRace = raceArray[empire.race].name
			let empireHistoryEra = eraArray[empire.era].name
			let clanHistory_id = empire.clanId
			let empireHistoryOffSucc = empire.offSucc
			let empireHistoryOffTotal = empire.offTotal
			let empireHistoryDefSucc = empire.defSucc
			let empireHistoryDefTotal = empire.defTotal
			let empireHistoryNetworth = empire.networth
			let empireHistoryLand = empire.land
			let empireHistoryRank = empire.rank

			// create empire history
			await new EmpireHistory({
				roundHistory_id,
				u_id,
				empireHistoryName,
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
			}).save()
			empire.remove()
		})

		let allClans = clans.length
		let allEmpires = empires.length
		const countUnclanned = empires.filter((empire) => {
			return empire.clanId === 0
		})
		let nonClanEmpires = countUnclanned.length

		await new RoundHistory({
			round_h_id,
			name,
			description,
			startDate,
			stopDate,
			allClans,
			allEmpires,
			nonClanEmpires,
		}).save()

		let clanMessages = await EmpireMessage.find()
		clanMessages.forEach((message) => {
			message.remove()
		})
		let messages = await EmpireMessage.find()
		messages.forEach((message) => {
			message.remove()
		})
		let markets = await Market.find()
		markets.forEach((market) => {
			market.remove()
		})
		let news = await EmpireNews.find()
		news.forEach((news) => {
			news.remove()
		})
		let clanRelation = await ClanRelation.find()
		clanRelation.forEach((relation) => {
			relation.remove()
		})
		let sessions = await Session.find()
		sessions.forEach((session) => {
			session.remove()
		})

		return res.json({ message: 'Game reset' })
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
router.get('/countusers', user, auth, countUsers)
router.get('/countempires', user, auth, countEmpires)
router.get('/countnews', user, auth, countNews)
router.get('/countmarkets', user, auth, countMarkets)
router.get('/countmail', user, auth, countMails)
router.get('/countall', user, auth, countAll)

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

router.post('/resetgame', user, auth, resetGame)

export default router
