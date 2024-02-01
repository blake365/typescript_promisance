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

	@Column({
		default: 'email',
	})
	method: string

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

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	totalProduction: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	totalConsumption: number

	@Column({
		type: 'json',
		default: {
			income4: { awarded: false, timeAwarded: null },
			income3: { awarded: false, timeAwarded: null },
			income2: { awarded: false, timeAwarded: null },
			income1: { awarded: false, timeAwarded: null },
			income0: { awarded: false, timeAwarded: null },
			indyProd4: { awarded: false, timeAwarded: null },
			indyProd3: { awarded: false, timeAwarded: null },
			indyProd2: { awarded: false, timeAwarded: null },
			indyProd1: { awarded: false, timeAwarded: null },
			indyProd0: { awarded: false, timeAwarded: null },
			magicProd4: { awarded: false, timeAwarded: null },
			magicProd3: { awarded: false, timeAwarded: null },
			magicProd2: { awarded: false, timeAwarded: null },
			magicProd1: { awarded: false, timeAwarded: null },
			magicProd0: { awarded: false, timeAwarded: null },
			expenses4: { awarded: false, timeAwarded: null },
			expenses3: { awarded: false, timeAwarded: null },
			expenses2: { awarded: false, timeAwarded: null },
			expenses1: { awarded: false, timeAwarded: null },
			expenses0: { awarded: false, timeAwarded: null },
			foodcon4: { awarded: false, timeAwarded: null },
			foodcon3: { awarded: false, timeAwarded: null },
			foodcon2: { awarded: false, timeAwarded: null },
			foodcon1: { awarded: false, timeAwarded: null },
			foodcon0: { awarded: false, timeAwarded: null },
			food4: { awarded: false, timeAwarded: null },
			food3: { awarded: false, timeAwarded: null },
			food2: { awarded: false, timeAwarded: null },
			food1: { awarded: false, timeAwarded: null },
			food0: { awarded: false, timeAwarded: null },
			exploreGains4: { awarded: false, timeAwarded: null },
			exploreGains3: { awarded: false, timeAwarded: null },
			exploreGains2: { awarded: false, timeAwarded: null },
			exploreGains1: { awarded: false, timeAwarded: null },
			exploreGains0: { awarded: false, timeAwarded: null },
			land4: { awarded: false, timeAwarded: null },
			land3: { awarded: false, timeAwarded: null },
			land2: { awarded: false, timeAwarded: null },
			land1: { awarded: false, timeAwarded: null },
			land0: { awarded: false, timeAwarded: null },
			networth4: { awarded: false, timeAwarded: null },
			networth3: { awarded: false, timeAwarded: null },
			networth2: { awarded: false, timeAwarded: null },
			networth1: { awarded: false, timeAwarded: null },
			networth0: { awarded: false, timeAwarded: null },
			peasants4: { awarded: false, timeAwarded: null },
			peasants3: { awarded: false, timeAwarded: null },
			peasants2: { awarded: false, timeAwarded: null },
			peasants1: { awarded: false, timeAwarded: null },
			peasants0: { awarded: false, timeAwarded: null },
			trpArm4: { awarded: false, timeAwarded: null },
			trpArm3: { awarded: false, timeAwarded: null },
			trpArm2: { awarded: false, timeAwarded: null },
			trpArm1: { awarded: false, timeAwarded: null },
			trpArm0: { awarded: false, timeAwarded: null },
			trpLnd4: { awarded: false, timeAwarded: null },
			trpLnd3: { awarded: false, timeAwarded: null },
			trpLnd2: { awarded: false, timeAwarded: null },
			trpLnd1: { awarded: false, timeAwarded: null },
			trpLnd0: { awarded: false, timeAwarded: null },
			trpFly4: { awarded: false, timeAwarded: null },
			trpFly3: { awarded: false, timeAwarded: null },
			trpFly2: { awarded: false, timeAwarded: null },
			trpFly1: { awarded: false, timeAwarded: null },
			trpFly0: { awarded: false, timeAwarded: null },
			trpSea4: { awarded: false, timeAwarded: null },
			trpSea3: { awarded: false, timeAwarded: null },
			trpSea2: { awarded: false, timeAwarded: null },
			trpSea1: { awarded: false, timeAwarded: null },
			trpSea0: { awarded: false, timeAwarded: null },
			trpWiz4: { awarded: false, timeAwarded: null },
			trpWiz3: { awarded: false, timeAwarded: null },
			trpWiz2: { awarded: false, timeAwarded: null },
			trpWiz1: { awarded: false, timeAwarded: null },
			trpWiz0: { awarded: false, timeAwarded: null },
			attackGains4: { awarded: false, timeAwarded: null },
			attackGains3: { awarded: false, timeAwarded: null },
			attackGains2: { awarded: false, timeAwarded: null },
			attackGains1: { awarded: false, timeAwarded: null },
			attackGains0: { awarded: false, timeAwarded: null },
			turns2: { awarded: false, timeAwarded: null },
			turns1: { awarded: false, timeAwarded: null },
			turns0: { awarded: false, timeAwarded: null },
			attacks4: { awarded: false, timeAwarded: null },
			attacks3: { awarded: false, timeAwarded: null },
			attacks2: { awarded: false, timeAwarded: null },
			attacks1: { awarded: false, timeAwarded: null },
			attacks0: { awarded: false, timeAwarded: null },
			defends4: { awarded: false, timeAwarded: null },
			defends3: { awarded: false, timeAwarded: null },
			defends2: { awarded: false, timeAwarded: null },
			defends1: { awarded: false, timeAwarded: null },
			defends0: { awarded: false, timeAwarded: null },
			rank1: { awarded: false, timeAwarded: null },
			build: { awarded: false, timeAwarded: null },
			joinClan: { awarded: false, timeAwarded: null },
		},
	})
	achievements: {
		income4: { awarded: boolean; timeAwarded: string }
		income3: { awarded: boolean; timeAwarded: string }
		income2: { awarded: boolean; timeAwarded: string }
		income1: { awarded: boolean; timeAwarded: string }
		income0: { awarded: boolean; timeAwarded: string }
		indyProd4: { awarded: boolean; timeAwarded: string }
		indyProd3: { awarded: boolean; timeAwarded: string }
		indyProd2: { awarded: boolean; timeAwarded: string }
		indyProd1: { awarded: boolean; timeAwarded: string }
		indyProd0: { awarded: boolean; timeAwarded: string }
		magicProd4: { awarded: boolean; timeAwarded: string }
		magicProd3: { awarded: boolean; timeAwarded: string }
		magicProd2: { awarded: boolean; timeAwarded: string }
		magicProd1: { awarded: boolean; timeAwarded: string }
		magicProd0: { awarded: boolean; timeAwarded: string }
		expenses4: { awarded: boolean; timeAwarded: string }
		expenses3: { awarded: boolean; timeAwarded: string }
		expenses2: { awarded: boolean; timeAwarded: string }
		expenses1: { awarded: boolean; timeAwarded: string }
		expenses0: { awarded: boolean; timeAwarded: string }
		foodcon4: { awarded: boolean; timeAwarded: string }
		foodcon3: { awarded: boolean; timeAwarded: string }
		foodcon2: { awarded: boolean; timeAwarded: string }
		foodcon1: { awarded: boolean; timeAwarded: string }
		foodcon0: { awarded: boolean; timeAwarded: string }
		food4: { awarded: boolean; timeAwarded: string }
		food3: { awarded: boolean; timeAwarded: string }
		food2: { awarded: boolean; timeAwarded: string }
		food1: { awarded: boolean; timeAwarded: string }
		food0: { awarded: boolean; timeAwarded: string }
		exploreGains4: { awarded: boolean; timeAwarded: string }
		exploreGains3: { awarded: boolean; timeAwarded: string }
		exploreGains2: { awarded: boolean; timeAwarded: string }
		exploreGains1: { awarded: boolean; timeAwarded: string }
		exploreGains0: { awarded: boolean; timeAwarded: string }
		land4: { awarded: boolean; timeAwarded: string }
		land3: { awarded: boolean; timeAwarded: string }
		land2: { awarded: boolean; timeAwarded: string }
		land1: { awarded: boolean; timeAwarded: string }
		land0: { awarded: boolean; timeAwarded: string }
		networth4: { awarded: boolean; timeAwarded: string }
		networth3: { awarded: boolean; timeAwarded: string }
		networth2: { awarded: boolean; timeAwarded: string }
		networth1: { awarded: boolean; timeAwarded: string }
		networth0: { awarded: boolean; timeAwarded: string }
		peasants4: { awarded: boolean; timeAwarded: string }
		peasants3: { awarded: boolean; timeAwarded: string }
		peasants2: { awarded: boolean; timeAwarded: string }
		peasants1: { awarded: boolean; timeAwarded: string }
		peasants0: { awarded: boolean; timeAwarded: string }
		trpArm4: { awarded: boolean; timeAwarded: string }
		trpArm3: { awarded: boolean; timeAwarded: string }
		trpArm2: { awarded: boolean; timeAwarded: string }
		trpArm1: { awarded: boolean; timeAwarded: string }
		trpArm0: { awarded: boolean; timeAwarded: string }
		trpLnd4: { awarded: boolean; timeAwarded: string }
		trpLnd3: { awarded: boolean; timeAwarded: string }
		trpLnd2: { awarded: boolean; timeAwarded: string }
		trpLnd1: { awarded: boolean; timeAwarded: string }
		trpLnd0: { awarded: boolean; timeAwarded: string }
		trpFly4: { awarded: boolean; timeAwarded: string }
		trpFly3: { awarded: boolean; timeAwarded: string }
		trpFly2: { awarded: boolean; timeAwarded: string }
		trpFly1: { awarded: boolean; timeAwarded: string }
		trpFly0: { awarded: boolean; timeAwarded: string }
		trpSea4: { awarded: boolean; timeAwarded: string }
		trpSea3: { awarded: boolean; timeAwarded: string }
		trpSea2: { awarded: boolean; timeAwarded: string }
		trpSea1: { awarded: boolean; timeAwarded: string }
		trpSea0: { awarded: boolean; timeAwarded: string }
		trpWiz4: { awarded: boolean; timeAwarded: string }
		trpWiz3: { awarded: boolean; timeAwarded: string }
		trpWiz2: { awarded: boolean; timeAwarded: string }
		trpWiz1: { awarded: boolean; timeAwarded: string }
		trpWiz0: { awarded: boolean; timeAwarded: string }
		attackGains4: { awarded: boolean; timeAwarded: string }
		attackGains3: { awarded: boolean; timeAwarded: string }
		attackGains2: { awarded: boolean; timeAwarded: string }
		attackGains1: { awarded: boolean; timeAwarded: string }
		attackGains0: { awarded: boolean; timeAwarded: string }
		turns2: { awarded: boolean; timeAwarded: string }
		turns1: { awarded: boolean; timeAwarded: string }
		turns0: { awarded: boolean; timeAwarded: string }
		attacks4: { awarded: boolean; timeAwarded: string }
		attacks3: { awarded: boolean; timeAwarded: string }
		attacks2: { awarded: boolean; timeAwarded: string }
		attacks1: { awarded: boolean; timeAwarded: string }
		attacks0: { awarded: boolean; timeAwarded: string }
		defends4: { awarded: boolean; timeAwarded: string }
		defends3: { awarded: boolean; timeAwarded: string }
		defends2: { awarded: boolean; timeAwarded: string }
		defends1: { awarded: boolean; timeAwarded: string }
		defends0: { awarded: boolean; timeAwarded: string }
		rank1: { awarded: boolean; timeAwarded: string }
		build: { awarded: boolean; timeAwarded: string }
		joinClan: { awarded: boolean; timeAwarded: string }
	}
}
