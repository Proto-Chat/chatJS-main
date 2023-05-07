
async function broadcastToSessions(client, connectionMap, others, toSend) {
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
}


export async function newMessage(mongoconnection, connectionMap, data) {
    if (!data || !data.channelID) return; //Maybe make it a "bad request"?

    const client = await mongoconnection;
    const others = data.channelID.split("|").filter((o) => (o && o.length > 0));

    const channelId = data.channelID;
    const dmsdbo = client.db('dms').collection(data.channelID);
    delete data.channelID;
    
    dmsdbo.insertOne(data);
    data.channelID = channelId;

    broadcastToSessions(client, connectionMap, others, { type: 0, code: 5, op: 0, data: data });
}


async function deleteMessage(mongoconnection, connectionMap, data) {
    const client = await mongoconnection;
    const mbo = client.db('dms').collection(data.chatid);
    const doc = await mbo.findOne({id: data.msgid});
    const others = data.chatid.split("|").filter((o) => (o && o.length > 0));
    
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


export function handleMessage(mongoconnection, connectionMap, data, op) {
    switch (op) {
        case 0: newMessage(mongoconnection, connectionMap, data);
        break;

        case 1: deleteMessage(mongoconnection, connectionMap, data);
        break;

        default: return false;
    }
}