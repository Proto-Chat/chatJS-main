import * as crypto from 'crypto';
import { getUidFromSid, getUsernameFromUID } from './utils/decodesid.js';
import { broadcastToSessions } from './database/newMessage.js';


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

const findAndStripUConf = async (client, uid) => {
    const uconf = await client.db(uid).collection('configs').findOne({_id: "myprofile"});
    if (!uconf) return ws.send(JSON.stringify({type: 1, code: 401}));
    delete uconf['description'];
    uconf['uid'] = uid;
    return uconf;
}

export async function createServer(mongoconnection, connectionMap, sid, data) {
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
        await sdbo.insertOne({
            _id: 'serverConfigs',
            owner: uid,
            dateCreated: (new Date()).toISOString(),
            isPublic: data.isPrivate,
            name: data.name,
        });

        const uconf = findAndStripUConf(client, uid);

        await sdbo.insertOne({_id: 'classifications', roles: [{'admin': [uid]}], users: [uconf]});
        await createChannel(mongoconnection, connectionMap, sid, serverId, 'general');

        return serverId;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


function pingEveryoneInChannel(connectionMap, client, op, data, uconf, users, code = 6) {
    try {
        const toSend = {code: code, op: op, data: {serverId: data.serverId, channelId: data.channelId, user: uconf}};
        broadcastToSessions(client, connectionMap, users.map(u => u.uid), toSend);
    }
    catch(err) {
        console.error(err);
    }
}

// modify this as needed later (check perms in dbo)
// maybe add an input for the action being done?
const checkPerms = async (db, uid, dbo = undefined) => {
    const serverDoc = await db.collection('settings').findOne({_id: 'serverConfigs'});

    if (dbo) {
// TODO: check channel perms
    }

    // for now, only the server owner can manage channels
    return (!serverDoc || serverDoc.owner != uid);
}


export async function createChannel(mongoconnection, connectionMap, sid, serverId, channelName = null) {
    try {
        const uid = getUidFromSid(sid);
        if (!uid) return;

        const client = await mongoconnection;
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: sid});
        if (!sessionDoc) return null;

        const db = client.db(`S|${serverId}`);

        // for now, only the server owner can manage channels
        if (!checkPerms(db, uid)) return null;

        const uconf = findAndStripUConf(client, uid);

        // insert the channel
        const channelId = crypto.randomUUID();
        const dbo = db.collection(channelId);
        await dbo.insertOne({_id: 'channelConfigs', name: (channelName) ? channelName : 'new channel', visibility: 0, permissions: {roles: ['admin'], users: [uconf]}});
        await dbo.insertOne({_id: 'inChannel', users: []}); // users = [{category/role: String, username: string, userId: string}]

        // ping everyone in the server
        const uDoc = await db.collection('settings').findOne({_id: 'classifications'});

        broadcastToSessions(client, connectionMap, uDoc.users.map(u => u.uid), {
            code: 6,
            op: 2,
            data: {serverId: serverId, channelId: channelId, creator: {username: getUsernameFromUID(client, uid), uid: uid}}
        });

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

// TODO: check if the person has admin privilages

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


async function handleMessage(ws, connectionMap, mongoconnection, data) {
    try {
        // const msg = {author: {username: String, uid: String}, id: crypto.randomUUID(), serverId: String, channelId: String, content: <content>, timestamp: Date}
        if (!data.id || !data.author || !data.serverId || !data.channelId) return ws.send(JSON.stringify({msgId: data.id || null, code: 400, type: 1}));

        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverId}`).collection(data.channelId);

        const doc = await dbo.findOne({_id: 'channelConfigs'});
        if (!doc) return ws.send(JSON.stringify({code: 404, serverId: data.serverId, channelId: data.channelId}));

// TODO check permissions

        // delete data[id];  // idk why I did this
        const conf = await dbo.insertOne(data);
        if (!conf) return ws.send(JSON.stringify({msgId: data.id || null, code: 500, type: 1}));
       
        // send to everyone in the channel (server notifs are not a thing at the moment)
        const inChannel = await dbo.findOne({_id: 'inChannel'});

        const uconf = await client.db(data.author.uid).collection('configs').findOne({_id: "myprofile"});
        if (!uconf) return ws.send(JSON.stringify({type: 1, code: 401}));
        delete uconf['description'];
        uconf['uid'] = data.author.uid;

        broadcastToSessions(client, connectionMap, inChannel.users.map(u => u.uid), {code: 5, op: 0, data: data});
    }
    catch (err) {
        console.error(err);
        return ws.send(JSON.stringify({msgId: data.id || null, code: 500, type: 1}));
    }
}


async function getChannel(ws, connectionMap, mongoconnection, data) {
    try {
        if (!data || !data.serverId || !data.channelId) return ws.send(JSON.stringify({type: 1, code: 404}));
        else if (!data.sid) return ws.send(JSON.stringify({type: 1, code: 401}));

        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverId}`).collection(data.channelId);
        const doc = await dbo.find({$nor: [{_id: 'channelConfigs'}, {_id: 'inChannel'}]}).toArray();
        if (!doc) return;

        const channelConfigs = await dbo.find({$or: [{_id: 'channelConfigs'}, {_id: 'inChannel'}]}).toArray();

        const uid = getUidFromSid(data.sid);
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: data.sid});
        if (!sessionDoc) return null;

        const uconf = await client.db(uid).collection('configs').findOne({_id: "myprofile"});
        if (!uconf) return ws.send(JSON.stringify({type: 1, code: 401}));
        delete uconf['description'];
        uconf['uid'] = uid;

        // add the fact that the user is currently looking at the channel to the DB
        if (data.currentChannel) {
            // remove user from the old channel
            const dboOld = client.client.db(`S|${data.serverId}`).collection(data.currentChannel);
            dboOld.updateOne({_id: 'inChannel'}, { $pull: { users: {uid: uid} } });
        }

        const uFromPresList = (await dbo.findOne({_id: 'inChannel'})).users.find(u => (u.uid == uid));
        if (!uFromPresList) {
            dbo.updateOne({_id: 'inChannel'}, { $push: { users: uconf} });
        }

        // update member list for everyone else in that channel
        const inChannel = await dbo.findOne({_id: 'inChannel'});
        pingEveryoneInChannel(connectionMap, client, 4, data, uconf, inChannel.users);

        const confInd = channelConfigs.findIndex((o) => o._id == 'channelConfigs');
        channelConfigs[confInd]['channelId'] = data.channelId;
        channelConfigs[confInd]['serverId'] = data.serverId;

        ws.send(JSON.stringify({
            code: 2,
            messages: doc,
            channelconfs: channelConfigs
        }));
    }
    catch (err) {
        console.error(err);
        ws.send(JSON.stringify({type: 1, code: 500}));
    }
}


// update or delete
async function updateChannel(ws, connectionMap, mongoconnection, data, op) {
    try {
        if (!data || !data.sid || !data.serverId || !data.channelId) return ws.send(JSON.stringify({type: 1, code: 404}));
        else if (!data.sid) return ws.send(JSON.stringify({type: 1, code: 401}));

        const client = await mongoconnection;
        const db = client.db(`S|${data.serverId}`);
        const dbo = db.collection(data.channelId);

        const doc = await dbo.find({$nor: [{_id: 'channelConfigs'}, {_id: 'inChannel'}]}).toArray();
        if (!doc) return;

        const uid = getUidFromSid(data.sid);
        const sessionDoc = await client.db(uid).collection('sessions').findOne({sid: data.sid});
        if (!sessionDoc) return null;

        if (!checkPerms(db, uid, data.channelId, dbo)) return null;

        const toSend = {serverId: data.serverId, channelId: data.channelId, changer: {username: getUsernameFromUID(client, uid), uid: uid}};

        // edit
        if (op == 6) {
            await dbo.updateOne({_id: "channelConfigs"}, {$set: {name: data.newName}});
            toSend['newName'] = data.newName;
        }
        // delete
        else if (op == 7) {
            await dbo.drop();
        }
        else return ws.send(JSON.stringify({type: 1, code: 404, msg: `UNKNOWN OP ${op}`}));

        // ping everyone in the server
        const uDoc = await db.collection('settings').findOne({_id: 'classifications'});

        broadcastToSessions(client, connectionMap, uDoc.users.map(u => u.uid), {
            code: 6,
            op: op - 1,
            data: toSend
        });
    }
    catch (err) {
        console.error(err);
        ws.send(JSON.stringify({type: 1, code: 500}));
    }
}


export async function handleChatServer(ws, connectionMap, mongoconnection, data) {    
    switch (data.op) {
        case 0:
            const response = await createServer(mongoconnection, connectionMap, data.sid, data.data);
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
            createChannel(mongoconnection, connectionMap, data.data.sid, data.data.serverId, data.data.channelName);
            // ws.send(501);
            break;

        case 4:
            getChannel(ws, connectionMap, mongoconnection, data.data);
            break;

        case 5:
            handleMessage(ws, connectionMap, mongoconnection, data.data);
            break;

        case 6:
        case 7:
            updateChannel(ws, connectionMap, mongoconnection, data.data, data.op);
            break;

        default: console.log(data);
    }
}