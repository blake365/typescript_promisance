// route to fetch individual empire news items
// fetch all public news items

import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import EmpireNews from '../entity/EmpireNews'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { Not } from 'typeorm'

const getAllEmpireNews = async (req: Request, res: Response) => {
	const { id } = req.body

	try {
		const news = await EmpireNews.find({
			where: { empireIdDestination: id },
			order: { createdAt: 'DESC' },
		})

		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getUnseenEmpireNews = async (req: Request, res: Response) => {
	const { id } = req.body

	try {
		const news = await EmpireNews.find({
			where: {
				empireIdDestination: id,
				seen: false,
			},
			order: { createdAt: 'DESC' },
		})

		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getAllNews = async (_: Request, res: Response) => {
	try {
		const news = await EmpireNews.find({
			where: { public: true },
			order: { createdAt: 'DESC' },
		})

		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/', getAllNews)
router.post('/news', user, auth, getAllEmpireNews)
router.post('/news/unseen', user, auth, getUnseenEmpireNews)

export default router
