import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import User from '../entity/User'
import auth from '../middleware/auth'
import user from '../middleware/user'


//CREATE
const createEmpire = async (req: Request, res: Response) => {
	let { name, race } = req.body

	const user: User = res.locals.user

	const time = new Date().getTime()

	if (user.role === 'demo') {
		name = "Demo" + time
	}

	if (name.trim() === '') {
		return res.status(400).json({ name: 'Name must not be empty' })
	}

	try {
		const empire = new Empire({ name, race, user })
		await empire.save()
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'Something went wrong' })
	}
}

// const createPost = async (req: Request, res: Response) => {
// 	const { title, body, sub } = req.body

// 	const user = res.locals.user

// 	if (title.trim() === '') {
// 		return res.status(400).json({ title: 'Title must not be empty' })
// 	}

// 	try {
// 		// find sub
// 		const subRecord = await Sub.findOneOrFail({ name: sub })

// 		const post = new Post({ title, body, user, sub: subRecord })

// 		await post.save()
// 		return res.json(post)
// 	} catch (error) {
// 		console.log(error)
// 		return res.status(500).json({ error: 'Something went wrong' })
// 	}
// }

// set some starting resources to work with
const giveResources = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find()

		empires.forEach(async (empire) => {
			empire.bldCash = 2000
			empire.bldCost = 2000
			empire.bldFood = 2000
			empire.bldPop = 2000
			empire.bldTroop = 2000
			empire.bldWiz = 2000
			empire.cash = 1000000
			empire.era = 1
			empire.food = 50000
			empire.freeLand = 2000
			empire.land = 14000
			empire.health = 100
			empire.indArmy = 25
			empire.indFly = 25
			empire.indLnd = 25
			empire.indSea = 25
			empire.trpArm = 500
			empire.trpFly = 500
			empire.trpLnd = 500
			empire.trpSea = 500
			empire.peasants = 20000
			empire.runes = 1000
			empire.turns = 1000
			empire.tax = 10

			await empire.save()
		})

		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// set some turns resources to work with
const giveTurns = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find()

		empires.forEach(async (empire) => {
			empire.turns = 1000

			await empire.save()
		})

		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// READ
const getEmpires = async (_: Request, res: Response) => {
	try {
		const empires = await Empire.find()

		return res.json(empires)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

// UPDATE
const updateEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params
	const { tax, indArmy, indFly, indLnd, indSea, empireId } = req.body

	if (indArmy && indArmy + indFly + indLnd + indSea !== 100) {
		return res.status(500).json({ error: 'percentages must add up to 100' })
	}

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		empire.tax = tax || empire.tax
		empire.indArmy = indArmy || empire.indArmy
		empire.indLnd = indLnd || empire.indLnd
		empire.indFly = indFly || empire.indFly
		empire.indSea = indSea || empire.indSea

		await empire.save()

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// DELETE
const deleteEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		await empire.remove()

		return res.json({ message: 'empire deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
}

// FIND ONE
const findOneEmpire = async (req: Request, res: Response) => {
	const { uuid } = req.params

	const user: User = res.locals.user

	try {
		const empire = await Empire.findOneOrFail({ uuid }, {relations: ['user']})
		// console.log('empire', empire)
		// console.log('user', user)
		if (user.username !== empire.user.username) {
			return res.status(403).json({error: 'unauthorized'})
		}

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const router = Router()

router.post('/', user, auth, createEmpire)

router.get('/', getEmpires)
router.get('/:uuid', user, auth, findOneEmpire)
router.put('/:uuid', user, auth, updateEmpire)

router.put('/give/resources', giveResources)
router.put('/give/turns', giveTurns)

router.delete('/:uuid', deleteEmpire)

export default router
