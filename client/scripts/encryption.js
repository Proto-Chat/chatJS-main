const dbName = 'keyDatabase';
const storeName = 'keys';
const version = 1;
const prvtIDBKey = 'privt';
const symmEncIDBKey = 'symmenc';


function getDB() {
    return new Promise(async (resolve, reject) => {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not supported!');
            return reject();
        }

        const db = await idb.openDB(dbName, version, {
            upgrade(db, oldVersion, newVersion, transaction) {
                const store = db.createObjectStore(storeName);
            }
        });

        resolve(db);
    });
}


async function writeKeyToIDB(cKey, isSymm = false) {
    try {
        const db = await getDB();
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = await tx.objectStore(storeName);

        const value = await store.put(cKey, (isSymm) ? symmEncIDBKey : prvtIDBKey);
        await tx.done;

        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

async function demo() {
    const toSend = prompt("please enter message");
    if (!toSend) return alert("NO TEXT FOUND TO SEND!")

    const encMsg = await encryptMessage("other", toSend);
    console.info("ENCRYPTED MESSAGE:", encMsg);
    alert(await decryptMessage(encMsg));
}


// CRYPTO STUFF

// for simplicity and aesthetic
/**
 * @param {Boolean} asJWK 
 * @returns {Object | CryptoKey}
 */
async function getPrivKey(asCrypto = false) {
    const jwkKey = await (await getDB())?.transaction(storeName).objectStore(storeName).get(prvtIDBKey) || null;

    if (!asCrypto) return jwkKey;

    else return await crypto.subtle.importKey(
        "jwk",
        jwkKey,
        {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" },
        },
        true,
        ["decrypt"]
    );
}

async function getSymmKey() {
    try {
        const symmEncKeyEnc = await (await getDB())?.transaction(storeName).objectStore(storeName).get(symmEncIDBKey) || null;;
        const prvKey = await getPrivKey(true);
        if (!symmEncKeyEnc || !prvKey) return alert("Encryption Key Error!\nPlease try again later!");

        // decrypt the symm key with the private key
        const symmEncKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, prvKey, base64ToArrayBuffer(symmEncKeyEnc));

        return await crypto.subtle.importKey(
            "raw",
            symmEncKey,
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    }
    catch(err) {
        console.error("ENCRYPTION ERROR:", err);
        return null;
    }
}


async function checkPassword(password, encryptedPrivateKeyData) {
    const { salt, iv, encryptedPrivateKey } = encryptedPrivateKeyData;
    if (!salt || !iv || !encryptedPrivateKey) return console.error("Missing data for password check!");

    try {
        const { keyFromPass } = await deriveKeyFromPass(password, salt);
        const decryptedPrivateKey = await decryptPrivateKey(keyFromPass, encryptedPrivateKey, iv);

        // password is correct and we get the private key
        writeKeyToIDB(decryptedPrivateKey);

        return true;
    } catch (error) {
        console.error("Incorrect password or decryption error:", error);
        return false;
    }
}



async function deriveKeyFromPass(password, saltInp = undefined) {
    const salt = (saltInp != undefined) ? saltInp : window.crypto.getRandomValues(new Uint8Array(32));
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: new TextEncoder().encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    return { keyFromPass: derivedKey, salt: salt, iv: window.crypto.getRandomValues(new Uint8Array(12)) };
}


async function decryptPrivateKey(derivedKey, encryptedPrivateKey, iv) {
    const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        derivedKey,
        encryptedPrivateKey
    );

    const decodedPrivateKey = new TextDecoder().decode(decryptedData);
    return JSON.parse(decodedPrivateKey);
}


function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}


async function generateSymmetricKey() {
    try {
        const key = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,  // Can be 128, 192, or 256 bits
            },
            true,  // Whether the key is extractable (i.e., can be used in exportKey)
            ["encrypt", "decrypt"]  // Specify the operations for which the key can be used
        );

        return key;
    } catch (error) {
        console.error("Error generating symmetric key:", error);
    }
}


async function createAndStoreKey(data) {
    try {
        const keyPair = await window.crypto.subtle.generateKey({
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
            true,
            ["encrypt", "decrypt"]
        );

        // encrypt
        const encoder = new TextEncoder();

        const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

        const { keyFromPass, salt, iv } = await deriveKeyFromPass(data.password);

        // encrypt the private key using the key derived from their password
        const encodedPrivateKey = encoder.encode(JSON.stringify(privateKey));
        const encryptedPrivateKey = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            keyFromPass,
            encodedPrivateKey
        );

        // not secure?
        writeKeyToIDB(privateKey);

        // encrypt the password using the private key
// DOES NOT WORK
        // const passwordEncrypted = await window.crypto.subtle.encrypt(
        //     { name: "RSA-OAEP" },
        //     keyPair.privateKey,
        //     encoder.encode(data.password)
        // );
        const passwordEncrypted = data.password


        // replace the unencrypted password
        data['password'] = passwordEncrypted;

        // new entries
        data['keyPrvtEnc'] = bufferToHex(encryptedPrivateKey);
        data['keyPub'] = JSON.stringify(publicKey);
        data['iv'] = bufferToHex(iv);
        data['salt'] = bufferToHex(salt);

        // data already has code 7 and op 0
        ws.send(JSON.stringify(data));

        return true;
    } catch (error) {
        console.error("Error in storing key:", error);
        return false;
    }
}


function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}


async function importKey(base64Key) {
    const arrayBufferKey = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        "raw",
        arrayBufferKey,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}


async function encryptMsg(symmKey, data) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        symmKey,
        new TextEncoder().encode(data)
    );

    const base64EncData = arrayBufferToBase64(encryptedData);
    const base64IV = arrayBufferToBase64(iv);
    return { base64EncData, base64IV };
}


async function decryptMsg(symmEncKey, dataObj) {
    const { base64EncData, base64IV } = dataObj;
    
    // Convert Base64 back to ArrayBuffer
    const encryptedData = base64ToArrayBuffer(base64EncData);
    const iv = base64ToArrayBuffer(base64IV);

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        symmEncKey,
        encryptedData
    );

    // Convert the decrypted data back to a string
    return new TextDecoder().decode(decryptedData);
}



// INITIAL THINGS
async function init() {
    if (!("TextDecoder" in window)) return alert("Sorry, this browser does not support TextDecoder...");
    if (!('indexedDB' in window)) return alert('IndexedDB not supported!');

    if (!localStorage.getItem('sessionid')) return;
    else if (!(await getPrivKey())) {
        // LOG OUT HERE
        logout();
    }
};

init();