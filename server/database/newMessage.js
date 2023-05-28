import { getUidFromSid, wasabiManager } from "../imports.js";
import { randomUUID } from 'crypto';

export async function broadcastToSessions(client, connectionMap, others, toSend) {
    try {
        for (const k of others) {
            const dbo = client.db(k).collection('sessions');
            const docs = await dbo.find().toArray();

            for (const doc of docs) {
                if (connectionMap.has(doc.sid)) {
                    const ws = connectionMap.get(doc.sid);
                    ws.send(JSON.stringify(toSend));
                }
            }        
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}


const splitByID = (channelID) => {
    return channelID.split("|").filter((o) => (o && o.length > 0));
}


export async function newMessage(mongoconnection, connectionMap, data) {
    if (!data || !data.channelID) return false; //Maybe make it a "bad request"?

    const client = await mongoconnection;
    const others = splitByID(data.channelID);

    //Open the DM for the recipient
    for (const i of others) {
        if (i == data.author.uid) continue;
        const other_dbo = client.db(`${i}`).collection('dm_keys');
        other_dbo.updateOne({uid: data.author.uid}, {$set: {open: true, unread: true}});
    }

    const channelId = data.channelID;
    const dmsdbo = client.db('dms').collection(data.channelID);
    delete data.channelID;
    
    dmsdbo.insertOne(data);
    data.channelID = channelId;

    return await broadcastToSessions(client, connectionMap, others, { type: 0, code: 5, op: 0, data: data });
}


async function deleteMessage(mongoconnection, connectionMap, data) {
    const client = await mongoconnection;
    const mbo = client.db('dms').collection(data.chatid);
    const doc = await mbo.findOne({id: data.msgid});
    const others = splitByID(data.chatid);
    
    if (data.user.uid != doc.author.uid) return;

    mbo.updateOne({id: data.msgid}, {$set: {deleted: true}});

    broadcastToSessions(client, connectionMap, others, {
        type: 0,
        code: 5,
        op: 1,
        data: {
            channelID: data.chatid,
            msgid: data.msgid
        }
    });
}


async function editMessage(mongoconnection, connectionMap, data) {
    if (!data || !data.chatid || !data.content) return; //Maybe make it a "bad request"?

    const client = await mongoconnection;
    const mbo = client.db('dms').collection(data.chatid);
    const doc = await mbo.findOne({id: data.msgid});
    const others = splitByID(data.chatid);

    if (!doc || data.user.uid != doc.author.uid) return;
    // if (doc.content != data.content) return;

    mbo.updateOne({id: data.msgid}, {$set: {content: data.content}});

    broadcastToSessions(client, connectionMap, others, {
        type: 0,
        code: 5,
        op: 2,
        data: {
            channelID: data.chatid,
            msgid: data.msgid,
            content: data.content,
            author: data.user
        }
    });
}


export async function markDMAsRead(mongoconnection, connectionMap, data) {
    const uid = String(getUidFromSid(data.data.sid));
    const client = await mongoconnection;
    const dbo = client.db(uid).collection('dm_keys');

    const ids = splitByID(data.data.dmid);
    for (const oid of ids) {
        if (oid == uid) continue;
        dbo.updateOne({uid: oid}, {$set: {unread: false}});
    }
}


/**
 * @param {*} data 
 * @param {wasabiManager} CDNManager 
 * @param {*} connectionMap 
 */
async function uploadMsgImg(mongoconnection, CDNManager, connectionMap, data) {
    try {
        if (!data || !data.buf || data.buf.byteLength/1000000 > 10) return false;
        
        const response = await CDNManager.uploadFile(data.channelid, data.filename, data.buf);
        if (response && response.type && response.code) return response;
        const uid = getUidFromSid(data.sid);

        const msg = {
            author: {
                uid: uid,
                username: data.username
            },
            channelID: data.channelid,
            id: randomUUID(),
            timestamp: (new Date()).toISOString(),
            content: {
                filename: data.filename
            }
        }

        return await newMessage(mongoconnection, connectionMap, msg);
    }
    catch (err) {
        console.error(err);
        return false;
    }
    
}


/**
 * @param {*} mongoconnection 
 * @param {*} connectionMap 
 * @param {*} data
 * @param {*} op 
 * @param {wasabiManager} CDNManager 
 * @returns 
 */
export function handleMessage(mongoconnection, connectionMap, data, op, CDNManager = null) {
    switch (op) {
        case 0: newMessage(mongoconnection, connectionMap, data);
        break;

        case 1: deleteMessage(mongoconnection, connectionMap, data);
        break;

        case 2: editMessage(mongoconnection, connectionMap, data);
        break;

        case 3: return uploadMsgImg(mongoconnection, CDNManager, connectionMap, data);
            // import('fs').then((o) => {
            //     o.writeFile(`./${data.filename}.avif`, data.buf, (err) => {
            //         console.log(err);
            //     });
            // });

        default: return false;
    }
}