import { getUidFromSid } from "../../utils/decodesid.js";
import { wasabiManager } from "./init.js";

/**
 * @param {*} mongoconnection
 * @param {wasabiManager} wm
 * @param {*} sid
 * @param {*} filename
 * @param {*} filedata
 */
export async function uploadPFP(mongoconnection, wm, sid, filename, filedata) {
    try {        
        const client = await mongoconnection;
        const uid = getUidFromSid(sid);
        if (!uid) return false;

        const dbo = client.db(uid).collection('configs');
        await dbo.updateOne({_id: 'myprofile'}, {$set: {icon: filename}});
        const response = await wm.uploadFile(uid, filename, filedata);
        if (response.type && response.code) return response;
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

/**
 * @param {*} mongoconnection
 * @param {wasabiManager} wm
 * @param {*} sid
 * @returns {Buffer} The PFP in buffer format
 */
export async function getPFP(mongoconnection, wm, uid) {
    try {
        if (!uid) return null;

        const client = await mongoconnection;
        const dbo = client.db(uid).collection('configs');
        const uprofile = await dbo.findOne({_id: 'myprofile'});
        
        if (!uprofile || !uprofile.icon) return null;

        const pfpdata = await wm.getFile(uid, uprofile.icon);
        if (!pfpdata) return {type: 1, code: 1, message: "no icon found"}
        else return pfpdata;
    } catch (err) {
        console.log(err);
        return null;
    }
        
}