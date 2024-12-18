process.env.NODE_ENV = process.env.NODE_ENV || "development";

import dotenv from "dotenv";
dotenv.config();
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import passport from "passport";
import apiRoutes from "./routes";
// import testMail from './util/mail'

import {
	aidCredits,
	cleanDemoAccounts,
	// cleanMarket,
	hourlyUpdate,
	promTurns,
	snapshot,
	thirtyMinUpdate,
	// updateRanks,
	// lotteryCheck,
} from "./jobs/promTurns";

import trim from "./middleware/trim";
import {
	ROUND_START,
	TURNS_FREQ,
	ROUND_END,
	AID_DELAY,
} from "./config/oldConifg";

const app = express();

Sentry.init({
	dsn: "https://31985fcd0be208efe31e249cf10b34f5@o4505988856676352.ingest.sentry.io/4505988959895552",
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
});

const PORT = process.env.PORT;
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(express.json());
app.use(morgan("dev"));
app.use(trim);
app.use(cookieParser());
app.use(
	cors({
		credentials: true,
		origin: process.env.ORIGIN,
		optionsSuccessStatus: 200,
	}),
);
app.use(express.static("public"));
app.use(passport.initialize());

app.get("/", (_, res) => res.send("hello world"));
app.get("/api/", (_, res) => res.send("hello api"));

app.get("/api/perpetual/hello", (req, res) => {
	console.log(req.url);
	res.send("hello perpetual");
});

app.use("/api", apiRoutes);

app.get("/debug-sentry", function mainHandler(req, res) {
	throw new Error("My first Sentry error!");
});

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
	// The error id is attached to `res.sentry` to be returned
	// and optionally displayed to the user for support.
	res.statusCode = 500;
	res.end(res.sentry + "\n");
});

app.listen(PORT, async () => {
	console.log(`server running at http://localhost:${PORT}`);

	try {
		let connection = await createConnection();
		// console.log(connection)
		console.log("database connected");
	} catch (err) {
		console.log(err);
	}
});

function checkTime() {
	const now = new Date().getTime();
	if (
		now > new Date(ROUND_START).getTime() &&
		now < new Date(ROUND_END).getTime()
	) {
		return true;
	}
	return false;
}

if (process.env.NODE_ENV === "development") {
	let gameOn = false;

	gameOn = checkTime();

	// console.log(ROUND_START)
	console.log(gameOn);

	const checkTimeTask = new AsyncTask("check time", async () => {
		// console.log(gameOn)
		let now = new Date().getTime();
		// console.log('checking time')
		// console.log(now)
		// console.log('start', new Date(ROUND_START).getTime())
		// console.log('end', new Date(ROUND_END).getTime())
		// console.log('check time', gameActive.getStatus())
		// console.log('turns', turns.getStatus())
		if (
			now >= new Date(ROUND_START).getTime() &&
			now <= new Date(ROUND_END).getTime()
		) {
			// console.log('game is on')
			gameOn = true;
			if (turns.getStatus() !== "running") {
				scheduler.startById("id_10");
			}
			if (thirtyMin.getStatus() !== "running") {
				scheduler.startById("id_5");
			}
			if (snaps.getStatus() !== "running") {
				scheduler.startById("id_3");
			}
			if (hourly.getStatus() !== "running") {
				scheduler.startById("id_2");
			}
			if (daily.getStatus() !== "running") {
				scheduler.startById("id_4");
			}
			// if (cleanMarketJob.getStatus() !== 'running') {
			// 	scheduler.startById('id_6')
			// }
			if (aidJob.getStatus() !== "running") {
				scheduler.startById("id_7");
			}
			// if (checkLottery.getStatus() !== 'running') {
			// 	scheduler.startById('id_8')
			// }
		} else {
			// console.log('game is off')
			gameOn = false;
			if (turns.getStatus() === "running") {
				scheduler.stopById("id_10");
			}
			if (thirtyMin.getStatus() === "running") {
				scheduler.stopById("id_5");
			}
			if (snaps.getStatus() === "running") {
				scheduler.stopById("id_3");
			}
			if (hourly.getStatus() === "running") {
				scheduler.stopById("id_2");
			}
			if (daily.getStatus() === "running") {
				scheduler.stopById("id_4");
			}
			// if (cleanMarketJob.getStatus() === 'running') {
			// 	scheduler.stopById('id_6')
			// }
			if (aidJob.getStatus() === "running") {
				scheduler.stopById("id_7");
			}
			// if (checkLottery.getStatus() === 'running') {
			// 	scheduler.stopById('id_8')
			// }
		}
		// console.log(gameOn)
	});

	const gameActive = new SimpleIntervalJob(
		{ minutes: 1, runImmediately: true },
		checkTimeTask,
		"id_0",
	);

	const turns = new SimpleIntervalJob(
		{ minutes: 2, runImmediately: false },
		promTurns,
		"id_10",
	);

	// const cleanMarketJob = new SimpleIntervalJob(
	// 	{ minutes: 30, runImmediately: false },
	// 	cleanMarket,
	// 	'id_6'
	// )

	const thirtyMin = new SimpleIntervalJob(
		{
			minutes: 30,
			runImmediately: false,
		},
		thirtyMinUpdate,
		"id_5",
	);

	const snaps = new SimpleIntervalJob(
		{ minutes: 45, runImmediately: false },
		snapshot,
		"id_3",
	);

	const hourly = new SimpleIntervalJob(
		{ hours: 1, runImmediately: false },
		hourlyUpdate,
		"id_2",
	);

	const daily = new SimpleIntervalJob(
		{ minutes: 3, runImmediately: false },
		cleanDemoAccounts,
		"id_4",
	);

	const aidJob = new SimpleIntervalJob(
		{ hours: AID_DELAY / 60 / 60, runImmediately: false },
		aidCredits,
		"id_7",
	);

	// const checkLottery = new SimpleIntervalJob(
	// 	{ hours: 24, runImmediately: false },
	// 	lotteryCheck,
	// 	'id_8'
	// )

	const scheduler = new ToadScheduler();

	scheduler.addSimpleIntervalJob(snaps);
	scheduler.addSimpleIntervalJob(thirtyMin);
	scheduler.addSimpleIntervalJob(hourly);
	scheduler.addSimpleIntervalJob(daily);
	// scheduler.addSimpleIntervalJob(cleanMarketJob)
	scheduler.addSimpleIntervalJob(aidJob);
	scheduler.addSimpleIntervalJob(turns);
	// scheduler.addSimpleIntervalJob(checkLottery)
	scheduler.addSimpleIntervalJob(gameActive);
}
