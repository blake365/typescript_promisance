export function calcTaxPenalty(taxrate: number): number {
	let taxpenalty = 0
	if (taxrate > 0.8) {
		taxpenalty = (taxrate - 0.8) / 2
	} else if (taxrate > 0.4) {
		taxpenalty = (taxrate - 0.5) / 2
	} else if (taxrate < 0.2) {
		taxpenalty = (taxrate - 0.2) / 2
	} else {
		taxpenalty = 0
	}
	return taxpenalty
}
