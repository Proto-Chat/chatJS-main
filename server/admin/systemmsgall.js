// call anything in this file ONLY using a POST request with authorized credentials

import { newMessage } from "../database/newMessage.js";
import * as crypto from 'crypto';


export async function systemMsgAll(mongconnection, connectionMap, res, token, content) {
    const client = await mongconnection;

    const configdbo = client.db('0').collection('configs');
    const configs = await configdbo.findOne({_id: 'myprofile'});

    if (!configs.tokens.includes(token)) return res.sendStatus(401);

    const dmdbo = client.db('0').collection('dm_keys');
    dmdbo.find({}).forEach(doc => {
        if (!doc.notetoself) {
            const channelid = `0|${doc.uid}`;
            const data = {
                id: crypto.randomUUID(),
                channelId: channelid,
                author: { username: configs.username, uid: '0' },
                content: content,
                timestamp: (new Date()).toISOString()
            }

            newMessage(mongconnection, connectionMap, data, true);
        }
    });
}