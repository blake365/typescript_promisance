import { IsEmail, Length } from 'class-validator'
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

@Entity('users')
export default class User extends Model {
	constructor(user: Partial<User>) {
		super()
		Object.assign(this, user)
	}

	@Index()
	@PrimaryGeneratedColumn()
	u_id: number

	@Index()
	@IsEmail(undefined, { message: 'Must be a valid email address' })
	@Length(1, 255, { message: 'Email is empty' })
	@Column({ unique: true })
	email: string

	@Index()
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
	@Column({ unique: true })
	username: string

	@Exclude()
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
	@Column()
	password: string

	@BeforeInsert()
	async hashPassword() {
		this.password = await bcrypt.hash(this.password, 6)
	}

	@OneToMany(() => Empire, (empire) => empire.user)
	empires: Empire[]

	@Column({
		type: 'enum',
		enum: ['user', 'admin', 'demo'],
		default: ['user'],
	})
	role: string

	@Column({ default: '' })
	comment: string

	@Column({ default: '' })
	dateFormat: string

	@Column({
		type: 'double precision',
		default: 0,
	})
	avgRank: number

	@Column({
		type: 'double precision',
		default: 0,
	})
	bestRank: number

	@Column({
		type: 'int',
		default: 0,
	})
	deaths: number

	@Column({
		type: 'int',
		default: 0,
	})
	defSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	defTotal: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	flags: number

	@Column({
		type: 'int',
		default: 0,
	})
	kills: number

	@Column({ default: '' })
	lang: string

	@Column({ default: new Date() })
	lastDate: Date

	@Column({ default: '' })
	lastIp: string

	@Column({ default: '' })
	name: string

	@Column({
		type: 'int',
		default: 0,
	})
	numPlays: number

	@Column({
		type: 'int',
		default: 0,
	})
	offSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	offTotal: number

	@Column({ default: '' })
	style: string

	@Column({
		type: 'int',
		default: 0,
	})
	sucPlays: number

	@Column({
		type: 'int',
		default: 0,
	})
	timezone: number

	@Column({
		type: 'int',
		default: 0,
	})
	totalProduction: number

	@Column({
		type: 'int',
		default: 0,
	})
	totalConsumption: number
}
