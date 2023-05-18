import expressWs from 'express-ws';
import {
    WebSocketServer,
    MongoClient, ServerApiVersion, GridFSBucket, MongoGridFSChunkError,
    configImp,
    resumeSesion, createSession,
    getMessages,
    getUidFromSid,
    handleMessage, newMessage,
    logout,
    handleSocials,
    wasabiManager,
    express,
    cors,
    validateSession,
    getPFP, uploadPFP,
    bodyParser,
    createUConf,
    processUConf,
    enableWs
} from './imports.js';

const config = (configImp) ? configImp : process.env;

//Stores clients by userId
const webSocketClients = new Map();


const client = new MongoClient(config.mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.on('error', (err) => { console.log(err); throw "N O" });
const mongoconnection = client.connect();

const port = process.env.PORT || 3000;
// const wss = new WebSocketServer({ port: port, path: '/websocket' });
const CDNManager = new wasabiManager(config.accessKeyID, config.accesskeySecret, mongoconnection);


const app = express();
app.use(cors());
app.use(bodyParser.raw({type: 'application/octet-stream', limit: '10mb'}));
app.use('/assets', express.static('../assets'));
app.use('/CSS', express.static('../CSS'));
app.use('/scripts', express.static('../scripts'));
const wsInstance = expressWs(app);


app.post('/updatepfp', async(request, response) => {
    const { headers } = request;
    const { sessionid, code, op, filename } = headers;

    if (!sessionid || !code || !op || !filename) return response.send({code: 400, message: 'missing parameters'});
    if (!validateSession(mongoconnection, sessionid)) return response.send({code: 404, message: 'session not found'});

    const imgBufRaw = request.body;
    const imgBuf = Buffer.from(imgBufRaw);

    const res = await uploadPFP(mongoconnection, CDNManager, sessionid, filename, imgBuf);
    
    if (res == true) response.sendStatus(201);
    else if (res == false) response.sendStatus(500);
    else response.send(res);
});


app.get('/getpfp', async (req, res) => {
    try {
        const{ headers } = req;
        const { sessionid } = headers;
        const isValidSession = await validateSession(mongoconnection, sessionid);
        if (!isValidSession) return res.send({type: 1, code: 404, message: "session id not found"});

        const pfpData = await getPFP(mongoconnection, CDNManager, sessionid);
        if (!pfpData) return res.send(null);

        const buffer = Buffer.concat([pfpData]);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);
    } catch (err) {
        console.log(err);
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

app.get('/favicon.ico', (req, res) => {
    res.sendFile('favicon.ico', {root: './client/assets'});
});


app.get('/', (req, res) => {
    res.sendFile(`index.html`, {root: './client'});
});

app.get('/social', (req, res) => {
    res.sendFile(`social.html`, {root: './client'});
});

app.get('/join', (req, res) => {
    res.sendFile(`join.html`, {root: './client'});
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


app.ws('/websocket', async (ws, req) => {
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
                    if (!data.data.sid) return ws.send(JSON.stringify({type: 1, code: 400}));
                    logout(webSocketClients, ws, mongoconnection, data.data.sid);
                break;
                
                case 3:
                    const messages = await getMessages(mongoconnection, data.sid, data.uid);
                    ws.send(JSON.stringify({code: 3, data: messages}));
                break;

                case 4:
                    handleSocials(ws, mongoconnection, data, webSocketClients);
                    webSocketClients.set(data.sid, ws);
                break;

                case 5:
                    handleMessage(mongoconnection, webSocketClients, data.data, data.op);
                break;

                default: ws.send(403);
            }
        } catch (err) {
            console.log(err);
            ws.send(400);
        }
    });
});

// app.ws('/*', (ws, req) => {
//     // WebSocket connection handling
//     ws.on('message', (message) => {
//       // Handle incoming WebSocket messages
//       console.log('Received message:', message);
//       ws.send('RESPONSE!');
//     });
  
//     ws.on('close', () => {
//       // Handle WebSocket connection closure
//       console.log('WebSocket connection closed');
//     });
//   });

app.listen(port, () => console.log(`App listening on port ${port}`));