import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('empire history')
export default class EmpireHistory extends Model {
	constructor(empireHistory: Partial<EmpireHistory>) {
		super()
		Object.assign(this, empireHistory)
	}

	@Index()
	@PrimaryGeneratedColumn()
	empireHistory_id: number

	@Index()
	@Column()
	roundHistory_id: string

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	u_id: number

	@Column()
	empireHistoryName: string

	@Column()
	empireHistoryRace: string

	@Column()
	empireHistoryEra: string

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistory_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryOffSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryOffTotal: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryDefSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryDefTotal: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryKills: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryScore: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryNetworth: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryLand: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryRank: number
}
