import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan relations')
export default class ClanRelation extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanRelation_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	c_id1: number

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
	clanRelationFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanNewsTime: number
}
