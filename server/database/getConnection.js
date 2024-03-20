import { getUidFromSid } from "../utils/decodesid.js";


/**
 * @description a more lightweight version of getConnection to validate a session
 * @param {*} connection 
 * @param {*} sid 
 * @returns 
 */
export async function validateSession(connection, sid) {
    try {
        const uid = getUidFromSid(sid);
        if (!uid || uid.type == 1) return false;
        
        const client = await connection;

        //Validate session
        const db = client.db(uid);
        const sbo = await db.collection('sessions');
    
        const sessionObj = await sbo.findOne({sid: sid});
        if (!sessionObj) return false;
        return true;
    }
    catch(err) {
        console.error(err);
        return false;
    }
}


export async function getConnection(connection, sid, all = false, validateOnly = false) {
    try {
        if (!sid) return null;

        const uid = getUidFromSid(sid);
        const client = await connection;

        //Validate session
        const db = client.db(uid);
        const sbo = await db.collection('sessions');

        const sessionObj = await sbo.findOne({sid: sid});
        if (!sessionObj && !validateOnly) return {type: 1, code: 0, op: 403};
        else if (!sessionObj && validateOnly) return false;
        else if (validateOnly) return true;
        
        sbo.updateOne({sid: sid}, {$set: {lastAccessed: new Date()}});

        const dms = await db.collection('dm_keys');
        const servers = await client.db(uid).collection('servers');

        // const nottoself = await dms.findOne({uid: getUidFromSid(sid)});
        const invites = await db.collection('social').find({type: 0}).toArray();

        const configs = await db.collection('configs').find().toArray();

        var obj;
        if (all) obj = {friends: await dms.find().toArray(), invites: invites};
        else obj = {
            dms: await dms.find({open: true}).toArray(),
            servers: (await servers.find().toArray()).map((s) => {delete s._id; return s;}),
            invites: invites,
            configs: configs
        };

        return obj;
    } catch (err) {
        console.error(err);
        return null;
    }
}