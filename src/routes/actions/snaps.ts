import { TURNS_PROTECTION } from '../../config/conifg'
import Empire from '../../entity/Empire'
import EmpireSnapshot from '../../entity/EmpireSnapshot'

export const takeSnapshot = async (empire: Empire) => {
	if (empire.turnsUsed >= TURNS_PROTECTION && empire.mode !== 'demo') {
		const snapshot = new EmpireSnapshot(empire)
		// console.log(empire)
		snapshot.e_id = empire.id
		snapshot.createdAt = new Date()
		await snapshot.save()
	}
}
