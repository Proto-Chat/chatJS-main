import { v4 as uuidv4 } from 'uuid';


export async function newConnection(connection, data) {
    return new Promise(async (resolve) => {
        try {
            if (!data || !data.username || !data.password) return resolve(null);

            const client = await connection;
            const dbo = await client.db('accounts').collection(data.username);
            const doc = await dbo.findOne({_id: 'main'});

            if (doc.password != data.password) return resolve(null);
            const sbo = client.db(doc.uid).collection('sessions');
            
            let sid = uuidv4();
            sid += "?" + Buffer.from(doc.uid).toString('base64');
            
            await sbo.insertOne({sid: sid});
            await dbo.updateOne({_id: "sessions"}, { $push: { sids: sid } });
            return resolve(sid);
        } catch (err) {
            console.error(err);
            resolve(null);
        }
    });
}