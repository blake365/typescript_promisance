import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan history')
export default class ClanHistory extends Model {
	constructor(clanHistory: Partial<ClanHistory>) {
		super()
		Object.assign(this, clanHistory)
	}

	@Index()
	@PrimaryGeneratedColumn()
	clanHistory_id: number

	@Index()
	@Column()
	roundHistory_id: string

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistoryMembers: number

	@Column()
	clanHistoryName: string

	// @Column()
	// clanHistoryTitle: string

	@Column({
		type: 'bigint',
		default: 0,
	})
	clanHistoryTotalNet: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistoryLeader: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistoryAssistant: number
}
