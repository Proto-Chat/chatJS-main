import * as crypto from 'crypto';
import { getUidFromSid } from './utils/decodesid.js';


async function generateServerId(client) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const servers = (await client.db('admin').admin().listDatabases()).databases.map(db => db.name).filter((d) => d.includes('S|'));

    while (true) {
        let result = '';
        for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            result += charset[randomIndex];
        }

        if (!servers.includes(`S|${result}`)) return `S|${result}`;
    }
}


export async function createServer(mongoconnection, sid, data) {
    try {
        const uid = getUidFromSid(sid);
        if (!sid) return null;

        const client = await mongoconnection;
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: sid});
        if (!sessionDoc) return null;

        const dbo = client.db(uid).collection('servers');
        const serverId = await generateServerId(client);
        if (!serverId) return;

        dbo.insertOne({serverId: serverId, timeCreated: (new Date()).toISOString(), isPublic: data.isPrivate, name: data.title});
        const sdbo = client.db(serverId).collection('settings');

        // 0 - private, 1 - public
        await sdbo.insertOne({_id: 'serverConfigs', owner: uid, dateCreated: (new Date()).toISOString(), isPublic: data.isPrivate, name: data.name});
        await createChannel(mongoconnection, sid, serverId, 'general');

        return serverId;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function createChannel(mongoconnection, sid, serverId, channelName = null) {
    try {
        const uid = getUidFromSid(sid);
        if (!uid) return;
        const client = await mongoconnection;
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: sid});
        if (!sessionDoc) return null;

        const db = client.db(serverId)
        const serverDoc = await db.collection('settings').findOne({_id: 'serverConfigs'});
        if (!serverDoc || serverDoc.owner != uid) return null;

        // insert the channel
        const channelId = crypto.randomUUID();
        const dbo = db.collection(channelId);
        await dbo.insertOne({_id: 'channelConfigs', name: (channelName) ? channelName : 'new channel', visibility: 0});
        return channelId;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

// testing server: http://localhost:3000/server/Y0Td7hn4

export async function getServerInfo(mongoconnection, sid, serverId) {
    try {
        const uid = getUidFromSid(sid);
        if (!uid) return;
        const client = await mongoconnection;
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: sid});
        if (!sessionDoc) return null;

        const db = client.db(serverId);
        const configs = await db.collection('settings').findOne({_id: 'serverConfigs'});
        if (!configs) return null;

        configs.serverId = serverId.replace('S|', '');

        const channelObjs = (await db.listCollections().toArray()).filter((col) => col.name != 'settings');
        const channels = {};
        for (const channelRaw of channelObjs) {
            const channelObj = db.collection(channelRaw.name);
            const doc = await channelObj.findOne({_id: 'channelConfigs'});
            channels[doc.name] = {channelId: channelRaw.name, vis: doc.visibility};
        }

        return {
            configs: configs,
            channels: channels
        };
    }
    catch (err) {
        console.error(err);
        return null;
    }
}

async function handleMessage(ws, mongoconnection, data) {
    try {
        // const msg = {author: {username: String, uid: String}, id: crypto.randomUUID(), serverId: String, channelID: String, content: <content>, timestamp: Date}
        if (!data.id || !data.author  || !data.serverId || !data.channelId) return ws.send(JSON.stringify({msgId: data.id || null, code: 400, type: 1}));

        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverId}`).collection(data.channelId);
        const doc = await dbo.findOne({id: channelConfigs});
        if (!doc) return;

// TODO check permissions

        delete data[id];
        const conf = await dbo.insertOne(data);
        if (!conf) return ws.send(JSON.stringify({msgId: data.id || null, code: 500, type: 1}));

// TODO send to everyone in the server
        
        
    }
    catch (err) {
        console.error(err);
        return ws.send(JSON.stringify({msgId: data.id || null, code: 500, type: 1}));
    }
}


async function getChannel(ws, mongoconnection, data) {
    try {
        if (!data || !data.serverId || !data.channelId) return ws.send(JSON.stringify({type: 1, code: 404}));
        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverId}`).collection(data.channelId);
        const doc = await dbo.find({}).toArray();
        if (!doc) return;

        ws.send(JSON.stringify({
            code: 2,
            data: doc
        }));
    }
    catch (err) {
        console.error(err);
        ws.send(JSON.stringify({type: 1, code: 500}));
    }
}


export async function handleChatServer(ws, mongoconnection, data) {
    switch (data.op) {
        case 0:
            const response = await createServer(mongoconnection, data.sid, data.data);
            if (!response) return ws.send(JSON.stringify({
                code: 500
            }));

            ws.send(JSON.stringify({
                code: 6,
                op: 0,
                serverId: response.replace('S|', '')
            }));
        break;

        case 2:
            getChannel(ws, mongoconnection, data.data);
            break;

        default: console.log(data);
    }
}