import { getUidFromSid } from "../utils/decodesid.js";


export async function getConnection(connection, sid) {
    return new Promise(async (resolve) => {
        try {
            if (!sid) return resolve(null);

            const uid = getUidFromSid(sid);
            const client = await connection;

            //Validate session
            const db = client.db(uid);
            const sessionObj = await db.collection('sessions').findOne({sid: sid});
            if (!sessionObj) return {type: 1, code: 404};

            const dms = await db.collection('dm_keys');
            // const servers = await client.db(uid).collection('servers');
            const nottoself = await dms.findOne({uid: getUidFromSid(sid)});

            const obj = {dms: await dms.find().toArray()}
            return resolve(obj);
        } catch (err) {
            console.error(err);
            resolve(null);
        }
    });
}