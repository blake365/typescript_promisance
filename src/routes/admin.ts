import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import EmpireNews from '../entity/EmpireNews'
import Market from '../entity/Market'
import EmpireMessage from '../entity/EmpireMessage'

import auth from '../middleware/auth'
import user from '../middleware/user'

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
		return res.json({
			users: users,
			empires: empires,
			news: news,
			markets: markets,
			mail: mail,
		})
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// reset game and round
const resetGame = async (req: Request, res: Response) => {
	if (res.locals.user.role !== 'admin') {
		return res.status(401).json({
			error: 'Not authorized',
		})
	}

	// create round history
	// save empire data into empire history table
	// save clan data into clan history
	// delete empires, intel, clans, clan relations, messages, clan messages, news, market, sessions, lottery, etc...

	try {
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
router.post('/updateuser/:uuid', user, auth, updateUser)
router.delete('/deleteuser/:uuid', user, auth, deleteUser)
router.post('/updatenews/:uuid', user, auth, updateNews)
router.delete('/deletenews/:uuid', user, auth, deleteNews)
router.post('/updatemarket/:uuid', user, auth, updateMarket)
router.delete('/deletemarket/:uuid', user, auth, deleteMarket)
router.post('/updatemail/:uuid', user, auth, updateMail)
router.delete('/deletemail/:uuid', user, auth, deleteMail)

export default router
