import expressWs from 'express-ws';
import {
    MongoClient, ServerApiVersion,
    configImp,
    resumeSesion, createSession,
    getMessages,
    getUidFromSid,
    handleMessage, markDMAsRead,
    logout, logoutAllSessions,
    handleSocials,
    wasabiManager,
    express,
    cors,
    validateSession,
    getPFP, uploadPFP,
    bodyParser,
    createUConf,
    processUConf,
    toggleDM,
    systemMsgAll,
    validateGDM, getDMID
} from './imports.js';
import { broadcastToSessions } from './database/newMessage.js';
import { handleChatServer } from './chatServer.js';

const config = (configImp) ? configImp : process.env;

//Stores clients by userId
const webSocketClients = new Map();


const client = new MongoClient(config.mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.on('error', (err) => { console.log(err); throw "N O" });
const mongoconnection = client.connect();

const port = process.env.PORT || 3000;
// const wss = new WebSocketServer({ port: port, path: '/websocket' });
const CDNManager = new wasabiManager(config.accessKeyID, config.accesskeySecret, config.cloudinaryKey, config.cloudinarySecret);


const app = express();
app.use(cors());
app.use(bodyParser.raw({type: 'application/octet-stream', limit: '10mb'}));
app.use('/assets', express.static('../assets'));
app.use('/CSS', express.static('../CSS'));
app.use('/scripts', express.static('../scripts'));
const wsInstance = expressWs(app);


// TURN code
const turnConfig = {
    "listeningPort": 4000,
    "relayIps": ["127.0.0.1"],
    "useUdp": false,
    "useTcp": true
  }
  
// Create and configure the STUN server
import turn from 'node-turn';

const turnServer = new turn({
    authMech: 'none',
    debugLevel: 'INFO',
    listeningIps: ['0.0.0.0'],
    turnConfig
});

turnServer.on('listening', () => {
    console.log('STUN server is running on port', turnServer.listeningPort);
});


turnServer.on('connection', async (connection) => {
    console.log(connection);
});

turnServer.on('error', async (err) => {
    console.log(err);
});

turnServer.start();


app.put('/msgImg', async (req, res) => {
    try {
        const sid = req.headers.sessionid;
        const channelid = req.headers.channelid;
        const fext = req.headers.fext;
        const username = req.headers.username;
        if (!sid) return res.sendStatus(401);
        if (!channelid || !username) return res.sendStatus(404);
        if (!fext) return res.sendStatus(409);
    
        const buf = Buffer.from(req.body, 'base64');
        const filename = Math.random().toString(36).slice(2);
    
        const response = await handleMessage(mongoconnection, webSocketClients, {files: req.body, sid: sid, username: username, channelid: channelid, filename: `${filename}.${fext}`, buf: buf}, 3, CDNManager);
        if (!response) return res.sendStatus(500);
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});


app.post('/updatepfp', async(request, response) => {
    try {
        const { headers } = request;
        const { sessionid, code, op, filename, isgdm, gdmid } = headers;

        if (!sessionid || !code || !op || !filename) return response.send({code: 400, message: 'missing parameters'});
        if (!validateSession(mongoconnection, sessionid)) return response.send({code: 404, message: 'session not found'});

        var uids;
        if (isgdm) {
            // check if this is a valid DM/the user is in it
            uids = await validateGDM(mongoconnection, sessionid, gdmid);
            if (!uids) return response.sendStatus(404);
        }

        const imgBufRaw = request.body;
        const imgBuf = Buffer.from(imgBufRaw);

        const res = await uploadPFP(mongoconnection, CDNManager, sessionid, filename, imgBuf, gdmid);
        
        if (res == true) {
            // send a "pfp updated" gateway event
            if (isgdm) {
                broadcastToSessions(client, webSocketClients, uids, {code: 4, op: 6, data: {
                    uid: gdmid,
                    isgroupdm: true,
                    updated: 'icon',
                    newdata: filename
                }});
            }
            else {
                const ws = webSocketClients.get(sessionid);
                handleSocials(ws, mongoconnection, {op: 10, sid: sessionid, updated: 'icon', newdata: filename}, webSocketClients);
                response.sendStatus(201);
            }
        }
        else if (res == false) response.sendStatus(500);
        else response.send(res);
    }
    catch (err) {
        console.error(err);
        response.sendStatus(500);
    }
});


app.get('/getpfp', async (req, res) => {
    try {
        const{ headers } = req;
        const { sessionid, otherid } = headers;

        if (!sessionid && !otherid) return res.send({type: 1, code: 404, message: "please provide a session id and optional username"});

        const isValidSession = await validateSession(mongoconnection, sessionid);
        if (!isValidSession) return res.send({type: 1, code: 404, message: "session id not found"});

        //deal with group DMS
        const isgdm = otherid && otherid.indexOf('|') != -1;
        var uid;

        if (isgdm) uid = await getDMID(mongoconnection, otherid);
        else uid = (otherid) ? otherid : getUidFromSid(sessionid);
        if (!uid) return res.send(null);

        const pfpData = await getPFP(mongoconnection, CDNManager, uid, isgdm);
        if (!pfpData) return res.send(null);
        else if (pfpData.type == 1) return res.send(null);

        const buffer = Buffer.concat([pfpData]);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});


app.get('/msgImg', async (req, res) => {
    try {
        const { sessionid, channelid, username } = req.headers;
        if (!sessionid) return res.sendStatus(401);
        if (!channelid || !username) return res.sendStatus(409);
    
        const fname = req.query.fname;
        if (!fname) return res.sendStatus(404);
    
        const file = await CDNManager.getFile(channelid, fname);
        return res.send(file);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}); 

/* THIS WILL BREAK THE WS SERVER
app.get('/*', async (req, res) => {   
    if (req.path == '/favicon.ico') {
        res.sendFile('favicon.ico', {root: './client/assets'});
    } else {
        res.sendFile(`${req.path}`, {root: './client'});
    }
});
*/

app.post('/systemmsgall', async (req, res) => {
    const { token, content } = req.headers;
    if (!token || !content) return;

    systemMsgAll(mongoconnection, webSocketClients, res, token, content);
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile('favicon.ico', {root: './client/assets'});
});


app.get('/', (req, res) => {
    res.sendFile(`index.html`, {root: './client'});
});

app.get('/server/:sid', (req, res) => {
    const serverId = req.path.replace('/server/', '');
    if (!serverId) return res.sendStatus(404);
    return res.sendFile('server.html', {root: './client'});
});

app.get('/server', async (req, res) => {
    res.sendStatus(404);
})

app.get('/social', (req, res) => {
    res.sendFile(`social.html`, {root: './client'});
});

app.get('/join', (req, res) => {
    res.sendFile(`join.html`, {root: './client'});
});

app.get('/call', (req, res) => {
    res.sendFile(`call.html`, {root: './client'});
});

app.get('/scripts/*', (req, res) => {
    res.sendFile(`${req.path}`, {root: './client'});
});

app.get('/CSS/*', (req, res) => {
    res.sendFile(`${req.path}`, {root: './client'});
});

app.get('/assets/*', (req, res) => {
    res.sendFile(`${req.path}`, {root: './client'});
});


/*
app.ws('/call', async (ws, req) => {
    console.log("CONNECTION RECIEVED");
    ws.on('error', console.error);

    ws.on('message', async (dataRaw) => {
        try {
            try {
                JSON.parse(dataRaw);
            }
            catch (err) {
                return ws.send(JSON.stringify({type: 1, code: 400, message: "Please use a JSON format"}));
            }
            
            // const data = JSON.parse(dataRaw);
            console.log(dataRaw);
        }
        catch (err) {
            console.error(err);
        }
    });
});
*/


app.ws('/websocket', async (ws, req) => {
	console.log("CONNECTION RECIEVED");
    ws.on('error', console.error);

    ws.on('message', async (dataRaw) => {
        try {
            try {
                JSON.parse(dataRaw);
            }
            catch (err) {
                return ws.send(JSON.stringify({type: 1, code: 400, message: "Please use a JSON format"}));
            }
            
            const data = JSON.parse(dataRaw);
            const code = data['code'];

            switch (code) {
                case 0:
                    if (data.op == 0) {
                        const toSend = await createSession(ws, mongoconnection, data);
                        if (toSend.sid) webSocketClients.set(toSend.sid, ws);
                        ws.send(JSON.stringify(toSend));
                    }
                    else if (data.op == 1) createUConf(ws, mongoconnection, config.emailPass, data);
                    else if (data.op == 2) processUConf(ws, mongoconnection, data);
                break;

                case 1:
                    const response = await resumeSesion(ws, mongoconnection, data, getUidFromSid(data.sid));
                    if (response) webSocketClients.set(data.sid, ws);
                break;

                case 2:
                    if (!data.data || !data.data.sid) return ws.send(JSON.stringify({type: 1, code: 400}));
                    
                    if (data.op == 0) logoutAllSessions(webSocketClients, ws, mongoconnection, data.data.sid);
                    else if (data.op == 1) logout(webSocketClients, ws, mongoconnection, data.data.sid);
                break;
                
                case 3:
                    if (data.op == 0) {
                        const messages = await getMessages(mongoconnection, data.sid, data.uid);
                        ws.send(JSON.stringify({code: 3, op: 0, data: messages}));
                    }
                    else if (data.op == 1 || data.op == 2) {
                        const isClosing = (data.op == 2);
                        const response = await toggleDM(mongoconnection, data.data.sid, data.data.other_id, isClosing);
                        if (response) ws.send(JSON.stringify({code: 3, op: 1, data: {other_id: data.data.other_id}}));
                        else ws.send(JSON.stringify({type: 1, code: 500, op: 3}));
                    }
                    else if (data.op == 3) {
                        markDMAsRead(mongoconnection, webSocketClients, data);
                    }
                break;

                case 4:
                    handleSocials(ws, mongoconnection, data, webSocketClients);
                    webSocketClients.set(data.sid, ws);
                break;

                case 5:
                    handleMessage(mongoconnection, webSocketClients, data.data, data.op);
                break;

                case 6:
                    handleChatServer(ws, mongoconnection, data);
                    break;

                case 10:
                    ws.send(JSON.stringify({code: 10}));
                break;

                case 500:
                    alert('REQUEST FAILED!');
                    window.location.reload();
                    break;
                    
                default: ws.send(403);
            }
        } catch (err) {
            console.log(err);
            ws.send(400);
        }
    });
});


app.listen(port, () => console.log(`App listening on port ${port}`));
