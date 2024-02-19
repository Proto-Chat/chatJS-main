import { getUidFromSid, wasabiManager } from "../imports.js";
import { randomUUID } from 'crypto';
import { SERVERMACROS as MACROS } from "../macros.js";

export async function broadcastToSessions(client, connectionMap, others, toSend, encDoc, checkPerms = undefined) {
    try {
        for (const k of others) {
            const dbo = client.db(k).collection('sessions');
            const docs = await dbo.find().toArray();

            if (encDoc) {
                const symmEncKeyEnc = encDoc[k];
                toSend['data']['encSymmKey'] = symmEncKeyEnc;
            }

            if (checkPerms && checkPerms.includes(k)) {
                toSend['hasPerms'] = hasPerms;
            }

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


const splitByID = (channelId, client) => {
    return channelId.split("|").filter((o) => (o && o.length > 0));
}


export async function newMessage(mongoconnection, connectionMap, data, isSystemMessage = false) {
    try {
        if (!data || !data.channelId) return false; //Maybe make it a "bad request"?
        const channelId = data.channelId;
        const client = await mongoconnection;
        const keyId = await client.db(data.author.uid).collection('dm_keys').findOne({dmid: channelId});

        if (!keyId) return false;
        const others = (keyId.isGroupDM) ? keyId.uid.split('|') : [keyId.uid, data.author.uid];

        if (!isSystemMessage && others.includes('0')) return;

        //Open the DM for the recipient
        for (const i of others) {
            if (i == data.author.uid) continue;
            const other_dbo = client.db(`${i}`).collection('dm_keys');
            other_dbo.updateOne({uid: data.author.uid}, {$set: {open: true, unread: true}});
        }

        const dmsdbo = client.db((keyId.isGroupDM) ? 'gdms' : 'dms').collection(data.channelId);
        delete data.channelId;
        
        dmsdbo.insertOne(data);
        data.channelId = channelId;

        const encDoc = await dmsdbo.findOne({_id: 'configs'});
        if (!encDoc) return ws.send({type: 1, code: 404, msg: "ENCRYPTION ERROR, KEY NOT FOUND!"});

        return await broadcastToSessions(client, connectionMap, others, { type: 0, code: 5, op: 0, data: data }, encDoc.keyObj);
    }
    catch(err) {
        console.error(err);
        return false;
    }
}


async function deleteMessage(mongoconnection, connectionMap, data) {
    try {
        const client = await mongoconnection;

        // get the key
        var doc = await client.db(data.user.uid).collection('dm_keys').findOne({dmid: data.chatid});
        const others = (doc.isGroupDM) ? splitByID(doc.uid) : [data.user.uid, doc.uid];

        const mbo = client.db((doc.isGroupDM) ? 'gdms' : 'dms').collection(data.chatid);
        doc = await mbo.findOne({id: data.id});
        
        if (!doc || data.user.uid != doc.author.uid) return;

        mbo.updateOne({id: data.id}, {$set: {deleted: true}});

        broadcastToSessions(client, connectionMap, others, {
            type: 0,
            code: 5,
            op: 1,
            data: {
                channelId: data.chatid,
                msgid: data.id
            }
        });
    } catch (err) {
        console.error(err);
        return false;
    }
}


async function editMessage(mongoconnection, connectionMap, data) {
    if (!data || !data.chatid || !data.content) return; //Maybe make it a "bad request"?

    const client = await mongoconnection;
    
    var doc = await client.db(data.user.uid).collection('dm_keys').findOne({dmid: data.chatid});
    const others = (doc.isGroupDM) ? splitByID(doc.uid) : [data.user.uid, doc.uid];

    const mbo = client.db((doc.isGroupDM) ? 'gdms' : 'dms').collection(data.chatid);
    doc = await mbo.findOne({id: data.id});

    if (!doc || data.user.uid != doc.author.uid) return;
    // if (doc.content != data.content) return;

    mbo.updateOne({id: data.id}, {$set: {content: data.content}});

    const encDoc = await mbo.findOne({_id: 'configs'});
    if (!encDoc) return ws.send({type: 1, code: 404, msg: "ENCRYPTION ERROR, KEY NOT FOUND!"});

    broadcastToSessions(client, connectionMap, others, {
        type: 0,
        code: 5,
        op: 2,
        data: {
            channelId: data.chatid,
            msgid: data.id,
            content: data.content,
            author: data.user
        },
    }, encDoc.keyObj);
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
        const uploadPath = (data.serverId) ? `${data.serverId}/${data.channelid}` : data.channelid
        const response = await CDNManager.uploadFile(data.channelid, data.filename, data.buf);

        if (response && response.type && response.code) return response;
        const uid = getUidFromSid(data.sid);

        const msg = {
            author: {
                uid: uid,
                username: data.username
            },
            channelId: data.channelid,
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
        case MACROS.MESSAGE.OPS.RECEIVED: newMessage(mongoconnection, connectionMap, data);
        break;

        case MACROS.MESSAGE.OPS.DELETED: deleteMessage(mongoconnection, connectionMap, data);
        break;

        case MACROS.MESSAGE.OPS.EDITED: editMessage(mongoconnection, connectionMap, data);
        break;

        case MACROS.MESSAGE.OPS.IMAGE: return uploadMsgImg(mongoconnection, CDNManager, connectionMap, data);
            // import('fs').then((o) => {
            //     o.writeFile(`./${data.filename}.avif`, data.buf, (err) => {
            //         console.log(err);
            //     });
            // });

        default: return false;
    }
}