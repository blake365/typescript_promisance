export function makeId(length: number): string {
	let result = ''
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const charactersLength = characters.length
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}
	return result
}

export function slugify(str: string): string {
	str = str.trim()
	str = str.toLowerCase()

	// remove accents, swap ñ for n, etc
	const from = 'åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;'
	const to = 'aaaaaaeeeeiiiioooouuuunc------'

	for (let i = 0, l = from.length; i < l; i++) {
		str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
	}

	return str
		.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
		.replace(/\s+/g, '-') // collapse whitespace and replace by -
		.replace(/-+/g, '-') // collapse dashes
		.replace(/^-+/, '') // trim - from start of text
		.replace(/-+$/, '') // trim - from end of text
		.replace(/-/g, '_')
}

import EmpireNews from '../entity/EmpireNews'

export async function createNewsEvent(
	content: string,
	pubContent: string,
	empireIdSource: number,
	sourceName: string,
	empireIdDestination: number,
	destinationName: string,
	type: string,
	result: string
) {
	// create news events
	let newsItem = new EmpireNews()
	newsItem.personalContent = content
	newsItem.publicContent = pubContent
	newsItem.empireIdSource = empireIdSource
	newsItem.sourceName = sourceName
	newsItem.empireIdDestination = empireIdDestination
	newsItem.destinationName = destinationName
	newsItem.type = type
	newsItem.result = result
	// console.log(newsItem)
	await newsItem.save()
}
