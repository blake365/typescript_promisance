import dotenv from 'dotenv'
dotenv.config()
import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'
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
import aid from './routes/aid'
import clans from './routes/clan'

import {
	aidCredits,
	cleanDemoAccounts,
	cleanMarket,
	hourlyUpdate,
	promTurns,
	thirtyMinUpdate,
	updateRanks,
} from './jobs/promTurns'

import trim from './middleware/trim'
import { ROUND_START, TURNS_FREQ, ROUND_END, AID_DELAY } from './config/conifg'

const app = express()

Sentry.init({
	dsn: 'https://31985fcd0be208efe31e249cf10b34f5@o4505988856676352.ingest.sentry.io/4505988959895552',
	integrations: [
		// enable HTTP calls tracing
		new Sentry.Integrations.Http({ tracing: true }),
		// enable Express.js middleware tracing
		new Sentry.Integrations.Express({ app }),
		new ProfilingIntegration(),
	],
	// Performance Monitoring
	tracesSampleRate: 0.5, // Capture 100% of the transactions, reduce in production!
	// Set sampling rate for profiling - this is relative to tracesSampleRate
	profilesSampleRate: 0.5, // Capture 100% of the transactions, reduce in production!
})

const PORT = process.env.PORT
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler())

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler())

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
app.use('/api/aid', aid)
app.use('/api/clans', clans)
// app.use('/api/empire', otherEmpires)

app.get('/debug-sentry', function mainHandler(req, res) {
	throw new Error('My first Sentry error!')
})

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler())

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
	// The error id is attached to `res.sentry` to be returned
	// and optionally displayed to the user for support.
	res.statusCode = 500
	res.end(res.sentry + '\n')
})

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
	console.log('checking time')
	if (now > ROUND_START && now < ROUND_END) {
		gameOn = true
	}
	return gameOn
})

checkTime()

// console.log(ROUND_START)
// console.log(gameOn)

const scheduler = new ToadScheduler()

const gameActive = new SimpleIntervalJob(
	{ minutes: 10, runImmediately: true },
	checkTimeTask,
	'id_0'
)

scheduler.addSimpleIntervalJob(gameActive)

const turns = new SimpleIntervalJob(
	{ minutes: TURNS_FREQ, runImmediately: false },
	promTurns,
	'id_1'
)

const cleanMarketJob = new SimpleIntervalJob(
	{ minutes: 30, runImmediately: false },
	cleanMarket,
	'id_6'
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

const aidJob = new SimpleIntervalJob(
	{ hours: AID_DELAY / 60 / 60, runImmediately: false },
	aidCredits,
	'id_7'
)

console.log('gameOn', gameOn)
while (gameOn) {
	scheduler.addSimpleIntervalJob(gameActive)
	scheduler.addSimpleIntervalJob(turns)
	scheduler.addSimpleIntervalJob(ranks)
	scheduler.addSimpleIntervalJob(thirtyMin)
	scheduler.addSimpleIntervalJob(hourly)
	scheduler.addSimpleIntervalJob(daily)
	scheduler.addSimpleIntervalJob(cleanMarketJob)
	scheduler.addSimpleIntervalJob(aidJob)
}
// console.log(scheduler.getById('id_1').getStatus());
