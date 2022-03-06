import { eraArray } from "../../config/eras";
import Empire from "../../entity/Empire";
import { getPower_self, getWizLoss_self } from "./general";

export const advance_cost = (baseCost: number) => {
    return Math.ceil(47.50 * baseCost)
}

export const advance_allow = ({era}) => {
    if (eraArray[era].era_next < 0) {
        return false
    } else return true

    //TODO: implement empire effects 
    // can't advance until acclimated to current era
}

export const advance_cast = (empire: Empire) => {
    if (getPower_self(empire) >= 90) {
        let result = { result: 'success', message: 'You have advanced to the next era', wizloss: 0 }
        return result
    }

    else {
        let wizloss = getWizLoss_self(empire)
        let result = {result: 'fail', message: 'Spell failed', wizloss: wizloss}
        return result
    }
}
