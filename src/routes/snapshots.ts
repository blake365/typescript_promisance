// get empire snapshots by id

import { Request, Response, Router } from 'express'
import EmpireSnapshot from '../entity/EmpireSnapshot'
import auth from '../middleware/auth'
import user from '../middleware/user'
import User from '../entity/User'
import { Raw } from 'typeorm'
import { Parser } from 'json2csv'
import { Readable } from 'stream'

// READ
const getSnapshot = async (req: Request, res: Response) => {
	const { id } = req.params
	const user: User = res.locals.user

	if (user.empires[0].id !== Number(id)) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	try {
		const snapshot = await EmpireSnapshot.find({
			where: {
				e_id: id,
			},
			order: {
				createdAt: 'ASC',
			},
		})

		return res.json(snapshot)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const getRecentSnapshot = async (req: Request, res: Response) => {
	const { id } = req.params
	const user: User = res.locals.user

	if (user.empires[0].id !== Number(id)) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}

	try {
		const snapshot = await EmpireSnapshot.find({
			where: {
				e_id: id,
				createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '6 hours'`),
			},
			order: {
				createdAt: 'ASC',
			},
		})

		return res.json(snapshot)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const paginateSnapshot = async (req: Request, res: Response) => {
	const { id } = req.params
	let { page, take } = req.body
	// const user: User = res.locals.user

	// if (user.empires[0].id !== Number(id)) {
	// 	return res.status(500).json({ error: 'Empire ID mismatch' })
	// }
	take = parseInt(take)
	// console.log(page, take)
	try {
		let snapshot = await EmpireSnapshot.find({
			where: {
				e_id: id,
			},
			order: {
				createdAt: 'DESC',
			},
			skip: page * take,
			take: take,
		})

		snapshot = snapshot.reverse()
		return res.json(snapshot)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const downloadSnapshots = async (req: Request, res: Response) => {
	const { id } = req.params
	const user: User = res.locals.user

	if (user.empires[0].id !== Number(id)) {
		return res.status(500).json({ error: 'Empire ID mismatch' })
	}
	console.log('download...')

	try {
		const snapshot = await EmpireSnapshot.find({
			where: {
				e_id: id,
			},
			order: {
				createdAt: 'ASC',
			},
		})

		const parser = new Parser()

		const csv = parser.parse(snapshot)

		const readStream = new Readable()
		readStream.push(csv)
		readStream.push(null)

		res.setHeader(
			'Content-disposition',
			'attachment; filename=downloaded-file.csv'
		)
		res.setHeader('Content-type', 'text/csv')

		readStream.pipe(res)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

const router = Router()

router.get('/:id', user, auth, getSnapshot)
router.get('/:id/recent', user, auth, getRecentSnapshot)
router.post('/:id/paginate', user, auth, paginateSnapshot)
router.get('/:id/download', user, auth, downloadSnapshots)

export default router
