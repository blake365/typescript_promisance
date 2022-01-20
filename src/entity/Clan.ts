import { Length } from 'class-validator'
import {
	Entity,
	Column,
	Index,
	BeforeInsert,
	PrimaryGeneratedColumn,
} from 'typeorm'
import Model from './Model'
import bcrypt from 'bcrypt'
import { Exclude } from 'class-transformer'
// import Empire from './Empire'

@Entity('clans')
export default class Clan extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	c_id: number

	@Index()
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
	@Column({ unique: true })
	clanName: string

	@Exclude()
	@Length(6, 255, { message: 'Must be at least 3 characters long' })
	@Column()
	clanPassword: string

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanMembers: number

	// assign to user who creates clan
	@Column({
		type: 'int',
		default: 0,
	})
	empireIdLeader: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireIdAssistant: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireIdAgent1: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireIdAgent2: number

	@Column()
	clanTitle: string

	@Column()
	clanURL: string

	@Column()
	clanPic: string

	@BeforeInsert()
	async hashPassword() {
		this.clanPassword = await bcrypt.hash(this.clanPassword, 6)
	}
}
