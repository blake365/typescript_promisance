import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan history')
export default class ClanHistory extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanHistory_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
		unique: true,
	})
	roundHistory_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistoryMembers: number

	@Column()
	clanHistoryName: string

	@Column()
	clanHistoryTitle: string

	@Column({
		type: 'bigint',
		default: 0,
	})
	clanHistoryTotalNet: number
}
