const SnakeNamingStrategy =
	require('typeorm-naming-strategies').SnakeNamingStrategy

const rootDir = process.env.NODE_ENV === 'development' ? 'src' : 'build'

// console.log('rootDir', rootDir)

module.exports = {
	type: process.env.DB_DIALECT,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	synchronize: true,
	logging: false,
	namingStrategy: new SnakeNamingStrategy(),
	entities: [rootDir + '/entity/**/*{.ts,.js}'],
	migrations: [rootDir + '/migrations/**/*{.ts,.js}'],
	cli: {
		entitiesDir: rootDir + '/entity',
		migrationsDir: rootDir + '/migrations',
		subscribersDir: rootDir + '/subscribers',
	},
}
