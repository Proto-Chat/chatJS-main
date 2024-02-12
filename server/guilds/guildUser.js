import { getUidFromSid, validateSession } from "../imports.js";
import * as MACROS from '../macros.js';

// modify this as needed later (check perms in dbo)
// maybe add an input for the action being done?

// action could be either an op code or {op: data.op, actioncode: actioncode}
export async function checkPerms(db, uid, action, dbo = undefined) {
    const serverDoc = await db.collection('settings').findOne({_id: 'serverConfigs'});

    if (dbo) {
        // TODO: check channel perms
    }

    // for now, only the server owner can manage channels
    return (!serverDoc || serverDoc.owner != uid);
}


async function getBans(ws, client, data) {
	try {
		const dbo = client.db(data.serverId).collection('bans');
		const banDoc = await dbo.find().toArray();
		ws.send(JSON.stringify({banned: banDoc, code: 6, op: 10, actioncode: 3}));
	}
	catch(err) {
		console.error(err);
		ws.send(JSON.stringify({type: 1, code: 500}));
	}
}


export async function handleUserAction(ws, connectionMap, mongoconnection, response) {
	const client = await mongoconnection;
	const { actioncode, data } = response;
	const uid = getUidFromSid(data.sid);
	const db = client.db(`S|${data.serverConfs.serverId}`);

	if (!validateSession(mongoconnection, data.sid)) return ws.send(JSON.stringify({type: 1, code: 404}));

// FOR DEBUGGING
	// else if (!(await checkPerms(db, uid, {op: data.op, actioncode: actioncode}))) {
	// 	return ws.send(JSON.stringify({type: 1, code: 401}));
	// }

	switch(actioncode) {
		case 3: getBans(ws, client, response.data);
		break;

		default: ws.send(JSON.stringify({type: 1, code: 404}));
	}
}