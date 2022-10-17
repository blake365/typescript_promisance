import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import EmpireEffect from '../entity/EmpireEffect'

import { eraArray } from '../config/eras'
import { raceArray } from '../config/races'

let troopTypes = ['trparm', 'trplnd', 'trpfly', 'trpsea']

function getRandomInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min) + min) //The maximum is exclusive and the minimum is inclusive
}

const calcUnitPower = (empire: Empire, unit: string, mode: string) => {
	let lookup = ''
	if ((mode = 'o')) {
		lookup = 'o_' + unit
	} else if ((mode = 'd')) {
		lookup = 'd_' + unit
	}

	let quantity = empire[unit]

	let power = eraArray[empire.era][lookup] * quantity
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

function isTimeGate(effect: Effect) {
	if (effect.empireEffectName === 'time gate') {
		return false
	} else true
}

const attack = async (req: Request, res: Response) => {
	const { attackType, defenderId } = req.body
	const { uuid } = req.params

	let offPower = 0
	let defPower = 0
	let canAttack = false

	let returnText = ''

	try {
		const attacker = await Empire.findOneOrFail({ uuid })

		const defender = await Empire.findOneOrFail({ empireId: defenderId })

		// calculate power levels
		troopTypes.forEach((type) => {
			offPower += calcUnitPower(attacker, type, 'o')
		})

		troopTypes.forEach((type) => {
			defPower += calcUnitPower(defender, type, 'd')
		})

		// apply race bonus
		offPower *= raceArray[attacker.race].mod_offense
		defPower *= raceArray[defender.race].mod_defense

		// reduce power level based on health
		offPower *= attacker.health
		defPower *= defender.health

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

		if (canAttack) {
			// TODO: clan stuff with shared def

			// add defense for guard towers
			let towerDef =
				defender.bldDef *
				450 *
				Math.min(1, defender.trpArm / (150 * defender.bldDef + 1))
			defPower += towerDef

			// determine how many units each empire is about to lose in battle

			// modification to attacker losses (towers excluded)
			let omod = Math.sqrt((defPower - towerDef) / (offPower + 1))
			// modification to enemy losses
			let dmod = Math.sqrt(offPower / (defPower + 1))

			let attackLosses = {}
			let defenseLosses = {}
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
					attackLosses = { unit: 'trparm', amount: result.attackLosses }
					defenseLosses = { unit: 'trparm', amount: result.defendLosses }
				case 'trplnd':
					result = calcUnitLosses(
						attacker.trpLnd,
						defender.trpLnd,
						0.1155,
						0.0705,
						omod,
						dmod
					)
					attackLosses = { unit: 'trplnd', amount: result.attackLosses }
					defenseLosses = { unit: 'trplnd', amount: result.defendLosses }
				case 'trpfly':
					result = calcUnitLosses(
						attacker.trpFly,
						defender.trpFly,
						0.1155,
						0.0705,
						omod,
						dmod
					)
					attackLosses = { unit: 'trpfly', amount: result.attackLosses }
					defenseLosses = { unit: 'trpfly', amount: result.defendLosses }
				case 'trpsea':
					result = calcUnitLosses(
						attacker.trpSea,
						defender.trpSea,
						0.1155,
						0.0705,
						omod,
						dmod
					)
					attackLosses = { unit: 'trpsea', amount: result.attackLosses }
					defenseLosses = { unit: 'trpsea', amount: result.defendLosses }
				// TODO: suprise attack and standard attack
			}
		}
	} catch (err) {
		console.log(err)
	}
}
