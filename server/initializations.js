//This file contains code for either creating or resuming a session
import { newConnection } from './database/newConnection.js';
import { getConnection } from './database/getConnection.js';


export function getCurrentUsername(mongoconnection, uid) {
    return new Promise(async (resolve) => {
        const client = await mongoconnection;
        const doc = await client.db(uid).collection('dm_keys').findOne({uid: uid});
        resolve(doc.username);
    });
}


export async function createSession(ws, mongoconnection, data) {
    const sid = await newConnection(mongoconnection, data);
    const toSend = (sid) ? {type: 0, code: 0, username: data['username'], sessionid: sid} : {type: 1, code: 403};
    return toSend;
}


export function resumeSesion(ws, mongoconnection, data, uid) {
    return new Promise(async (resolve) => {
        if (!data.sid) {
            ws.send(401);
            return resolve(false);
        }
        const doc = await getConnection(mongoconnection, data.sid);

        if (doc.type == 1) {
            ws.send(JSON.stringify(doc));
            return resolve(false);
        }
        else {
            const username = await getCurrentUsername(mongoconnection, uid);
            ws.send(JSON.stringify({type: 0, code: 1, data: {dms: doc.dms, user: {username: username, uid: uid}}}));
            resolve(true);
        }
    });
}