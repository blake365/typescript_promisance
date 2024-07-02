import type Empire from '../../entity/Empire'

export function calcRot(empire: Empire): number {
	let rot = 0
	let percentFarms = empire.bldFood / empire.land
	if (percentFarms < 0.1) percentFarms = 0.1
	if (empire.networth < 10000000) {
		rot = 0
	} else if (empire.food > empire.networth * 35 * percentFarms) {
		const multiples = Math.floor(empire.food / empire.networth) - 1
		rot = Math.round(
			(multiples / 2) * empire.food * 0.001 * 0.01 * (1 - percentFarms)
		)
	}
	return rot
}
