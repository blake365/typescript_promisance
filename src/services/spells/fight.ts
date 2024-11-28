import { eraArray } from "../../config/eras";
import Empire from "../../entity/Empire";
import {
	getPower_enemy,
	getWizLoss_enemy,
	getPower_self,
	randomIntFromInterval,
} from "./general";
import { createNewsEvent } from "../../util/helpers";
import { getNetworth } from "../actions/actions";
import { getRepository } from "typeorm";
import type Game from "../../entity/Game";
import EmpireEffect from "../../entity/EmpireEffect";
import { translate } from "../../util/translation";

export const fight_cost = (baseCost: number) => {
	return Math.ceil(27.5 * baseCost);
};

const destroyBuildings = async (
	type: string,
	pcloss: number,
	enemyEmpire: Empire,
) => {
	pcloss *= 0.66;
	let loss = 0;

	if (enemyEmpire[type] > 0) {
		console.log(enemyEmpire[type]);
		loss = randomIntFromInterval(
			enemyEmpire[type] * 0.01,
			Math.ceil(pcloss * enemyEmpire[type] + 2),
		);
		if (loss > enemyEmpire[type]) {
			loss = enemyEmpire[type];
		}
	}

	enemyEmpire[type] -= loss;
	await enemyEmpire.save();

	return loss;
};

export const fight_cast = async (
	empire: Empire,
	enemyEmpire: Empire,
	clan,
	turnsProtection: number,
	drRate: number,
	game: Game,
	points: number,
	language: string,
) => {
	let war = false;
	if (clan) {
		const relations = clan.relation.map((relation) => {
			if (relation.clanRelationFlags === "war") {
				return relation.c_id2;
			}
		});
		// check if clan is at war
		if (relations.includes(enemyEmpire.clanId)) {
			// console.log('clan is at war')
			// clan is at war with defender
			war = true;
		}
	}

	// console.log(totalLand, empireCount)
	// console.log(avgLand)

	if (getPower_self(empire) < 50) {
		// spell failed to cast
		const wizloss = getWizLoss_enemy(empire);
		const result = {
			result: "fail",
			message: translate("responses:spells.fail", language, {
				trpwiz: eraArray[empire.era].trpwiz,
				spell: eraArray[empire.era].spell_fight,
			}),
			wizloss: wizloss,
			descriptor: eraArray[empire.era].trpwiz,
		};

		empire.offTotal++;
		await empire.save();

		return result;
	}

	if (getPower_enemy(empire, enemyEmpire) >= 2.2) {
		let returnText = "";
		// spell casts successfully
		const now = new Date();
		let avgLand = 1;
		if (!game.scoreEnabled) {
			const { totalLand, empireCount } = await getRepository(Empire)
				.createQueryBuilder("empire")
				.select("SUM(empire.land)", "totalLand")
				.addSelect("COUNT(empire.id)", "empireCount")
				.where("empire.turnsUsed > :turnsUsed AND empire.mode != :demo", {
					turnsUsed: turnsProtection,
					demo: "demo",
				})
				.getRawOne();

			// console.log(totalLand, empireCount)
			avgLand = totalLand / empireCount;
		}

		const landCutoff = 10000;
		let aboveCutoff = false;
		let defeated = false;
		if (game.scoreEnabled) {
			if (enemyEmpire.land >= landCutoff) {
				aboveCutoff = true;
			}

			const effect = await EmpireEffect.findOne({
				where: {
					effectOwnerId: enemyEmpire.id,
					empireEffectName: "defeated",
				},
				order: { updatedAt: "DESC" },
			});

			let timeLeft = 0;
			if (effect) {
				let effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000;
				timeLeft = effect.empireEffectValue - effectAge;
				// age in minutes
				effectAge = Math.floor(effectAge);
				if (timeLeft > 0) {
					aboveCutoff = false;
					defeated = true;
					returnText +=
						"This empire has been recently defeated, no points will be given...";
				}
			}
		}

		let uloss = randomIntFromInterval(0, Math.round(empire.trpWiz * 0.05 + 1));
		let eloss = randomIntFromInterval(
			0,
			Math.round(enemyEmpire.trpWiz * 0.07 + 1),
		);

		if (uloss > empire.trpWiz) {
			uloss = empire.trpWiz;
		}
		if (eloss > 50 * uloss) {
			eloss = randomIntFromInterval(0, 50 * uloss + 1);
		}
		if (eloss > enemyEmpire.trpWiz) {
			eloss = enemyEmpire.trpWiz;
		}

		empire.trpWiz -= uloss;
		enemyEmpire.trpWiz -= eloss;

		let lowLand = 1;
		if (
			enemyEmpire.land < avgLand * 0.75 &&
			empire.land > enemyEmpire.land * 2 &&
			empire.land > avgLand &&
			!war
		) {
			// the defender is being "low landed"
			returnText += translate("responses:spells.lowLand", language, {
				trpwiz: eraArray[empire.era].trpwiz,
			});
			lowLand = 0.5;
		}

		let bldLoss = 0;
		bldLoss += await destroyBuildings("bldCash", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldPop", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldTroop", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldCost", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldFood", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldWiz", 0.07 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("bldDef", 0.11 * lowLand, enemyEmpire);
		bldLoss += await destroyBuildings("freeLand", 0.1 * lowLand, enemyEmpire);

		enemyEmpire.land -= bldLoss;
		empire.land += bldLoss;
		empire.freeLand += bldLoss;
		empire.attackGains += bldLoss;
		enemyEmpire.attackLosses += bldLoss;
		empire.attacks++;
		empire.offSucc++;
		empire.offTotal++;
		enemyEmpire.defTotal++;
		enemyEmpire.diminishingReturns =
			enemyEmpire.diminishingReturns + drRate / lowLand;
		enemyEmpire.networth = getNetworth(enemyEmpire, game);

		if (empire.diminishingReturns > 0) {
			empire.diminishingReturns -= drRate;
		}

		if (empire.diminishingReturns < 0) {
			empire.diminishingReturns = 0;
		}

		returnText += translate("responses:spells.fightSuccess", language, {
			acres: bldLoss.toLocaleString(),
			defenderName: enemyEmpire.name,
			ewizloss: eloss.toLocaleString(),
			etrpwiz: eraArray[enemyEmpire.era].trpwiz,
			wizloss: uloss.toLocaleString(),
			trpwiz: eraArray[empire.era].trpwiz,
		});

		const attackDescription = {
			result: "success",
			message: returnText,
			wizloss: uloss,
			fight: true,
		};

		const content = {
			key: "spells.fight.successPrivate",
			params: {
				attacker: empire.name,
				unitType: eraArray[empire.era].trpwiz,
				landCaptured: bldLoss.toLocaleString(),
				losses: eloss.toLocaleString(),
				defenderUnitType: eraArray[enemyEmpire.era].trpwiz,
				kills: uloss.toLocaleString(),
				attackerUnitType: eraArray[empire.era].trpwiz,
			},
		};

		const pubContent = {
			key: "spells.fight.successPublic",
			params: {
				attacker: empire.name,
				defender: enemyEmpire.name,
				unitType: eraArray[empire.era].trpwiz,
				landCaptured: bldLoss.toLocaleString(),
				defenderLosses: eloss.toLocaleString(),
				defenderUnitType: eraArray[enemyEmpire.era].trpwiz,
				attackerLosses: uloss.toLocaleString(),
				attackerUnitType: eraArray[empire.era].trpwiz,
			},
		};

		await createNewsEvent(
			content,
			pubContent,
			empire.id,
			empire.name,
			enemyEmpire.id,
			enemyEmpire.name,
			"spell",
			"fail", // defense fails
			empire.game_id,
		);

		if (game.scoreEnabled) {
			empire.score += points;
			if (enemyEmpire.land < landCutoff && aboveCutoff && !defeated) {
				empire.score += 100;

				let effect: EmpireEffect = null;
				effect = new EmpireEffect({
					effectOwnerId: enemyEmpire.id,
					empireEffectName: "defeated",
					empireEffectValue: 12960,
				});
				await effect.save();
			}
		}

		await empire.save();
		await enemyEmpire.save();

		return attackDescription;
	}

	// spell casts but attack fails
	let uloss = randomIntFromInterval(0, Math.round(empire.trpWiz * 0.08 + 1));
	let eloss = randomIntFromInterval(
		0,
		Math.round(enemyEmpire.trpWiz * 0.04 + 1),
	);

	if (uloss > empire.trpWiz) {
		uloss = empire.trpWiz;
	}
	if (eloss > 50 * uloss) {
		eloss = randomIntFromInterval(0, 50 * uloss + 1);
	}
	if (eloss > enemyEmpire.trpWiz) {
		eloss = enemyEmpire.trpWiz;
	}

	empire.trpWiz -= uloss;
	enemyEmpire.trpWiz -= eloss;

	empire.offTotal++;
	enemyEmpire.defTotal++;
	enemyEmpire.defSucc++;
	enemyEmpire.diminishingReturns = enemyEmpire.diminishingReturns + drRate;
	if (empire.diminishingReturns > 0) {
		empire.diminishingReturns -= drRate;
	}

	if (empire.diminishingReturns < 0) {
		empire.diminishingReturns = 0;
	}

	const returnText = translate("responses:spells.fightFail", language, {
		defenderName: enemyEmpire.name,
		eloss: eloss.toLocaleString(),
		etrpwiz: eraArray[enemyEmpire.era].trpwiz,
		wizloss: uloss.toLocaleString(),
		trpwiz: eraArray[empire.era].trpwiz,
	});

	const attackDescription = {
		result: "fail",
		message: returnText,
		wizloss: uloss,
		fight: true,
	};

	const content = {
		key: "spells.fight.failPrivate",
		params: {
			attacker: empire.name,
			unitType: eraArray[empire.era].trpwiz,
			losses: eloss.toLocaleString(),
			defenderUnitType: eraArray[enemyEmpire.era].trpwiz,
			kills: uloss.toLocaleString(),
			attackerUnitType: eraArray[empire.era].trpwiz,
		},
	};

	const pubContent = {
		key: "spells.fight.failPublic",
		params: {
			defender: enemyEmpire.name,
			attacker: empire.name,
			defenderLosses: eloss.toLocaleString(),
			defenderUnitType: eraArray[enemyEmpire.era].trpwiz,
			attackerLosses: uloss.toLocaleString(),
			attackerUnitType: eraArray[empire.era].trpwiz,
		},
	};

	await createNewsEvent(
		content,
		pubContent,
		empire.id,
		empire.name,
		enemyEmpire.id,
		enemyEmpire.name,
		"spell",
		"success", // defense succeeds
		empire.game_id,
	);

	enemyEmpire.networth = getNetworth(enemyEmpire, game);
	enemyEmpire.score += points;

	await empire.save();
	await enemyEmpire.save();

	return attackDescription;
};
