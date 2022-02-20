import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'

import Model from './Model'
import User from './User'

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

	@ManyToOne(() => User, (user) => user.empires)
	@JoinColumn({name: 'username', referencedColumnName: 'username'})
	user: User

	// @CreateDateColumn()
	// createdAt: Date

	// @UpdateDateColumn()
	// updatedAt: Date

	@Column({default: ''})
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

	@Column()
	name: string

	@Column('bigint', {
		transformer: {
			to: (value) => value,
			from: (value) => parseInt(value),
		},
		default: 0,
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

	@Column()
	race: string

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

	

	// @Column()
	// turns: number

	// @Column()
	// turnsUsed: number
}
