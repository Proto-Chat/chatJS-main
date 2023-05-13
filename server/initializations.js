//This file contains code for either creating or resuming a session
import { newConnection } from './database/newConnection.js';
import { getConnection } from './database/getConnection.js';
import { getUIDFromUsername, getUidFromSid, getUsernameFromUID } from './utils/decodesid.js';
import { broadcastToSessions } from './database/newMessage.js';


export async function getCurrentUsername(mongoconnection, uid) {
    try {
        const client = await mongoconnection;
        const doc = await client.db(uid).collection('dm_keys').findOne({uid: uid});
        return doc.username;
    } catch (err) {
        console.log(err);
        return null;
    }
}


export async function createSession(ws, mongoconnection, data) {
    const sid = await newConnection(mongoconnection, data);
    const toSend = (typeof sid === 'string' || sid instanceof String) ? {type: 0, code: 0, username: data['username'], sessionid: sid} : sid;
    return toSend;
}


export async function resumeSesion(ws, mongoconnection, data, uid) {
    if (!data.sid) {
            ws.send({type: 1, code: 0, op: 401});
            return false;
        }
        const doc = await getConnection(mongoconnection, data.sid);

        if (!doc) {
            return ws.send(JSON.stringify({type: 1, code: 0, op: 403}));
        }
        if (doc.type == 1) {
            ws.send(JSON.stringify(doc));
            return false;
        }
        else {
            const username = await getCurrentUsername(mongoconnection, uid);
            ws.send(JSON.stringify({type: 0, code: 1, op: 0, data: {
                dms: doc.dms,
                user: {username: username, uid: uid},
                configs: doc.configs
            }}));
            return true;
        }
}