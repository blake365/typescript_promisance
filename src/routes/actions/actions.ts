import Empire from '../../entity/Empire'
import { raceArray } from '../../config/races'
import { eraArray } from '../../config/eras'
import {
	PVTM_FOOD,
	PVTM_TRPARM,
	PVTM_TRPFLY,
	PVTM_TRPLND,
	PVTM_TRPSEA,
} from '../../config/conifg'

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

export const calcSizeBonus = ({ networth }) => {
	let net = Math.max(networth, 1)
	let size = Math.atan(generalLog(net, 10000) - 1.3) * 2.6 - 0.6
	size = Math.round(Math.min(Math.max(0.5, size), 1.7) * 1000) / 1000
	return size
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
	return Math.ceil(
		(1 / (empire.land * 0.000035 + 1)) *
			100 *
			((100 +
				eraArray[empire.era].mod_explore +
				raceArray[empire.race].mod_explore) /
				100)
	)
}

export const getNetworth = (empire: Empire) => {
	let networth = 0

	//troops
	networth += empire.trpArm * 1 // 100
	networth += (empire.trpLnd * PVTM_TRPLND) / PVTM_TRPARM // 50 100
	networth += (empire.trpFly * PVTM_TRPFLY) / PVTM_TRPARM // 20 80
	networth += (empire.trpSea * PVTM_TRPSEA) / PVTM_TRPARM // 10 60
	networth += empire.trpWiz * 2 // 10 20
	networth += empire.peasants * 3 // 500 1500
	// Cash
	networth +=
		(empire.cash + empire.bank / 2 - empire.loan * 2) / (5 * PVTM_TRPARM) // 100000
	networth += empire.land * 250 // 250 62500
	networth += empire.freeLand * 100 // 160 16000

	// Food, reduced using logarithm to prevent it from boosting networth to ludicrous levels
	networth +=
		(empire.food / Math.log10(Math.max(10, empire.food))) *
		(PVTM_FOOD / PVTM_TRPARM) // 10000 2500

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
	return Math.abs(
		location + location * 0.15 * Math.tan(Math.PI * (Math.random() - 0.5))
	)
}
