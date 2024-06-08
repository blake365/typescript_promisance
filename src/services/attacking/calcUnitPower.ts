import type Empire from '../../entity/Empire'
import { eraArray } from '../../config/eras'

/**
 * Calculates the power of a unit in an empire based on the given mode.
 * @param empire - The empire object containing unit quantities.
 * @param unit - The unit to calculate the power for.
 * @param mode - The mode ('o' for offensive, 'd' for defensive).
 * @returns The calculated power of the unit.
 */

export const calcUnitPower = (empire: Empire, unit: string, mode: string) => {
	// convert unit from trparm to trpArm
	// console.log('unit: ', unit)

	const unitM =
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
	const power = eraArray[empire.era][lookup] * quantity
	// console.log('power: ', power)

	return power
}
