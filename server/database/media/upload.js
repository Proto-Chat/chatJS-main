import { getUidFromSid } from "../../utils/decodesid.js";
import { wasabiManager } from "./init.js";

/**
 * @param {*} mongoconnection
 * @param {wasabiManager} wm
 * @param {*} sid
 * @param {*} filename
 * @param {*} filedata
 */
export async function uploadPFP(mongoconnection, wm, sid, filename, filedata, gdmid) {
    try {        
        const client = await mongoconnection;
        var uid;

        if (!gdmid) {
            uid = getUidFromSid(sid);
            if (!uid) return false;
    
            const dbo = client.db(uid).collection('configs');
            await dbo.updateOne({_id: 'myprofile'}, {$set: {icon: filename}});
        }
        else {
            uid = gdmid;
            const dbo = client.db('gdms').collection(gdmid);
            await dbo.updateOne({_id: 'configs'}, {$set: {icon: filename}});
        }

        const response = await wm.uploadFile(uid, filename, filedata);
        if (response && response.type && response.code) return response;
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
export async function getPFP(mongoconnection, wm, uid, isgdm = false) {
    try {
        if (!uid) return null;
        var dbo;
        var uprofile;

        const client = await mongoconnection;
        
        if (!isgdm) {
            dbo = client.db(uid).collection('configs');
            uprofile = await dbo.findOne({_id: 'myprofile'});
        }
        else {
            dbo = client.db('gdms').collection(uid);
            uprofile = await dbo.findOne({_id: 'configs'});
        }
        
        if (!uprofile || !uprofile.icon) return null;

        const pfpdata = await wm.getFile(uid, uprofile.icon);
        if (!pfpdata) return {type: 1, code: 1, message: "no icon found"}
        else return pfpdata;
    } catch (err) {
        console.log(err);
        return null;
    }
        
}