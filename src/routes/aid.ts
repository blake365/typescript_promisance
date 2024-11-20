import type { Request, Response } from "express";
import { Router } from "express";
import Empire from "../entity/Empire";
import auth from "../middleware/auth";
import user from "../middleware/user";
import { useTurnInternal } from "./useturns";
import Clan from "../entity/Clan";
import { eraArray } from "../config/eras";
import { createNewsEvent } from "../util/helpers";
import { getNetworth } from "../services/actions/actions";
import { takeSnapshot } from "../services/actions/snaps";
import { updateEmpire } from "../services/actions/updateEmpire";
import { attachGame } from "../middleware/game";
import { language } from "../middleware/language";
import { translate, sendError } from "../util/translation";

// send aid to another empire
const sendAid = async (req: Request, res: Response) => {
	const {
		empireId,
		receiverId,
		cash,
		food,
		runes,
		trpArm,
		trpLnd,
		trpSea,
		trpFly,
		type,
	} = req.body;
	const game = res.locals.game;

	console.log(res.locals.language);
	const language = res.locals.language;

	// if all the values are 0, return
	if (!cash && !food && !runes && !trpArm && !trpLnd && !trpSea && !trpFly) {
		return sendError(res, 400)("aid.nothingToSend", language);
	}

	if (type !== "aid") {
		return sendError(res, 400)("generic", language);
	}

	const items = [
		"cash",
		"food",
		"runes",
		"trpArm",
		"trpLnd",
		"trpFly",
		"trpSea",
	];

	// console.log(sentItems)

	const turns = 2;
	const resultArray = [];

	try {
		const sender = await Empire.findOneOrFail({ id: empireId });
		const receiver = await Empire.findOneOrFail({ id: receiverId });

		if (sender.game_id !== receiver.game_id) {
			return sendError(res, 401)("unauthorized", language);
		}

		let shipsNeeded = Math.round(sender.trpSea * 0.02);
		if (shipsNeeded < 10000) {
			shipsNeeded = 10000;
		}

		if (sender.trpSea < shipsNeeded) {
			return sendError(res, 400)("aid.notEnoughShips", language);
		}

		if (sender.id === receiver.id) {
			return sendError(res, 400)("aid.cannotSendAidToSelf", language);
		}

		if (sender.aidCredits < 1) {
			return sendError(res, 400)("aid.notEnoughAidCredits", language);
		}

		if (sender.mode === "demo" || receiver.mode === "demo") {
			return sendError(res, 400)("aid.cannotSendAidAsDemo", language);
		}

		if (
			sender.turnsUsed < game.turnsProtection ||
			receiver.turnsUsed < game.turnsProtection
		) {
			return sendError(res, 400)(
				"aid.cannotSendAidWhileInProtection",
				language,
			);
		}

		let clan = null;
		if (sender.clanId !== 0) {
			clan = await Clan.findOneOrFail({
				where: { id: sender.clanId },
				relations: ["relation"],
			});

			console.log(clan.relation);
			const relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === "war") {
					return relation.c_id2;
				}
			});
			// check if clan is at war
			if (relations.includes(receiver.clanId)) {
				// console.log("clan is at war");
				// clan is at war with receiver
				return sendError(res, 400)("aid.cannotSendAidToWarClan", language);
			}
		}

		if (
			receiver.networth > sender.networth * 2 &&
			receiver.clanId !== sender.clanId
		) {
			return sendError(res, 400)("aid.cannotSendAidToLargeEmpire", language);
		}

		const sentItems = items
			.map((item) => {
				return {
					name: item,
					value: req.body[item],
				};
			})
			.filter(
				(item) => item.value > 0 && item.value <= sender[item.name] * 0.15,
			);

		let aidTurns = useTurnInternal("aid", turns, sender, clan, true, game);
		const spellRes = aidTurns[0];
		// console.log('spell res', spellRes)
		aidTurns = aidTurns[0];
		if (!spellRes?.messages?.desertion) {
			// remove items from sender
			sender.cash -= cash;
			sender.food -= food;
			sender.runes -= runes;
			sender.trpArm -= trpArm;
			sender.trpLnd -= trpLnd;
			sender.trpSea -= trpSea;
			sender.trpFly -= trpFly;
			sender.aidCredits -= 1;
			sender.trpSea -= shipsNeeded;

			// add items to receiver
			receiver.cash += cash;
			receiver.food += food;
			receiver.runes += runes;
			receiver.trpArm += trpArm;
			receiver.trpLnd += trpLnd;
			receiver.trpSea += trpSea;
			receiver.trpFly += trpFly;
			receiver.trpSea += shipsNeeded;

			receiver.networth = getNetworth(receiver, game);

			if (receiver.peakCash < receiver.cash + receiver.bank) {
				receiver.peakCash = receiver.cash + receiver.bank;
			}
			if (receiver.peakFood < receiver.food) {
				receiver.peakFood = receiver.food;
			}
			if (receiver.peakRunes < receiver.runes) {
				receiver.peakRunes = receiver.runes;
			}
			if (receiver.peakNetworth < receiver.networth) {
				receiver.peakNetworth = receiver.networth;
			}
			if (receiver.peakTrpArm < receiver.trpArm) {
				receiver.peakTrpArm = receiver.trpArm;
			}
			if (receiver.peakTrpLnd < receiver.trpLnd) {
				receiver.peakTrpLnd = receiver.trpLnd;
			}
			if (receiver.peakTrpFly < receiver.trpFly) {
				receiver.peakTrpFly = receiver.trpFly;
			}
			if (receiver.peakTrpSea < receiver.trpSea) {
				receiver.peakTrpSea = receiver.trpSea;
			}

			await receiver.save();
			await takeSnapshot(receiver, game.turnsProtection);

			aidTurns["aid"] = translate("responses:aid.shipmentSuccess", language);

			const pubContent = {
				key: "news.aid.public",
				params: {
					sender: sender.name,
					receiver: receiver.name,
				},
			};

			const sentString = sentItems.map((item) => {
				if (item.name === "cash") {
					return `$${item.value.toLocaleString()}`;
				}
				return `${item.value.toLocaleString()} ${
					eraArray[receiver.era][item.name.toLowerCase()]
				}`;
			});

			const content = {
				key: "news.aid.private",
				params: {
					sender: sender.name,
					items: sentString.join(", "),
				},
			};

			// console.log('content', content)
			await createNewsEvent(
				content,
				pubContent,
				sender.id,
				sender.name,
				receiver.id,
				receiver.name,
				"aid",
				"success",
				sender.game_id,
			);
		} else {
			aidTurns["aid"] = translate("responses:aid.shipmentFailed", language);
		}

		await updateEmpire(sender, aidTurns, turns, game);

		resultArray.push(aidTurns);

		// await awardAchievements(sender)
		await takeSnapshot(sender, game.turnsProtection);
	} catch (err) {
		console.log(err);
		return sendError(res, 400)("generic", language);
	}

	// console.log('result array', resultArray)
	return res.json(resultArray);
	// createNewsEvent()
};

const router = Router();

router.post("/", user, auth, language, attachGame, sendAid);

export default router;
