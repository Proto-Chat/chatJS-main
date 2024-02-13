import { broadcastToSessions } from "../database/newMessage.js";
import { getUidFromSid, validateSession } from "../imports.js";
import { SERVERMACROS } from '../macros.js';
import { getUsernameFromUID } from "../utils/decodesid.js";
const UMACROS = SERVERMACROS.SERVER.OPS.USER_ACTION.ACTION_CODES;


export class guildUser {
	/** @type {String} */
	status

	/** @type {String} */
	icon

	/** @type {String} */
	username

	/** @type {String} */
	uid

	/** @type {{id: String, name: String, color: String}[]} */
	roles

	constructor(obj) { for (const i in this) this[i] = obj[i]; }
}

// modify this as needed later (check perms in dbo)
// maybe add an input for the action being done?

// action could be either an op code or {op: data.op, actioncode: actioncode}
export async function checkPerms(db, uid, action, dbo = undefined) {
    const serverDoc = await db.collection('settings').findOne({_id: 'serverConfigs'});

    if (dbo) {
        // TODO: check channel perms
    }

    // for now, only the server owner can manage channels
	if (!serverDoc || serverDoc.owner != uid) return false;
	return true;
}



/*
{
  sid: '8f1e1ada-64db-4532-8fde-eeed5e2aad55?NWFhOWI1MzYtZTBmYi00ZDYxLTkxNDUtMDdmMTkyY2EyY2Yz',
  serverConfs: {
    _id: 'channelConfigs',
    name: 'general',
    visibility: 0,
    permissions: { roles: [Array], users: [Array] },
    channelId: '8d4a5123-0e10-4214-8b6f-40529665ca21',
    serverId: 'Y0Td7hn4',
    serverOwner: '5aa9b536-e0fb-4d61-9145-07f192ca2cf3'
  },
  roleId: '2a4547ad-3053-4436-a7f6-396e11c0eb47'
}
*/

async function changeRoles(mongoconnection, ws, connectionMap, data) {
	try {
		if (data.adding) return addRole(mongoconnection, ws, connectionMap, data);

		const uid = getUidFromSid(data.sid);
        const client = await mongoconnection;
        const db = client.db(`S|${data.serverConfs.serverId}`)
		const dbo = db.collection('settings');

		const isAuth = await checkPerms(db, uid, UMACROS.CHANGEROLES);
		if (!isAuth) return ws.send(401);

        await dbo.updateOne({ _id: "classifications", "roles.id": data.roleId }, { $pull: { "roles.$.users": { uid: uid } } });

        const uDoc = await dbo.findOne({ _id: 'classifications' });
		broadcastToSessions(client, connectionMap, uDoc.users.map(u => u.uid), {
			code: 6,
			op: 6,
			data: { serverId: serverId, channelId: channelId, creator: { username: await getUsernameFromUID(client, uid), uid: uid } }
		});
	}
	catch(err) {
		console.error(err);
		ws.send(500);
	}
}


async function addRole(mongoconnection, ws, connectionMap, data) {
	try {
		const uid = getUidFromSid(data.sid);
        const client = await mongoconnection;
		const username = await getUsernameFromUID(client, uid);

        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        await dbo.updateOne({ _id: "classifications", "roles.id": data.roleId }, { $push: { "roles.$.users": { name: username, uid: uid } } });

        const uDoc = await dbo.findOne({ _id: 'classifications' });
		broadcastToSessions(client, connectionMap, uDoc.users.map(u => u.uid), {
			code: 6,
			op: 6,
			data: { serverId: data.serverConfs.serverId, channelId: null, creator: { username: await getUsernameFromUID(client, uid), uid: uid } }
		});
	}
	catch(err) {
		console.error(err);
		ws.send(500);
	}
}


async function getRoles(mongoconnection, ws, data) {
	try {
		const uid = getUidFromSid(data.sid);
        const client = await mongoconnection;

        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        const roles = (await dbo.findOne({ _id: "classifications" })).roles;
		const uRoles = roles.filter((role) => role.users.find((u) => u.uid == uid));

        ws.send(JSON.stringify({
			code: 6,
			op: 6,
			data: {uRoles, uid}
		}));
	}
	catch(err) {
		console.error(err);
		ws.send(500);
	}
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

		case UMACROS.CHANGEROLES: changeRoles(mongoconnection, ws, connectionMap, data);
		break;

		case UMACROS.GETROLES: getRoles(mongoconnection, ws, data);
		break;

		default: ws.send(JSON.stringify({type: 1, code: 404}));
	}
}