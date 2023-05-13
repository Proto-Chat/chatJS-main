
export const getUidFromSid = (sid) => {
    try {
        return Buffer.from(sid.split("?")[1], 'base64').toString();
    } catch (err) {
        return {type: 1, message: err.toString()}
    }
}

export const getUIDFromUsername = (client, username) => {
    return new Promise(async (resolve) => {
        const dbo = client.db('main').collection('accounts');
        const doc = await dbo.findOne({username: username});
        if (!doc) return resolve(null);

        resolve(doc.uid);
    });
}

export const getUsernameFromUID = (client, uid) => {
    // const dbo = client
}