import { getConnection } from "./database/getConnection.js";
import { broadcastToSessions } from "./database/newMessage.js";
import { getCurrentUsername } from "./initializations.js";
import { getUidFromSid } from "./utils/decodesid.js";
import { changeGCID, createGroupDM, leaveGroupDM } from "./groupDM.js";
import { generateSymmKeyset } from "./utils/encryption.js";
import { SERVERMACROS as MACROS } from "./macros.js";


async function getSocials(ws, mongoconnection, data, getAll = true) {
	if (!data.sid) {
		ws.send(401);
		return false;
	}

	const doc = await getConnection(mongoconnection, data.sid, true);

	doc.friends = doc.friends.filter((f) => (!f.system && !f.bot));

	if (!doc) ws.send(JSON.stringify({ type: 1, code: 0, op: 404 }));
	else if (doc.type == 1) {
		ws.send(JSON.stringify(doc));
		return false;
	}
	else {
		const uid = getUidFromSid(data.sid);
		const username = await getCurrentUsername(mongoconnection, uid);
		ws.send(JSON.stringify({
			type: 0,
			code: 4,
			op: (getAll) ? 0 : 8,
			data: {
				friends: doc.friends,
				user: { username: username, uid: uid },
				requests: (getAll) ? doc.invites : null
			}
		}));
		return true;
	}
}

/**
 * @param {*} u1 The requestor object
 * @param {*} u2 The acceptor object
 * @param {*} client
 * @param {*} addReq whether or not you're adding the request
 * @returns 
 */
async function manageFReqinDB(u1, u2, client, addReq) {
	try {
		const dbo1 = client.db(u1.uid).collection('social');
		const dbo2 = client.db(u2.uid).collection('social');

		if (await dbo1.findOne({ uid: u2.uid })) return;
		if (await dbo2.findOne({ uid: u1.uid })) return;

		if (addReq) {
			await dbo1.insertOne({ type: 0, other: { uid: u2.uid, username: u2.username }, isRequestor: true });
			await dbo2.insertOne({ type: 0, other: { uid: u1.uid, username: u1.username }, isRequestor: false });
		} else {
			await dbo1.deleteOne({ type: 0, other: { uid: u2.uid, username: u2.username } });
			await dbo2.deleteOne({ type: 0, other: { uid: u1.uid, username: u1.username } });
		}

		return true;
	} catch (err) {
		console.log(err);
		return { type: 1, message: err.message }
	}
}


async function checkAndAddFriend(ws, mongoconnection, data, connectionMap) {
	if (!data.otherUname || !data.sid) return ws.send(JSON.stringify({ code: 401 }));
	const client = await mongoconnection;

	const udata = await getConnection(mongoconnection, data.sid, true);
	if (!udata || udata.type == 1) return ws.send(JSON.stringify({ code: 401 }));
	if (udata.friends.find((o) => o.username == data.otherUname)) return ws.send(JSON.stringify({ code: 409 }));

	const dbo = client.db('main').collection('accounts');
	const doc = await dbo.findOne({ username: data.otherUname });
	if (!doc) return ws.send(JSON.stringify({ code: 404 }));

	//Send the friend request to their sessions
	const self = udata.friends.find((o) => o.notetoself);

	//Check if there already is an invite to this person
	const ubo = client.db(self.uid).collection('dm_keys');
	const idoc = await ubo.findOne({ "uid": doc.uid });

	if (idoc) return;

	const success = await broadcastToSessions(client, connectionMap, [doc.uid], { code: 4, op: 1, requester: { username: self.username, uid: self.uid } });
	broadcastToSessions(client, connectionMap, [self.uid], {
		code: 4,
		op: 5,
		data: {
			username: doc.username,
			uid: doc.uid
		}
	});

	if (success) manageFReqinDB(self, doc, client, true);
}


async function getFriendInfo(response, mongoconnection) {
	// The acceptor's UID
	const acceptorUid = getUidFromSid(response.data.sid);
	if (!(typeof acceptorUid === 'string' || acceptorUid instanceof String)) return console.log(acceptorUid); // send to the websocket later!!!!!!!!!!!!

	const client = await mongoconnection;

	// The requestor's user object
	const requestorDB = client.db(response.data.otherUid).collection('dm_keys');
	const requestorUobj = await requestorDB.findOne({ notetoself: true });
	if (requestorUobj == undefined || requestorUobj.uid != response.data.otherUid) return null; // console.log("REJECT THE REQUEST HERE??????");

	// The acceptor's user object
	const acceptorDB = client.db(acceptorUid).collection('dm_keys');
	const acceptorObj = await acceptorDB.findOne({ notetoself: true });

	return [requestorDB, requestorUobj, acceptorDB, acceptorObj];
}


async function acceptFIR(ws, mongoconnection, response, connectionMap) {
	try {
		const [requestorDB, requestorUobj, acceptorDB, acceptorObj] = await getFriendInfo(response, mongoconnection);
		//Open the dm with new friend
		const ids = [requestorUobj.uid, acceptorObj.uid];
		ids.sort();

		const client = await mongoconnection;

		if (await requestorDB.findOne({ uid: acceptorObj.uid })) return;
		if (await acceptorDB.findOne({ uid: requestorUobj.uid })) return;

		// return console.log(12);

		const dmkey = `${ids[0]}|${ids[1]}`;
		const dmid = (await import('crypto')).randomUUID();

		// const collectionNames = await client.db('dms').listCollections().toArray();
		// const collectionExists = collectionNames.some((col) => col.name == dmkey);

		// encryption
		const requestorPubKey = JSON.parse((await client.db(requestorUobj.uid).collection('configs').findOne({ _id: 'encryption' })).keyPub);
		const acceptorPubKey = JSON.parse((await client.db(acceptorObj.uid).collection('configs').findOne({ _id: 'encryption' })).keyPub);
		const keyObj = generateSymmKeyset({ uid: requestorUobj.uid, keyPub: requestorPubKey }, { uid: acceptorObj.uid, keyPub: acceptorPubKey });

		client.db('dms').collection(dmid).insertOne({
			_id: 'configs',
			users: dmkey,
			isSystem: false,
			keyObj: keyObj
		});

		//Add that dm to the acceptor
		acceptorDB.insertOne({
			uid: requestorUobj.uid,
			username: requestorUobj.username,
			notetoself: false,
			open: true,
			dmid: dmid
		});

		//Add the dm to the acceptor
		requestorDB.insertOne({
			uid: acceptorObj.uid,
			username: acceptorObj.username,
			notetoself: false,
			open: true,
			dmid: dmid
		});

		const toSend = {
			code: 4,
			op: 2,
			data: {
				users: [
					{ uid: requestorUobj.uid, username: requestorUobj.username },
					{ uid: acceptorObj.uid, username: acceptorObj.username }
				]
			}
		}

		const success = await broadcastToSessions(client, connectionMap, ids, toSend);
		if (success) manageFReqinDB(requestorUobj, acceptorObj, client, false);
	} catch (err) {
		console.log(err);
		//SEND SMTH TO THE SOCKET??????
	}
}


async function rejectFIR(ws, mongoconnection, response, connectionMap) {
	const [requestorDB, requestorUobj, acceptorDB, acceptorObj] = await getFriendInfo(response, mongoconnection);
	const client = await mongoconnection;

	const ids = [requestorUobj.uid, acceptorObj.uid];
	const toSend = {
		code: 4,
		op: 3,
		data: {
			users: [
				{ uid: requestorUobj.uid, username: requestorUobj.username },
				{ uid: acceptorObj.uid, username: acceptorObj.username }
			]
		}
	}

	const success = await broadcastToSessions(client, connectionMap, ids, toSend);
	if (success) manageFReqinDB(requestorUobj, acceptorObj, client, false);
}


async function cancelFIR(ws, mongoconnection, response, connectionMap) {
	const [requestorDB, requestorUobj, acceptorDB, acceptorObj] = await getFriendInfo(response, mongoconnection);
	const client = await mongoconnection;

	const ids = [requestorUobj.uid, acceptorObj.uid];
	const toSend = {
		code: 4,
		op: 4,
		data: {
			users: [
				{ uid: requestorUobj.uid, username: requestorUobj.username },
				{ uid: acceptorObj.uid, username: acceptorObj.username }
			]
		}
	}

	const success = await broadcastToSessions(client, connectionMap, ids, toSend);
	if (success) manageFReqinDB(requestorUobj, acceptorObj, client, false);
}


async function recieveProfileEditRequest(ws, mongoconnection, response, connectionMap) {
	try {
		const udata = await getConnection(mongoconnection, response.data.sid, true);
		if (!udata) return;

		const uid = udata.friends[0].uid;
		const fieldName = response.data.fieldChanged;
		const fieldContent = response.data.newVal;

		const client = await mongoconnection;
		const dbo = client.db(uid).collection('configs');
		if (!fieldName || !fieldContent) return;

		if (fieldName == 'desc') {
			dbo.updateOne({ _id: "myprofile" }, { $set: { description: fieldContent } });
		}
		else if (fieldName == 'stat') {
			dbo.updateOne({ _id: "myprofile" }, { $set: { status: fieldContent } });
		}
		else if (fieldName == 'icon') {
			dbo.updateOne({ _id: "myprofile" }, { $set: { icon: fieldContent } });
		} else if (fieldName == 'gctitle') {
			return await changeGCID(mongoconnection, connectionMap, response.data.sid, response.data.newVal, response.data.dmid);
		}

		const toSend = {
			code: 4, op: 8, data: {
				fieldname: fieldName,
				newContent: fieldContent,
				sid: response.data.sid,
				uid: uid
			}
		};
		broadcastToSessions(client, connectionMap, [uid], toSend);

	} catch (err) {
		console.log(err);
		ws.send({ code: 4, op: 500, message: err.message });
	}
}


async function removeFriend(ws, mongoconnection, response, connectionMap) {
	try {
		const data = response.data;
		if (!data || !data.channelId || !data.sid || !data.uid) return;
		const otherId = data.channelId.split('|').find((o) => (o != data.uid));
		if (!otherId || otherId == '0') return null;

		const client = await mongoconnection;
		const dbo = client.db('main').collection('accounts');
		const doc = await dbo.findOne({ uid: `${data.uid}` });

		if (!doc || !doc.sids.includes(data.sid)) return;
		const dmdbo = client.db(data.uid).collection('dm_keys');
		const dmdoc = await dmdbo.findOne({ uid: otherId });
		dmdbo.deleteOne({ uid: otherId });

		const otherdmdbo = client.db(otherId).collection('dm_keys');
		otherdmdbo.deleteOne({ uid: data.uid });

		client.db('dms').collection(dmdoc.dmid).updateOne({ _id: 'configs' }, { $set: { userDeleted: true } });

		ws.send(JSON.stringify({
			code: 4,
			op: 7,
		}));
	}
	catch (err) {
		console.error(err);
		ws.send(JSON.stringify({ code: 500, type: 1 }));
		return null;
	}
}


// broadcast a profil change request to all friends
async function broadcastProfileChange(ws, mongoconnection, response, connectionMap) {
	try {
		const uid = getUidFromSid(response.sid);
		const client = await mongoconnection;
		const dbo = client.db(uid).collection('dm_keys');
		const docs = await dbo.find({ uid: { $ne: '0' } }, { uid: 1 }).toArray();

		const uids = [];
		for (const doc of docs) { uids.push(doc.uid); }

		broadcastToSessions(client, connectionMap, uids, {
			code: 4, op: 8, data: {
				fieldname: response.updated,
				newContent: response.newdata,
				sid: response.sid,
				uid: uid
			}
		});
	}
	catch (err) {
		console.error(err);
		return false;
	}
}


export function handleSocials(ws, mongoconnection, response, connectionMap) {
	switch (response.op) {
		case MACROS.SOCIALS.OPS.GET_SOCIALS:
			getSocials(ws, mongoconnection, response);
			break;

		case MACROS.SOCIALS.OPS.SEND_FRIEND_REQUEST:
			checkAndAddFriend(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.FRIEND_REQUEST_ACCEPTED:
			acceptFIR(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.FRIEND_REQUEST_REJECTED:
			rejectFIR(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.FRIEND_REQUEST_CANCELLED:
			cancelFIR(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.SEND_PROFILE_EDIT_REQUEST:
			recieveProfileEditRequest(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.REMOVE_FRIEND:
			removeFriend(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.GET_FRIENDS:
			getSocials(ws, mongoconnection, response, false);
			break;

		case MACROS.SOCIALS.OPS.CREATE_GROUP_DM:
			createGroupDM(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.REMOVE_FROM_GROUP_DM:
			leaveGroupDM(ws, mongoconnection, response, connectionMap);
			break;

		case MACROS.SOCIALS.OPS.SEND_PROFILE_EDIT_REQUEST:
			broadcastProfileChange(ws, mongoconnection, response, connectionMap);
			break;

		default:
			console.log(response);
	}

}