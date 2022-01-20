import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan invites')
export default class ClanInvite extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanInvite_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	c_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireId_1: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireId_2: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanInviteFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanInviteTime: number
}
