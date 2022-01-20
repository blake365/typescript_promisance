import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('empire news')
export default class EmpireNews extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	news_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanIdDestination: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanIdSource: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireIdDestination: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireIdSource: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d0: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d1: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d2: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d3: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d4: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d5: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d6: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d7: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	news_d8: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	newsEvent: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	newsFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	newsTime: number
}
