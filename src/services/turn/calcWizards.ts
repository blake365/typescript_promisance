import type Empire from '../../entity/Empire'

export function calcWizards(empire: Empire): number {
	let trpWiz = 0

	if (empire.trpWiz < empire.bldWiz * 25) {
		trpWiz = empire.bldWiz * 0.45
	} else if (empire.trpWiz < empire.bldWiz * 50) {
		trpWiz = empire.bldWiz * 0.3
	} else if (empire.trpWiz < empire.bldWiz * 90) {
		trpWiz = empire.bldWiz * 0.15
	} else if (empire.trpWiz < empire.bldWiz * 100) {
		trpWiz = empire.bldWiz * 0.1
	} else if (empire.trpWiz > empire.bldWiz * 175) {
		trpWiz = empire.trpWiz * -0.05
	}

	trpWiz = Math.round(
		trpWiz *
			Math.sqrt(
				1 -
					((trpWiz / Math.max(1, Math.abs(trpWiz))) * 0.66 * empire.bldWiz) /
						empire.land
			)
	)

	return trpWiz
}
