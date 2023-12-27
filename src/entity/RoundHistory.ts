import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('round history')
export default class RoundHistory extends Model {
	constructor(roundHistory: Partial<RoundHistory>) {
		super()
		Object.assign(this, roundHistory)
	}

	@Index()
	@PrimaryGeneratedColumn()
	round_id: number

	@Column()
	round_h_id: string

	@Column()
	name: string

	@Column({
		type: 'text',
	})
	description: string

	@Column({
		type: 'text',
		default: '',
	})
	gameVersion: string

	@Column()
	startDate: Date

	@Column()
	stopDate: Date

	@Column({
		type: 'int',
		default: 0,
	})
	flags: number

	@Column({
		type: 'int',
		default: 0,
	})
	smallClanSize: number

	@Column({
		type: 'int',
		default: 0,
	})
	smallClans: number

	@Column({
		type: 'int',
		default: 0,
	})
	allClans: number

	@Column({
		type: 'int',
		default: 0,
	})
	nonClanEmpires: number

	@Column({
		type: 'int',
		default: 0,
	})
	liveEmpires: number

	@Column({
		type: 'int',
		default: 0,
	})
	deadEmpires: number

	@Column({
		type: 'int',
		default: 0,
	})
	deletedEmpires: number

	@Column({
		type: 'int',
		default: 0,
	})
	allEmpires: number
}
