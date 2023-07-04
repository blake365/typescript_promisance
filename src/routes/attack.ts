import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import EmpireEffect from '../entity/EmpireEffect'
import auth from '../middleware/auth'
import user from '../middleware/user'
import { useTurnInternal } from './useturns'

import { eraArray } from '../config/eras'
import { raceArray } from '../config/races'
import { getNetworth } from './actions/actions'

let troopTypes = ['trparm', 'trplnd', 'trpfly', 'trpsea']

function getRandomInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min) + min) //The maximum is exclusive and the minimum is inclusive
}

const calcUnitPower = (empire: Empire, unit: string, mode: string) => {
	// convert unit from trparm to trpArm
	let unitM =
		unit.substring(0, 3) + unit.charAt(3).toUpperCase() + unit.substring(4)

	let lookup = ''
	if ((mode = 'o')) {
		lookup = 'o_' + unit
	} else if ((mode = 'd')) {
		lookup = 'd_' + unit
	}
	// console.log(empire)
	// console.log(unit)
	// console.log(lookup)

	let quantity = empire[unitM]
	// console.log('quantity: ', quantity)

	let power = eraArray[empire.era][lookup] * quantity

	// console.log('power: ', power)
	return power
}

// calculate number of units lost for attacker and defender
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

	let attackLosses = Math.min(
		getRandomInt(0, Math.ceil(attackUnits * oper * omod) + 1),
		attackUnits
	)

	let maxKill =
		Math.round(0.9 * attackUnits) +
		getRandomInt(0, Math.round(0.2 * attackUnits) + 1)

	let defendLosses = Math.min(
		getRandomInt(0, Math.ceil(defendUnits * dper * dmod) + 1),
		defendUnits,
		maxKill
	)

	console.log('attackLosses: ', attackLosses)
	console.log('defendLosses: ', defendLosses)

	return { attackLosses: attackLosses, defendLosses: defendLosses }
}

function isOld(createdAt: Date, effectValue: number) {
	let effectAge = (Date.now().valueOf() - new Date(createdAt).getTime()) / 60000
	effectAge = Math.floor(effectAge)

	// console.log(effectAge)
	// console.log(effectValue)

	if (effectAge > effectValue) {
		return false
	} else {
		return true
	}
}

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

function isTimeGate(effect: Effect) {
	if (effect.empireEffectName === 'time gate') {
		return false
	} else true
}

const destroyBuildings = async (
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
	}

	let loss = Math.min(
		getRandomInt(1, Math.ceil(defender[type] * pcloss + 2)),
		defender[type]
	)

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
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
			attacker[type] += gain
			buildGain[type] += gain
			attacker.freeLand += loss - gain
			buildGain['freeLand'] += loss - gain
			break
		case 'surprise':
		case 'trparm':
			// attacks don't steal buildings, they just destroy them
			defender.land -= loss
			defender[type] -= loss
			buildLoss[type] += loss
			attacker.land += loss
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
			defender[type] -= loss
			buildLoss[type] += loss
			defender.freeLand += loss - gain
			// buildLoss['freeLand'] will be negative because the free land is increasing as buildings are destroyed
			buildLoss['freeLand'] -= loss - gain

			attacker.land += gain
			attacker.freeLand += gain
			buildGain['freeLand'] += gain
			break
	}

	// console.log('buildLoss: ', buildLoss)
	// console.log('buildGain: ', buildGain)

	return { buildGain, buildLoss }
}

const attack = async (req: Request, res: Response) => {
	// TODO: use two turns for attacks
	// only send troops relevant to the attack type
	console.log(req.body)
	console.log(req.params)
	const { attackType, defenderId, type, number, empireId } = req.body

	let offPower = 0
	let defPower = 0
	let canAttack = false

	let returnText = ''
	let attackDescription = {}
	let resultArray = []

	try {
		const attacker = await Empire.findOneOrFail({ empireId: empireId })

		const defender = await Empire.findOneOrFail({ empireId: defenderId })

		// calculate power levels
		if (attackType === 'standard') {
			troopTypes.forEach((type) => {
				offPower += calcUnitPower(attacker, type, 'o')
			})

			troopTypes.forEach((type) => {
				defPower += calcUnitPower(defender, type, 'd')
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

		//TODO: war flag +20% when at war with other clan

		// check eras and time gates
		if (attacker.era === defender.era) {
			canAttack = true
		} else if (attacker.era !== defender.era) {
			// use attacker time gate first then try defender
			let effects = await EmpireEffect.find({
				where: { effectOwnerId: attacker.empireId },
			})
			let currentEffects = effects.filter((effect) =>
				isOld(effect.createdAt, effect.empireEffectValue)
			)
			let timeEffects = currentEffects.filter((effect) => isTimeGate(effect))
			console.log(timeEffects)

			if (timeEffects[0]) {
				canAttack = true
				returnText = 'Your army travels through your Time Gate...'
			} else {
				// try defender time gate
				let effects = await EmpireEffect.find({
					where: {
						effectOwnerId: defender.empireId,
					},
				})
				let currentEffects = effects.filter((effect) =>
					isOld(effect.createdAt, effect.empireEffectValue)
				)
				let timeEffects = currentEffects.filter((effect) => isTimeGate(effect))
				console.log(timeEffects)
				if (timeEffects[0]) {
					canAttack = true
					returnText = 'Your army travels through your opponents Time Gate...'
				} else {
					returnText =
						'You must open a Time Gate to attack players in another Era'
				}
			}
		}

		console.log('can attack', canAttack)
		if (canAttack) {
			let attackTurns = useTurnInternal('attack', 2, attacker, true)

			let attackRes = attackTurns[0]
			attackTurns = attackTurns[0]
			console.log(attackRes)

			attacker.cash =
				attacker.cash +
				attackRes.withdraw +
				attackRes.money -
				attackRes.loanpayed

			attacker.loan -= attackRes.loanpayed + attackRes?.loanInterest
			attacker.trpArm += attackRes.trpArm
			attacker.trpLnd += attackRes.trpLnd
			attacker.trpFly += attackRes.trpFly
			attacker.trpSea += attackRes.trpSea
			attacker.food += attackRes.food
			attacker.peasants += attackRes.peasants
			attacker.runes += attackRes.runes
			attacker.trpWiz += attackRes.trpWiz
			attacker.turns -= 2
			attacker.turnsUsed += 2

			attacker.offTotal++
			defender.defTotal++
			// TODO: clan stuff with shared def

			// add defense for guard towers
			let towerDef =
				defender.bldDef *
				450 *
				Math.min(1, defender.trpArm / (150 * defender.bldDef + 1))

			// console.log('tower def', towerDef)
			defPower += towerDef

			console.log('off power', offPower)
			console.log('def power', defPower)
			// determine how many units each empire is about to lose in battle

			// modification to attacker losses (towers excluded)
			let omod = Math.sqrt((defPower - towerDef) / (offPower + 1))
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
				//FIXME: surprise attack and standard attack losses
				case 'surprise':
					omod *= 1.2
				case 'standard':
					result = calcUnitLosses(
						attacker.trpArm,
						defender.trpArm,
						0.1455,
						0.0805,
						omod,
						dmod
					)
					attackLosses['trparm'] = result.attackLosses
					defenseLosses['trparm'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.1285,
						0.073,
						omod,
						dmod
					)
					attackLosses['trplnd'] = result.attackLosses
					defenseLosses['trplnd'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.0788,
						0.0675,
						omod,
						dmod
					)
					attackLosses['trpfly'] = result.attackLosses
					defenseLosses['trpfly'] = result.defendLosses
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.065,
						0.0555,
						omod,
						dmod
					)
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
			} else if (attackType === 'surprise' || attackType === 'standard') {
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

			if (offPower > defPower * 1.05) {
				// won = true
				let buildLoss: buildLoss = {}
				let buildGain: buildGain = {}

				destroyBuildings(
					attackType,
					0.07,
					0.7,
					'bldCash',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07,
					0.7,
					'bldPop',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07,
					0.5,
					'bldTroop',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07,
					0.7,
					'bldCost',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07,
					0.3,
					'bldFood',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.07,
					0.6,
					'bldWiz',
					defender,
					attacker,
					buildLoss,
					buildGain
				)
				destroyBuildings(
					attackType,
					0.11,
					0.6,
					'bldDef',
					defender,
					attacker,
					buildLoss,
					buildGain
				) // towers more likely to be taken, since they are encountered first
				destroyBuildings(
					attackType,
					0.1,
					0.0,
					'freeLand',
					defender,
					attacker,
					buildLoss,
					buildGain
				) // 3rd argument MUST be 0 (for Standard attacks)

				console.log('buildGain', buildGain)
				// console.log('buildLoss', buildLoss)
				// TODO: create return text for captured buildings

				// take enemy land
				// attacker.land += buildGain.freeLand

				returnText +=
					'' +
					buildGain.freeLand +
					' acres of land were captured from ' +
					defender.name +
					'(#' +
					defender.id +
					')'

				attackDescription = {
					result: 'success',
					attackType: attackType,
					troopType: eraArray[attacker.era][attackType],
					message: returnText,
					troopLoss: attackLosses,
					troopKilled: defenseLosses,
					buildingGain: buildGain,
				}
				// attacker off success
				attacker.offSucc++

				//TODO: check for kill
			} else {
				let landLoss = 0

				attackDescription = {
					result: 'fail',
					attackType: attackType,
					troopType: eraArray[attacker.era][attackType],
					message: returnText,
					troopLoss: attackLosses,
					troopKilled: defenseLosses,
					buildingGain: null,
				}
				// defender def success
				defender.defSucc++
			}

			attackTurns['attack'] = attackDescription
			resultArray.push(attackTurns)
			// attacker.networth = getNetworth(attacker)
			// defender.networth = getNetworth(defender)

			// save updated attacker and defender
			await attacker.save()
			await defender.save()

			//TODO: still need news system
			// figure out return object
			// console.log(attackTurns)
			// console.log(returnText)
		}

		console.log('resultArray', resultArray)
		return res.json(resultArray)
	} catch (err) {
		console.log(err)
	}
}

const router = Router()

router.post('/', user, auth, attack)

export default router
