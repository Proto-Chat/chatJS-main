import { broadcastToSessions } from "../database/newMessage.js";
import { getUidFromSid, validateSession } from "../imports.js";
import { SERVERMACROS } from '../macros.js';
import { getUsernameFromUID } from "../utils/decodesid.js";
import { checkPerms } from "./checkPerms.js";
import { uidsToUsers } from "./handleRoles.js";
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

        await dbo.updateOne({ _id: "classifications", "roles.id": data.roleId }, { $pull: { "roles.$.users": uid } });

        const uDoc = await dbo.findOne({ _id: 'classifications' });
		broadcastToSessions(client, connectionMap, uDoc.users, {
			code: 6,
			op: 13,
			actioncode: 0,
			data: { roleId: data.roleId, serverInfo: data.serverConfs, creator: (await uidsToUsers([uid], client))[0] }
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
		if (!uid) return ws.send(JSON.stringify({type: 1, code: 404}));

        const client = await mongoconnection;
		const username = await getUsernameFromUID(client, uid);
		if (!username) return ws.send(JSON.stringify({type: 1, code: 404}));

        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        await dbo.updateOne({ _id: "classifications", "roles.id": data.roleId }, { $push: { "roles.$.users": uid } });

        const uDoc = await dbo.findOne({ _id: 'classifications' });
		broadcastToSessions(client, connectionMap, uDoc.users, {
			code: 6,
			op: 13,
			actioncode: 1,
			data: { roleId: data.roleId, serverInfo: data.serverConfs, creator: (await uidsToUsers([uid], client))[0] }
		});
	}
	catch(err) {
		console.error(err);
		ws.send(500);
	}
}


export async function getRoles(mongoconnection, ws, data, ret = false) {
	try {
		const uid = getUidFromSid(data.sid);
        const client = await mongoconnection;

        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        const roles = (await dbo.findOne({ _id: "classifications" })).roles;
		const uRoles = roles.filter((role) => role.users.find((u) => u == uid));

		if (ret) return uRoles;

        ws.send(JSON.stringify({
			code: 6,
			op: 6,
			data: {uRoles, uid}
		}));
	}
	catch(err) {
		console.error(err);
		return (ret) ? ret : ws.send(500);
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


async function kickOrBan(mongoconnection, ws, connectionMap, data, actioncode) {
	try {
		const retRej = (msg) => ws.send(JSON.stringify({type: 1, msg}));

		const initiator = getUidFromSid(data.sid);
		if (initiator == data.target) return retRej("you can not perform this action on yourself!");
		else if (typeof initiator == 'object') return ws.send(JSON.stringify(initiator));

		const permCodeToCheck = (actioncode == SERVERMACROS.SERVER.OPS.USER_ACTION.ACTION_CODES.KICK) ? SERVERMACROS.SERVER.PERMS.KICK : SERVERMACROS.SERVER.PERMS.BAN;

		const client = await mongoconnection;
		const dbo = client.db(data.serverId).collection('settings');
		const doc = await dbo.findOne({_id: 'classifications'});
		const confs = await dbo.findOne({_id: 'serverConfigs'});

		if (confs.owner == data.target) return retRej("insufficient permissions!");
		else if (initiator != doc.owner) {
			// check perms
			const hasBasePerms = doc.roles.find(r => {
				if (!r.users.includes(initiator)) return false;
				const minRole = Math.min(r.perms);
				return (minRole == permCodeToCheck);
			});
			if (!hasBasePerms) return retRej("insufficient permissions!");

			// check if user is above the one they're trying to ban
			const initBasePerm = doc.roles.find(r => r.users.includes(initiator));
			const targetBasePerm = doc.roles.find(r => r.users.includes(data.target));
			if (targetBasePerm >= initBasePerm) return retRej("insufficient permissions!");
		}
		
		// has perms, proceed
		switch (actioncode) {
			case SERVERMACROS.SERVER.OPS.USER_ACTION.ACTION_CODES.KICK:
				// uhhhhhhhhhhhhhhh, implement when invites work
			break;

			case SERVERMACROS.SERVER.OPS.USER_ACTION.ACTION_CODES.BAN:
				const bdbo = client.db(data.serverId).collection('bans');
				await bdbo.insertOne({_id: data.target, actioncode, reason: data.reason || "none"});
			break;

			case SERVERMACROS.SERVER.OPS.USER_ACTION.ACTION_CODES.UNBAN:
				await bdbo.deleteOne({_id: data.target});
			break;

			default: console.log(`UNKNOWN USER ACTION CODE: ${actioncode}`);
		}

		broadcastToSessions(client, connectionMap, doc.users, {code: 6, op: SERVERMACROS.SERVER.OPS.USER_ACTION.CODE, actioncode, target: data.target, initiator});
	}
	catch(err) {
		console.error(err);
		ws.send(JSON.stringify({code: 500, type: 1}));
	}
}


export async function handleUserAction(ws, connectionMap, mongoconnection, response) {
	try {
		const client = await mongoconnection;
		const { actioncode, data } = response;

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

			case UMACROS.KICK:
			case UMACROS.BAN:
			case UMACROS.UNBAN:
				kickOrBan(mongoconnection, ws, connectionMap, data, actioncode);
				break;

			default: ws.send(JSON.stringify({type: 1, code: 404}));
		}
	}
	catch(err) {
		console.error(err);
		return null;
	}
}