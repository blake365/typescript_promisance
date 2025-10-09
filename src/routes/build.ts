import { Router } from "express";
import type { Request, Response } from "express";
import { raceArray } from "../config/races";
import Empire from "../entity/Empire";
import Clan from "../entity/Clan";
import { useTurnInternal } from "./useturns";
import user from "../middleware/user";
import auth from "../middleware/auth";
import { calcSizeBonus, calcSizeFactors } from "../services/actions/actions";
import { takeSnapshot } from "../services/actions/snaps";
import { attachGame } from "../middleware/game";
import type Game from "../entity/Game";
import { updateEmpire } from "../services/actions/updateEmpire";
import { getServerStats } from "../services/game/serverStats";

// FIXED?: created new turn function for use in loops that is not async use returned values to update empire

const getBuildAmounts = async (empire: Empire, cost: number, gameId: number) => {
	// Get server statistics for balanced calculations
	const serverStats = await getServerStats(gameId);
	const sizeFactors = calcSizeFactors(empire, serverStats.medianNetworth, serverStats.dayOfRound);

	// Apply expansion difficulty instead of raw size
	let buildCost = Math.round((cost + empire.land * 0.3) * sizeFactors.expansionDifficulty);

	let buildRate = Math.round(empire.land * 0.015 + 4);

	buildRate = Math.round(
		((100 + raceArray[empire.race].mod_buildrate) / 100) * buildRate,
	);

	let canBuild = Math.min(
		Math.floor(empire.cash / buildCost),
		buildRate * empire.turns,
		empire.freeLand,
	);

	return { canBuild, buildRate, buildCost };
};

const build = async (req: Request, res: Response) => {
	// request will have object with type of building and number to build
	const {
		type,
		empireId,
		bldCash,
		bldPop,
		bldCost,
		bldDef,
		bldFood,
		bldTroop,
		bldWiz,
	} = req.body;

	const game: Game = res.locals.game;

	if (type !== "build") {
		return res.status(400).json({ error: "Invalid type", code: "INVALID_TYPE" });
	}

	const empire = await Empire.findOne({ id: empireId });
	if (!empire) {
		return res.status(404).json({ error: "Empire not found", code: "EMPIRE_NOT_FOUND" });
	}

	let clan = null;
	if (empire.clanId !== 0) {
		clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ["relation"],
		});
	}

	const { canBuild, buildRate, buildCost } = await getBuildAmounts(
		empire,
		game.buildCost,
		game.game_id
	);

	let buildTotal =
		bldCash + bldPop + bldCost + bldDef + bldFood + bldTroop + bldWiz;

	if (buildTotal > canBuild) {
		const maxByCash = Math.floor(empire.cash / buildCost);
		const maxByTurns = buildRate * empire.turns;
		const maxByLand = empire.freeLand;
		console.warn('[BUILD] Request exceeds limits', {
			empireId,
			requested: buildTotal,
			maxByCash,
			maxByTurns,
			maxByLand,
			buildRate,
			buildCost,
			cash: empire.cash,
			turns: empire.turns,
			freeLand: empire.freeLand,
		});
		return res.status(400).json({
			error: "Requested buildings exceed available limits",
			code: "REQUEST_EXCEEDS_LIMITS",
			details: { requested: buildTotal, maxByCash, maxByTurns, maxByLand },
		});
	}

	// console.log(buildRate)
	// console.log(buildTotal)

	let buildArray = [
		{ bldCash: bldCash },
		{ bldPop: bldPop },
		{ bldCost: bldCost },
		{ bldDef: bldDef },
		{ bldFood: bldFood },
		{ bldTroop: bldTroop },
		{ bldWiz: bldWiz },
	];

	// console.log(buildArray)
	buildArray = buildArray.filter((object) => Object.values(object)[0] > 0);

	// Calculate the exact number of turns required across all categories
	// Using per-category ceiling prevents underestimating turns when splitting builds
	const requiredTurns = buildArray.reduce((sum, obj) => {
		const value: number = Object.values(obj)[0] as number;
		return sum + Math.ceil(value / buildRate);
	}, 0);

	const buildLoop = async () => {
		try {
			if (requiredTurns > empire.turns) {
				return [{ error: "Not enough turns", code: "NOT_ENOUGH_TURNS", requiredTurns, availableTurns: empire.turns }];
			}
			let resultArray = [];
			for (let i = 0; i < buildArray.length; i++) {
				// console.log(buildArray[i])
				let key: string = Object.keys(buildArray[i])[0];
				let value: number = Object.values(buildArray[i])[0];
				let turns = 0;
				if (value < buildRate) {
					turns = 1;
				} else {
					turns = Math.ceil(value / buildRate);
				}
				// console.log(turns)
				let leftToBuild = value;
				for (let i = 0; i < turns; i++) {
					// console.log(`build ${value} of ${key}s`)
					let buildAmount: number;
					if (leftToBuild < buildRate) {
						buildAmount = leftToBuild;
					} else {
						buildAmount = buildRate;
					}
					// use one turn
					let oneTurn = useTurnInternal("build", 1, empire, clan, true, game);
					// console.log(oneTurn)
					let turnRes = oneTurn[0];
					// Detect both wrapped and direct error responses from the turn function
					if (turnRes?.messages?.error || turnRes?.error) {
						resultArray.push(turnRes);
						break;
					} else if (!turnRes?.messages?.desertion) {
						// console.log(turnRes)

						empire.cash -= buildAmount * buildCost;
						empire[key] += buildAmount;
						empire.freeLand -= buildAmount;
						leftToBuild -= buildAmount;

						await updateEmpire(empire, turnRes, 1, game);
						// extract turn info from result and put individual object in result array
						resultArray.push(turnRes);
					} else {
						// add value to empire.key
						await updateEmpire(empire, turnRes, 1, game);
						resultArray.push(turnRes);

						break;
					}
				}
			}
			// console.log(resultArray)
			// await awardAchievements(empire)
			// console.log(achievementResult)
			await takeSnapshot(empire, game.turnsProtection);
			return resultArray;
		} catch (err) {
			console.log(err);
		}
	};

	let returnArray = await buildLoop();

	// If buildLoop returned an error shape, surface as a 400 with details
	if (
		Array.isArray(returnArray) &&
		returnArray.length > 0 &&
		(returnArray[0]?.error || returnArray.some((r) => r?.messages?.error))
	) {
		const firstErr = returnArray.find((r) => r?.error) || returnArray.find((r) => r?.messages?.error);
		console.warn('[BUILD] Build failed', { empireId, error: firstErr });
		return res.status(400).json(firstErr);
	}

	return res.json(returnArray);
};

const router = Router();

// needs user and auth middleware
router.post("/", user, auth, attachGame, build);

export default router;
