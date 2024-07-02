import type Empire from '../../entity/Empire'

export function calcPeasants(empire: Empire, popBase: number): number {
	let peasants = 0
	let peasantsMult = 1
	let taxReplacement = empire.tax
	if (empire.tax < 5) {
		taxReplacement = 5
	} else if (empire.tax > 95) {
		taxReplacement = 95
	}

	if (empire.peasants !== popBase) {
		peasants = (popBase - empire.peasants) / 20
	}

	if (peasants > 0) {
		peasantsMult = 4 / ((taxReplacement + 15) / 20) - 7 / 9
	}
	if (peasants < 0) {
		peasantsMult = 1 / (4 / (taxReplacement + 15) / 20 - 7 / 9)
	}

	peasants = Math.round(peasants * peasantsMult * peasantsMult)

	if (empire.peasants + peasants < 1) {
		peasants = 1 - empire.peasants
	}

	return peasants
}
