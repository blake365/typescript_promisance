import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import EmpireEffect from '../entity/EmpireEffect'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { useTurnInternal } from './useturns'
import { eraArray } from '../config/eras'
import { raceArray } from '../config/races'
import { createNewsEvent } from '../util/helpers'
import {
	DR_RATE,
	MAX_ATTACKS,
	TURNS_PROTECTION,
	PVTM_TRPARM,
	PVTM_TRPLND,
	PVTM_TRPFLY,
	PVTM_TRPSEA,
} from '../config/conifg'
import { cauchyRandom, gaussianRandom, getNetworth } from './actions/actions'
import Clan from '../entity/Clan'
import User from '../entity/User'
// import { awardAchievements } from './actions/achievements'
import { takeSnapshot } from './actions/snaps'
import { getRepository } from 'typeorm'

let troopTypes = ['trparm', 'trplnd', 'trpfly', 'trpsea']

function getRandomInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min) + min) //The maximum is exclusive and the minimum is inclusive
}

/**
 * Calculates the power of a unit in an empire based on the given mode.
 * @param empire - The empire object containing unit quantities.
 * @param unit - The unit to calculate the power for.
 * @param mode - The mode ('o' for offensive, 'd' for defensive).
 * @returns The calculated power of the unit.
 */
const calcUnitPower = (empire: Empire, unit: string, mode: string) => {
	// convert unit from trparm to trpArm
	// console.log('unit: ', unit)

	let unitM =
		unit.substring(0, 3) + unit.charAt(3).toUpperCase() + unit.substring(4)

	let lookup = ''
	if (mode === 'o') {
		lookup = 'o_' + unit
	} else if (mode === 'd') {
		lookup = 'd_' + unit
	}

	// console.log(empire)
	// console.log(lookup)

	let quantity = empire[unitM]
	if (!quantity) {
		quantity = 0
	}
	// console.log('quantity: ', quantity)
	// console.log('era: ', eraArray[empire.era][lookup])
	let power = eraArray[empire.era][lookup] * quantity
	// console.log('power: ', power)

	return power
}

// calculate number of units lost for attacker and defender
/**
 * Calculates the unit losses for an attack.
 *
 * @param attackUnits The number of attacking units.
 * @param defendUnits The number of defending units.
 * @param oper The offensive power of the attacker.
 * @param dper The defensive power of the defender.
 * @param omod The offensive modifier.
 * @param dmod The defensive modifier.
 * @returns An object containing the number of attack losses and defend losses.
 */
const calcUnitLosses = (
	attackUnits: number,
	defendUnits: number,
	oper: number,
	dper: number,
	omod: number,
	dmod: number
) => {
	// console.log('attackUnits: ', attackUnits)
	// console.log('defendUnits: ', defendUnits)
	// console.log('oper: ', oper)
	// console.log('dper: ', dper)
	// console.log('omod: ', omod)
	// console.log('dmod: ', dmod)

	let attackLosses = Math.round(
		Math.min(
			cauchyRandom(Math.ceil((attackUnits * oper * omod + 1) / 2)),
			attackUnits
		)
	)
	// console.log('max attacker loss:', Math.ceil(attackUnits * oper * omod) + 1)

	let maxKill =
		Math.round(0.9 * attackUnits) +
		getRandomInt(0, Math.round(0.2 * attackUnits) + 1)

	let defendLosses = Math.round(
		Math.min(
			cauchyRandom(Math.ceil((defendUnits * dper * dmod + 1) / 2)),
			defendUnits,
			maxKill
		)
	)

	// console.log(
	// 	'intermediate defender loss:',
	// 	Math.ceil(defendUnits * dper * dmod) + 1
	// )

	// console.log('attackLosses: ', attackLosses)
	// console.log('defendLosses: ', defendLosses)

	return { attackLosses: attackLosses, defendLosses: defendLosses }
}

// function isOld(createdAt: Date, effectValue: number) {
// 	let effectAge = (Date.now().valueOf() - new Date(createdAt).getTime()) / 60000
// 	effectAge = Math.floor(effectAge)

// 	// console.log(effectAge)
// 	// console.log(effectValue)

// 	if (effectAge > effectValue) {
// 		return false
// 	} else {
// 		return true
// 	}
// }

interface Effect {
	empireEffectValue: number
	empireEffectName: string
	effectOwnerId: number
}

interface UnitLoss {
	attackLosses: number
	defendLosses: number
}

interface buildGain {
	[key: string]: number
}

interface buildLoss {
	[key: string]: number
}

interface attackLosses {
	[key: string]: number
}

interface defendLosses {
	[key: string]: number
}

// function isTimeGate(effect: Effect) {
// 	if (effect.empireEffectName === 'time gate') {
// 		return false
// 	} else true
// }

/**
 * Destroys buildings during an attack.
 * @param attackType - The type of attack.
 * @param pcloss - The percentage of buildings lost during the attack.
 * @param pcgain - The percentage of buildings gained during the attack.
 * @param type - The type of building being attacked.
 * @param defender - The defending empire.
 * @param attacker - The attacking empire.
 * @param buildLoss - The object to track the loss of buildings.
 * @param buildGain - The object to track the gain of buildings.
 * @returns An object containing the updated buildGain and buildLoss.
 */
export const destroyBuildings = async (
	attackType: string,
	pcloss: number,
	pcgain: number,
	type: string,
	defender: Empire,
	attacker: Empire,
	buildLoss: buildLoss,
	buildGain: buildGain
) => {
	if (
		attackType === 'trplnd' ||
		attackType === 'trpfly' ||
		attackType === 'trpsea'
	) {
		if (attackType === 'trpfly') {
			// air strikes destroy more, take more land, but gain fewer buildings
			pcloss *= 1.25
			pcgain *= 0.72
		} else if (type === 'bldDef' || type === 'bldWiz') {
			// towers are even more likely to be destroyed by land/sea attacks (and more likely to be destroyed)
			pcloss *= 1.3
			pcgain *= 0.7
		} else {
			// while land/sea attacks simply have a higher chance of destroying the buildings stolen
			pcgain *= 0.9
		}
	} else if (attackType === 'pillage') {
	}

	let loss = Math.min(
		getRandomInt(
			defender[type] * 0.01,
			Math.ceil(
				((defender[type] * pcloss + 2) * (100 - defender.diminishingReturns)) /
					100
			)
		),
		defender[type]
	)

	// console.log('diminishing returns', defender.diminishingReturns)
	// console.log(
	// 	defender[type] * 0.05,
	// 	Math.ceil(
	// 		((defender[type] * pcloss + 2) * (100 - defender.diminishingReturns)) /
	// 			100
	// 	)
	// )
	// console.log(attacker.freeLand)
	// console.log(defender.freeLand)
	// console.log(type)
	// console.log('loss: ', loss)

	let gain = Math.ceil(loss * pcgain)
	// console.log('gain: ', gain)

	if (typeof buildLoss[type] === 'undefined') buildLoss[type] = 0
	if (typeof buildGain[type] === 'undefined') buildGain[type] = 0
	if (typeof buildGain['freeLand'] === 'undefined') buildGain['freeLand'] = 0
	if (typeof buildLoss['freeLand'] === 'undefined') buildLoss['freeLand'] = 0

	switch (attackType) {
		case 'standard':
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker[type] += gain
			buildGain[type] += gain
			attacker.freeLand += loss - gain
			buildGain['freeLand'] += loss - gain
			break
		case 'pillage':
			// attacks don't steal buildings, they just destroy them
			loss = Math.round(loss * 0.15)
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker.freeLand += loss
			buildGain['freeLand'] += loss
			break
		case 'surprise':
		case 'trparm':
			// attacks don't steal buildings, they just destroy them
			defender.land -= loss
			defender.attackLosses += loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker.attackGains += loss
			attacker.freeLand += loss
			buildGain['freeLand'] += loss
			break
		case 'trplnd':
		case 'trpfly':
		case 'trpsea':
			// console.log(buildGain.freeLand)
			// console.log(buildLoss.freeLand)
			if (type === 'freeLand') {
				// for stealing unused land, the 'gain' percent is zero
				gain = loss
				// so we need to use the 'loss' value instead
			}
			defender.land -= gain
			defender.attackLosses += gain
			defender[type] -= loss
			buildLoss[type] += loss
			defender.freeLand += loss - gain
			// buildLoss['freeLand'] will be negative because the free land is increasing as buildings are destroyed
			buildLoss['freeLand'] -= loss - gain
			attacker.land += gain
			attacker.attackGains += gain
			attacker.freeLand += gain
			buildGain['freeLand'] += gain
			break
	}

	// console.log('buildLoss: ', buildLoss)
	// console.log('buildGain: ', buildGain)

	return { buildGain, buildLoss }
}

const attack = async (req: Request, res: Response) => {
	// use two turns for attacks
	// only send troops relevant to the attack type
	// console.log(req.body)
	// console.log(req.params)
	const { attackType, defenderId, number, empireId } = req.body

	const user: User = res.locals.user

	if (user.empires[0].id !== empireId) {
		return res.status(403).json({ error: 'Unauthorized' })
	}

	let { type } = req.body

	if (type !== 'attack') {
		return res.status(500).send('Invalid')
	}

	let offPower = 0
	let defPower = 0
	let canAttack = false

	let returnText = ''
	let attackDescription = {}
	let resultArray = []

	try {
		const attacker = await Empire.findOneOrFail({ id: empireId })
		// console.log(attacker)
		const defender = await Empire.findOneOrFail({ id: defenderId })

		const { totalLand, empireCount } = await getRepository(Empire)
			.createQueryBuilder('empire')
			.select('SUM(empire.land)', 'totalLand')
			.addSelect('COUNT(empire.id)', 'empireCount')
			.where('empire.turnsUsed > :turnsUsed AND empire.mode != :demo', {
				turnsUsed: TURNS_PROTECTION,
				demo: 'demo',
			})
			.getRawOne()

		console.log(totalLand, empireCount)
		const avgLand = totalLand / empireCount
		console.log(avgLand)

		if (attacker.attacks >= MAX_ATTACKS) {
			canAttack = false
			returnText =
				'You have reached the max number of attacks. Wait a while before attacking.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.clanId !== 0 && attacker.clanId === defender.clanId) {
			canAttack = false
			returnText = 'You cannot attack a member of your clan.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turnsUsed <= TURNS_PROTECTION) {
			canAttack = false
			returnText = 'You cannot attack while in protection.'
			return res.json({
				error: returnText,
			})
		}

		if (defender.turnsUsed <= TURNS_PROTECTION) {
			canAttack = false
			returnText = 'You cannot attack such a young empire.'
			return res.json({
				error: returnText,
			})
		}

		if (defender.land <= 1000) {
			canAttack = false
			returnText =
				'You cannot attack an empire with such a small amount of land.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.turns < 2) {
			canAttack = false
			returnText = 'You do not have enough turns to attack.'
			return res.json({
				error: returnText,
			})
		}

		if (attacker.health < 10) {
			canAttack = false
			returnText = 'Your health is too low to send an attack.'
			return res.json({
				error: returnText,
			})
		}
		// check eras and time gates
		let defenderTimegate = false
		if (attacker.era === defender.era) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			const effect = await EmpireEffect.findOne({
				where: { effectOwnerId: attacker.id, empireEffectName: 'time gate' },
				order: { createdAt: 'DESC' },
			})

			if (effect) {
				// console.log('found effect on your empire')
				let now = new Date()

				let effectAge =
					(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
				let timeLeft = effect.empireEffectValue - effectAge

				if (timeLeft > 0) {
					canAttack = true
					returnText = 'Your army travels through your Time Gate...'
				} else {
					// try defender time gate
					const defEffect = await EmpireEffect.findOne({
						where: {
							effectOwnerId: defender.id,
							empireEffectName: 'time gate',
						},
						order: { createdAt: 'DESC' },
					})

					// console.log(defEffect)

					if (defEffect) {
						let now = new Date()
						let effectAge =
							(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
						let timeLeft = defEffect.empireEffectValue - effectAge
						if (timeLeft > 0) {
							canAttack = true
							defenderTimegate = true
							returnText =
								'Your army travels through your opponents Time Gate...'
						} else {
							returnText =
								'You must open a Time Gate to attack players in another Era'
							return res.json({
								error: returnText,
							})
						}
					} else {
						canAttack = false
						returnText =
							'You must open a Time Gate to attack players in another Era'
						return res.json({
							error: returnText,
						})
					}
				}
			} else {
				// try defender time gate
				const defEffect = await EmpireEffect.findOne({
					where: {
						effectOwnerId: defender.id,
						empireEffectName: 'time gate',
					},
					order: { createdAt: 'DESC' },
				})

				// console.log(defEffect)

				if (defEffect) {
					let now = new Date()
					let effectAge =
						(now.valueOf() - new Date(defEffect.updatedAt).getTime()) / 60000
					let timeLeft = defEffect.empireEffectValue - effectAge
					if (timeLeft > 0) {
						canAttack = true
						defenderTimegate = true
						returnText = 'Your army travels through your opponents Time Gate...'
					} else {
						returnText =
							'You must open a Time Gate to attack players in another Era'
						return res.json({
							error: returnText,
						})
					}
				} else {
					canAttack = false
					returnText =
						'You must open a Time Gate to attack players in another Era'
					return res.json({
						error: returnText,
					})
				}
			}
		}

		// calculate power levels
		if (
			attackType === 'standard' ||
			attackType === 'surprise' ||
			attackType === 'pillage'
		) {
			console.log(troopTypes)
			troopTypes.forEach((type) => {
				offPower += calcUnitPower(attacker, type, 'o')
			})

			troopTypes.forEach((type) => {
				defPower += calcUnitPower(defender, type, 'd')
				// console.log(defPower)
			})
		} else {
			offPower = calcUnitPower(attacker, attackType, 'o')
			defPower = calcUnitPower(defender, attackType, 'd')
		}

		// apply race bonus
		offPower *= (100 + raceArray[attacker.race].mod_offense) / 100
		defPower *= (100 + raceArray[defender.race].mod_defense) / 100

		// reduce power level based on health
		offPower *= attacker.health / 100
		defPower *= defender.health / 100

		// war flag +20% when at war with other clan
		let clan = null
		if (attacker.clanId !== 0) {
			// attacker is in a clan

			// get attacker clan
			clan = await Clan.findOneOrFail({
				where: { id: attacker.clanId },
				relations: ['relation'],
			})

			// console.log(clan)
			let relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === 'war') {
					return relation.c_id2
				}
			})
			// check if clan is at war
			if (relations.includes(defender.clanId)) {
				console.log('clan is at war')
				// clan is at war with defender
				offPower *= 1.2
				type = 'war'
			}
		}

		if (attackType === 'surprise') {
			offPower *= 1.25
		}

		// clan shared defense
		if (defender.clanId !== 0 && attackType !== 'surprise') {
			// defender is in a clan

			// get defender clan
			// let clan = await Clan.findOne({ id: defender.clanId })

			// get clan members
			let clanMembers = await Empire.find({ clanId: defender.clanId })
			// console.log(clanMembers)

			let defBonus = 0

			// calculate clan defense
			clanMembers.forEach(async (member) => {
				if (member.id === defender.id) {
					return
				}
				if (member.era !== defender.era && !defenderTimegate) {
					// check for member time gate
					const effect = await EmpireEffect.findOne({
						where: { effectOwnerId: member.id, empireEffectName: 'time gate' },
						order: { createdAt: 'DESC' },
					})

					if (effect) {
						// console.log('found effect on your empire')
						let now = new Date()

						let effectAge =
							(now.valueOf() - new Date(effect.updatedAt).getTime()) / 60000
						let timeLeft = effect.empireEffectValue - effectAge

						if (timeLeft > 0) {
							let allyDef = 0
							// time gate is active
							if (attackType === 'standard' || attackType === 'surprise') {
								troopTypes.forEach((type) => {
									allyDef += calcUnitPower(defender, type, 'd') * 0.1
									// console.log(defPower)
								})
							} else {
								calcUnitPower(member, attackType, 'd') * 0.1
							}
							allyDef *= member.health / 100
							allyDef *= (100 + raceArray[member.race].mod_defense) / 100
							defBonus += allyDef
						}
					}
				} else {
					let allyDef = 0
					// time gate is active
					if (attackType === 'standard' || attackType === 'surprise') {
						troopTypes.forEach((type) => {
							allyDef += calcUnitPower(defender, type, 'd') * 0.1
							// console.log(defPower)
						})
					} else {
						calcUnitPower(member, attackType, 'd') * 0.1
					}
					allyDef *= member.health / 100
					allyDef *= (100 + raceArray[member.race].mod_defense) / 100
					defBonus += allyDef
				}
			})

			// console.log('defBonus', defBonus)
			// console.log('defPower', defPower)
			if (defBonus > defPower) {
				defBonus = defPower
			}

			defPower += defBonus

			// console.log('defPower', defPower)/
			if (defBonus > 0) {
				returnText += "The defender's clan comes to their aid..."
			}
		}

		// console.log('can attack', canAttack)
		if (canAttack) {
			if (attacker.networth > defender.networth * 2 && type !== 'war') {
				// the attacker is ashamed, troops desert
				returnText +=
					'Your army is ashamed to fight such a weak opponent, many desert... '
				attacker.trpArm = Math.round(0.97 * attacker.trpArm)
				attacker.trpLnd = Math.round(0.97 * attacker.trpLnd)
				attacker.trpFly = Math.round(0.97 * attacker.trpFly)
				attacker.trpSea = Math.round(0.97 * attacker.trpSea)
				attacker.trpWiz = Math.round(0.97 * attacker.trpWiz)
			}

			if (attacker.networth < defender.networth * 0.2 && type !== 'war') {
				// the attacker is fearful, troops desert
				returnText +=
					'Your army is fearful of fighting such a strong opponent, many desert... '
				attacker.trpArm = Math.round(0.98 * attacker.trpArm)
				attacker.trpLnd = Math.round(0.98 * attacker.trpLnd)
				attacker.trpFly = Math.round(0.98 * attacker.trpFly)
				attacker.trpSea = Math.round(0.98 * attacker.trpSea)
				attacker.trpWiz = Math.round(0.98 * attacker.trpWiz)
			}

			let attackTurns = useTurnInternal(type, 2, attacker, clan, true)

			let attackRes = attackTurns[0]
			attackTurns = attackTurns[0]
			// console.log(attackRes)

			attacker.cash =
				attacker.cash +
				attackRes.withdraw +
				attackRes.money -
				attackRes.loanpayed

			if (attacker.cash < 0) {
				attacker.cash = 0
			}

			attacker.income += attackRes.income
			attacker.expenses +=
				attackRes.expenses + attackRes.wartax + attackRes.corruption

			attacker.bank += attackRes.bankInterest
			attacker.loan -= attackRes.loanpayed + attackRes.loanInterest
			attacker.trpArm += attackRes.trpArm
			attacker.trpLnd += attackRes.trpLnd
			attacker.trpFly += attackRes.trpFly
			attacker.trpSea += attackRes.trpSea

			attacker.indyProd +=
				attackRes.trpArm * PVTM_TRPARM +
				attackRes.trpLnd * PVTM_TRPLND +
				attackRes.trpFly * PVTM_TRPFLY +
				attackRes.trpSea * PVTM_TRPSEA

			attacker.food += attackRes.food
			if (attacker.food < 0) {
				attacker.food = 0
			}

			attacker.foodpro += attackRes.foodpro
			attacker.foodcon += attackRes.foodcon

			attacker.peasants += attackRes.peasants
			attacker.runes += attackRes.runes
			attacker.trpWiz += attackRes.trpWiz
			attacker.turns -= 2
			attacker.turnsUsed += 2
			if (type !== 'war') {
				attacker.attacks++
			}
			attacker.offTotal++
			defender.defTotal++

			let newTowerDef =
				// percent land as GTs
				1 + defender.bldDef / defender.land

			if (newTowerDef > 1.5) {
				newTowerDef = 1.5
			}

			// console.log(newTowerDef)
			// console.log('tower def', towerDef)
			defPower *= newTowerDef
			defPower = Math.round(defPower)

			// console.log('off power', offPower)
			// console.log('def power', defPower)
			// determine how many units each empire is about to lose in battle

			// modification to attacker losses (towers excluded)
			// let omod = Math.sqrt((defPower - towerDef) / (offPower + 1))
			console.log('offPower', offPower)
			console.log('defPower', defPower)
			let omod = Math.sqrt(defPower / (offPower + 1))
			// modification to enemy losses
			let dmod = Math.sqrt(offPower / (defPower + 1))

			let attackLosses: attackLosses = {}
			let defenseLosses: defendLosses = {}
			let result: UnitLoss

			switch (attackType) {
				case 'trparm':
					result = calcUnitLosses(
						attacker.trpArm,
						defender.trpArm,
						0.1155,
						0.0705,
						omod,
						dmod
					)
					attackLosses['trparm'] = result.attackLosses
					defenseLosses['trparm'] = result.defendLosses
					break
				case 'trplnd':
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.0985,
						0.053,
						omod,
						dmod
					)
					attackLosses['trplnd'] = result.attackLosses
					defenseLosses['trplnd'] = result.defendLosses
					break
				case 'trpfly':
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.0688,
						0.0445,
						omod,
						dmod
					)
					attackLosses['trpfly'] = result.attackLosses
					defenseLosses['trpfly'] = result.defendLosses
					break
				case 'trpsea':
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.045,
						0.0355,
						omod,
						dmod
					)
					attackLosses['trpsea'] = result.attackLosses
					defenseLosses['trpsea'] = result.defendLosses
					break
				//surprise attack and standard attack losses
				case 'surprise':
					console.log('surprise attack')
					omod *= 1.2
					console.log('omod', omod)
				case 'pillage':
					console.log('pillage attack')
					omod *= 1.2
					console.log('omod', omod)
				case 'standard':
					console.log('omod', omod)
					console.log('standard attack')
					result = calcUnitLosses(
						attacker.trpArm,
						defender.trpArm,
						0.1455,
						0.0695,
						omod,
						dmod
					)
					console.log(result)
					attackLosses['trparm'] = result.attackLosses
					defenseLosses['trparm'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.1285,
						0.052,
						omod,
						dmod
					)
					console.log(result)
					attackLosses['trplnd'] = result.attackLosses
					defenseLosses['trplnd'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.0788,
						0.0435,
						omod,
						dmod
					)
					console.log(result)
					attackLosses['trpfly'] = result.attackLosses
					defenseLosses['trpfly'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.065,
						0.0345,
						omod,
						dmod
					)
					console.log(result)
					attackLosses['trpsea'] = result.attackLosses
					defenseLosses['trpsea'] = result.defendLosses
			}

			if (attackType === 'trparm') {
				attacker.trpArm -= attackLosses.trparm
				defender.trpArm -= defenseLosses.trparm
			} else if (attackType === 'trplnd') {
				attacker.trpLnd -= attackLosses.trplnd
				defender.trpLnd -= defenseLosses.trplnd
			} else if (attackType === 'trpfly') {
				attacker.trpFly -= attackLosses.trpfly
				defender.trpFly -= defenseLosses.trpfly
			} else if (attackType === 'trpsea') {
				attacker.trpSea -= attackLosses.trpsea
				defender.trpSea -= defenseLosses.trpsea
			} else if (
				attackType === 'surprise' ||
				attackType === 'standard' ||
				attackType === 'pillage'
			) {
				console.log('surprise, standard, pillage attack')
				console.log(attackLosses)
				console.log(defenseLosses)
				attacker.trpArm -= attackLosses.trparm
				defender.trpArm -= defenseLosses.trparm
				attacker.trpLnd -= attackLosses.trplnd
				defender.trpLnd -= defenseLosses.trplnd
				attacker.trpFly -= attackLosses.trpfly
				defender.trpFly -= defenseLosses.trpfly
				attacker.trpSea -= attackLosses.trpsea
				defender.trpSea -= defenseLosses.trpsea
			}

			// let won: boolean
			let lowLand = 1
			if (offPower > defPower * 1.05) {
				if (
					defender.land < avgLand * 0.75 &&
					attacker.land > defender.land * 2 &&
					attacker.land > avgLand &&
					type !== 'war'
				) {
					// the defender is being "low landed"
					returnText +=
						'Your troops are ashamed to attack an opponent with so little land, their effectiveness dropped... '
					lowLand = 0.5
				}
				// won = true
				let buildLoss: buildLoss = {}
				let buildGain: buildGain = {}

				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					'bldCash',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					'bldPop',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.5 * lowLand,
					'bldTroop',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.7 * lowLand,
					'bldCost',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.3 * lowLand,
					'bldFood',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07 * lowLand,
					0.6 * lowLand,
					'bldWiz',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.11 * lowLand,
					0.6 * lowLand,
					'bldDef',
					defender,
					attacker,
					buildLoss,
					buildGain
				) // towers more likely to be taken, since they are encountered first
				destroyBuildings(
					attackType,
					0.1 * lowLand,
					0.0 * lowLand,
					'freeLand',
					defender,
					attacker,
					buildLoss,
					buildGain
				) // 3rd argument MUST be 0 (for Standard attacks)

				const sumBuildGain = (buildGain: { [key: string]: number }): number => {
					let sum = 0
					for (const key in buildGain) {
						if (Object.prototype.hasOwnProperty.call(buildGain, key)) {
							sum += buildGain[key]
						}
					}
					return sum
				}

				let totalBuildGain = sumBuildGain(buildGain)
				// console.log('buildGain', buildGain)
				// console.log('buildLoss', buildLoss)
				// create return text for captured buildings

				let food = 0
				let cash = 0
				if (attackType === 'pillage') {
					// steal food and cash
					food = Math.ceil(defender.food * 0.0912 * 0.63)
					cash = Math.ceil(defender.cash * 0.1266 * 0.63)
					defender.food -= food
					attacker.food += food
					defender.cash -= cash
					attacker.cash += cash
				}

				// take enemy land
				// attacker.land += buildGain.freeLand
				if (attackType === 'pillage') {
					returnText +=
						'' +
						totalBuildGain.toLocaleString() +
						` acres of land, ${food.toLocaleString()} ${
							eraArray[attacker.era].food
						}, and $${cash.toLocaleString()} were captured from ` +
						defender.name

					attackDescription = {
						result: 'success',
						attackType: attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				} else if (attackType !== 'surprise' && attackType !== 'standard') {
					returnText +=
						'' +
						buildGain.freeLand.toLocaleString() +
						' acres of land were captured from ' +
						defender.name

					attackDescription = {
						result: 'success',
						attackType: attackType,
						troopType: eraArray[attacker.era][attackType],
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				} else {
					returnText +=
						'' +
						totalBuildGain.toLocaleString() +
						' acres of land and buildings were captured from ' +
						defender.name

					attackDescription = {
						result: 'success',
						attackType: attackType === 'standard' ? 'all out' : attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: buildGain,
					}
				}

				// attacker off success
				attacker.offSucc++

				// console.log(defenseLosses)
				// console.log(attackLosses)
				// console.log(buildGain)

				let content = ''
				let pubContent = ''

				if (attackType === 'pillage') {
					content = `${
						attacker.name
					} attacked you with a ${attackType} attack and captured ${totalBuildGain.toLocaleString()} acres of land, ${food.toLocaleString()} ${
						eraArray[defender.era].food
					}, and $${cash.toLocaleString()}. /n 
					In the battle you lost: /n
					${defenseLosses.trparm.toLocaleString()} ${
						eraArray[defender.era].trparm
					} /n ${defenseLosses.trplnd.toLocaleString()} ${
						eraArray[defender.era].trplnd
					} /n ${defenseLosses.trpfly.toLocaleString()} ${
						eraArray[defender.era].trpfly
					} /n ${defenseLosses.trpsea.toLocaleString()} ${
						eraArray[defender.era].trpsea
					} /n 
					You killed: /n
					${attackLosses.trparm.toLocaleString()} ${eraArray[attacker.era].trparm} /n 
					${attackLosses.trplnd.toLocaleString()} ${eraArray[attacker.era].trplnd} /n 
					${attackLosses.trpfly.toLocaleString()} ${eraArray[attacker.era].trpfly} /n 
					${attackLosses.trpsea.toLocaleString()} ${eraArray[attacker.era].trpsea}.`

					pubContent = `${attacker.name} attacked ${
						defender.name
					} with a ${attackType} attack and captured ${totalBuildGain.toLocaleString()} acres of land, as well as ${
						eraArray[defender.era].food
					} and money. /n 
					In the battle ${defender.name} lost: /n
					${defenseLosses.trparm.toLocaleString()} ${eraArray[defender.era].trparm} /n
					${defenseLosses.trplnd.toLocaleString()} ${eraArray[defender.era].trplnd} /n
					${defenseLosses.trpfly.toLocaleString()} ${eraArray[defender.era].trpfly} /n
					${defenseLosses.trpsea.toLocaleString()} ${eraArray[defender.era].trpsea} /n
					${attacker.name} lost: /n
					${attackLosses.trparm.toLocaleString()} ${eraArray[attacker.era].trparm} /n
					${attackLosses.trplnd.toLocaleString()} ${eraArray[attacker.era].trplnd} /n
					${attackLosses.trpfly.toLocaleString()} ${eraArray[attacker.era].trpfly} /n
					${attackLosses.trpsea.toLocaleString()} ${eraArray[attacker.era].trpsea}.`
				} else if (attackType !== 'surprise' && attackType !== 'standard') {
					content = `${attacker.name} attacked you with ${
						eraArray[attacker.era][attackType]
					} and captured ${buildGain.freeLand.toLocaleString()} acres of land. /n In the battle you lost: ${defenseLosses[
						attackType
					].toLocaleString()} ${
						eraArray[defender.era][attackType]
					} /n You killed: ${attackLosses[attackType].toLocaleString()} ${
						eraArray[attacker.era][attackType]
					}.`

					pubContent = `${attacker.name} attacked ${defender.name} with ${
						eraArray[attacker.era][attackType]
					} and captured ${buildGain.freeLand.toLocaleString()} acres of land. /n In the battle ${
						defender.name
					} lost: ${defenseLosses[attackType].toLocaleString()} ${
						eraArray[defender.era][attackType]
					} /n ${attacker.name} lost: ${attackLosses[
						attackType
					].toLocaleString()} ${eraArray[attacker.era][attackType]}.`
				} else {
					content = `${attacker.name} attacked you with ${
						attackType === 'standard' ? 'an' : 'a'
					} ${
						attackType === 'standard' ? 'all out' : attackType
					} attack and captured ${totalBuildGain.toLocaleString()} acres of land and buildings. /n 
					In the battle you lost: /n
					${defenseLosses.trparm.toLocaleString()} ${
						eraArray[defender.era].trparm
					} /n ${defenseLosses.trplnd.toLocaleString()} ${
						eraArray[defender.era].trplnd
					} /n ${defenseLosses.trpfly.toLocaleString()} ${
						eraArray[defender.era].trpfly
					} /n ${defenseLosses.trpsea.toLocaleString()} ${
						eraArray[defender.era].trpsea
					} /n 
					You killed: /n
					${attackLosses.trparm.toLocaleString()} ${eraArray[attacker.era].trparm} /n 
					${attackLosses.trplnd.toLocaleString()} ${eraArray[attacker.era].trplnd} /n 
					${attackLosses.trpfly.toLocaleString()} ${eraArray[attacker.era].trpfly} /n 
					${attackLosses.trpsea.toLocaleString()} ${eraArray[attacker.era].trpsea}.`

					pubContent = `${attacker.name} attacked ${defender.name} with ${
						attackType === 'standard' ? 'an' : 'a'
					} ${
						attackType === 'standard' ? 'all out' : attackType
					} attack and captured ${totalBuildGain.toLocaleString()} acres of land and buildings. /n 
					In the battle ${defender.name} lost: /n
					${defenseLosses.trparm.toLocaleString()} ${eraArray[defender.era].trparm} /n
					${defenseLosses.trplnd.toLocaleString()} ${eraArray[defender.era].trplnd} /n
					${defenseLosses.trpfly.toLocaleString()} ${eraArray[defender.era].trpfly} /n
					${defenseLosses.trpsea.toLocaleString()} ${eraArray[defender.era].trpsea} /n
					${attacker.name} lost: /n
					${attackLosses.trparm.toLocaleString()} ${eraArray[attacker.era].trparm} /n
					${attackLosses.trplnd.toLocaleString()} ${eraArray[attacker.era].trplnd} /n
					${attackLosses.trpfly.toLocaleString()} ${eraArray[attacker.era].trpfly} /n
					${attackLosses.trpsea.toLocaleString()} ${eraArray[attacker.era].trpsea}.`
				}

				await createNewsEvent(
					content,
					pubContent,
					attacker.id,
					attacker.name,
					defender.id,
					defender.name,
					'attack',
					'fail'
				)

				// check for kill
			} else {
				let landLoss = 0

				if (
					attackType !== 'surprise' &&
					attackType !== 'standard' &&
					attackType !== 'pillage'
				) {
					attackDescription = {
						result: 'fail',
						attackType: attackType,
						troopType: eraArray[attacker.era][attackType],
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: null,
					}
				} else {
					attackDescription = {
						result: 'fail',
						attackType: attackType === 'standard' ? 'all out' : attackType,
						era: attacker.era,
						message: returnText,
						troopLoss: attackLosses,
						troopKilled: defenseLosses,
						buildingGain: null,
					}
				}
				// defender def success
				defender.defSucc++

				let content = ''
				let pubContent = ''

				if (
					attackType !== 'surprise' &&
					attackType !== 'standard' &&
					attackType !== 'pillage'
				) {
					content = `You successfully defended your empire. /n ${
						attacker.name
					} attacked you with ${
						eraArray[attacker.era][attackType]
					}. /n In the battle you lost: ${defenseLosses[
						attackType
					].toLocaleString()} ${
						eraArray[defender.era][attackType]
					} /n You killed: ${attackLosses[attackType].toLocaleString()} ${
						eraArray[attacker.era][attackType]
					}. `

					pubContent = `${
						defender.name
					} successfully defended their empire against ${
						attacker.name
					}. /n In the battle ${defender.name} lost: ${defenseLosses[
						attackType
					].toLocaleString()} ${eraArray[defender.era][attackType]} /n ${
						attacker.name
					} lost: ${attackLosses[attackType].toLocaleString()} ${
						eraArray[attacker.era][attackType]
					}.`
				} else {
					content = `You successfully defended your empire. /n ${
						attacker.name
					} attacked you with ${attackType === 'standard' ? 'an' : 'a'} ${
						attackType === 'standard' ? 'all out' : attackType
					} attack. /n In the battle you lost: /n
					${defenseLosses.trparm.toLocaleString()} ${
						eraArray[defender.era].trparm
					} /n ${defenseLosses.trplnd.toLocaleString()} ${
						eraArray[defender.era].trplnd
					} /n ${defenseLosses.trpfly.toLocaleString()} ${
						eraArray[defender.era].trpfly
					} /n ${defenseLosses.trpsea.toLocaleString()} ${
						eraArray[defender.era].trpsea
					} /n
					You killed: /n
					${attackLosses.trparm.toLocaleString()} ${
						eraArray[attacker.era].trparm
					} /n ${attackLosses.trplnd.toLocaleString()} ${
						eraArray[attacker.era].trplnd
					} /n ${attackLosses.trpfly.toLocaleString()} ${
						eraArray[attacker.era].trpfly
					} /n ${attackLosses.trpsea.toLocaleString()} ${
						eraArray[attacker.era].trpsea
					}.`

					pubContent = `${
						defender.name
					} successfully defended their empire against ${
						attacker.name
					}. /n In the battle ${defender.name} lost: /n
					${defenseLosses.trparm.toLocaleString()} ${eraArray[defender.era].trparm} /n
					${defenseLosses.trplnd.toLocaleString()} ${eraArray[defender.era].trplnd} /n
					${defenseLosses.trpfly.toLocaleString()} ${eraArray[defender.era].trpfly} /n
					${defenseLosses.trpsea.toLocaleString()} ${eraArray[defender.era].trpsea} /n
					${attacker.name} lost: /n
					${attackLosses.trparm.toLocaleString()} ${eraArray[attacker.era].trparm} /n
					${attackLosses.trplnd.toLocaleString()} ${eraArray[attacker.era].trplnd} /n
					${attackLosses.trpfly.toLocaleString()} ${eraArray[attacker.era].trpfly} /n
					${attackLosses.trpsea.toLocaleString()} ${eraArray[attacker.era].trpsea}.`
				}

				await createNewsEvent(
					content,
					pubContent,
					attacker.id,
					attacker.name,
					defender.id,
					defender.name,
					'attack',
					'success'
				)
			}

			attacker.health -= 6
			if (attackType === 'surprise') {
				attacker.health -= 5
			}

			let adjustedDR =
				DR_RATE + Math.round((defender.bldDef / defender.land) * 100) / 100

			// console.log('adjusted DR', adjustedDR)
			defender.diminishingReturns =
				defender.diminishingReturns + adjustedDR / lowLand

			if (attacker.diminishingReturns > 0) {
				attacker.diminishingReturns -= DR_RATE
			}

			if (attacker.diminishingReturns < 0) {
				attacker.diminishingReturns = 0
			}

			attackTurns['attack'] = attackDescription
			resultArray.push(attackTurns)
			attacker.networth = getNetworth(attacker)
			defender.networth = getNetworth(defender)

			if (attacker.peakCash < attacker.cash + attacker.bank) {
				attacker.peakCash = attacker.cash + attacker.bank
			}
			if (attacker.peakFood < attacker.food) {
				attacker.peakFood = attacker.food
			}
			if (attacker.peakRunes < attacker.runes) {
				attacker.peakRunes = attacker.runes
			}
			if (attacker.peakPeasants < attacker.peasants) {
				attacker.peakPeasants = attacker.peasants
			}
			if (attacker.peakLand < attacker.land) {
				attacker.peakLand = attacker.land
			}
			if (attacker.peakNetworth < attacker.networth) {
				attacker.peakNetworth = attacker.networth
			}
			if (attacker.peakTrpArm < attacker.trpArm) {
				attacker.peakTrpArm = attacker.trpArm
			}
			if (attacker.peakTrpLnd < attacker.trpLnd) {
				attacker.peakTrpLnd = attacker.trpLnd
			}
			if (attacker.peakTrpFly < attacker.trpFly) {
				attacker.peakTrpFly = attacker.trpFly
			}
			if (attacker.peakTrpSea < attacker.trpSea) {
				attacker.peakTrpSea = attacker.trpSea
			}
			if (attacker.peakTrpWiz < attacker.trpWiz) {
				attacker.peakTrpWiz = attacker.trpWiz
			}

			attacker.lastAction = new Date()
			// save updated attacker and defender
			await attacker.save()
			await defender.save()

			// await awardAchievements(attacker)
			await takeSnapshot(attacker)
			await takeSnapshot(defender)
		} else {
			// console.log('not allowed')
			return res.json({
				error: `Something went wrong. Attack could not be completed.`,
			})
		}

		// console.log('resultArray', resultArray)
		return res.json(resultArray)
	} catch (err) {
		console.log(err)
	}
}

const router = Router()

router.post('/', user, auth, attack)

export default router
