
export async function newMessage(mongoconnection, connectionMap, data) {
    if (!data || !data.channelID) return; //Maybe make it a "bad request"?

    const client = await mongoconnection;
    const others = data.channelID.split("|").filter((o) => (o && o.length > 0));

    const channelId = data.channelID;
    const dmsdbo = client.db('dms').collection(data.channelID);
    delete data.channelID;
    dmsdbo.insertOne(data);
    data.channelID = channelId;

    for (const k of others) {
        const dbo = client.db(k).collection('sessions');
        const docs = await dbo.find().toArray();
        for (const doc of docs) {
            if (connectionMap.has(doc.sid)) {
                const ws = connectionMap.get(doc.sid);
                ws.send(JSON.stringify({
                    type: 0,
                    code: 5,
                    data: data
                }));
            }
        }        
    }
}