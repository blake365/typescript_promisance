import type Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'
import type Game from '../../entity/Game'

export const exploreAlt = (empire: Empire, lucky: boolean) => {
	let land = giveLand(empire)
	// console.log(lucky)
	if (lucky) {
		land *= 1.5
	}
	land = Math.ceil(land)
	empire.exploreGains += land
	empire.land += land
	empire.freeLand += land
	return land
}

// Legacy size bonus function - kept for reference
export const calcSizeBonusLegacy = ({ networth }) => {
	let net = Math.max(networth, 1)
	let size = Math.atan(generalLog(net, 10000) - 1.3) * 2.6 - 0.6
	size = Math.round(Math.min(Math.max(0.5, size), 1.7) * 1000) / 1000
	return size
}

// New multi-factor size system interfaces
export interface EmpireSizeFactors {
	economicEfficiency: number   // Affects income/production (0.9-1.3)
	militaryLogistics: number     // Affects upkeep/maintenance (1.0+)
	expansionDifficulty: number   // Affects building/exploring costs (1.0+)
	combatReadiness: number       // Affects attack/defense (0.85-1.2)
}

// New balanced size calculation system
export const calcSizeFactors = (
	empire: Empire,
	serverMedian: number = 10000000,
	dayOfRound: number = 0
): EmpireSizeFactors => {
	const net = Math.max(empire.networth, 1)
	const ratio = net / serverMedian

	// Economic efficiency: Slight advantage for larger, but capped
	// Range: 0.9 to 1.3 (only 44% difference vs legacy 340%)
	let economicEfficiency = 1.0
	if (ratio < 0.5) economicEfficiency = 1.15  // Small boost for struggling
	else if (ratio < 0.8) economicEfficiency = 1.05
	else if (ratio < 1.5) economicEfficiency = 1.0
	else if (ratio < 3.0) economicEfficiency = 0.95
	else economicEfficiency = 0.9  // Diminishing returns at top

	// Military logistics: Exponential penalty for huge armies
	const militarySize = empire.trpArm + empire.trpLnd * 2 + empire.trpFly * 4 + empire.trpSea * 6
	const militaryRatio = militarySize / Math.max(empire.land, 1)
	const militaryLogistics = 1.0 + Math.pow(militaryRatio / 100, 1.5)

	// Expansion difficulty: Makes growth harder but not impossible
	const landRatio = empire.land / 10000  // Per 10k acres
	const expansionDifficulty = 1.0 + (landRatio * 0.1) // +10% cost per 10k land

	// Combat readiness: Size affects combat differently
	let combatReadiness = 1.0
	if (ratio < 0.5) {
		combatReadiness = 1.2   // Guerrilla bonus for small empires
	} else if (ratio > 2.0) {
		combatReadiness = 0.85  // Harder to coordinate large empire
	}

	// Late-game compression: Bring everyone closer together
	if (dayOfRound > 21) {
		const compression = (dayOfRound - 21) / 9  // 0 to 1 over last week
		economicEfficiency = 1.0 + (economicEfficiency - 1.0) * (1 - compression * 0.5)
	}

	return {
		economicEfficiency: Math.round(economicEfficiency * 1000) / 1000,
		militaryLogistics: Math.round(militaryLogistics * 1000) / 1000,
		expansionDifficulty: Math.round(expansionDifficulty * 1000) / 1000,
		combatReadiness: Math.round(combatReadiness * 1000) / 1000
	}
}

// Compatibility wrapper - maintains old interface while using new system
export const calcSizeBonus = (empire: Empire | { networth: number }) => {
	// If called with just networth (legacy), use conservative estimate
	if (!('land' in empire)) {
		const net = empire.networth
		// Return a simplified version based on networth alone
		if (net < 5000000) return 1.15
		if (net < 10000000) return 1.05
		if (net < 20000000) return 1.0
		if (net < 50000000) return 0.95
		return 0.9
	}

	// Full empire object - use new system's economic factor
	const factors = calcSizeFactors(empire as Empire)
	return factors.economicEfficiency
}

// New growth momentum calculation
export const calcGrowthBonus = (empire: Empire): number => {
	const currentNW = empire.networth
	const yesterdayNW = empire.peakNetworth || currentNW // Using peakNetworth as proxy for now
	const growthRate = (currentNW - yesterdayNW) / Math.max(yesterdayNW, 1)

	// Reward growth, not size
	if (growthRate > 0.10) return 1.15      // 10%+ daily growth = bonus
	else if (growthRate > 0.05) return 1.08 // 5%+ growth = small bonus
	else if (growthRate < -0.05) return 0.9 // Shrinking = penalty
	else return 1.0
}

// Underdog advantages that feel earned
export const calcUnderdogBonus = (empire: Empire, serverMedian: number) => {
	const ratio = empire.networth / serverMedian

	if (ratio < 0.5) {
		return {
			explorationBonus: 1.5,     // Find more land when exploring
			marketDiscount: 0.8,        // 20% better prices as "small trader"
			spellResistance: 1.3,       // Harder to target with magic
			newsVisibility: 0.5         // Less likely to appear in attack news
		}
	}
	return null
}

export const calcPCI = (empire: Empire) => {
	const { bldCash, land, race, era } = empire
	return Math.round(
		30 *
			(1 + bldCash / Math.max(land, 1)) *
			((100 + raceArray[race].mod_income + eraArray[era].mod_cashpro) / 100)
	)
}

export const giveLand = (empire: Empire) => {
	// Reduced exploration rate by 50% to create land scarcity
	// This makes attacks more valuable and creates strategic pressure
	return Math.ceil(
		(1 / (empire.land * 0.00016 + 1)) *  // Doubled coefficient (was 0.00008)
			100 *
			((100 +
				eraArray[empire.era].mod_explore +
				raceArray[empire.race].mod_explore) /
				100)
	)
}

export const getNetworth = (empire: Empire, game: Game) => {
	let networth = 0

	//troops
	networth += empire.trpArm * 1 // 100
	networth += (empire.trpLnd * game.pvtmTrpLnd) / game.pvtmTrpArm // 50 100
	networth += (empire.trpFly * game.pvtmTrpFly) / game.pvtmTrpArm // 20 80
	networth += (empire.trpSea * game.pvtmTrpSea) / game.pvtmTrpArm // 10 60
	networth += empire.trpWiz * 2 // 10 20
	networth += empire.peasants * 3 // 500 1500
	// Cash
	networth +=
		(empire.cash + empire.bank / 2 - empire.loan * 2) / (5 * game.pvtmTrpArm) // 100000
	networth += empire.land * 250 // 250 62500
	networth += empire.freeLand * 100 // 160 16000

	// Food, reduced using logarithm to prevent it from boosting networth to ludicrous levels
	networth += empire.food * (game.pvtmFood / game.pvtmTrpArm) // 10000 2500

	return Math.max(0, Math.floor(networth))
}

function generalLog(number: number, base: number) {
	return Math.log(number) / Math.log(base)
}

// Standard Normal variate using Box-Muller transform.
export function gaussianRandom(mean: number, stdev: number) {
	const u = 1 - Math.random() // Converting [0,1) to (0,1]
	const v = Math.random()
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
	// Transform to the desired mean and standard deviation:
	return z * stdev + mean
}

// cauchyRandom returns a random number from a Cauchy distribution
// with the given location and scale parameters.
export function cauchyRandom(location: number) {
	const result = Math.abs(
		location + location * 0.05 * Math.tan(Math.PI * (Math.random() - 0.5))
	)
	if (result < location * 0.98) {
		console.log('less than min')
		return cauchyRandom(location)
	}
	if (result > location * 2 * 0.98) {
		console.log('more than max')
		return cauchyRandom(location)
	}
	return result
}

export function containsOnlySymbols(str: string) {
	const regex = /^[^\w\s]+$/
	return regex.test(str)
}
