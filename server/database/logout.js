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