import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan news')
export default class ClanNews extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanNews_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	c_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	c_id2: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanNewsEvent: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireId1: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireId2: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanNewsTime: number
}
