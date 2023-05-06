
export const getUidFromSid = (sid) => Buffer.from(sid.split("?")[1], 'base64').toString();

export const getUIDFromUsername = (client, username) => {
    return new Promise(async (resolve) => {
        const dbo = client.db('accounts').collection(username);
        const doc = await dbo.findOne({username: username});
        if (!doc) return resolve(null);

        resolve(doc.uid);
    });
}

export const getUsernameFromUID = (client, uid) => {
    // const dbo = client
}