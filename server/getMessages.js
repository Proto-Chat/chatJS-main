import {getUidFromSid} from './utils/decodesid.js';

async function getGroupDMmsgs(client, uid, other_id) {
    const ubo = client.db(uid).collection('dm_keys');
    const gdmUIDs = await ubo.findOne({uid: other_id});
    if (!gdmUIDs) return null;
    const dmid = gdmUIDs.dmid;

    const dbo = client.db('gdms').collection(dmid);
    const doc = await dbo.find();

    doc.map((document) => {
        delete document._id;
        return document;
    });

    const configs = await dbo.findOne({_id: 'configs'});
    configs.otherId = other_id;
    const messages = await dbo.find({$or: [{deleted : { $exists : false }}, {deleted: false}], _id: {$ne: 'configs'}}).toArray();

    // get the usernames
    const friendList = await client.db(uid).collection('dm_keys').find().toArray();
    const unames = {};
    for (const f of configs.uids) {
        const friend = friendList.find(o => o.uid == f);
        if (!friend) return ws.send(404);
        unames[f] = friend.username;
    }

    return {
        configs: configs,
        messages: messages,
        unames: unames,
        isGroupDM: true
    };
}


export async function getMessages(mongoconnection, ws, sid, other_id) {
    try {
        const client = await mongoconnection;
        const userid = getUidFromSid(sid);
        if (!userid) return null;

        const udbo = client.db(userid).collection('sessions');
        if (!await udbo.findOne({sid: sid})) return null;

        //Deal with group-dms
        const isGroupDM = other_id.split("|").length > 2;
        if (isGroupDM) return await getGroupDMmsgs(client, userid, other_id);

        const dmDoc = await client.db(userid).collection('dm_keys').findOne({uid: other_id});
        const dmId = dmDoc.dmid;

        const dbo = client.db('dms').collection(dmId);

        // const doc = await dbo.find({
        //     timestamp: {
        //         $gte: '2023-05-04 00:00:00',
        //         $lt:  '2023-05-06 00:00:00'
        //     }
        // }).toArray();

        const configs = await client.db(other_id).collection('configs').findOne({_id: 'myprofile'});
        configs.uid = other_id;

        // get the chat encryption details
        const encDoc = await dbo.findOne({_id: 'configs'});
        if (!encDoc) return ws.send(JSON.stringify({type: 1, code: 404, dmId: dmId}));

        const doc = await dbo.find({$or: [{deleted : { $exists : false }}, {deleted: false}], _id: {$ne: 'configs'}}).toArray();
        doc.map((document) => {
            delete document._id;
            return document;
        });

        if (configs.tokens) delete configs.tokens;

        return {other: configs, messages: doc, chatID: dmId, symmKeyEnc: encDoc.keyObj[userid]};
    }
    catch (err) {
        console.error(err);
        return null;
    }
}