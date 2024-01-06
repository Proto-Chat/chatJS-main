import { v4 as uuidv4 } from 'uuid';
import { delay } from '../utils/timers.js';
import { generateSymmKeyset } from '../utils/encryption.js';


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


function getEncKeys(mongoconnection, ws, password) {
    
}


export async function createNewUser(mongoconnection, ws, dataFull) {
    try {
        const data = dataFull.data;
        const client = await mongoconnection;
        
        if (!data.password || !data.username) return;
        
        //Check if the username already exists
        const dbo = client.db('main').collection('accounts');
        if (await dbo.findOne({username: data.username})) return ws.send({code: 4, type: 1, op: 409, message: 'username already exists!'});

        //Encrypt the password later
        const passEncrypted = data.password;
        const uid = (await import('crypto')).randomUUID();

        //Insert the "account"
        const res = await dbo.insertOne({
            uid: uid,
            username: data.username,
            password: passEncrypted,
            email: data.email,
            sids: []
        });
        
        const newobjid = res.insertedId;
        if (!newobjid) return ws.send({code: 4, type: 1, op: 500});
        
        //This is horrendous, find a better way
        //wait for the uid to be inserted
        // await delay(5000);
        // var doc = await dbo.findOne({_id: newobjid});
        // var stopCounter = 5;
        // while (!doc && stopCounter > 0) {
        //     await delay(5000);
        //     doc = await dbo.findOne({_id: newobjid});
        //     stopCounter--;
        // }

        // if (!doc.uid) return console.log(12); //DEAL WITH THIS LATER
        const ntsdmid = (await import('crypto')).randomUUID();

        //Create the main account db
        const ab = client.db(uid);
        ab.collection('dm_keys').insertOne({
            uid: uid,
            username: data.username,
            notetoself: true,
            open: true,
            dmid: ntsdmid
        });

        ab.createCollection('social');

        const configs = ab.collection('configs');
        configs.insertOne({_id: 'myprofile', status: "", description: "", icon: "", username: data.username});
        configs.insertOne({_id: 'encryption', keyPub: dataFull.keyPub, iv: dataFull.iv, salt: dataFull.salt, prvKeyEnc: dataFull.keyPrvtEnc});
        
        //Session stuff
        const sid = uuidv4() + "?" + Buffer.from(uid).toString('base64');
        ab.collection('sessions').insertOne({sid: sid});
        await dbo.updateOne({username: data.username}, { $push: { sids: sid } });

        const sysdmid = (await import('crypto')).randomUUID();

        //Create the "note to self" dm
        const mySymmKeyEnc = generateSymmKeyset({uid: uid, keyPub: JSON.parse(dataFull.keyPub)}, {uid: uid, keyPub: JSON.parse(dataFull.keyPub)});
        
        await client.db('dms').collection(ntsdmid).insertOne({
            _id: 'configs',
			users: `${uid}|${uid}`,
			isSystem: false,
			keyObj: mySymmKeyEnc
        });
        
        await client.db('dms').collection(sysdmid).insertOne({
			_id: 'configs',
			users: `${sysdmid}|${uid}`,
			isSystem: true,
			keyObj: mySymmKeyEnc  // you can not send messages to the system
        });

        // add SYSTEM as a friend
        await client.db(uid).collection('dm_keys').insertOne({
            uid: "0",
            username: "SYSTEM",
            notetoself: false,
            open: true,
            system: true,
            dmid: sysdmid
        });
        
        //SEND CONFIRMTION OF ACCOUNT CREATION
        ws.send(JSON.stringify({code: 0, op: 2, type: 0}));
    } catch (err) {
        console.log(err);
    }
}