// route to fetch individual empire news items
// fetch all public news items

import { Request, Response, Router } from 'express'
import EmpireNews from '../entity/EmpireNews'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { getConnection } from 'typeorm'

// set up route for pagination of news data
const getPageNews = async (req: Request, res: Response) => {
	const { skip, take, view } = req.body

	try {
		const news = await EmpireNews.find({
			where: { public: view },
			order: { createdAt: 'DESC' },
			skip: skip,
			take: take,
		})

		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getEmpireNews = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const news = await EmpireNews.find({
			where: { empireIdDestination: id },
			order: { createdAt: 'DESC' },
			skip: 0,
			take: 50,
		})

		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const markRead = async (req: Request, res: Response) => {
	console.log('marking news as read')
	const { id } = req.params

	await getConnection()
		.createQueryBuilder()
		.update(EmpireNews)
		.set({ seen: true })
		.where({ empireIdDestination: id })
		.execute()

	return res.json({ success: true })
}

const checkForNew = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const news = await EmpireNews.find({
			where: { empireIdDestination: id },
			order: { createdAt: 'DESC' },
			skip: 0,
			take: 1,
		})

		let check = news[0].seen
		return res.json({ new: !check })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/', getPageNews)
router.get('/:id', user, auth, getEmpireNews)
router.get('/:id/read', user, auth, markRead)
router.get('/:id/check', user, auth, checkForNew)

export default router
