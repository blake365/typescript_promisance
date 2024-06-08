import { getRandomInt } from '../../util/helpers'
import { cauchyRandom } from '../actions/actions'

// calculate number of units lost for attacker and defender
/**
 * Calculates the unit losses for an attack.
 *
 * @param attackUnits The number of attacking units.
 * @param defendUnits The number of defending units.
 * @param oper The offensive power of the attacker.
 * @param dper The defensive power of the defender.
 * @param omod The offensive modifier.
 * @param dmod The defensive modifier.
 * @returns An object containing the number of attack losses and defend losses.
 */
export const calcUnitLosses = (
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

	const attackLosses = Math.round(
		Math.min(
			cauchyRandom(Math.ceil((attackUnits * oper * omod + 1) / 2)),
			attackUnits
		)
	)
	// console.log('max attacker loss:', Math.ceil(attackUnits * oper * omod) + 1)

	const maxKill =
		Math.round(0.9 * attackUnits) +
		getRandomInt(0, Math.round(0.2 * attackUnits) + 1)

	const defendLosses = Math.round(
		Math.min(
			cauchyRandom(Math.ceil((defendUnits * dper * dmod + 1) / 2)),
			defendUnits,
			maxKill
		)
	)

	// console.log(
	// 	'intermediate defender loss:',
	// 	Math.ceil(defendUnits * dper * dmod) + 1
	// )

	// console.log('attackLosses: ', attackLosses)
	// console.log('defendLosses: ', defendLosses)

	return { attackLosses: attackLosses, defendLosses: defendLosses }
}
