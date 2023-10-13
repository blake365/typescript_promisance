import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('clan messages')
export default class ClanMessage extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	clanMessage_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	ct_id: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	empireId: number

	@Column({
		default: '',
	})
	empireName: string

	@Column({
		type: 'text',
	})
	clanMessageBody: string

	@Column({
		type: 'int',
		default: 0,
	})
	clanMessageTime: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanMessageFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	clanId: number

	@Column({ type: 'simple-array', default: '', nullable: true })
	seenBy: string[]
}
