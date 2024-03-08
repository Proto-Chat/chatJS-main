import { broadcastToSessions } from '../database/newMessage.js';
import { getUidFromSid, validateSession } from '../imports.js';
import { SERVERMACROS } from '../macros.js';
import { checkPerms } from './guildUser.js';
import crypto from 'crypto';

const RMACROS = SERVERMACROS.SERVER.OPS.ROLE;

async function addRole(mongoconnection, ws, connectionMap, data) {
    try {
        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        const doc = await dbo.findOne({_id: 'classifications'});
        if (!doc) return ws.send(404);
        else if (!data.rolename || !data.rolecol) return ws.send(400);

        const roleObj = {
            id: crypto.randomUUID(),
            name: data.rolename,
            pos: Math.max(doc.roles.map(r => r.pos)) + 1,
            color: data.rolecol,
            users: [getUidFromSid(data.sid)]
        }

        await dbo.updateOne({_id: 'classifications'}, { $push: { roles: roleObj } });

        broadcastToSessions(client, connectionMap, doc.users, {code: 6, op: 11, actioncode: 0, data: roleObj});
    }
    catch(err) {
        console.error(err);
        ws.send(500);
    }
}

async function delRole(mongoconnection, ws, connectionMap, data) {
    try {
        // const uid = getUidFromSid(data.sid);
        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');

        await dbo.updateOne({_id: 'classifications'}, { $pull: { roles: { roleId: data.roleId} } });
        broadcastToSessions(client, connectionMap, (await dbo.findOne({ _id: 'classifications' })).users, {code: 6, op: 10, actioncode: 4});
    }
    catch(err) {
        console.error(err);
        ws.send(500);
    }
}

async function editRole(mongoconnection, ws, connectionMap, data) {
    try {
        const client = await mongoconnection;

    }
    catch(err) {
        console.error(err);
        ws.send(500);
    }
}


export const uidsToUsers = (uids, client) => {
    return Promise.all(uids.map(async (uid) => {
        const doc = await client.db(uid).collection('configs').findOne({_id: 'myprofile'});
        doc['uid'] = uid;
        return doc;
    }));
}


async function getRoles(mongoconnection, ws, data) {
    try {
        const client = await mongoconnection;
        const dbo = client.db(`S|${data.serverConfs.serverId}`).collection('settings');
        const doc = await dbo.findOne({_id: 'classifications'});

        if (!doc) return ws.send(404);        

        if (data.channelId) {
            const cdbo = client.db(`S|${data.serverConfs.serverId}`).collection(data.channelId);
            const cdoc = await cdbo.findOne({ _id: 'channelConfigs' });

            // get the roles
            const channelRolesFull = doc.roles.filter(r => cdoc.permissions.roles.includes(r.id));
            const users = await uidsToUsers(channelRolesFull.flatMap(o => o.users).filter(e => e), client);

            // get the users in the role
            const roles = await Promise.all(doc.roles?.map(async (r) =>{
                r.isInChannel = cdoc.permissions.roles.some(r2 => (r2 == r.id));
                return r;
            }));

            ws.send(JSON.stringify({
                code: 6,
                op: 12,
                data: {
                    roles: roles,
                    users,
                    serverConfs: {serverId: data.serverConfs.serverId, usersAll: doc.users},
                    channelId: data.channelId
                }
            }));
        }
        else {
            const users = await uidsToUsers(doc.roles.flatMap(o => o.users), client);
            ws.send(JSON.stringify({
                code: 6,
                op: 11,
                roles: doc.roles,
                users,
                serverConfs: data.serverConfs
            }));
        }
    }
    catch(err) {
        console.error(err);
        ws.send(500);
    }
}


export async function handleRoleReq(ws, mongoconnection, connectionMap, response) {
    try {
        const { actioncode, data: data } = response;

        // removed `|| !actioncode` bc it wouldn't work with `0`
        if (!data) return ws.send(400);

        const isValidSession = await validateSession(mongoconnection, data.sid);
        if (!isValidSession) return ws.send(401);

		const client = await mongoconnection;
		const db = client.db(`S|${data.serverConfs.serverId}`);
		const dbo = db.collection('settings');

        const uid = getUidFromSid(data.sid);
		const sConf = await dbo.findOne({ _id: 'serverConfigs' });
		if (!sConf) return ws.send(JSON.stringify({ type: 1, code: 404 }));

        // for now, only the server owner can manage channels
		if (!checkPerms(db, uid, RMACROS.CODE)) return ws.send(JSON.stringify({ type: 1, code: 401 }));

        switch (actioncode) {
            case RMACROS.ACTION_CODES.CREATE: addRole(mongoconnection, ws, connectionMap, data);
            break;

            case RMACROS.ACTION_CODES.EDIT: editRole(mongoconnection, ws, connectionMap, data);
            break;

            case RMACROS.ACTION_CODES.DELETE: delRole(mongoconnection, ws, connectionMap, data);
            break;

            case RMACROS.ACTION_CODES.GET: getRoles(mongoconnection, ws, data);
            break;

            default: console.error(`Unknown role action ${actioncode}`);
        }
    }
    catch(err) {
        console.error(err);
        return null;
    }
}