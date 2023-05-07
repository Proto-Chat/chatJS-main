import {getUidFromSid} from './utils/decodesid.js';

export function getMessages(mongoconnection, sid, other_id) {
    return new Promise(async (resolve) => {
        const client = await mongoconnection;
        const userid = getUidFromSid(sid);
        const arr = [userid, other_id];
        arr.sort();

        const dbo = client.db('dms').collection(arr.join('|'));
        // dbo.insertOne({author: userid, timestamp: new Date('2023-05-05T18:37:35.449Z').toISOString()});

        // const doc = await dbo.find({
        //     timestamp: {
        //         $gte: '2023-05-04 00:00:00',
        //         $lt:  '2023-05-06 00:00:00'
        //     }
        // }).toArray();

        const doc = await dbo.find({$or: [{deleted : { $exists : false }}, {deleted: false}]}).toArray();
        doc.map((msg) => {
            delete msg._id;
            return msg
        });
        resolve({other: other_id, messages: doc, chatID: arr.join('|')});
    });
}