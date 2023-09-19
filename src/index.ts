import dotenv from 'dotenv'
dotenv.config()
import 'reflect-metadata'
import { createConnection } from 'typeorm'
import express from 'express'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import {
	ToadScheduler,
	SimpleIntervalJob,
	Task,
	AsyncTask,
} from 'toad-scheduler'

import authRoutes from './routes/auth'
import empireRoutes from './routes/empire'
import useTurns from './routes/useturns'
import build from './routes/build'
import demolish from './routes/demolish'
import drop from './routes/dropLand'
import magic from './routes/magic'
import privateMarket from './routes/privateMarket'
import publicMarket from './routes/publicMarket'
// import otherEmpires from './routes/empire'
import attack from './routes/attack'
import news from './routes/news'
import effects from './routes/effects'
import intel from './routes/intel'
import mail from './routes/mail'
import session from './routes/sessions'
import admin from './routes/admin'

import {
	cleanDemoAccounts,
	hourlyUpdate,
	promTurns,
	thirtyMinUpdate,
	updateRanks,
} from './jobs/promTurns'

import trim from './middleware/trim'
import { ROUND_START, TURNS_FREQ, ROUND_END } from './config/conifg'

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
app.use('/api/demolish', demolish)
// app.use('/api/demolish', demolish)
app.use('/api/drop', drop)
app.use('/api/magic', magic)
app.use('/api/privatemarket', privateMarket)
app.use('/api/publicmarket', publicMarket)
app.use('/api/attack', attack)
app.use('/api/news', news)
app.use('/api/effects', effects)
app.use('/api/intel', intel)
app.use('/api/messages', mail)
app.use('/api/session', session)
app.use('/api/admin', admin)
// app.use('/api/empire', otherEmpires)

app.listen(PORT, async () => {
	console.log(`server running at http://localhost:${PORT}`)

	try {
		let connection = await createConnection()
		// console.log(connection)
		console.log('database connected')
	} catch (err) {
		console.log(err)
	}
})

let gameOn = false

function checkTime() {
	let now = new Date()
	if (now > ROUND_START && now < ROUND_END) {
		gameOn = true
	}
}

const checkTimeTask = new Task('check time', () => {
	let now = new Date()
	if (now > ROUND_START && now < ROUND_END) {
		gameOn = true
	}
})

checkTime()

// console.log(ROUND_START)
// console.log(gameOn)

const scheduler = new ToadScheduler()

const gameActive = new SimpleIntervalJob(
	{ minutes: 1, runImmediately: true },
	checkTimeTask,
	'id_0'
)
scheduler.addSimpleIntervalJob(gameActive)

const turns = new SimpleIntervalJob(
	{ minutes: TURNS_FREQ, runImmediately: false },
	promTurns,
	'id_1'
)

const thirtyMin = new SimpleIntervalJob(
	{
		minutes: 30,
		runImmediately: false,
	},
	thirtyMinUpdate,
	'id_5'
)

const ranks = new SimpleIntervalJob(
	{ minutes: TURNS_FREQ, runImmediately: false },
	updateRanks,
	'id_3'
)

const hourly = new SimpleIntervalJob(
	{ hours: 1, runImmediately: false },
	hourlyUpdate,
	'id_2'
)

const daily = new SimpleIntervalJob(
	{ days: 1, runImmediately: false },
	cleanDemoAccounts,
	'id_4'
)

if (gameOn) {
	scheduler.addSimpleIntervalJob(turns)
	scheduler.addSimpleIntervalJob(ranks)
	scheduler.addSimpleIntervalJob(thirtyMin)
	scheduler.addSimpleIntervalJob(hourly)
	scheduler.addSimpleIntervalJob(daily)
}
// console.log(scheduler.getById('id_1').getStatus());
