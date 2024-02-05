import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'
import { Length } from 'class-validator'

import Model from './Model'
import User from './User'
import Clan from './Clan'

@Entity('empires')
export default class Empire extends Model {
	constructor(empire: Partial<Empire>) {
		super()
		Object.assign(this, empire)
	}
	// @PrimaryGeneratedColumn()
	// id: number

	// @PrimaryGeneratedColumn('uuid')
	// uuid: string
	@Index()
	@PrimaryGeneratedColumn()
	empireId: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	clanId: number

	@ManyToOne(() => Clan, (clan) => clan.empires)
	clan: Clan

	@ManyToOne(() => User, (user) => user.empires)
	@JoinColumn({ name: 'username', referencedColumnName: 'username' })
	user: User

	// @CreateDateColumn()
	// createdAt: Date

	// @UpdateDateColumn()
	// updatedAt: Date
	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	lastAction: Date

	@Column({ default: '' })
	mode: string

	@Column({
		type: 'int',
		default: 0,
	})
	clanOldId: number

	@Column({
		type: 'int',
		default: 0,
	})
	attacks: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	bank: number

	@Column({
		type: 'int',
		default: 20,
	})
	bldCash: number

	@Column({
		type: 'int',
		default: 5,
	})
	bldCost: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldDef: number

	@Column({
		type: 'int',
		default: 25,
	})
	bldFood: number

	@Column({
		type: 'int',
		default: 30,
	})
	bldPop: number

	@Column({
		type: 'int',
		default: 0,
	})
	bldTroop: number

	@Column({
		type: 'int',
		default: 10,
	})
	bldWiz: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100000,
	})
	cash: number

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

	@Column({
		type: 'int',
		default: 0,
	})
	era: number

	@Index()
	@Column({
		type: 'int',
		default: 0,
	})
	flags: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10000,
	})
	food: number

	@Column({
		type: 'int',
		default: 160,
	})
	freeLand: number

	@Column({
		type: 'int',
		default: 100,
	})
	health: number

	@Column({
		type: 'int',
		default: 0,
	})
	e_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	idle: number

	@Column({
		type: 'int',
		default: 25,
	})
	indArmy: number

	@Column({
		type: 'int',
		default: 25,
	})
	indFly: number

	@Column({
		type: 'int',
		default: 25,
	})
	indLnd: number

	@Column({
		type: 'int',
		default: 25,
	})
	indSea: number

	@Column({
		type: 'int',
		default: 0,
	})
	killClan: number

	@Column({
		type: 'int',
		default: 0,
	})
	killedBy: number

	@Column({
		type: 'int',
		default: 0,
	})
	kills: number

	@Column({
		type: 'int',
		default: 250,
	})
	land: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	loan: number

	// private market supplies
	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 4000,
	})
	mktArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 2000,
	})
	mktFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100000,
	})
	mktFood: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100000,
	})
	mktRunes: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 3000,
	})
	mktLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 1000,
	})
	mktSea: number

	@Column({
		type: 'int',
		default: 500,
	})
	mktPerArm: number

	@Column({
		type: 'int',
		default: 2000,
	})
	mktPerFly: number

	@Column({
		type: 'int',
		default: 1000,
	})
	mktPerLnd: number

	@Column({
		type: 'int',
		default: 3000,
	})
	mktPerSea: number

	@Column({ unique: true })
	@Length(3, 255, { message: 'Must be at least 3 characters long' })
	name: string

	@Column({
		type: 'int',
		default: 0,
	})
	changeName: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 655360,
	})
	networth: number

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

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 500,
	})
	peasants: number

	@Column({
		type: 'int',
		default: 0,
	})
	race: number

	@Column({
		type: 'int',
		default: 0,
	})
	rank: number

	@Column({
		type: 'int',
		default: 0,
	})
	reason: string

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	runes: number

	@Column({
		type: 'int',
		default: 0,
	})
	score: number

	@Column({
		type: 'int',
		default: 0,
	})
	sharing: number

	@Column({
		type: 'int',
		default: 25,
	})
	tax: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 100,
	})
	trpArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 20,
	})
	trpFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 50,
	})
	trpLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10,
	})
	trpSea: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 10,
	})
	trpWiz: number

	@Column({
		type: 'int',
		default: 0,
	})
	turns: number

	@Column({
		type: 'int',
		default: 0,
	})
	storedturns: number

	@Column({
		type: 'int',
		default: 0,
	})
	turnsUsed: number

	@Column({
		type: 'int',
		default: 0,
	})
	vacation: number

	@Column({
		type: 'int',
		default: 0,
	})
	valCode: number

	@Column({ type: 'simple-array', default: '', nullable: true })
	favorites: string[]

	@Column({ type: 'varchar', nullable: true, length: 1000 })
	profile: string

	@Column({ type: 'varchar', nullable: true })
	profileIcon: string

	@Column({ type: 'float', default: 0 })
	diminishingReturns: number

	@Column({ type: 'int', default: 0 })
	spells: number

	@Column({ type: 'int', default: 4 })
	aidCredits: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	income: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	expenses: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	foodpro: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	foodcon: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	attackGains: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	attackLosses: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	exploreGains: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	indyProd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	magicProd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakCash: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakFood: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakRunes: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakTrpArm: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakTrpLnd: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakTrpFly: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakTrpSea: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakTrpWiz: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakLand: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakNetworth: number

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
	})
	peakPeasants: number

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
