import 'reflect-metadata'
import { createConnection } from 'typeorm'
import Empire from './entity/Empire'

// import { validate } from 'class-validator'

import express, { Request, Response } from 'express'

const app = express()
app.use(express.json())

//CREATE
app.post('/empire', async (req: Request, res: Response) => {
	const { name, race } = req.body

	try {
		const empire = Empire.create({ name, race })

		empire.save()
		return res.status(201).json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
})
// READ
app.get('/empire', async (_: Request, res: Response) => {
	try {
		const empire = await Empire.find()

		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(500).json(error)
	}
})
// UPDATE
app.put('/empire/:uuid', async (req: Request, res: Response) => {
	const uuid = req.params.body
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
})
// DELETE
app.delete('/empire/:uuid', async (req: Request, res: Response) => {
	const uuid = req.params.body

	try {
		const empire = await Empire.findOneOrFail({ uuid })

		await empire.remove()

		return res.json({ message: 'empire deleted' })
	} catch (error) {
		console.log(error)
		return res.status(500).json({ error: 'something went wrong' })
	}
})
// FIND
app.get('/empire/:uuid', async (req: Request, res: Response) => {
	const uuid = req.params.body
	try {
		const empire = await Empire.findOneOrFail({ uuid })
		return res.json(empire)
	} catch (error) {
		console.log(error)
		return res.status(404).json({ empire: 'empire not found' })
	}
})

createConnection()
	.then(async () => {
		app.listen(5001, () => console.log('server up at http://localhost:5001'))
		// const empire = new Empire()

		// empire.name = 'Test Empire'
		// empire.turns = 300
		// empire.race = 'human'

		// await empire.save()

		// console.log('Empire created')
	})
	.catch((error) => console.log(error))
