//TO BE IMPLEMENTED LATER
// const nodemailer = require('nodemailer');
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createNewUser } from './newConnection.js';


function sendConfEmail(password, other_email, confCode) {
	if (!other_email) return;

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: "customdiscordwebapp@gmail.com",
			pass: password,
		},
	});

	// send mail with defined transport object
	const toSend = {
		from: 'customdiscordwebapp@gmail.com',
		to: other_email,
		subject: 'Confirm your new account!',
		text: `Confirmation code: ${confCode}\n\nThis code will expire in 5 minutes ;-;`
	}

	transporter.sendMail(toSend, (err, data) => {
		if (err) throw err;
	});
}


export async function createUConf(ws, mongoconnection, emailPass, data) {
	try {
		const { username, password, email } = data.data;
		const client = await mongoconnection;

		//I'd rather do more work here than query the db twice
		const tbo = await client.db('main').collection('accounts').findOne({
			$or: [
				{ email: email },
				{ username: username }
			]
		});

		//collision checking
		if (tbo) {
			if (tbo.email == email) return ws.send(JSON.stringify({ code: 0, op: 1, type: 1 }));
			else if (tbo.username == username) return ws.send(JSON.stringify({ code: 0, op: 1, type: 2 }));
		}

		const confCode = crypto.randomInt(10000000, 100000000);

		const cdbo = client.db('main').collection('confirmation');

		const expDate = new Date();
		expDate.setMinutes(expDate.getMinutes() + 10);

		await cdbo.insertOne({ email: email, username: username, password: password, code: confCode, created: new Date(), expires: expDate });

		sendConfEmail(emailPass, email, confCode);

		ws.send(JSON.stringify({
			code: 0,
			op: 1,
			type: 0,
			data: {
				confCode: confCode
			}
		}));
	} catch (err) {
		console.log(err);
		ws.send(JSON.stringify({ code: 500 }));
	}
}


export async function processUConf(ws, mongoconnection, data) {
	try {
		const confCode = data.data.confCode;
		if (!confCode) return ws.send(JSON.stringify({ code: 0, op: 2, type: 1 }));

		const client = await mongoconnection;
		const cdbo = client.db('main').collection('confirmation');

		const doc = await cdbo.findOne({ code: Number(confCode) });
		if (!doc) return ws.send(JSON.stringify({ code: 0, op: 2, type: 1 }));

		if (new Date(doc.expires) < Date.now()) {
			return ws.send(JSON.stringify({ code: 0, op: 2, type: 2 }));
		}

		cdbo.deleteOne({ code: Number(confCode) });

		// send the message for the encryption keys
		ws.send(JSON.stringify({ code: 7, op: 0, data: { username: doc.username, email: doc.email, password: doc.password } }));
		// createNewUser(mongoconnection, ws, {username: doc.username, email: doc.email, password: doc.password});
	} catch (err) {
		console.log(err);
		ws.send(JSON.stringify({ code: 500 }));
	}
}


/**
 * The password will be encrypted with the private key and the private key will be encrypted with the password
 * @param {*} mongoconnection
 * @param {*} ws
 * @param {{username: String, email: String, password: String, keyPrvt: String, keyPub: String}} data
 */
export async function recieveKeysInit(mongoconnection, ws, data) {
	// console.log(data);
	createNewUser(mongoconnection, ws, data);
}