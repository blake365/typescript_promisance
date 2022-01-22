import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
// import user from '../middleware/user'
// import auth from './auth'

//CREATE
const createEmpire = async (req: Request, res: Response) => {
	const { name, race } = req.body

	try {
		const empire = Empire.create({ name, race })

		empire.save()
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
}

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
	const { name, race } = req.body

	try {
		const empire = await Empire.findOneOrFail({ uuid })
		empire.name = name || empire.name
		empire.race = race || empire.race

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
	try {
		const empire = await Empire.findOneOrFail({ uuid })
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
}

const router = Router()

router.post('/', createEmpire)

router.get('/', getEmpires)
router.get('/:uuid', findOneEmpire)
router.put('/:uuid', updateEmpire)

router.put('/give/resources', giveResources)
router.put('/give/turns', giveTurns)

router.delete('/:uuid', deleteEmpire)

export default router
