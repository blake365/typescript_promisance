import type { Request, Response } from "express";
import { Router } from "express";
import Empire from "../entity/Empire";
import auth from "../middleware/auth";
import user from "../middleware/user";
import { Not } from "typeorm";
import EmpireEffect from "../entity/EmpireEffect";
import Clan from "../entity/Clan";
import bcrypt from "bcrypt";
import { createNewsEvent } from "../util/helpers";
import ClanRelation from "../entity/ClanRelation";
import { containsOnlySymbols } from "../services/actions/actions";
import { attachGame } from "../middleware/game";
import type Game from "../entity/Game";
import { language } from "../middleware/language";
import { translate, sendError } from "../util/translation";

const Filter = require("bad-words");
const filter = new Filter();

const createClan = async (req: Request, res: Response) => {
	let { clanName, clanPassword, empireId } = req.body;

	const game: Game = res.locals.game;
	const language = res.locals.language;
	// console.log(clanName, clanPassword, empireId)
	if (!containsOnlySymbols(clanName)) {
		clanName = filter.clean(clanName);
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});
		if (empire.clanId !== 0) {
			return sendError(res, 400)("clan.alreadyInClan", language);
		}

		if (empire.turnsUsed < game.turnsProtection) {
			return sendError(res, 400)("clan.underProtection", language);
		}

		const existingClan = await Clan.findOne({
			where: { clanName: clanName },
		});
		if (existingClan) {
			return sendError(res, 400)("clan.clanNameAlreadyExists", language);
		}

		const clanMembers = 1;
		const empireIdLeader = empireId;
		const game_id = game.game_id;
		let newClan: Clan = null;
		newClan = new Clan({
			clanName,
			clanPassword,
			clanMembers,
			empireIdLeader,
			game_id,
		});

		await newClan.save();

		empire.clanId = newClan.id;
		await empire.save();

		// create effect
		const empireEffectName = "join clan";
		const empireEffectValue = game.clanMinJoin * 60;
		const effectOwnerId = empire.id;

		const newEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		});
		// console.log(effect)
		await newEffect.save();

		return res.json(empire);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const joinClan = async (req: Request, res: Response) => {
	const { clanName, clanPassword, empireId } = req.body;

	const game: Game = res.locals.game;
	const language = res.locals.language;
	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: "leave clan" },
			order: { createdAt: "DESC" },
		});

		const now = new Date();
		let timeLeft = 0;

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000;
			timeLeft = effect.empireEffectValue - effectAge;
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge);
		}

		if (timeLeft > 0) {
			return sendError(res, 400)("clan.leaveCooldown", language);
		}

		if (empire.turnsUsed < game.turnsProtection) {
			return sendError(res, 400)("clan.cannotJoinClanWhileProtected", language);
		}

		if (empire.clanId !== 0) {
			return sendError(res, 400)("clan.alreadyInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { clanName },
		});

		const passwordMatches = await bcrypt.compare(
			clanPassword,
			clan.clanPassword,
		);

		if (!passwordMatches) {
			return sendError(res, 401)("auth.passwordIncorrect", language);
		}

		if (clan.clanMembers >= game.clanSize) {
			return sendError(res, 400)("clan.clanFull", language);
		}

		clan.clanMembers++;
		await clan.save();

		empire.clanId = clan.id;
		await empire.save();

		// create effect
		const empireEffectName = "join clan";
		const empireEffectValue = game.clanMinJoin * 60;
		const effectOwnerId = empire.id;

		const newEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		});
		// console.log(effect)
		await newEffect.save();

		return res.json(empire);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const leaveClan = async (req: Request, res: Response) => {
	const { empireId } = req.body;

	const game: Game = res.locals.game;
	const language = res.locals.language;

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: "join clan" },
			order: { createdAt: "DESC" },
		});

		const now = new Date();
		let timeLeft = 0;

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000;
			timeLeft = effect.empireEffectValue - effectAge;
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge);
		}

		if (timeLeft > 0) {
			return sendError(res, 400)("clan.leaveCooldown", language, {
				hours: game.clanMinJoin,
			});
		}

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader === empire.id) {
			return sendError(res, 400)("clan.leaderCannotLeave", language);
		}

		clan.clanMembers--;
		await clan.save();

		empire.clanId = 0;
		await empire.save();

		// create effect
		const empireEffectName = "leave clan";
		const empireEffectValue = game.clanMinRejoin * 60;
		const effectOwnerId = empire.id;

		const newEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		});
		// console.log(effect)
		await newEffect.save();

		return res.json(empire);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const disbandClan = async (req: Request, res: Response) => {
	const { empireId, clanId } = req.body;

	const game: Game = res.locals.game;
	const language = res.locals.language;

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		const effect = await EmpireEffect.findOne({
			where: { effectOwnerId: empire.id, empireEffectName: "join clan" },
			order: { createdAt: "DESC" },
		});

		const now = new Date();
		let timeLeft = 0;

		if (effect) {
			let effectAge =
				(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000;
			timeLeft = effect.empireEffectValue - effectAge;
			// age in minutes
			// console.log(effectAge)
			effectAge = Math.floor(effectAge);
		}

		if (timeLeft > 0) {
			return sendError(res, 400)("clan.disbandCooldown", language, {
				hours: game.clanMinJoin,
			});
		}

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader !== empire.id) {
			return sendError(res, 400)("clan.notLeader", language);
		}

		const members = await Empire.find({
			where: { clanId: clanId },
		});

		await clan.remove();

		for (const member of members) {
			member.clanId = 0;
			await member.save();
		}

		// create effect
		const empireEffectName = "leave clan";
		const empireEffectValue = game.clanMinRejoin * 60;
		const effectOwnerId = empire.id;

		const newEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		});
		// console.log(effect)
		await newEffect.save();

		return res.json(empire);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const kickFromClan = async (req: Request, res: Response) => {
	const { empireId } = req.body;

	const game: Game = res.locals.game;
	const language = res.locals.language;
	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader === empire.id) {
			return sendError(res, 400)("clan.cannotKickLeader", language);
		}

		if (clan.empireIdAssistant === empire.id) {
			clan.empireIdAssistant = 0;
		}

		clan.clanMembers--;
		await clan.save();

		empire.clanId = 0;
		await empire.save();

		// create effect
		const empireEffectName = "leave clan";
		const empireEffectValue = game.clanMinRejoin * 60;
		const effectOwnerId = empire.id;

		const newEffect: EmpireEffect = new EmpireEffect({
			effectOwnerId,
			empireEffectName,
			empireEffectValue,
		});
		// console.log(effect)
		await newEffect.save();

		const pubContent = {
			key: "clan.kickedPublic",
			params: {
				empireName: empire.name,
				clanName: clan.clanName,
			},
		};
		const content = {
			key: "clan.kickedPrivate",
			params: {
				clanName: clan.clanName,
			},
		};

		await createNewsEvent(
			content,
			pubContent,
			clan.empireIdLeader,
			clan.clanName,
			empire.id,
			empire.name,
			"clan",
			"fail",
			empire.game_id,
		);

		return res.json(empire);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const getClan = async (req: Request, res: Response) => {
	const { clanId } = req.body;

	try {
		const clan = await Clan.find({
			select: [
				"id",
				"clanName",
				"clanTitle",
				"clanMembers",
				"clanPic",
				"empireIdLeader",
				"empireIdAssistant",
				"empireIdAgent1",
				"empireIdAgent2",
				"enemies",
				"peaceOffer",
				"clanTag",
			],
			where: { id: clanId },
			relations: ["relation"],
		});

		// console.log(clan)
		return res.json(clan);
	} catch (err) {
		console.log(err);
		return res
			.status(500)
			.json({ error: "Something went wrong when getting clan" });
	}
};

const getClanMembers = async (req: Request, res: Response) => {
	const { clanId } = req.body;
	// console.log(req.body)
	try {
		const empires = await Empire.find({
			where: { clanId },
			order: { networth: "DESC" },
		});

		// console.log(empires)
		return res.json(empires);
	} catch (err) {
		console.log(err);
		return res
			.status(500)
			.json({ error: "Something went wrong when getting clan members" });
	}
};

const getClans = async (req: Request, res: Response) => {
	const { gameId } = req.query;

	try {
		const clans = await Clan.find({
			select: ["id", "clanName", "clanTitle", "clanMembers", "clanPic"],
			where: { clanMembers: Not(0), game_id: gameId },
		});

		if (clans.length === 0) {
			return res.status(400).json({ error: "No clans found" });
		}

		return res.json(clans);
	} catch (err) {
		console.log(err);
		return res
			.status(500)
			.json({ error: "Something went wrong when getting clans" });
	}
};

const getClansData = async (req: Request, res: Response) => {
	const { gameId } = req.query;
	// console.log(gameId);
	try {
		const clans = await Clan.find({
			select: [
				"id",
				"clanName",
				"clanTitle",
				"clanMembers",
				"clanPic",
				"empireIdLeader",
				"empireIdAssistant",
				"empireIdAgent1",
				"empireIdAgent2",
				"enemies",
				"peaceOffer",
				"clanTag",
			],
			where: { clanMembers: Not(0), game_id: gameId },
			relations: ["relation"],
		});

		if (clans.length === 0) {
			return res.status(400).json({ error: "No clans found" });
		}

		const clanNetworths = await Promise.all(
			clans.map(async (clan) => {
				let avgNetworth = 0;
				let totalNetworth = 0;
				let leader = { name: "", id: 0 };
				const empires = await Empire.find({
					where: { clanId: clan.id },
				});

				for (const empire of empires) {
					totalNetworth += empire.networth;
					if (empire.id === clan.empireIdLeader) {
						leader = { name: empire.name, id: empire.id };
					}
				}

				avgNetworth = totalNetworth / clan.clanMembers;

				return { clan, avgNetworth, totalNetworth, leader };
			}),
		);

		return res.json(clanNetworths);
	} catch (err) {
		console.log(err);
		return res
			.status(500)
			.json({ error: "Something went wrong when getting clans" });
	}
};

// assign empire to clan role
const assignClanRole = async (req: Request, res: Response) => {
	const language = res.locals.language;
	const { empireId, clanRole, memberId } = req.body;

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const member = await Empire.findOneOrFail({
			where: { id: memberId },
		});

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader !== empire.id) {
			return sendError(res, 400)("clan.notLeaderAssignRole", language);
		}

		if (clan.empireIdAssistant !== 0) {
			return sendError(res, 400)("clan.alreadyAssigned", language);
		}

		if (clanRole === "leader") {
			clan.empireIdLeader = member.id;
		} else if (clanRole === "assistant") {
			clan.empireIdAssistant = member.id;
		} else if (clanRole === "agent1") {
			clan.empireIdAgent1 = member.id;
		} else if (clanRole === "agent2") {
			clan.empireIdAgent2 = member.id;
		} else {
			return res.status(400).json({ error: "Invalid role" });
		}

		await clan.save();

		return res.json(clan);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

// remove empire from clan role
const removeClanRole = async (req: Request, res: Response) => {
	const { empireId, clanRole } = req.body;
	const language = res.locals.language;
	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});
		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader !== empire.id) {
			return sendError(res, 400)("clan.notLeaderAssignRole", language);
		}

		if (clanRole === "leader") {
			clan.empireIdLeader = 0;
		} else if (clanRole === "assistant") {
			clan.empireIdAssistant = 0;
		} else if (clanRole === "agent1") {
			clan.empireIdAgent1 = 0;
		} else if (clanRole === "agent2") {
			clan.empireIdAgent2 = 0;
		} else {
			return res.status(400).json({ error: "Invalid role" });
		}

		await clan.save();

		return res.json(clan);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const declareWar = async (req: Request, res: Response) => {
	const { empireId, clanId, enemyClanId } = req.body;
	const language = res.locals.language;

	const game: Game = res.locals.game;
	// console.log(req.body)
	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ["relation"],
		});

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
			relations: ["relation"],
		});

		const enemyLeader = await Empire.findOneOrFail({
			where: { id: enemyClan.empireIdLeader },
		});

		if (
			clan.empireIdLeader !== empire.id &&
			clan.empireIdAssistant !== empire.id
		) {
			return sendError(res, 400)("clan.cantDeclareWar", language);
		}

		// console.log(clan.relation)

		const relations = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === "war") {
				return relation.c_id2;
			}
		});

		// console.log(enemyClan.relation)

		const enemyRelations = enemyClan.relation.map((relation) => {
			if (relation.clanRelationFlags === "war") {
				return relation.c_id2;
			}
		});

		if (relations.includes(enemyClanId) || enemyRelations.includes(clanId)) {
			return sendError(res, 400)("clan.alreadyAtWar", language);
		}

		const myClanRelation = new ClanRelation({
			c_id1: clanId,
			clan1Name: clan.clanName,
			c_id2: enemyClanId,
			clan2Name: enemyClan.clanName,
			clanRelationFlags: "war",
			clan: clan,
			game_id: game.game_id,
		});

		const enemyClanRelation = new ClanRelation({
			c_id1: enemyClanId,
			clan1Name: enemyClan.clanName,
			c_id2: clanId,
			clan2Name: clan.clanName,
			clanRelationFlags: "war",
			clan: enemyClan,
			game_id: game.game_id,
		});

		await myClanRelation.save();
		await enemyClanRelation.save();

		const pubContent = {
			key: "clan.warDeclaredPublic",
			params: {
				clanName: clan.clanName,
				enemyClanName: enemyClan.clanName,
			},
		};
		const content = {
			key: "clan.warDeclaredPrivate",
			params: {
				clanName: clan.clanName,
			},
		};

		await createNewsEvent(
			content,
			pubContent,
			empireId,
			empire.name,
			enemyClan.empireIdLeader,
			enemyLeader.name,
			"war",
			"success",
			empire.game_id,
		);

		return res.json(clan);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const offerPeace = async (req: Request, res: Response) => {
	const { empireId, clanId, enemyClanId } = req.body;
	const language = res.locals.language;
	const game: Game = res.locals.game;
	// console.log(req.body)

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
			relations: ["relation"],
		});

		const enemyClan = await Clan.findOneOrFail({
			where: { id: enemyClanId },
			relations: ["relation"],
		});

		const enemyLeader = await Empire.findOneOrFail({
			where: { id: enemyClan.empireIdLeader },
		});

		if (
			clan.empireIdLeader !== empire.id &&
			clan.empireIdAssistant !== empire.id
		) {
			return sendError(res, 400)("clan.cannotOfferPeace", language);
		}

		// check if you are at war
		// check if you have already offered peace
		// check if enemy has already offered peace
		const myWarRelation = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === "war") {
				return relation.c_id2;
			}
		});

		const myPeaceOffer = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === "peace") {
				return relation.c_id2;
			}
		});

		const enemyPeaceOffer = enemyClan.relation.map((relation) => {
			if (relation.clanRelationFlags === "peace") {
				return relation.c_id2;
			}
		});

		if (!myWarRelation.includes(enemyClanId)) {
			return sendError(res, 400)("clan.notAtWar", language);
		}

		if (myPeaceOffer.includes(enemyClanId)) {
			// already offered peace
			return sendError(res, 400)("clan.alreadyOfferedPeace", language);
		}

		console.log(enemyPeaceOffer);
		console.log(myPeaceOffer);
		console.log(myWarRelation);

		if (enemyPeaceOffer.includes(clanId)) {
			// peace has been offered by other clan, you are accepting peace, remove from enemies
			for (const relation of clan.relation) {
				if (
					relation.c_id2 === enemyClanId &&
					relation.clanRelationFlags === "war"
				) {
					await relation.remove();
				}
			}

			for (const relation of enemyClan.relation) {
				if (relation.c_id2 === clanId && relation.clanRelationFlags === "war") {
					await relation.remove();
				} else if (
					relation.c_id2 === clanId &&
					relation.clanRelationFlags === "peace"
				) {
					await relation.remove();
				}
			}
			// peace news event
			const content = {
				key: "clan.peaceAcceptedPrivate",
				params: {
					clanName: clan.clanName,
				},
			};
			const pubContent = {
				key: "clan.peaceAcceptedPublic",
				params: {
					clanName: clan.clanName,
					enemyClanName: enemyClan.clanName,
				},
			};

			await createNewsEvent(
				content,
				pubContent,
				empireId,
				empire.name,
				enemyClan.empireIdLeader,
				enemyLeader.name,
				"peace",
				"success",
				empire.game_id,
			);
		} else if (myWarRelation.includes(enemyClanId)) {
			// you are at war and have not offered peace yet, first offer
			const myClanRelation = new ClanRelation({
				c_id1: clanId,
				clan1Name: clan.clanName,
				c_id2: enemyClanId,
				clan2Name: enemyClan.clanName,
				clanRelationFlags: "peace",
				clan: clan,
				game_id: game.game_id,
			});

			await myClanRelation.save();
			// peace is offered by one side
			const content = {
				key: "clan.peaceOfferedPrivate",
				params: {
					clanName: clan.clanName,
				},
			};
			const pubContent = {
				key: "clan.peaceOfferedPublic",
				params: {
					clanName: clan.clanName,
					enemyClanName: enemyClan.clanName,
				},
			};

			await createNewsEvent(
				content,
				pubContent,
				empireId,
				empire.name,
				enemyClan.empireIdLeader,
				enemyLeader.name,
				"peace",
				"shielded",
				empire.game_id,
			);
		}

		return res.json(clan);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const setClanTag = async (req: Request, res: Response) => {
	let { empireId, clanTag } = req.body;
	const language = res.locals.language;

	if (!containsOnlySymbols(clanTag)) {
		clanTag = filter.clean(clanTag);
	}

	if (clanTag.includes("**")) {
		return sendError(res, 400)("clan.profaneClanTag", language);
	}

	try {
		const empire = await Empire.findOneOrFail({
			where: { id: empireId },
		});

		if (empire.clanId === 0) {
			return sendError(res, 400)("clan.notInClan", language);
		}

		const clan = await Clan.findOneOrFail({
			where: { id: empire.clanId },
		});

		if (clan.empireIdLeader !== empire.id) {
			return sendError(res, 400)("clan.notClanLeader", language);
		}

		clan.clanTag = clanTag;
		await clan.save();

		return res.json(clan);
	} catch (err) {
		console.log(err);
		return sendError(res, 500)("generic", language);
	}
};

const router = Router();

router.post("/create", user, auth, language, attachGame, createClan);
router.post("/join", user, auth, language, attachGame, joinClan);
router.post("/leave", user, auth, language, attachGame, leaveClan);
router.post("/disband", user, auth, language, attachGame, disbandClan);
router.post("/kick", user, auth, language, attachGame, kickFromClan);
router.post("/get", user, auth, getClan);
router.post("/getMembers", user, auth, getClanMembers);
router.get("/getClans", getClans);
router.get("/getClansData", getClansData);
router.post("/assignRole", user, auth, language, assignClanRole);
router.post("/removeRole", user, auth, language, removeClanRole);
router.post("/declareWar", user, auth, language, attachGame, declareWar);
router.post("/offerPeace", user, auth, language, attachGame, offerPeace);
router.post("/setTag", user, auth, language, setClanTag);

export default router;
