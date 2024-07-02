import type Empire from '../../entity/Empire'

export function calcCorruption(empire: Empire): number {
	let corruption = 0
	if (empire.cash > empire.networth * 110) {
		const multiples = Math.floor(empire.cash / empire.networth) - 1
		corruption = Math.round(multiples * empire.networth * 0.001 * 0.5)
	}
	return corruption
}
