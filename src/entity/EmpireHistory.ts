import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('empire history')
export default class EmpireHistory extends Model {
	constructor(empireHistory: Partial<EmpireHistory>) {
		super()
		Object.assign(this, empireHistory)
	}

	@Index()
	@PrimaryGeneratedColumn()
	empireHistory_id: number

	@Index()
	@Column()
	roundHistory_id: string

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryFlags: number

	@Column({
		type: 'int',
		default: 0,
	})
	u_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryId: number

	@Column()
	empireHistoryName: string

	@Column()
	empireHistoryRace: string

	@Column()
	empireHistoryEra: string

	@Column({
		type: 'int',
		default: 0,
	})
	clanHistory_id: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryOffSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryOffTotal: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryDefSucc: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryDefTotal: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryKills: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryScore: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryNetworth: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryLand: number

	@Column({
		type: 'int',
		default: 0,
	})
	empireHistoryRank: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryFoodPro: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryFoodCon: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryIncome: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryExpenses: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryIndyProd: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryMagicProd: number
	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryAttackGain: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	empireHistoryAttackLoss: number

	@Column({
		type: 'int',
		default: 0,
	})
	turnsUsed: number

	@Column({ type: 'varchar', nullable: true, length: 1000 })
	profile: string

	@Column({ type: 'varchar', nullable: true })
	profileIcon: string

	@Column({
		type: 'bigint',
		default: 0,
	})
	finalTrpArm: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	finalTrpLnd: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	finalTrpFly: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	finalTrpSea: number

	@Column({
		type: 'bigint',
		default: 0,
	})
	finalTrpWiz: number
}
