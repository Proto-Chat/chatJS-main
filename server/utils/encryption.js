import jwkToPem from 'jwk-to-pem'
import crypto from 'crypto'

// change as needed
export function generateSymmetricKey() {
    const keyLength = 32; // 32 bytes for AES-256
    const key = crypto.randomBytes(keyLength);
    return key;
}


/**
 * @param {{uid: String, keyPub: String}} keyObj1
 * @param {{uid: String, keyPub: String}} keyObj2
 */
export function generateSymmKeyset(keyObj1, keyObj2) {
    const symmKey = generateSymmetricKey();
    const encSymmKeyWithUkeyPub = (dBuff, ukeyPub) => {
        return crypto.publicEncrypt(
            {
                key: ukeyPub,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            dBuff
        ).toString('base64');
    }

    const buffer = Buffer.from(symmKey, 'utf8');
    const uOnePemkeyPub = jwkToPem(keyObj1.keyPub);
    const uTwoPemkeyPub = jwkToPem(keyObj2.keyPub);

    const encSymmKeyUOne = encSymmKeyWithUkeyPub(buffer, uOnePemkeyPub);
    const encSymmKeyUTwo = encSymmKeyWithUkeyPub(buffer, uTwoPemkeyPub);

    const retObj = {};
    retObj[`${keyObj1.uid}`] = encSymmKeyUOne;
    retObj[`${keyObj2.uid}`] = encSymmKeyUTwo;
    return retObj;
}