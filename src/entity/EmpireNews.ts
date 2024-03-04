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

	@Index()
	@Column({
		type: 'int',
		default: 1,
	})
	game_id: number

	@Column({ default: '' })
	sourceName: string

	@Column({ default: '' })
	destinationName: string

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

	@Column({ default: '' })
	personalContent: string

	@Column({ default: '' })
	publicContent: string

	@Column({ default: '' })
	type: string

	@Column({ default: '' })
	result: string

	@Column({ default: false })
	seen: boolean

	@Column({ default: true })
	public: boolean
}
