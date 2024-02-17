import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'
import Model from './Model'

// import Empire from './Empire'

@Entity('game')
export default class Game extends Model {
	@Index()
	@PrimaryGeneratedColumn()
	game_id: number

	@Column()
	name: string

	@Column()
	version: number

	@Column()
	roundName: string

	@Column()
	roundStart: Date

	@Column()
	roundEnd: Date

	@Column()
	roundDescription: string

	@Column({ default: 1 })
	empiresPerUser: number

	@Column({ default: 400 })
	turnsProtection: number

	@Column({ default: 100 })
	turnsInitial: number

	@Column({ default: 400 })
	turnsMax: number

	@Column({ default: 200 })
	turnsStored: number

	@Column({ default: 600 })
	turnsDemo: number

	@Column({ default: 12 })
	vacationStart: number

	@Column({ default: 72 })
	vacationLimit: number

	@Column({ default: 12 })
	turnsFreq: number

	@Column({ default: 2 })
	turnsCount: number

	@Column({ default: 1 })
	turnsUnstore: number

	@Column({ default: 3 })
	lotteryMaxTickets: number

	@Column({ default: 1000000000 })
	lotteryJackpot: number

	@Column({ default: 10000 })
	buildCost: number

	@Column({ default: 60 * 60 * 12 })
	dropDelay: number

	@Column({ default: 4.0 })
	bankSaveRate: number

	@Column({ type: 'double precision', default: 7.5 })
	bankLoanRate: number

	@Column({ default: 6 })
	pubMktStart: number

	// @Column()
	// pubMktMinTime: number

	@Column({ default: 72 })
	pubMktMaxTime: number

	@Column({ default: 0 })
	pubMktMinSell: number

	@Column({ default: 50 })
	pubMktMaxSell: number

	@Column({ default: 0 })
	pubMktMinFood: number

	@Column({ default: 90 })
	pubMktMaxFood: number

	@Column({ default: 0 })
	pubMktMinRunes: number

	@Column({ default: 90 })
	pubMktMaxRunes: number

	@Column({ default: true })
	clanEnable: boolean

	@Column({ default: 4 })
	clanSize: number

	@Column({ default: 72 })
	clanMinJoin: number

	@Column({ default: 24 })
	clanMinRejoin: number

	@Column({ default: 48 })
	clanMinRelate: number

	@Column({ default: 3 })
	clanMaxWar: number

	@Column({ default: 8000 })
	pvtmMaxSell: number

	@Column({ type: 'double precision', default: 0.2 })
	pvtmShopBonus: number

	@Column({ default: 500 })
	pvtmTrpArm: number

	@Column({ default: 1000 })
	pvtmTrpLnd: number

	@Column({ default: 2000 })
	pvtmTrpFly: number

	@Column({ default: 3000 })
	pvtmTrpSea: number

	@Column({ default: 30 })
	pvtmFood: number

	@Column({ default: 1600 })
	pvtmRunes: number

	@Column({ type: 'double precision', default: 2.5 })
	industryMult: number

	@Column({ default: 30 })
	maxAttacks: number

	@Column({ default: 20 })
	maxSpells: number

	@Column({ type: 'double precision', default: 1.5 })
	drRate: number

	@Column({ default: 5 })
	baseLuck: number

	@Column({ default: true })
	aidEnable: boolean

	@Column({ default: 5 })
	aidMaxCredits: number

	@Column({ default: 60 * 60 * 3 })
	aidDelay: number

	@Column({ default: true })
	allowMagicRegress: boolean
}
