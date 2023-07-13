import { min } from 'class-validator'
import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import {
	calcPCI,
	calcSizeBonus,
	exploreAlt,
	getNetworth,
} from './actions/actions'
// import Empire from '../entity/Empire'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import { INDUSTRY_MULT } from '../config/conifg'

function getRandomInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min) + min) //The maximum is exclusive and the minimum is inclusive
}

export const useTurn = async (
	type: string,
	turns: number,
	empireId: number,
	condensed: boolean
) => {
	let taken: number = 0
	let overall = {}
	let statsArray = []
	let turnResult = 0
	let interruptable = true

	let deserted = 1

	const empire = await Empire.findOneOrFail({ id: empireId })

	if (empire.tax < 1) {
		empire.tax = 1
	}

	if (turns > empire.turns) {
		return { message: 'not enough turns available' }
	} else if (turns === 0) {
		return { message: 'specify number of turns to use' }
	}

	while (taken < turns) {
		let current = {}
		taken++
		let trouble = 0
		let troubleFood = false
		let troubleLoan = false
		let troubleCash = false
		empire.networth = getNetworth(empire)

		if (type === 'explore') {
			turnResult += exploreAlt(empire)
		}

		// size bonus penalty
		let size = calcSizeBonus(empire)

		// savings interest
		let withdraw = 0

		// savings interest
		if (empire.turnsUsed > 200) {
			let bankMax = empire.networth * 100
			if (empire.bank > bankMax) {
				withdraw = empire.bank - bankMax
				empire.bank -= withdraw
				empire.cash += withdraw
			} else {
				let saveRate = 0.4 + size
				let bankInterest = Math.round(empire.bank * (saveRate / 52 / 100))
				empire.bank = Math.min(empire.bank + bankInterest, bankMax)
			}
		}

		// FIXME: withdraw not accumulating in condensed view?
		current['withdraw'] = withdraw

		// loan interest
		let loanMax = empire.networth * 50
		let loanRate = 7.5 + size
		let loanInterest = Math.round(empire.loan * (loanRate / 52 / 100))
		empire.loan += loanInterest
		current['loanInterest'] = loanInterest
		// income/expenses/loan

		// takes place of calcFinances function
		let income =
			Math.round(
				calcPCI(empire) *
					(empire.tax / 100) *
					(empire.health / 100) *
					empire.peasants +
					empire.bldCash * 500
			) / size

		let loan = Math.round(empire.loan / 200)

		let expenses = Math.round(
			empire.trpArm * 1 +
				empire.trpLnd * 2.5 +
				empire.trpFly * 4 +
				empire.trpSea * 7 +
				empire.land * 8 +
				empire.trpWiz * 0.5
		)

		//set up race/era modifier
		let expensesBonus = Math.min(
			0.5,
			(raceArray[empire.race].mod_expenses + 100) / 100 -
				1 +
				empire.bldCost / Math.max(empire.land, 1)
		)

		expenses -= Math.round(expenses * expensesBonus)

		if (type === 'cash') {
			income = Math.round(income * 1.25)
		}

		//TODO: war tax
		let wartax = 0

		// net income
		if (type === 'heal') {
			income = income * 0.75
		}
		let money = income - (expenses + wartax)

		empire.cash += money

		// handle loan separately
		if (empire.cash < 0) {
			trouble |= 1 // turns trouble cash
			troubleCash = true
		}

		//more loan stuff
		let loanpayed = 0
		let loanEmergencyLimit = loanMax * 2

		if (trouble === 1 && troubleCash && empire.loan > loanEmergencyLimit) {
			trouble |= 2
			troubleLoan = true
			empire.cash = 0
			loanpayed = 0
		} else {
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		}

		empire.cash -= loanpayed
		empire.loan -= loanpayed

		//adjust net income
		money -= loanpayed
		if (type === 'cash') {
			turnResult += money
		}

		current['income'] = income
		current['expenses'] = expenses
		current['wartax'] = wartax
		current['loanpayed'] = loanpayed
		current['money'] = money

		// industry
		let indMultiplier = 1
		if (type === 'industry') {
			indMultiplier = 1.25
		}
		if (type === 'heal') {
			indMultiplier = 0.75
		}

		let trparm = Math.ceil(
			empire.bldTroop *
				(empire.indArmy / 100) *
				1.2 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trplnd = Math.ceil(
			empire.bldTroop *
				(empire.indLnd / 100) *
				0.6 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trpfly = Math.ceil(
			empire.bldTroop *
				(empire.indFly / 100) *
				0.3 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trpsea = Math.ceil(
			empire.bldTroop *
				(empire.indSea / 100) *
				0.2 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)

		empire.trpArm += trparm
		empire.trpLnd += trplnd
		empire.trpFly += trpfly
		empire.trpSea += trpsea

		current['trpArm'] = trparm
		current['trpLnd'] = trplnd
		current['trpFly'] = trpfly
		current['trpSea'] = trpsea

		// update food

		// takes place of calcProvisions function
		let production =
			10 * empire.freeLand +
			empire.bldFood *
				85 *
				Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1))
		production *= (100 + raceArray[empire.race].mod_foodpro) / 100
		let foodpro = Math.round(production)

		let consumption =
			empire.trpArm * 0.05 +
			empire.trpLnd * 0.03 +
			empire.trpFly * 0.02 +
			empire.trpSea * 0.01 +
			empire.peasants * 0.01 +
			empire.trpWiz * 0.25
		consumption *= (100 + raceArray[empire.race].mod_foodcon) / 100
		let foodcon = Math.round(consumption)

		if (type === 'farm') {
			foodpro = Math.round(1.25 * foodpro)
		}
		if (type === 'heal') {
			foodpro = Math.round(0.75 * foodpro)
		}

		let food = foodpro - foodcon
		empire.food += food
		if (type === 'farm') {
			turnResult += food
		}
		if (empire.food < 0) {
			empire.food = 0
			trouble |= 4
			troubleFood = true
		}

		current['foodpro'] = foodpro
		current['foodcon'] = foodcon
		current['food'] = food

		// health
		if (empire.health < 100 - Math.max((empire.tax - 10) / 2, 0)) {
			empire.health++
		}

		// gain 1 additional health per turn used healing
		if (type === 'heal') {
			empire.health += 1
		}

		// update population
		let taxrate = empire.tax / 100
		let taxpenalty = 0
		if (taxrate > 0.4) {
			taxpenalty = (taxrate - 0.4) / 2
		} else if (taxrate < 0.2) {
			taxpenalty = (taxrate - 0.2) / 2
		} else {
			taxpenalty = 0
		}

		let popBase = Math.round(
			(empire.land * 2 + empire.freeLand * 5 + empire.bldPop * 60) /
				(0.95 + taxrate + taxpenalty)
		) // 14495

		let peasants = 0
		let peasantsMult = 1

		if (empire.peasants !== popBase) {
			peasants = (popBase - empire.peasants) / 20
		}

		if (peasants > 0) {
			peasantsMult = 4 / ((empire.tax + 15) / 20) - 7 / 9
		}
		if (peasants < 0) {
			peasantsMult = 1 / (4 / (empire.tax + 15) / 20 - 7 / 9)
		}

		peasants = Math.round(peasants * peasantsMult * peasantsMult)

		if (empire.peasants + peasants < 1) {
			peasants = 1 - empire.peasants
		}
		empire.peasants += peasants
		current['peasants'] = peasants

		// gain magic energy
		let runeMultiplier = 1
		if (type === 'meditate') {
			runeMultiplier = 1.25
		}
		if (type === 'heal') {
			runeMultiplier = 0.75
		}

		let runes = 0
		if (empire.bldWiz / empire.land > 0.15) {
			runes = Math.round(
				getRandomInt(
					Math.round(empire.bldWiz * 1.1),
					Math.round(empire.bldWiz * 1.5)
				) * runeMultiplier
			)
		} else {
			runes = Math.round(empire.bldWiz * 1.1 * runeMultiplier)
		}
		runes = Math.round(
			runes *
				((100 +
					raceArray[empire.race].mod_runepro +
					eraArray[empire.era].mod_runepro) /
					100)
		)
		empire.runes += runes
		current['runes'] = runes

		// add/lose wizards
		let trpWiz = 0

		if (empire.trpWiz < empire.bldWiz * 25) {
			trpWiz = empire.bldWiz * 0.45
		} else if (empire.trpWiz < empire.bldWiz * 50) {
			trpWiz = empire.bldWiz * 0.3
		} else if (empire.trpWiz < empire.bldWiz * 90) {
			trpWiz = empire.bldWiz * 0.15
		} else if (empire.trpWiz < empire.bldWiz * 100) {
			trpWiz = empire.bldWiz * 0.1
		} else if (empire.trpWiz < empire.bldWiz * 175) {
			trpWiz = empire.bldWiz * -0.05
		}
		// console.log(trpWiz)
		trpWiz = Math.round(
			trpWiz *
				Math.sqrt(
					1 -
						((trpWiz / Math.max(1, Math.abs(trpWiz))) * 0.75 * empire.bldWiz) /
							empire.land
				)
		)

		// console.log(trpWiz)
		empire.trpWiz += trpWiz
		current['trpWiz'] = trpWiz

		// current['result'] = turnResult

		// console.log(current)
		Object.entries(current).forEach((entry) => {
			if (overall[entry[0]]) {
				overall[entry[0]] += entry[1]
			} else {
				overall[entry[0]] = entry[1]
			}
		})

		if (!condensed || taken === turns || trouble === 6) {
			if (condensed) {
				statsArray.push(overall)
			} else statsArray.push(current)
		}

		empire.turnsUsed++
		empire.turns--

		if (trouble && (troubleLoan || troubleFood)) {
			empire.peasants -= Math.round(empire.peasants * 0.03)
			empire.trpArm -= Math.round(empire.trpArm * 0.03)
			empire.trpLnd -= Math.round(empire.trpLnd * 0.03)
			empire.trpFly -= Math.round(empire.trpFly * 0.03)
			empire.trpSea -= Math.round(empire.trpSea * 0.03)
			empire.trpWiz -= Math.round(empire.peasants * 0.03)
			deserted *= 1 - 0.3
			if (!interruptable) {
				let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let message = {
					desertion: `${percent}% of your people, troops, and wizards have deserted due to lack of resources.`,
				}
				current['messages'] = message
			} else {
				let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let message = {
					desertion: `${percent}% of your people, troops, and wizards have deserted due to lack of resources. Turns have been stopped to prevent further losses.`,
				}
				current['messages'] = message
				break
			}
		}

		empire.networth = getNetworth(empire)
		await empire.save()
	}

	return statsArray
}

const useTurns = async (req: Request, res: Response) => {
	const { type, turns, empireId, condensed } = req.body

	// const user = res.locals.user
	// const empireId = res.locals.user.empire.empireId

	const response = await useTurn(type, turns, empireId, condensed)

	return res.json(response)
}

// for use in loops such as build and magic functions
export const useTurnInternal = (
	type: string,
	turns: number,
	empire: Empire,
	condensed: boolean
) => {
	let taken: number = 0
	let overall = {}
	let statsArray = []
	let turnResult = 0
	let interruptable = true

	let deserted = 1

	// const empire = await Empire.findOneOrFail({ id: empireId })

	if (empire.tax < 1) {
		empire.tax = 1
	}

	if (turns > empire.turns) {
		return { message: 'not enough turns available' }
	} else if (turns === 0) {
		return { message: 'specify number of turns to use' }
	}

	while (taken < turns) {
		let current = {}
		taken++
		let trouble = 0
		let troubleFood = false
		let troubleLoan = false
		let troubleCash = false
		empire.networth = getNetworth(empire)

		if (type === 'explore') {
			turnResult += exploreAlt(empire)
		}

		// size bonus penalty
		let size = calcSizeBonus(empire)

		// savings interest
		let withdraw = 0

		// savings interest
		if (empire.turnsUsed > 200) {
			let bankMax = empire.networth * 100
			if (empire.bank > bankMax) {
				withdraw = empire.bank - bankMax
				empire.bank -= withdraw
				empire.cash += withdraw
			} else {
				let saveRate = 0.4 + size
				let bankInterest = Math.round(empire.bank * (saveRate / 52 / 100))
				empire.bank = Math.min(empire.bank + bankInterest, bankMax)
			}
		}

		// FIXME: withdraw not accumulating in condensed view?
		current['withdraw'] = withdraw

		// loan interest
		let loanMax = empire.networth * 50
		let loanRate = 7.5 + size
		let loanInterest = Math.round(empire.loan * (loanRate / 52 / 100))
		// empire.loan += loanInterest

		current['loanInterest'] = loanInterest

		// income/expenses/loan

		// takes place of calcFinances function
		let income =
			Math.round(
				calcPCI(empire) *
					(empire.tax / 100) *
					(empire.health / 100) *
					empire.peasants +
					empire.bldCash * 500
			) / size

		let loan = Math.round(empire.loan / 200)

		let expenses = Math.round(
			empire.trpArm * 1 +
				empire.trpLnd * 2.5 +
				empire.trpFly * 4 +
				empire.trpSea * 7 +
				empire.land * 8 +
				empire.trpWiz * 0.5
		)

		//TODO: set up race/era modifier
		let expensesBonus = Math.min(
			0.5,
			(raceArray[empire.race].mod_expenses + 100) / 100 -
				1 +
				empire.bldCost / Math.max(empire.land, 1)
		)

		expenses -= Math.round(expenses * expensesBonus)

		if (type === 'cash') {
			income = Math.round(income * 1.25)
		}

		//TODO: war tax
		let wartax = 0

		// net income
		let money = income - (expenses + wartax)

		// empire.cash += money

		// handle loan separately
		if (empire.cash < 0) {
			trouble |= 1 // turns trouble cash
			troubleCash = true
		}

		//TODO: more loan stuff
		let loanpayed = 0
		let loanEmergencyLimit = loanMax * 2

		if (trouble === 1 && troubleCash && empire.loan > loanEmergencyLimit) {
			trouble |= 2
			troubleLoan = true
			empire.cash = 0
			loanpayed = 0
		} else {
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		}

		empire.cash -= loanpayed
		empire.loan -= loanpayed

		//adjust net income
		money -= loanpayed
		if (type === 'cash') {
			turnResult += money
		}

		current['income'] = income
		current['expenses'] = expenses
		current['wartax'] = wartax
		current['loanpayed'] = loanpayed
		current['money'] = money

		// industry
		let indMultiplier = 1
		if (type === 'industry') {
			indMultiplier = 1.25
		}

		let trparm = Math.ceil(
			empire.bldTroop *
				(empire.indArmy / 100) *
				1.2 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trplnd = Math.ceil(
			empire.bldTroop *
				(empire.indLnd / 100) *
				0.6 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trpfly = Math.ceil(
			empire.bldTroop *
				(empire.indFly / 100) *
				0.3 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)
		let trpsea = Math.ceil(
			empire.bldTroop *
				(empire.indSea / 100) *
				0.2 *
				INDUSTRY_MULT *
				indMultiplier *
				((100 +
					raceArray[empire.race].mod_industry +
					eraArray[empire.era].mod_industry) /
					100)
		)

		// empire.trpArm += trparm
		// empire.trpLnd += trplnd
		// empire.trpFly += trpfly
		// empire.trpSea += trpsea

		current['trpArm'] = trparm
		current['trpLnd'] = trplnd
		current['trpFly'] = trpfly
		current['trpSea'] = trpsea

		// update food

		// takes place of calcProvisions function
		let production =
			10 * empire.freeLand +
			empire.bldFood *
				85 *
				Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1))
		production *= (100 + raceArray[empire.race].mod_foodpro) / 100
		let foodpro = Math.round(production)

		let consumption =
			empire.trpArm * 0.05 +
			empire.trpLnd * 0.03 +
			empire.trpFly * 0.02 +
			empire.trpSea * 0.01 +
			empire.peasants * 0.01 +
			empire.trpWiz * 0.25
		consumption *= (100 + raceArray[empire.race].mod_foodcon) / 100
		let foodcon = Math.round(consumption)

		if (type === 'farm') {
			foodpro = Math.round(1.25 * foodpro)
		}
		let food = foodpro - foodcon
		// empire.food += food
		if (type === 'farm') {
			turnResult += food
		}
		if (empire.food < 0) {
			empire.food = 0
			trouble |= 4
			troubleFood = true
		}

		current['foodpro'] = foodpro
		current['foodcon'] = foodcon
		current['food'] = food

		// health
		if (empire.health < 100 - Math.max((empire.tax - 10) / 2, 0)) {
			empire.health++
		}

		// update population
		let taxrate = empire.tax / 100
		let taxpenalty = 0
		if (taxrate > 0.4) {
			taxpenalty = (taxrate - 0.4) / 2
		} else if (taxrate < 0.2) {
			taxpenalty = (taxrate - 0.2) / 2
		} else {
			taxpenalty = 0
		}

		let popBase = Math.round(
			(empire.land * 2 + empire.freeLand * 5 + empire.bldPop * 60) /
				(0.95 + taxrate + taxpenalty)
		) // 14495

		let peasants = 0
		let peasantsMult = 1

		if (empire.peasants !== popBase) {
			peasants = (popBase - empire.peasants) / 20
		}

		if (peasants > 0) {
			peasantsMult = 4 / ((empire.tax + 15) / 20) - 7 / 9
		}
		if (peasants < 0) {
			peasantsMult = 1 / (4 / (empire.tax + 15) / 20 - 7 / 9)
		}

		peasants = Math.round(peasants * peasantsMult * peasantsMult)

		if (empire.peasants + peasants < 1) {
			peasants = 1 - empire.peasants
		}
		// empire.peasants += peasants
		current['peasants'] = peasants

		// gain magic energy
		let runeMultiplier = 1
		if (type === 'meditate') {
			runeMultiplier = 1.25
		}

		let runes = 0
		if (empire.bldWiz / empire.land > 0.15) {
			runes = Math.round(
				getRandomInt(
					Math.round(empire.bldWiz * 1.1),
					Math.round(empire.bldWiz * 1.5)
				) * runeMultiplier
			)
		} else {
			runes = Math.round(empire.bldWiz * 1.1 * runeMultiplier)
		}
		runes = Math.round(
			runes *
				((100 +
					raceArray[empire.race].mod_runepro +
					eraArray[empire.era].mod_runepro) /
					100)
		)
		// empire.runes += runes
		current['runes'] = runes

		// add/lose wizards
		let trpWiz = 0

		if (empire.trpWiz < empire.bldWiz * 25) {
			trpWiz = empire.bldWiz * 0.45
		} else if (empire.trpWiz < empire.bldWiz * 50) {
			trpWiz = empire.bldWiz * 0.3
		} else if (empire.trpWiz < empire.bldWiz * 90) {
			trpWiz = empire.bldWiz * 0.15
		} else if (empire.trpWiz < empire.bldWiz * 100) {
			trpWiz = empire.bldWiz * 0.1
		} else if (empire.trpWiz > empire.bldWiz * 175) {
			trpWiz = empire.trpWiz * -0.05
		}
		// console.log(trpWiz)
		trpWiz = Math.round(
			trpWiz *
				Math.sqrt(
					1 -
						((trpWiz / Math.max(1, Math.abs(trpWiz))) * 0.75 * empire.bldWiz) /
							empire.land
				)
		)

		// console.log(trpWiz)
		// empire.trpWiz += trpWiz
		current['trpWiz'] = trpWiz

		// current['result'] = turnResult

		// console.log(current)
		Object.entries(current).forEach((entry) => {
			if (overall[entry[0]]) {
				overall[entry[0]] += entry[1]
			} else {
				overall[entry[0]] = entry[1]
			}
		})

		if (!condensed || taken === turns || trouble === 6) {
			if (condensed) {
				statsArray.push(overall)
			} else statsArray.push(current)
		}

		if (trouble && (troubleLoan || troubleFood)) {
			empire.peasants -= Math.round(empire.peasants * 0.03)
			empire.trpArm -= Math.round(empire.trpArm * 0.03)
			empire.trpLnd -= Math.round(empire.trpLnd * 0.03)
			empire.trpFly -= Math.round(empire.trpFly * 0.03)
			empire.trpSea -= Math.round(empire.trpSea * 0.03)
			empire.trpWiz -= Math.round(empire.peasants * 0.03)
			deserted *= 1 - 0.3
			if (!interruptable) {
				let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let message = {
					desertion: `${percent}% of your people, troops, and wizards have deserted due to lack of resources.`,
				}
				current['messages'] = message
			} else {
				let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let message = {
					desertion: `${percent}% of your people, troops, and wizards have deserted due to lack of resources. Turns have been stopped to prevent further losses.`,
				}
				current['messages'] = message
				break
			}
		}

		// empire.networth = getNetworth(empire)
		// await empire.save()
	}

	return statsArray
}

const router = Router()

//TODO: move to empire route and require auth and user
router.post('/', useTurns)

export default router
