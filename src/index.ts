import 'reflect-metadata'
import { createConnection } from 'typeorm'
import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
dotenv.config()
import { ToadScheduler, SimpleIntervalJob, Task, AsyncTask } from 'toad-scheduler';

import authRoutes from './routes/auth'
import empireRoutes from './routes/empire'
import useTurns from './routes/useturns'
import build from './routes/build'

import {hourlyUpdate, promTurns} from './jobs/promTurns'

import trim from './middleware/trim'

const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use(morgan('dev'))
app.use(trim)
app.use(cookieParser())
app.use(
	cors({
		credentials: true,
		origin: process.env.ORIGIN,
		optionsSuccessStatus: 200,
	})
)

app.use(express.static('public'))

app.get('/', (_, res) => res.send('hello world'))
app.get('/api/', (_, res) => res.send('hello api'))

app.use('/api/auth', authRoutes)
app.use('/api/empire', empireRoutes)
app.use('/api/useturns', useTurns)
app.use('/api/build', build)

app.listen(PORT, async () => {
	console.log(`server running at http://localhost:${PORT}`)

	try {
		await createConnection()
		console.log('database connected')
	} catch (err) {
		console.log(err)
	}
})

const scheduler = new ToadScheduler()

const turns = new SimpleIntervalJob(
	{ minutes: 2, runImmediately: false },
	promTurns,
	'id_1'
);

const hourly = new SimpleIntervalJob(
	{ hours: 1, runImmediately: false },
	hourlyUpdate,
	'id_2'
);

scheduler.addSimpleIntervalJob(turns);
scheduler.addSimpleIntervalJob(hourly);

// console.log(scheduler.getById('id_1').getStatus());