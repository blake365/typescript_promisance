import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import type { EmpireSizeFactors } from '../actions/actions'

export function calcFinances(
	pci: number,
	empire: Empire,
	size: number | EmpireSizeFactors
) {
	// Support both legacy number and new factors object
	const economicEfficiency = typeof size === 'number'
		? Math.max(0.8, size * 1.25)
		: size.economicEfficiency

	const income = Math.round(
		pci * (empire.tax / 100) * (empire.health / 100) * empire.peasants +
			empire.bldCash * 550 * economicEfficiency
	)

	// Calculate military upkeep with progressive scaling (softened for larger armies)
	const baseUpkeep =
		empire.trpArm * 0.18 +
		empire.trpLnd * 0.7 +
		empire.trpFly * 2.0 +
		empire.trpSea * 4.0 +
		empire.trpWiz * 0.7

	// Apply military logistics multiplier if using new system (softened and clamped)
	const rawLogistics = typeof size === 'object' ? size.militaryLogistics : 1.0
	const softenedLogistics = 1.0 + Math.pow((Math.max(0, (rawLogistics - 1.0)) * 100) / 125, 1.2)
	const militaryLogistics = Math.min(1.25, softenedLogistics)

	// Progressive scaling based on army-to-land ratio
	// Softened to allow more sustainable growth
	const troopDensity = (empire.trpArm + empire.trpLnd + empire.trpFly + empire.trpSea) / Math.max(empire.land, 1)
	let densityMultiplier = 1.0

	if (troopDensity > 30) {
		densityMultiplier = 1.0 + (troopDensity - 30) * 0.005  // +0.5% per unit over 30
	}

	let expenses = Math.round(
		baseUpkeep * militaryLogistics * densityMultiplier +
		empire.land * 3.2
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
