import { SERVERMACROS } from '../macros.js';
const SMACROS = SERVERMACROS.SERVER.OPS;
const PMACROS = SERVERMACROS.SERVER.PERMS;

/**
 * @param {*} db 
 * @param {*} uid 
 * @param {*} action 
 * @param {*} dbo 
 * @returns {Promise<Boolean>} not technically correct but it works for intellisense
 */
export async function checkPerms(db, uid, action, dbo = undefined) {
	const serverDoc = await db.collection('settings').findOne({ _id: 'classifications' });
	if (!serverDoc || !uid) return false;

	const owner = (await db.collection('settings').findOne({ _id: 'serverConfigs' }))?.owner;
	if (owner === uid) return true;

	switch (action) {
		case SMACROS.EDIT_SERVER:
			return serverDoc.roles.find(r => (r.pos == 0))?.users.includes(uid);

		case SMACROS.GET_CHANNEL: {
			if (!dbo) return false;
			else {
				const { permissions } = await dbo.findOne({ _id: 'channelConfigs' });
				if (!permissions) return false;
				return permissions.roles.find(r => {
					return serverDoc.roles.find(r2 => (r2.id == r &&
														r2.users.includes(uid)));
				}) || permissions.users.includes(uid);
			}
		}

		case SMACROS.CREATE_CHANNEL:
		case SMACROS.DELETE_CHANNEL:
		case SMACROS.EDIT_CHANNEL: {
			return serverDoc.roles.find(r => {
				if (!r.users.includes(uid)) return false;
				const minRole = Math.min(r.perms);
				return (minRole == PMACROS.ADMIN || minRole == PMACROS.MANAGE_CHANNELS);
			});
		}

		case SMACROS.ROLE.ACTION_CODES.CREATE:
		case SMACROS.ROLE.ACTION_CODES.DELETE:
		case SMACROS.ROLE.ACTION_CODES.EDIT: {
			// for now, anyone with access to a channel can send messages
			const cRoles = (dbo) ? (await dbo.findOne({ _id: 'channelConfigs' })).permissions : undefined;
			const roles = (cRoles) ? serverDoc.roles.filter(r => cRoles.includes(r.id)) : serverDoc.roles;
			return roles.find(r => {
				if (!r.users.includes(uid)) return false;
				const minRole = Math.min(r.perms);
				return (minRole == PMACROS.ADMIN || minRole == PMACROS.MANAGE_ROLES);
			});
		}

		// this is a check if the deleter is NOT the one that sent it
		case SMACROS.DELETE_MESSAGE:
			return serverDoc.roles.find(r => {
				if (!r.users.includes(uid)) return false;

				// remember that 0 is admin
				const highestRole = Math.min(r.perms);
				return (highestRole == PMACROS.ADMIN || highestRole == PMACROS.MANAGE_MESSAGES);
			});

		default: return true;
	}
}
