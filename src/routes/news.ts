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

		let check = true
		if (news.length > 0) {
			check = news[0].seen
		}
		return res.json({ new: !check })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const countNew = async (req: Request, res: Response) => {
	const { id } = req.params

	try {
		const news = await EmpireNews.findAndCount({
			where: { empireIdDestination: id, seen: false },
		})

		// console.log(news[news.length - 1])
		return res.json({ count: news[news.length - 1] })
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const searchNews = async (req: Request, res: Response) => {
	console.log(req.body)
	const { skip, take, view, empire, type } = req.body

	let searchType = ''
	if (type) {
		searchType = type
	}

	try {
		if (empire && type) {
			const news = await EmpireNews.find({
				where: [
					{
						public: view,
						empireIdDestination: empire,
						type: searchType,
					},
					{
						public: view,
						empireIdSource: empire,
						type: searchType,
					},
				],
				order: { createdAt: 'DESC' },
				skip: skip,
				take: take,
			})
			return res.json(news)
		}
		if (type && !empire) {
			const news = await EmpireNews.find({
				where: {
					public: view,
					type: searchType,
				},
				order: { createdAt: 'DESC' },
				skip: skip,
				take: take,
			})
			return res.json(news)
		}
		if (empire && !type) {
			const news = await EmpireNews.find({
				where: [
					{
						public: view,
						empireIdDestination: empire,
					},
					{
						public: view,
						empireIdSource: empire,
					},
				],
				order: { createdAt: 'DESC' },
				skip: skip,
				take: take,
			})
			return res.json(news)
		}
		if (!empire && !type) {
			const news = await EmpireNews.find({
				where: {
					public: view,
				},
				order: { createdAt: 'DESC' },
				skip: skip,
				take: take,
			})
			return res.json(news)
		}
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const clanNews = async (req: Request, res: Response) => {
	let { empireIdDestination } = req.body
	let searchArray = []
	if (empireIdDestination) {
		empireIdDestination = empireIdDestination.map((id) => {
			searchArray.push({ empireIdDestination: id })
			searchArray.push({ empireIdSource: id })
		})
	}

	// console.log(searchArray)

	try {
		const news = await EmpireNews.find({
			where: searchArray,
			order: { createdAt: 'DESC' },
		})

		// console.log(news)
		return res.json(news)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.post('/', getPageNews)
router.post('/search', searchNews)
router.get('/:id', user, auth, getEmpireNews)
router.get('/:id/read', user, auth, markRead)
router.get('/:id/check', user, auth, checkForNew)
router.get('/:id/count', user, auth, countNew)
router.post('/clan', user, auth, clanNews)

export default router
