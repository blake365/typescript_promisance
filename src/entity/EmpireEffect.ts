import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('empire effects')
export default class EmpireEffect extends Model {
	constructor(empire: Partial<EmpireEffect>) {
		super()
		Object.assign(this, empire)
	}
	@Index()
	@PrimaryGeneratedColumn()
	empireEffect_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireEffectValue: number

	@Column({
		type: 'int',
		default: 0,
	})
	effectOwnerId: number

	@Column()
	empireEffectName: string
}
