import { Length } from 'class-validator'
import {
	Entity,
	Column,
	Index,
	BeforeInsert,
	PrimaryGeneratedColumn,
	OneToMany,
} from 'typeorm'
import Model from './Model'
import bcrypt from 'bcrypt'
import { Exclude } from 'class-transformer'
import Empire from './Empire'
import ClanRelation from './ClanRelation'
// import Empire from './Empire'

@Entity('clans')
export default class Clan extends Model {
	constructor(clan: Partial<Clan>) {
		super()
		Object.assign(this, clan)
	}

	@Column({ name: 'c_id', unique: true })
	@PrimaryGeneratedColumn()
	c_id: number

	@Index()
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
	@Column({ unique: true })
	clanName: string

	@Column({ default: null })
	clanTag: string

	@Column({ type: 'int', default: 1 })
	game_id: number

	@Exclude()
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
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

	@Column({ type: 'varchar', nullable: true })
	clanTitle: string

	@Column({ type: 'varchar', nullable: true })
	clanURL: string

	@Column({ type: 'varchar', nullable: true })
	clanPic: string

	@Column({ type: 'simple-array', default: null, nullable: true })
	enemies: string[]

	@Column({ type: 'simple-array', default: null, nullable: true })
	peaceOffer: string[]

	@OneToMany(() => ClanRelation, (relation) => relation.clan)
	relation: ClanRelation[]

	@OneToMany(() => Empire, (empire) => empire.clan)
	empires: Empire[]

	@BeforeInsert()
	async hashPassword() {
		this.clanPassword = await bcrypt.hash(this.clanPassword, 6)
	}
}
