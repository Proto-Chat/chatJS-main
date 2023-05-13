//TO BE IMPLEMENTED LATER


export async function sendConfEmail(email) {
	const data = JSON.stringify({
		"Messages": [{
			"From": { "Email": "<YOUR EMAIL>", "Name": "<YOUR NAME>" },
			"To": [{ "Email": email, "Name": name }],
			"Subject": subject,
			"TextPart": message
		}]
	});

	const config = {
		method: 'post',
		url: 'https://api.mailjet.com/v3.1/send',
		data: data,
		headers: { 'Content-Type': 'application/json' },
		auth: { username: '<API Key>', password: '<Secret Key>' },
	};

	return axios(config)
		.then(function (response) {
			console.log(JSON.stringify(response.data));
		})
		.catch(function (error) {
			console.log(error);
		});
}