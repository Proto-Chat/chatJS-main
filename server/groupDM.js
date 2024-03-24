// ADD THE ABILITY TO CHANGE THE DM TITLE/ICON AND REMOVE THE "STATUS" AND "ABOUT ME" SECTIONS IN THE CLIENT

import { broadcastToSessions } from "./database/newMessage.js";
import { getUidFromSid, getConnection } from "./imports.js";
import * as crypto from 'crypto';

export async function createGroupDM(ws, mongoconnection, response, connectionMap) {
    try {
        const client = await mongoconnection;
        const data = response.data;
        if (!data || !data.sid || !data.uids) return ws.send(404);
        const uids = data.uids;

        const uid = getUidFromSid(data.sid);
        if (!uid) return ws.send(404);
        uids.push(uid);

        uids.sort().join("|");
        const dmkey = uids.join("|");

        const friendList = await client.db(uid).collection('dm_keys').find().toArray();
        const unames = [];
        const unameObj = {};

        for (const f of uids) {
            const friend = friendList.find(o => o.uid == f);
            if (!friend) return ws.send(404);
            unames.push(friend.username);
            unameObj[f] = friend.username;
        }

        // const collectionNames = await client.db('gdms').listCollections().toArray();
        // const collectionExists = collectionNames.some((col) => col.name == dmkey);

        const gdmid = crypto.randomUUID();

        const gdbo = client.db('gdms').collection(gdmid);
        gdbo.insertOne({
            _id: 'configs',
            uids: uids,
            users: unameObj,
            owner: uid,
            dmId: gdmid,
            timeCreated: (new Date()).toISOString(),
            icon: "",
            displayname: unames.join(', ')
        });

        var unamesNew = unames;
        try {
            unamesNew[unames.length - 1] = 'and ' + unamesNew[unames.length - 1];
        }
        catch (err) { console.error(err); }
        
        gdbo.insertOne({
            author: {username: "SYSTEM","uid":"0"},
            id: crypto.randomUUID(),
            content: `DM with **${unamesNew.join(', ')}** created successfully`,
            timestamp: (new Date()).toISOString(),
            channelId: gdmid
        });

        for (const uid of uids) {
            const dbo = client.db(uid).collection('dm_keys');
            dbo.insertOne({
                uid: dmkey,
                username: unames.join(', '), // will store the chat name in this case
                notetoself: false,
                open: true,
                isGroupDM: true,
                dmid: gdmid
            });
        }

        broadcastToSessions(client, connectionMap, uids, { code: 4, op: 7 });
    } catch (err) {
        console.log(err);
        ws.send(500);
    }
}


export async function leaveGroupDM(ws, mongoconnection, response, connectionMap) {
    try {
        if (!response.data.channelId || !response.data.sid || !response.data.uid) return ws.send(401);

        const { channelId, uid, sid } = response.data;

        const client = await mongoconnection;
        // check for the session
        const isValidSession = getConnection(mongoconnection, sid, false, true);
        if (!isValidSession) return ws.send(403);

        // check if this is the person that owns the DM
        const gdbo = client.db('gdms').collection(channelId);
        const doc = await gdbo.findOne({ _id: 'configs' });
        if (!doc) return ws.send(404);

        if (doc.owner == uid) {
            // delete the DM
            for (const u of doc.uids) {
                const dbo = client.db(u).collection('dm_keys');
                await dbo.deleteOne({ dmid: doc.dmId });
            }

            await gdbo.updateOne({ _id: 'configs' }, { $set: { deleted: true } });
        }
        else if (doc.uids.includes(uid)) {
            // remove user from the DM
            const newuid = doc.uids.filter((o) => (o != uid)).join('|');
            for (const u of doc.uids) {
                const dbo = client.db(u).collection('dm_keys');
                await dbo.updateOne({ dmid: doc.dmId }, { $set: { uid: newuid } });
            }

            client.db(uid).collection('dm_keys').deleteOne({ dmid: doc.dmId })
            await gdbo.updateOne({ _id: 'configs' }, { $pull: { uids: uid } });
        }

        broadcastToSessions(client, connectionMap, doc.uids, { code: 4, op: 7, uid: channelId });
    }
    catch (err) {
        console.log(err);
        return null;
    }
}


export async function validateGDM(mongoconnection, sid, gdmid) {
    try {
        const client = await mongoconnection;
        const dbo = client.db('gdms').collection(gdmid);
        const configs = await dbo.findOne({ _id: 'configs' });
        const uid = getUidFromSid(sid);

        if (!configs || !configs.uids.includes(uid)) return false;
        return configs.uids;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}


export async function getDMID(mongoconnection, uidstr) {
    if (!uidstr) return null;

    const uids = uidstr.split('|');
    if (!uids) return null;

    const client = await mongoconnection;
    const udbo = client.db(uids[0]).collection('dm_keys');
    const doc = await udbo.findOne({ uid: uidstr });
    return doc.dmid;
}


export async function changeGCID(mongoconnection, connectionMap, sid, newtitle, gcid) {
    try {
        const client = await mongoconnection;
        if (!sid || !newtitle || !gcid) return false;
        const uid = getUidFromSid(sid);

        const dbo = client.db('gdms').collection(gcid);
        const configs = await dbo.findOne({ _id: 'configs' });

        if (!configs || !configs.uids || !configs.uids.includes(uid)) return false;

        dbo.updateOne({ _id: 'configs' }, { $set: { displayname: newtitle } });

        for (const u of configs.uids) {
            const udbo = client.db(u).collection('dm_keys');
            await udbo.updateOne({ dmid: gcid }, { $set: { username: newtitle } });
        }

        return await broadcastToSessions(client, connectionMap, configs.uids, {
            code: 4,
            op: 6,
            data: {
                fieldname: 'gctitle',
                newContent: newtitle,
                sid: sid,
                uid: configs.uids.join('|'),
                gcid: gcid
            }
        });
    }
    catch (err) {
        console.error(err);
        return false;
    }
}