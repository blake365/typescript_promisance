import Empire from "../../entity/Empire";
import { raceArray } from "../../config/races";
import { calcSizeBonus } from "../actions/actions";

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export const baseCost = (empire: Empire) => {
    return (empire.land * 0.10) + 100 + (empire.bldWiz * 0.20) * ((100 + raceArray[empire.race].mod_magic) / 100) * calcSizeBonus(empire)
}

export const getPower_self = (empire: Empire) => {
    return empire.trpWiz * ((100 + raceArray[empire.race].mod_magic) / 100) / Math.max(empire.bldWiz, 1)
}

// TODO: getPower_enemy

// TODO: getPower_friend

export const getWizLoss_self = (empire: Empire) => {
    let wizLoss = randomIntFromInterval(Math.ceil(empire.trpWiz * 0.01), Math.ceil(empire.trpWiz * 0.05 + 1))
    
    if (wizLoss > empire.trpWiz) {
        wizLoss = empire.trpWiz
    }

    return wizLoss
}

// TODO: wizloss friend

// TODO: wizloss enemy

