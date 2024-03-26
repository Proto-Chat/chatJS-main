import * as crypto from 'crypto';
import { getUidFromSid, getUsernameFromUID } from '../utils/decodesid.js';
import { broadcastToSessions } from '../database/newMessage.js';
import { SERVERMACROS as MACROS, SERVERMACROS } from '../macros.js';
import { handleUserAction, getRoles } from './guildUser.js';
import { checkPerms } from "./checkPerms.js";
import { handleRoleReq, uidsToUsers } from './handleRoles.js';
import { validateSession } from '../imports.js';


function pingEveryoneInChannel(connectionMap, client, op, data, uconf, users, code = 6) {
	try {
		const toSend = { code: code, op: op, data: { serverId: data.serverId, channelId: data.channelId, user: uconf } };
		broadcastToSessions(client, connectionMap, users, toSend);
	}
	catch (err) {
		console.error(err);
	}
}


async function generateServerId(client) {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const servers = (await client.db('admin').admin().listDatabases()).databases.map(db => db.name).filter((d) => d.includes('S|'));

	while (true) {
		let result = '';
		for (let i = 0; i < 8; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			result += charset[randomIndex];
		}

		if (!servers.includes(`S|${result}`)) return `S|${result}`;
	}
}

const findAndStripUConf = async (client, uid) => {
	const uconf = await client.db(uid).collection('configs').findOne({ _id: "myprofile" });
	if (!uconf) return null; // ws.send(JSON.stringify({type: 1, code: 401}));
	delete uconf['description'];
	uconf['uid'] = uid;
	return uconf;
}


export async function createServer(mongoconnection, connectionMap, sid, data) {
	try {
		const uid = getUidFromSid(sid);
		if (!sid) return null;

		const client = await mongoconnection;
		const sessionDoc = await client.db(uid).collection('sessions').findOne({ sid: sid });
		if (!sessionDoc) return null;

		const dbo = client.db(uid).collection('servers');
		const serverId = await generateServerId(client);
		if (!serverId) return;

		dbo.insertOne({ serverId: serverId, timeCreated: (new Date()).toISOString(), isPublic: !data.isPrivate, name: data.title });
		const sdbo = client.db(serverId).collection('settings');

		// 0 - private, 1 - public
		await sdbo.insertOne({
			_id: 'serverConfigs',
			owner: uid,
			timeCreated: (new Date()).toISOString(),
			isPublic: !data.isPrivate,
			name: data.name,
		});

		const uconf = await findAndStripUConf(client, uid);
		if (!uconf) return;

		await sdbo.insertOne({
			_id: 'classifications',
			roles: 
				[{
					id: crypto.randomUUID(),
					name: 'admin',
					pos: 0,
					color: 'grey',
					users: [uid],
					perms: [MACROS.SERVER.PERMS.ADMIN]
				},
				{
					id: crypto.randomUUID(),
					name: 'everyone',
					pos: 0,
					color: 'grey',
					users: [uid],
					perms: [MACROS.SERVER.PERMS.EVERYONE]
				}
			],
			users: [uid]
		});

		await createChannel(mongoconnection, connectionMap, sid, serverId.replace('S|', ''), 'general');

		return serverId;
	}
	catch (err) {
		console.error(err);
		return null;
	}
}


export async function createChannel(mongoconnection, connectionMap, sid, serverId, channelName = null) {
	try {
		const uid = getUidFromSid(sid);
		if (!uid) return;

		const client = await mongoconnection;
		const sessionDoc = await client.db(uid).collection('sessions').findOne({ sid: sid });
		if (!sessionDoc) return null;

		const db = client.db(`S|${serverId}`);

		// for now, only the server owner can manage channels
		if (!(await checkPerms(db, uid, MACROS.SERVER.OPS.CREATE_CHANNEL))) return null;

		const uconf = await findAndStripUConf(client, uid);
		if (!uconf) return;

		// insert the channel
		const channelId = crypto.randomUUID();
		const dbo = db.collection(channelId);

		// ping everyone in the server
		const uDoc = await db.collection('settings').findOne({ _id: 'classifications' });
		const adminId = uDoc.roles.filter(r => (r.name == 'admin'));

		await dbo.insertOne({ _id: 'channelConfigs', name: (channelName) ? channelName : 'new channel', visibility: 0, permissions: { roles: [adminId], users: [uid] } });
		await dbo.insertOne({ _id: 'inChannel', users: [] }); // users = [{category/role: String, username: string, userId: string}]

		broadcastToSessions(client, connectionMap, uDoc.users, {
			code: 6,
			op: 6,
			data: { serverId: serverId, channelId: channelId, creator: { username: await getUsernameFromUID(client, uid), uid: uid } }
		});

		return channelId;
	}
	catch (err) {
		console.error(err);
		return false;
	}
}


async function editServer(ws, mongoconnection, connectionMap, data) {
	try {		
		const client = await mongoconnection;
		const fullSID = `S|${data.serverConfs.serverId}`;
		const db = client.db(fullSID);
		const dbo = db.collection('settings');

		const uid = getUidFromSid(data.sid);
		const sConf = await dbo.findOne({ _id: 'serverConfigs' });
		if (!sConf) return ws.send(JSON.stringify({ type: 1, code: 404 }));

		// for now, only the server owner can manage channels
		if (!(await checkPerms(db, uid, MACROS.SERVER.OPS.EDIT_SERVER))) return ws.send(JSON.stringify({ type: 1, code: 401 }));
		const usersInServer = (await db.collection('settings').findOne({ _id: 'classifications' })).users;

		const toSend = {code: 6, op: 8, data: {}};
		if (data.serverPrivacy) {
			const sPriv = (data.serverPrivacy == 'private');
			await dbo.updateOne({ _id: 'serverConfigs' }, { $set: { isPublic: sPriv } });
			toSend.data['serverPrivacy'] = sPriv;
		}

		if (data.serverName) {
			toSend.data['serverName'] = data.serverName;
			await dbo.updateOne({ _id: 'serverConfigs' }, { $set: { name: data.serverName } });

			// add the change to every user
			usersInServer.forEach(u => client.db(u).collection('servers').updateOne({serverId: fullSID}, {$set: {name: data.serverName}}).catch((err) => {}));
		}

		// NOT IMPLEMENTED
		if (data.serverIcon) return ws.send(JSON.stringify({ type: 1, code: 501 }));

		broadcastToSessions(client, connectionMap, usersInServer, toSend);
	}
	catch (err) {
		console.error(err);
		ws.send(JSON.stringify({ code: 500 }));
	}
}


export async function getServerInfo(mongoconnection, sid, serverId, getUsers = false, getMeta = false) {
	try {
		const uid = getUidFromSid(sid);
		if (!uid && !getMeta) return;

		const client = await mongoconnection;
		
		if (!getMeta) {
			const sessionDoc = await client.db(uid).collection('sessions').findOne({ sid: sid });
			if (!sessionDoc) return {type: 1, code: 404, msg: "session not found!"};
		}

		const db = client.db(`S|${serverId}`);
		const configs = await db.collection('settings').findOne({ _id: 'serverConfigs' });
		if (!configs) return {type: 1, code: 404, msg: "server not found!"};

		configs.serverId = serverId.replace('S|', '');
		const classifications = await db.collection('settings').findOne({ _id: 'classifications' });

		// get the users in the server
		const usersInServer = classifications?.users;
		if (!usersInServer) return {type: 1, code: 404, msg: "server not found!"};
		const isChannelManager = await checkPerms(db, uid, MACROS.SERVER.OPS.EDIT_CHANNEL);

		const uInServer = usersInServer?.find(u => (u == uid));

		// if the user isn't in the server, add them to the server
		if (!uInServer) {
			// check server privacy settings
			if (!configs.isPublic) return { type: 1, code: 501, msg: "This server is private!" };
			else if (getUsers) return await uidsToUsers(usersInServer, client);

			return {type: 1, code: 451, msg: "NOT IN SERVER"};
		}
		else if (getUsers) return await uidsToUsers(usersInServer, client);

		const channelObjs = (await db.listCollections().toArray()).filter((col) => col.name != 'settings');
		const channels = {};
		for (const channelRaw of channelObjs) {
			const channelObj = db.collection(channelRaw.name);
			const doc = await channelObj.findOne({ _id: 'channelConfigs' });

			// check user perms
			const uRoles = await getRoles(mongoconnection, null, {sid, serverConfs: configs}, true);
			const hasRole = doc.permissions.roles.some(o => (uRoles.some(r => (r.id == o))));
			if (hasRole || doc.permissions.users.some(o => (o == uid))) {
				channels[doc.name] = { channelId: channelRaw.name, vis: doc.visibility, canEdit: isChannelManager };
			}
		}

		return {
			configs: configs,
			channels: channels,
			roles: classifications.roles
		};
	}
	catch (err) {
		console.error(err);
		return null;
	}
}


export async function addToServer(mongoconnection, uid, serverId) {
	try {
		const client = await mongoconnection;
		const db = client.db(`S|${serverId}`);
		const uConfStripped = await findAndStripUConf(client, uid);

		// check bans
		const bdbo = db.collection('bans');
		if (await bdbo.findOne({_id: uid})) return {code: 404, msg: "invalid invite!"};

		const dbo = db.collection('settings');
		const sConf = await dbo.findOne({_id: 'serverConfigs'});
		
		// check if the user is already in the server
		const users = await dbo.findOne({ _id: 'classifications', users: [uid] });
		if (users) return {code: 200};		

		if (!uConfStripped) return { type: 1, code: 404, msg: "user not found" };

		await dbo.updateOne({ _id: 'classifications' }, { $push: {users: uid} } );
		dbo.updateOne(
			{ _id: "classifications", "roles.name": "everyone" },
			{ $push: { "roles.$.users": uid } }
		  );

		delete sConf['id'];
		sConf['serverId'] = `S|${serverId}`;
		client.db(uid).collection('servers').insertOne(sConf);

		return {code: 200};
	}
	catch(err) {
		console.error(err);
		return {type: 1, code: 500};
	}
}


async function handleMessage(ws, connectionMap, mongoconnection, data, op) {
	try {
		// const msg = {author: {username: String, uid: String}, id: crypto.randomUUID(), serverId: String, channelId: String, content: <content>, timestamp: Date}
		const user = data.author || data.user || undefined;
		if (!data.id || !user || !data.serverId || !data.channelId) return ws.send(JSON.stringify({ msgId: data.id || null, code: 400, type: 1 }));

		const client = await mongoconnection;
		const db = client.db(`S|${data.serverId}`);
		const dbo = db.collection(data.channelId);

		const doc = await dbo.findOne({ _id: 'channelConfigs' });
		if (!doc) return ws.send(JSON.stringify({ code: 404, serverId: data.serverId, channelId: data.channelId }));

		// check permissions
		const uid = getUidFromSid(data.sid);
		if (!uid) return {type: 1, code: 404, msg: "user not found!"};

		var conf;
		const toSend = { code: 6, op: 3, data: data };

		// delete data[id];  // idk why I did this
		if (op == MACROS.SERVER.OPS.DELETE_MESSAGE) {
			if (uid != user.uid && !(await checkPerms(db, uid, op))) return {type: 1, code: 401};
			conf = await dbo.deleteOne({ $and: [{ channelId: data.channelId }, { id: data.id }] });
			toSend.op = 5;
		}
		else if (op == MACROS.SERVER.OPS.EDIT_MESSAGE) {
			if (uid != user.uid) return {type: 1, code: 401};
			conf = await dbo.updateOne({ $and: [{ channelId: data.channelId }, { id: data.id }] }, { $set: { content: data.content } });
			toSend.op = 4;
		}
		else if (op == MACROS.SERVER.OPS.SEND_MESSAGE) {
			if (!(await checkPerms(db, uid, op, dbo))) return {type: 1, code: 401};
			conf = await dbo.insertOne(data);
		}

		if (!conf) return ws.send(JSON.stringify({ msgId: data.id || null, code: 500, type: 1 }));

		// send to everyone in the channel (server notifs are not a thing at the moment)
		const inChannel = await dbo.findOne({ _id: 'inChannel' });

		const uconf = await client.db(user.uid).collection('configs').findOne({ _id: "myprofile" });
		if (!uconf) return ws.send(JSON.stringify({ type: 1, code: 401 }));
		delete uconf['description'];
		uconf['uid'] = user.uid;

		broadcastToSessions(client, connectionMap, inChannel.users, toSend);
	}
	catch (err) {
		console.error(err);
		return ws?.send(JSON.stringify({ msgId: data.id || null, serverId: data.serverId, channelId: data.channelId, code: 500, type: 1 }));
	}
}


async function getChannel(ws, connectionMap, mongoconnection, data) {
	try {
		if (!data || !data.serverId || !data.channelId) return ws.send(JSON.stringify({ type: 1, code: 404 }));
		else if (!data.sid) return ws.send(JSON.stringify({ type: 1, code: 401 }));

		const client = await mongoconnection;
		const db = client.db(`S|${data.serverId}`);
		const dbo = db.collection(data.channelId);
		const doc = await dbo.find({ $nor: [{ _id: 'channelConfigs' }, { _id: 'inChannel' }] }).toArray();
		if (!doc) return;

		const channelConfigs = await dbo.find({ $or: [{ _id: 'channelConfigs' }, { _id: 'inChannel' }] }).toArray();

		const uid = getUidFromSid(data.sid);
		const sessionDoc = await client.db(uid).collection('sessions').findOne({ sid: data.sid });
		if (!sessionDoc) return null;

		// check if the user can access the channel
		if (!(await checkPerms(db, uid, MACROS.SERVER.OPS.GET_CHANNEL, dbo))) return ws.send(JSON.stringify({ type: 1, code: 401 }))

		const uconf = await client.db(uid).collection('configs').findOne({ _id: "myprofile" });
		if (!uconf) return ws.send(JSON.stringify({ type: 1, code: 401 }));
		delete uconf['description'];
		uconf['uid'] = uid;

		// add the fact that the user is currently looking at the channel to the DB
		if (data.currentChannel) {
			// remove user from the old channel
			const dboOld = client.client.db(`S|${data.serverId}`).collection(data.currentChannel);
			dboOld.updateOne({ _id: 'inChannel' }, { $pull: { users: uid } });
		}

		const uFromPresList = (await dbo.findOne({ _id: 'inChannel' })).users.find(u => (u == uid));
		if (!uFromPresList) {
			dbo.updateOne({ _id: 'inChannel' }, { $push: { users: uid } });
		}

		// update member list for everyone else in that channel
		const inChannel = await dbo.findOne({ _id: 'inChannel' });
		pingEveryoneInChannel(connectionMap, client, 4, data, uconf, inChannel.users);

		const serverConfigs = await client.db(`S|${data.serverId}`).collection('settings').findOne({_id: 'serverConfigs'});
		const confInd = channelConfigs.findIndex((o) => o._id == 'channelConfigs');
		
		channelConfigs[confInd]['channelId'] = data.channelId;
		channelConfigs[confInd]['serverId'] = data.serverId;
		channelConfigs[confInd]['serverOwner'] = serverConfigs.owner;

		// TODO: change to like the first 30 users or smth to avoid load
		const UICInd = channelConfigs.findIndex(o => o._id == 'inChannel');

		const uConfs = await Promise.all(channelConfigs[UICInd].users.map(async (uid) => {
			const doc = await client.db(uid).collection('configs').findOne({_id: 'myprofile'});
			doc['uid'] = uid;
			return doc;
		}));
		channelConfigs[UICInd]['users'] = uConfs;

		ws.send(JSON.stringify({
			code: 6,
			op: 2,
			messages: doc,
			channelconfs: channelConfigs
		}));
	}
	catch (err) {
		console.error(err);
		ws.send(JSON.stringify({ type: 1, code: 500 }));
	}
}


async function changeChannelRoles(dbo, role, client, connectionMap, db, toSend) {
	// get role
	const cdoc = (await dbo.findOne({_id: 'channelConfigs'}));
	const rDoc = cdoc.permissions.roles;
	const roles = (await db.collection('settings').findOne({_id: 'classifications'})).roles;
	const sCol = await db.collection('settings').findOne({_id: 'serverConfigs'});

	toSend['data']['channelName'] = cdoc.name;
	toSend['data']['isOwner'] = (sCol?.owner == toSend.data.creator.uid);

	if (!role.isAdding) {
		if (!rDoc.includes(role.roleToChange)) return;
		await dbo.updateOne({ _id: 'channelConfigs' }, { $pull: { "permissions.roles": role.roleToChange } });
		// console.log(`removed ${role.roleToChange}`);
		toSend['op'] = 7;
	}
	else {
		if (rDoc.includes(role.roleToChange)) return;
		await dbo.updateOne({ _id: 'channelConfigs' }, { $push: { "permissions.roles": role.roleToChange } });
		// console.log(`added ${role.roleToChange}`);
	}

	// get the users for who the role would change
	const usersInRole = roles.find(r => r.id == role.roleToChange).users;
	broadcastToSessions(client, connectionMap, usersInRole, toSend);
}


// update or delete
async function updateChannel(ws, connectionMap, mongoconnection, data, op) {
	try {
		if (!data || !data.sid || !data.serverId || !data.channelId) return ws.send(JSON.stringify({ type: 1, code: 404 }));
		else if (!data.sid) return ws.send(JSON.stringify({ type: 1, code: 401 }));

		const client = await mongoconnection;
		const db = client.db(`S|${data.serverId}`);
		const dbo = db.collection(data.channelId);

		const doc = await dbo.find({ $nor: [{ _id: 'channelConfigs' }, { _id: 'inChannel' }] }).toArray();
		if (!doc) return;

		const uid = getUidFromSid(data.sid);
		const sessionDoc = await client.db(uid).collection('sessions').findOne({ sid: data.sid });
		if (!sessionDoc) return null;

		if (!(await checkPerms(db, uid, MACROS.SERVER.OPS.EDIT_CHANNEL, dbo))) return null; // had data.channelId as a param

		// ping everyone in the server
		const uDoc = await db.collection('settings').findOne({ _id: 'classifications' });
		const toSend = { serverId: data.serverId, channelId: data.channelId, changer: { username: getUsernameFromUID(client, uid), uid: uid } };

		// edit (3 is needed for the legacy version)
		if (op == MACROS.SERVER.OPS.EDIT_CHANNEL || op == 3) {
			// role stuff
			if (data.roleToChange) {
				// check roles
				const canNotChange = uDoc.roles.find(r => {
					if ((r.name == 'admin')) return (r.id == data.roleToChange);
					else return false;
				});

				if (canNotChange) return ws.send(JSON.stringify({type: 1, code: 409}));

				const toSend = {code: 6, op: 6, actioncode: 2, data: {
					serverId: data.serverId,
					channelId: data.channelId,
					creator: { username: await getUsernameFromUID(client, uid), uid: uid }
				}};

				await changeChannelRoles(dbo, data, client, connectionMap, db, toSend);
				return ws.send(JSON.stringify({code: 6, op: 13, actioncode: 2, data: {roleId: data.roleToChange, adding: data.isAdding}}));
			}
			else {
				await dbo.updateOne({ _id: "channelConfigs" }, { $set: { name: data.newName } });
				toSend['newName'] = data.newName;
			}

		}
		// delete
		else if (op == MACROS.SERVER.OPS.DELETE_CHANNEL) {
			await dbo.drop();
		}
		else return ws.send(JSON.stringify({ type: 1, code: 404, msg: `UNKNOWN OP ${op}` }));


		// check the perms of each user
		const usersWithPerms = (await Promise.all(uDoc.users.map(u => checkPerms(db, u, MACROS.SERVER.OPS.EDIT_CHANNEL, dbo))))
											.filter(u => u);

		broadcastToSessions(client, connectionMap, uDoc.users, {
			code: 6,
			op: (op == MACROS.SERVER.OPS.DELETE_CHANNEL) ? 7 : 6,
			data: toSend
		}, null, usersWithPerms);
	}
	catch (err) {
		console.error(err);
		ws.send(JSON.stringify({ type: 1, code: 500 }));
	}
}


export async function handleChatServer(ws, connectionMap, mongoconnection, data) {
	const sid = data.sid || data.data.sid;
	if (!(await validateSession(mongoconnection, sid))) return {type: 1, code: 404, msg: "session not found!"};

	switch (data.op) {
		case MACROS.SERVER.OPS.CREATE_SERVER:
			const response = await createServer(mongoconnection, connectionMap, sid, data.data);
			if (!response) return ws.send(JSON.stringify({
				code: 500
			}));

			ws.send(JSON.stringify({
				code: 6,
				op: 0,
				serverId: response.replace('S|', '')
			}));
			break;

		case MACROS.SERVER.OPS.EDIT_SERVER:
			editServer(ws, mongoconnection, connectionMap, data.data);
			break;

		case MACROS.SERVER.OPS.CREATE_CHANNEL:
			createChannel(mongoconnection, connectionMap, sid, data.data.serverId, data.data.channelName);
			// ws.send(501);
			break;

		case MACROS.SERVER.OPS.GET_CHANNEL:
			getChannel(ws, connectionMap, mongoconnection, data.data);
			break;

		case MACROS.SERVER.OPS.SEND_MESSAGE:
		case MACROS.SERVER.OPS.EDIT_MESSAGE:
		case MACROS.SERVER.OPS.DELETE_MESSAGE:
			handleMessage(ws, connectionMap, mongoconnection, data.data, data.op);
			break;

		case MACROS.SERVER.OPS.EDIT_CHANNEL:
		case MACROS.SERVER.OPS.DELETE_CHANNEL:
			updateChannel(ws, connectionMap, mongoconnection, data.data, data.op);
			break;

		case MACROS.SERVER.OPS.USER_ACTION.CODE:
			handleUserAction(ws, connectionMap, mongoconnection, data);
			break;

		case MACROS.SERVER.OPS.ROLE.CODE:
			handleRoleReq(ws, mongoconnection, connectionMap, data);
			break;

		default: console.log("HANDLECHATSERVER: UNKNOWN DATA -->", data);
	}
}