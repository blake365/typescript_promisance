import { TURNS_PROTECTION } from '../../config/oldConifg'
import type Empire from '../../entity/Empire'
import EmpireSnapshot from '../../entity/EmpireSnapshot'

export const takeSnapshot = async (empire: Empire, turnsProtection) => {
	if (empire.turnsUsed >= turnsProtection && empire.mode !== 'demo') {
		const snapshot = new EmpireSnapshot(empire)
		// console.log(empire)
		snapshot.e_id = empire.id
		snapshot.createdAt = new Date()
		await snapshot.save()
	}
}
