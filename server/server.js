import { WebSocketServer } from 'ws';
import { MongoClient, ServerApiVersion, GridFSBucket, MongoGridFSChunkError } from 'mongodb';
import config from '../config.json' assert { type: 'json' };
import { resumeSesion, createSession } from './initializations.js';
import { getMessages } from './getMessgaes.js';
import { getUidFromSid } from './utils/decodesid.js';
import { newMessage } from './database/newMessage.js';
import { logout } from './database/logout.js';

//Stores clients by userId
const webSocketClients = new Map();


const client = new MongoClient(config.mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.on('error', (err) => { console.log(err); throw "N O" });
const mongoconnection = client.connect();
const wss = new WebSocketServer({ port: 8080 });


wss.on('connection', async function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async (dataRaw) => {
        try {
            const data = JSON.parse(dataRaw);
            const code = data['code'];

            switch (code) {
                case 0:
                    const toSend = await createSession(ws, mongoconnection, data);
                    if (toSend.sid) webSocketClients.set(toSend.sid, ws);
                    ws.send(JSON.stringify(toSend));
                break;

                case 1:
                    const uid = getUidFromSid(data.sid);
                    const response = await resumeSesion(ws, mongoconnection, data, uid);
                    if (response) webSocketClients.set(data.sid, ws);
                break;

                case 2:
                    if (!data.data.sid) return ws.send(JSON.stringify({type: 1, code: 400}));
                    logout(webSocketClients, ws, mongoconnection, data.data.sid);
                break;
                
                case 3: const messages = await getMessages(mongoconnection, data.sid, data.uid);
                    ws.send(JSON.stringify({code: 3, data: messages}));
                break;

                case 5:
                    // Send the other people in the DM (seperated by "|") the message
                    // and add it to the db
                    newMessage(mongoconnection, webSocketClients, data.data);
                        // ws.send(JSON.stringify({code: 5, data: {message: {author: 'OTHER', content: 'reply!', timestamp: new Date().toISOString()}}}));
                break;

                default: ws.send(403);

            }
        } catch (err) {
            console.log(err);
            ws.send(400);
        }
    });
});

