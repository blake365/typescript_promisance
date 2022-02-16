
import { AsyncTask } from "toad-scheduler";
import {getConnection} from "typeorm";
import ClanInvite from "../entity/ClanInvite";
import Empire from "../entity/Empire";
import Market from "../entity/Market";

// perform standard turn update events
export const promTurns = new AsyncTask('prom turns', async () => {
    
    // max turns 500, max stored turns 250
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update turns
            turns: () => "turns + 5 + LEAST(storedTurns, 1), storedTurns = storedTurns - LEAST(storedTurns, 1)",
        })
    .where("vacation  = 0 AND id != 0")
    .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update stored turns
            storedturns: () => "LEAST(250, storedTurns + turns - 500), turns = 500 "
        })
    .where("turns > 500 AND id != 0")
        .execute();
    
    // reduce max private market sell percentage based on number of buildCash buildings
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update price on private market
            mktPerArm: () => "mkt_Per_Arm - LEAST(mkt_Per_Arm, 100 * (1 + bld_Cash / land))"
        })
    .where("land != 0 AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update price on private market
            mktPerLnd: () => "mkt_Per_Lnd - LEAST(mkt_Per_Lnd, 100 * (1 + bld_Cash / land))"
        })
    .where("land != 0 AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update price on private market
            mktPerFly: () => "mkt_Per_Fly - LEAST(mkt_Per_Fly, 100 * (1 + bld_Cash / land))"
        })
    .where("land != 0 AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update price on private market
            mktPerSea: () => "mkt_Per_Sea - LEAST(mkt_Per_Sea, 100 * (1 + bld_Cash / land))"
        })
    .where("land != 0 AND id != 0")
        .execute();
    
    // refill private market based on bldCost, except for food bldFood
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
            mktArm: () => "mkt_Arm + 8 * (land + bld_Cost)"
        })
    .where("mkt_Arm / 250 < land + 2 * bld_Cost AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
           mktLnd: () => "mkt_Lnd + 5 * (land + bld_Cost)"
        })
    .where("mkt_Lnd / 250 < land + 2 * bld_Cost AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
            mktFly: () => "mkt_Fly + 3 * (land + bld_Cost)"
        })
    .where("mkt_Fly / 250 < land + 2 * bld_Cost AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
           mktSea: () => "mkt_Sea + 2 * (land + bld_Cost)"
        })
    .where("mkt_Sea / 250 < land + 2 * bld_Cost AND id != 0")
        .execute();
    
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
            mktFood: () => "mkt_Food + 50 * (land + bld_Food)"
        })
    .where("mkt_Food / 2000 < land + 2 * bld_Food AND id != 0")
        .execute();
    
    // max attack counter
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update number of attacks
            attacks: () => "attacks - 1"
        })
    .where("attacks > 0 AND id != 0")
        .execute();
    
    // clan troop sharing
    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update available quantity on market
            sharing: () => "sharing - 1"
        })
    .where("sharing > 0 AND id != 0")
        .execute();
    
    //TODO: clean up expired clan invites
    
  
    console.log('Task triggered', new Date());
})



export const hourlyUpdate = new AsyncTask('hourly update', async () => {
    console.log('performing hourly update')

    await getConnection()
    .createQueryBuilder()
    .update(Empire)
        .set({
            // update number of attacks
            attacks: () => "attacks + 1"
        })
    .where("attacks < 0 AND id != 0")
    .execute();
    
    //TODO: clean up expired effects


})

export const cleanMarket = new AsyncTask('clean market', async () => {
    // max time on market 72 hours
    console.log('cleaning market')

let now = new Date()

const markets = await getConnection()
    .createQueryBuilder()
    .select()
    .from(Market, "market")
    .where(`time < (${now} - 3600 * 72)`).getMany()

    console.log(markets)

    // defCosts = []

    //TODO: return unsold goods

    //TODO: delete from market
})