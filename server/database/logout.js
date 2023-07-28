import { getUidFromSid } from "../utils/decodesid.js";

export async function logout(clients, ws, mongoconnection, sid) {
    if (!clients.has(sid)) return;

    const uid = getUidFromSid(sid);
    const client = await mongoconnection;
    const dbo = client.db(uid).collection('sessions');
    await dbo.deleteOne({sid: sid});

    ws.send(JSON.stringify({type: 0, code: 2}));
    clients.delete(sid);
}

export async function logoutAllSessions(clients, ws, mongoconnection, sid) {
    try {
        const uid = getUidFromSid(sid);
        const client = await mongoconnection;
        const dbo = client.db(uid).collection('sessions');
        const sdoc = await dbo.findOne({sid: sid});
        if (!sdoc) return;

        // delete all sessions
        dbo.deleteMany({});

        if (!clients.has(sid)) return;
        ws.send(JSON.stringify({type: 0, code: 2}));
        clients.delete(sid);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}

export async function toggleDM(mongoconnection, sid, other_id, open) {
    try {
        const uid = getUidFromSid(sid);
        if (uid == other_id || other_id == '0') return;
        
        const client = await mongoconnection;
        const dbo = client.db(uid).collection('dm_keys');

        const doc = await dbo.findOne({uid: other_id});
        if (doc.open == open) return true;
        
        await dbo.updateOne({uid: other_id}, {$set: {open: open}});
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}