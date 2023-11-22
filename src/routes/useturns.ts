import { Request, Response, Router } from 'express'
import Empire from '../entity/Empire'
import Clan from '../entity/Clan'
import {
	calcPCI,
	calcSizeBonus,
	exploreAlt,
	getNetworth,
} from './actions/actions'
// import Empire from '../entity/Empire'
import { raceArray } from '../config/races'
import { eraArray } from '../config/eras'
import {
	BANK_LOANRATE,
	BANK_SAVERATE,
	BASE_LUCK,
	INDUSTRY_MULT,
	PVTM_TRPARM,
	PVTM_TRPFLY,
	PVTM_TRPLND,
	PVTM_TRPSEA,
	TURNS_PROTECTION,
} from '../config/conifg'
import user from '../middleware/user'
import auth from '../middleware/auth'

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
	let desertionTurns = 0

	const empire = await Empire.findOneOrFail({ id: empireId })

	if (empire.flags === 1) {
		return { message: 'Your empire has been disabled by administration.' }
	}

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
		let message = {
			production: '',
			desertion: '',
		}
		taken++
		let trouble = 0
		let troubleFood = false
		let troubleLoan = false
		let troubleCash = false
		empire.networth = getNetworth(empire)

		// size bonus penalty
		let size = calcSizeBonus(empire)

		let luck = BASE_LUCK / size
		let lucky = Math.random() * 100 <= luck

		if (type === 'explore') {
			turnResult = exploreAlt(empire, lucky)
			// console.log(turnResult)
		}

		// console.log(lucky)
		// savings interest
		let withdraw = 0

		// savings interest
		if (empire.turnsUsed > TURNS_PROTECTION) {
			let bankMax = empire.networth * 100
			if (empire.bank > bankMax) {
				withdraw = empire.bank - bankMax
				empire.bank -= withdraw
				empire.cash += withdraw
			} else {
				let saveRate = BANK_SAVERATE - size
				let bankInterest = Math.round(empire.bank * (saveRate / 52 / 100))
				empire.bank = Math.min(empire.bank + bankInterest, bankMax)
			}
		}

		// withdraw not accumulating in condensed view?
		current['withdraw'] = withdraw

		// loan interest
		let loanMax = empire.networth * 50
		let loanRate = BANK_LOANRATE + size
		let loanInterest = Math.round(empire.loan * (loanRate / 52 / 100))
		empire.loan += loanInterest
		current['loanInterest'] = loanInterest
		// income/expenses/loan

		// takes place of calcFinances function
		let income = Math.round(
			(calcPCI(empire) *
				(empire.tax / 100) *
				(empire.health / 100) *
				empire.peasants +
				empire.bldCash * 500) /
				size
		)

		if (type === 'cash') {
			income = Math.round(income * 1.25)
			if (lucky) {
				income = Math.round(income * 1.5)
			}
		}
		if (type === 'heal') {
			income = Math.round(income * 0.75)
		}

		let loan = Math.round(empire.loan / 200)

		let expenses = Math.round(
			empire.trpArm * 0.5 +
				empire.trpLnd * 1.25 +
				empire.trpFly * 2 +
				empire.trpSea * 3.5 +
				empire.land * 4 +
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

		//war tax
		let wartax = 0
		if (empire.clanId !== 0) {
			let clan = await Clan.findOneOrFail({
				where: { id: empire.clanId },
				relations: ['relation'],
			})

			// console.log(clan)
			let relations = clan.relation.map((relation) => {
				if (relation.clanRelationFlags === 'war') {
					return relation.c_id2
				}
			})
			if (relations.length > 0) {
				wartax += (relations.length * empire.networth) / 100
				// active war tax
				if (type === 'war') {
					wartax += expenses / 10
				}
			}

			wartax = Math.ceil(wartax)
		}

		let corruption = 0
		if (empire.cash > empire.networth * 110) {
			let multiples = Math.floor(empire.cash / empire.networth) - 1
			corruption = Math.round(multiples * empire.networth * 0.001 * size)
			// console.log(corruption)
		}

		// net income
		let money = Math.round(income - (expenses + wartax + corruption))
		// console.log(money)

		empire.cash += money

		// handle loan separately
		if (empire.cash <= 0) {
			trouble |= 1 // turns trouble cash
			troubleCash = true
		}

		//more loan stuff
		let loanpayed
		let loanincrease
		let loanEmergencyLimit = loanMax * 2

		if (trouble && troubleCash && empire.loan > loanEmergencyLimit) {
			trouble |= 2
			troubleLoan = true
			empire.cash = 0
			loanpayed = 0
		} else if (troubleCash) {
			message['desertion'] =
				'You have run out of money! You rush to the bank to take out a loan.'
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		} else {
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		}

		// console.log(loanpayed)
		if (loanpayed >= 0) {
			empire.loan -= loanpayed
			empire.cash -= loanpayed
			money -= loanpayed
			if (empire.cash < 0) {
				empire.cash = 0
			}
		} else {
			loanincrease = loanpayed
			empire.loan -= loanincrease
			empire.cash = 0
			money += loanincrease
		}

		//adjust net income
		// money = money - loanpayed
		if (type === 'cash') {
			turnResult = money
			message['production'] = `You produced $${money} while cashing.`
		}

		// console.log(money)
		current['income'] = income
		empire.income += income
		current['expenses'] = expenses
		empire.expenses += expenses + wartax
		current['wartax'] = wartax
		current['corruption'] = corruption
		if (loanpayed < 0) {
			current['loanpayed'] = loanincrease
		} else current['loanpayed'] = loanpayed

		current['money'] = money

		// industry
		let indMultiplier = 1
		if (type === 'industry') {
			indMultiplier = 1.25
			if (lucky) {
				indMultiplier *= 1.5
			}
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

		empire.indyProd +=
			trparm * PVTM_TRPARM +
			trplnd * PVTM_TRPLND +
			trpfly * PVTM_TRPFLY +
			trpsea * PVTM_TRPSEA

		current['trpArm'] = trparm
		current['trpLnd'] = trplnd
		current['trpFly'] = trpfly
		current['trpSea'] = trpsea

		if (type === 'industry') {
			message['production'] = `You produced ${trparm} ${
				eraArray[empire.era].trparm
			}, ${trplnd} ${eraArray[empire.era].trplnd}, ${trpfly} ${
				eraArray[empire.era].trpfly
			}, and ${trpsea} ${eraArray[empire.era].trpsea}.`
		}

		// update food
		// takes place of calcProvisions function
		let production =
			10 * empire.freeLand +
			empire.bldFood *
				95 *
				Math.sqrt(1 - (0.75 * empire.bldFood) / Math.max(empire.land, 1))
		production *=
			(100 +
				raceArray[empire.race].mod_foodpro +
				eraArray[empire.era].mod_foodpro) /
			100
		let foodpro = Math.round(production)

		let consumption =
			empire.trpArm * 0.05 +
			empire.trpLnd * 0.03 +
			empire.trpFly * 0.02 +
			empire.trpSea * 0.01 +
			empire.peasants * 0.01 +
			empire.trpWiz * 0.25
		consumption *= (100 - raceArray[empire.race].mod_foodcon) / 100
		let foodcon = Math.round(consumption)

		if (type === 'farm') {
			foodpro = Math.round(1.25 * foodpro)
			if (lucky) {
				foodpro *= 1.5
			}
		}
		if (type === 'heal') {
			foodpro = Math.round(0.75 * foodpro)
		}

		let food = Math.round(foodpro - foodcon)
		empire.food += food
		if (type === 'farm') {
			turnResult = food
		}

		foodpro = Math.round(foodpro)

		current['foodpro'] = foodpro
		empire.foodpro += foodpro
		current['foodcon'] = foodcon
		empire.foodcon += foodcon
		current['food'] = food

		if (empire.food <= 0) {
			empire.food = 0
			trouble |= 4
			troubleFood = true
			current['food'] = 0
		}

		if (type === 'farm') {
			message['production'] = `You produced ${food} ${
				eraArray[empire.era].food
			}.`
		}

		// health
		// gain 1 additional health per turn used healing
		if (empire.health < 100 - Math.max((empire.tax - 25) / 2, 0)) {
			empire.health++
			if (type === 'heal' && empire.health < 100) {
				empire.health++
			}
		}
		if (empire.health > 100) {
			empire.health = 100
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
			(empire.land * 2 + empire.freeLand * 5 + empire.bldPop * 65) /
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
			if (lucky) {
				runeMultiplier *= 1.5
			}
		}
		if (type === 'heal') {
			runeMultiplier = 0.75
		}

		let runes = 0
		if (empire.bldWiz / empire.land > 0.15) {
			runes = Math.round(
				getRandomInt(
					Math.round(empire.bldWiz * 1.05),
					Math.round(empire.bldWiz * 1.35)
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

		if (type === 'meditate') {
			turnResult = runes
			message['production'] = `You produced ${runes} ${
				eraArray[empire.era].runes
			}.`
		}

		// add/lose wizards
		let trpWiz = 0

		if (empire.trpWiz < empire.bldWiz * 25) {
			trpWiz = empire.bldWiz * 0.45 * 0.9
		} else if (empire.trpWiz < empire.bldWiz * 50) {
			trpWiz = empire.bldWiz * 0.3 * 0.9
		} else if (empire.trpWiz < empire.bldWiz * 90) {
			trpWiz = empire.bldWiz * 0.15 * 0.9
		} else if (empire.trpWiz < empire.bldWiz * 100) {
			trpWiz = empire.bldWiz * 0.1 * 0.9
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
		empire.trpWiz += trpWiz
		current['trpWiz'] = trpWiz

		current['result'] = turnResult
		empire.turnsUsed++
		empire.turns--
		// console.log(current)
		// current['messages'] = message
		Object.entries(current).forEach((entry) => {
			if (overall[entry[0]]) {
				overall[entry[0]] += entry[1]
			} else {
				overall[entry[0]] = entry[1]
			}
		})

		// console.log(trouble, troubleCash, troubleLoan, troubleFood)
		// console.log(taken)

		if (trouble && (troubleLoan || troubleFood)) {
			// console.log(empire.peasants)
			// console.log(Math.round(empire.peasants * 0.03))
			empire.peasants -= Math.round(empire.peasants * 0.03)
			empire.trpArm -= Math.round(empire.trpArm * 0.03)
			empire.trpLnd -= Math.round(empire.trpLnd * 0.03)
			empire.trpFly -= Math.round(empire.trpFly * 0.03)
			empire.trpSea -= Math.round(empire.trpSea * 0.03)
			empire.trpWiz -= Math.round(empire.trpWiz * 0.03)
			// console.log(deserted)
			desertionTurns++
			deserted *= 1 - 0.3
			// console.log(deserted)
			if (!interruptable) {
				// let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let percent = 3 * desertionTurns
				message['desertion'] = `${percent}% of your ${
					eraArray[empire.era].peasants
				}, Troops, and ${
					eraArray[empire.era].trpwiz
				} have deserted due to lack of resources.`
				current['messages'] = message
				statsArray.push(current)
			} else {
				// let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let percent = 3 * desertionTurns
				// console.log(percent)
				message['desertion'] = `${percent}% of your ${
					eraArray[empire.era].peasants
				}, Troops, and ${
					eraArray[empire.era].trpwiz
				} have deserted due to lack of resources. Turns have been stopped to prevent further losses.`
				current['messages'] = message

				empire.networth = getNetworth(empire)
				await empire.save()
				statsArray.push(current)
				break
			}
		} else {
			current['messages'] = message
			current['result'] = turnResult
			current['type'] = type
			if (!condensed || taken === turns || trouble === 6) {
				if (condensed) {
					overall['messages'] = message
					// overall['result'] = turnResult
					overall['type'] = type
					statsArray.push(overall)
				} else statsArray.push(current)
			}
		}
	}

	empire.lastAction = new Date()
	empire.networth = getNetworth(empire)
	await empire.save()
	// console.log(statsArray)
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
	clan: Clan,
	condensed: boolean
) => {
	let taken: number = 0
	let overall = {}
	let statsArray = []
	let message = {
		error: '',
		production: '',
		desertion: '',
	}
	let turnResult = 0

	// console.log(type)
	let interruptable = false
	if (type === 'build' || type === 'demolish') {
		interruptable = true
	}

	if (empire.flags === 1) {
		message.error = 'Your empire has been disabled by administration.'
		statsArray.push(message)
		return statsArray
	}

	let deserted = 1
	let desertionTurns = 0

	// const empire = await Empire.findOneOrFail({ id: empireId })

	if (empire.tax < 1) {
		empire.tax = 1
	}

	if (turns > empire.turns) {
		message.error = 'not enough turns available'
		statsArray.push(message)
		return statsArray
	} else if (turns === 0) {
		message.error = 'specify number of turns to use'
		statsArray.push(message)
		return statsArray
	}

	while (taken < turns) {
		let current = {}
		taken++
		let trouble = 0
		let troubleFood = false
		let troubleLoan = false
		let troubleCash = false
		empire.networth = getNetworth(empire)

		// if (type === 'explore') {
		// 	turnResult += exploreAlt(empire)
		// }

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
				let saveRate = BANK_SAVERATE - size
				let bankInterest = Math.round(empire.bank * (saveRate / 52 / 100))
				empire.bank = Math.min(empire.bank + bankInterest, bankMax)
			}
		}

		// withdraw not accumulating in condensed view?
		current['withdraw'] = withdraw

		// loan interest
		let loanMax = empire.networth * 50
		let loanRate = BANK_LOANRATE + size
		let loanInterest = Math.round(empire.loan * (loanRate / 52 / 100))
		empire.loan += loanInterest
		current['loanInterest'] = loanInterest
		// income/expenses/loan

		// takes place of calcFinances function
		let income = Math.round(
			(calcPCI(empire) *
				(empire.tax / 100) *
				(empire.health / 100) *
				empire.peasants +
				empire.bldCash * 500) /
				size
		)

		let loan = Math.round(empire.loan / 200)

		let expenses = Math.round(
			empire.trpArm * 0.5 +
				empire.trpLnd * 1.25 +
				empire.trpFly * 2 +
				empire.trpSea * 3.5 +
				empire.land * 4 +
				empire.trpWiz * 0.25
		)

		// set up race/era modifier
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

		//war tax
		let wartax = 0
		if (empire.clanId !== 0) {
			// console.log('calculate war tax')
			// passive wartax
			// console.log(clan)
			if (clan && clan.relation) {
				let relations = clan.relation.map((relation) => {
					if (relation.clanRelationFlags === 'war') {
						return relation.c_id2
					}
				})
				// console.log(relations)
				if (relations.length > 0) {
					wartax += (relations.length * empire.networth) / 100
					// active war tax
					if (type === 'war') {
						wartax += expenses / 10
					}
				}
			}
			wartax = Math.ceil(wartax)
		}

		let corruption = 0
		if (empire.cash > empire.networth * 110) {
			let multiples = Math.floor(empire.cash / empire.networth) - 1
			corruption = Math.round(multiples * empire.networth * 0.001 * size)
			// console.log(corruption)
		}

		// net income
		let money = Math.round(income - (expenses + wartax + corruption))

		// empire.cash += money

		// handle loan separately
		if (empire.cash <= 0) {
			trouble |= 1 // turns trouble cash
			troubleCash = true
		}

		//more loan stuff
		let loanpayed
		let loanincrease
		let loanEmergencyLimit = loanMax * 2
		if (trouble && troubleCash && empire.loan > loanEmergencyLimit) {
			message['desertion'] =
				'You have run out of money and your loan is maxed out!'
			trouble |= 2
			troubleLoan = true
			empire.cash = 0
			loanpayed = 0
		} else if (troubleCash) {
			message['desertion'] =
				'You have run out of money! You rush to the bank to take out a loan.'
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		} else {
			loanpayed = Math.min(Math.round(empire.loan / 200), empire.cash)
		}

		// empire.cash -= loanpayed
		// empire.loan -= loanpayed

		//adjust net income
		// console.log(loanpayed)
		if (loanpayed >= 0) {
			empire.loan -= loanpayed
			empire.cash -= loanpayed
			money -= loanpayed
			if (empire.cash < 0) {
				empire.cash = 0
			}
		} else {
			loanincrease = loanpayed
			empire.loan -= loanincrease
			empire.cash = 0
			money += loanincrease
		}
		// if (type === 'cash') {
		// 	turnResult += money
		// }

		current['income'] = income
		current['expenses'] = expenses
		current['wartax'] = wartax
		current['corruption'] = corruption
		if (loanpayed < 0) {
			current['loanpayed'] = loanincrease
		} else current['loanpayed'] = loanpayed
		current['money'] = money

		// industry
		let indMultiplier = 1
		// if (type === 'industry') {
		// 	indMultiplier = 1.25
		// }

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
		consumption *= (100 - raceArray[empire.race].mod_foodcon) / 100
		let foodcon = Math.round(consumption)

		if (type === 'farm') {
			foodpro = Math.round(1.25 * foodpro)
		}
		let food = Math.round(foodpro - foodcon)
		// empire.food += food
		// if (type === 'farm') {
		// 	turnResult += food
		// }

		current['foodpro'] = foodpro
		current['foodcon'] = foodcon
		current['food'] = food

		if (empire.food <= 0) {
			empire.food = 0
			trouble |= 4
			troubleFood = true
			current['food'] = 0
		}

		// health
		if (empire.health < 100 - Math.max((empire.tax - 25) / 2, 0)) {
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
					Math.round(empire.bldWiz * 1.01),
					Math.round(empire.bldWiz * 1.3)
				) * runeMultiplier
			)
		} else {
			runes = Math.round(empire.bldWiz * 1.01 * runeMultiplier)
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
			trpWiz = empire.bldWiz * 0.45 * 1.25
		} else if (empire.trpWiz < empire.bldWiz * 50) {
			trpWiz = empire.bldWiz * 0.3 * 1.25
		} else if (empire.trpWiz < empire.bldWiz * 90) {
			trpWiz = empire.bldWiz * 0.15 * 1.25
		} else if (empire.trpWiz < empire.bldWiz * 100) {
			trpWiz = empire.bldWiz * 0.1 * 1.25
		} else if (empire.trpWiz > empire.bldWiz * 175) {
			trpWiz = empire.trpWiz * -0.05 * 1.25
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
		// current['messages'] = message
		Object.entries(current).forEach((entry) => {
			if (overall[entry[0]]) {
				overall[entry[0]] += entry[1]
			} else {
				overall[entry[0]] = entry[1]
			}
		})

		// console.log(overall['food'])

		if (empire.food + overall['food'] < 0) {
			trouble |= 4
			troubleFood = true
		}

		// console.log(current)
		// console.log(overall)
		// console.log(trouble, troubleCash, troubleLoan, troubleFood)
		// console.log(taken)

		if (trouble && (troubleLoan || troubleFood)) {
			empire.peasants -= Math.round(empire.peasants * 0.03)
			empire.trpArm -= Math.round(empire.trpArm * 0.03)
			empire.trpLnd -= Math.round(empire.trpLnd * 0.03)
			empire.trpFly -= Math.round(empire.trpFly * 0.03)
			empire.trpSea -= Math.round(empire.trpSea * 0.03)
			empire.trpWiz -= Math.round(empire.trpWiz * 0.03)
			deserted *= 1 - 0.3
			desertionTurns++
			if (!interruptable) {
				// let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let percent = 3 * desertionTurns
				message['desertion'] = `${percent}% of your ${
					eraArray[empire.era].peasants
				}, Troops, and ${
					eraArray[empire.era].trpwiz
				} have deserted due to lack of resources.`
				current['messages'] = message
				statsArray.push(current)
			} else {
				// let percent = condensed ? Math.round((1 - deserted) * 100) : 3
				let percent = 3 * desertionTurns
				// console.log(percent)
				message['desertion'] = `${percent}% of your ${
					eraArray[empire.era].peasants
				}, Troops, and ${
					eraArray[empire.era].trpwiz
				} have deserted due to lack of resources. Turns have been stopped to prevent further losses.`
				current['messages'] = message
				statsArray.push(current)
				break
			}
		} else {
			current['messages'] = message
			if (!condensed || taken === turns || trouble === 6) {
				if (condensed) {
					// console.log(overall)
					overall['messages'] = message
					statsArray.push(overall)
				} else statsArray.push(current)
			}
		}
	}

	// console.log(statsArray)
	return statsArray
}

const router = Router()

router.post('/', user, auth, useTurns)

export default router
