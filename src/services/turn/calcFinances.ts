import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'

export function calcFinances(pci: number, empire: Empire, size: number) {
	const income = Math.round(
		pci * (empire.tax / 100) * (empire.health / 100) * empire.peasants +
			empire.bldCash * 550 * Math.max(0.8, size * 1.25)
	)

	// income *= Math.max(0.8, size)
	// let loan = Math.round(empire.loan / 200)
	let expenses = Math.round(
		empire.trpArm * 0.13 +
			empire.trpLnd * 0.5 +
			empire.trpFly * 1.5 +
			empire.trpSea * 3 +
			empire.land * 3.2 +
			empire.trpWiz * 0.53
	)

	// console.log(empire.loan)
	// let loanpayed = 0
	// if (empire.loan > 0) {
	// 	loanpayed = Math.min(Math.round(empire.loan / 200), income - expenses)
	// }
	// console.log(loanpayed)
	const expensesBonus = Math.min(
		0.5,
		(raceArray[empire.race].mod_expenses + 100) / 100 -
			1 +
			empire.bldCost / Math.max(empire.land, 1)
	)

	expenses -= Math.round(expenses * expensesBonus)

	return { income: income, expenses: expenses }
}
