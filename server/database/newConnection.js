import { v4 as uuidv4 } from 'uuid';
import { delay } from '../utils/timers.js';


export async function newConnection(connection, data) {
    try {
        if (!data || !data.username || !data.password) return null;

        const client = await connection;
        const dbo = await client.db('main').collection('accounts');
        const doc = await dbo.findOne({username: data.username});

        if (!doc) return {type: 1, code: 0, op: 404};
        if (doc.password != data.password) return {type: 1, code: 0, op: 401};
        const sbo = client.db(doc.uid).collection('sessions');
        
        let sid = uuidv4();
        sid += "?" + Buffer.from(doc.uid).toString('base64');
        
        await sbo.insertOne({sid: sid, timeCreated: new Date(), lastAccessed: null});
        await dbo.updateOne({username: data.username}, { $push: { sids: sid } });
        return sid;
    } catch (err) {
        console.error(err);
        return {type: 1, code: 0, op: 500, message: err.message};
    }
}


export async function createNewUser(mongoconnection, ws, data) {
    try {
        const client = await mongoconnection;
        
        if (!data.password || !data.username) return;
        
        //Check if the username already exists
        const dbo = client.db('main').collection('accounts');
        if (await dbo.findOne({username: data.username})) return ws.send({code: 4, type: 1, op: 409, message: 'username already exists!'});

        //Encrypt the password later
        const passEncrypted = data.password;

        //Insert the "account"
        const res = await dbo.insertOne({
            username: data.username,
            password: passEncrypted,
            sids: []
        });
        
        const newobjid = res.insertedId;
        if (!newobjid) return ws.send({code: 4, type: 1, op: 500});
        
        //This is horrendous, find a better way
        //wait for the uid to be inserted
        await delay(5000);
        var doc = await dbo.findOne({_id: newobjid});
        var stopCounter = 5;
        while (!doc && stopCounter > 0) {
            await delay(5000);
            doc = await dbo.findOne({_id: newobjid});
            stopCounter--;
        }

        if (!doc.uid) return console.log(12); //DEAL WITH THIS LATER

        //Create the main account db
        const ab = client.db(doc.uid);
        ab.collection('dm_keys').insertOne({
            uid: doc.uid,
            username: doc.username,
            notetoself: true,
            open: true
        });

        ab.createCollection('social');

        const configs = ab.collection('configs');
        configs.insertOne({_id: 'myprofile', status: "", description: "", icon: ""});
        
        //Session stuff
        const sid = uuidv4() + "?" + Buffer.from(doc.uid).toString('base64');
        ab.collection('sessions').insertOne({sid: sid});
        await dbo.updateOne({username: data.username}, { $push: { sids: sid } });

        //Create the "note to self" dm
        client.db('dms').createCollection(`${doc.uid}|${doc.uid}`);
        
        //SEND CONFIRMTION OF ACCOUNT CREATION
        ws.send(JSON.stringify({code: 0, op: 2, type: 0}));
    } catch (err) {
        console.log(err);
    }
}