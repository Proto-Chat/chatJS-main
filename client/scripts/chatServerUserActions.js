/**
 * @param {{status: String, icon: String, username: String, uid: String, reasonforban: String}} user
 */
const createBannedUserCard = (user, uCardTxt = undefined) => {
	const userDiv = document.createElement('div');
	userDiv.className = 'user-item';

	// IMAGE DOES NOT WORK AT THE MOMENT
	var req = new XMLHttpRequest();
    req.open('GET', `${window.location.origin}/getpfp`, true);

    req.responseType = 'arraybuffer';

    req.onloadend = () => {
        const blob = new Blob([req.response]);
        const img = document.createElement('img');
        img.src = (blob.size > 0) ? URL.createObjectURL(blob) : 'https://github.com/ION606/chatJS/blob/main/client/assets/nopfp.jpg?raw=true';
        img.className = 'user-icon';
        img.id = `roledisppfp-${user.uid}`;

        userDiv.prepend(img);
    }
    
    req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
    req.setRequestHeader('otherid', user.uid);
    req.send();

	const userName = document.createElement('span');
	userName.style.lineHeight = '50px';
	userDiv.appendChild(userName);

	if (uCardTxt) {
		userName.innerText = uCardTxt;
		return userDiv;
	}

	userName.textContent = `${user.username}\tReason: ${user.reasonforban}`;

	const unbanButton = document.createElement('button');
	unbanButton.textContent = 'Unban';
	unbanButton.className = 'unban-button';
	unbanButton.onclick = (e) => {
		e.preventDefault();
		// Implement unban logic here
		console.log('Unban User:', user.uid);
	};
	userDiv.appendChild(unbanButton);

	return userDiv;
}


/**
 * @param {{name: String, id: String, users: {name: String, uid: String}[]}} role
 */
const createRoleCard = (serverInfo, role) => {
    const roleDiv = document.createElement('div');
    roleDiv.className = 'role-item';

    const roleName = document.createElement('h3');
    roleName.textContent = `Role: ${role.name}`;
	roleName.style.color = role.color;
    roleDiv.appendChild(roleName);

	const addToRoleBtn = document.createElement('button');
	addToRoleBtn.className = 'saveBtn';
	addToRoleBtn.onclick = (e) => {
		e.preventDefault();
		ws.send(JSON.stringify({
			code: 6,
			op: 11,
			actioncode: 2,
			data: {
				sid: localStorage.getItem('sessionid'),
				serverConfs: serverInfo,
				roleId: role.id
			}
		}));
	}
	addToRoleBtn.innerText = 'Add Role';
	roleDiv.appendChild(addToRoleBtn);

    const userList = document.createElement('ul');
    userList.className = 'user-list';
    role.users.forEach(user => {
		const uEl = createBannedUserCard(user, user.name);
		const remBtn = document.createElement('button');
		remBtn.innerText = 'Remove';
		remBtn.className = 'viewBaseBtn viewBanned';
		remBtn.style.fontSize = '';
		remBtn.style.padding = '5px'
		remBtn.style.marginLeft = '10px';
		remBtn.onclick = (e) => {
			e.preventDefault();
			ws.send(JSON.stringify({
				code: 6,
				op: 11,
				actioncode: 2,
				data: {
					sid: localStorage.getItem('sessionid'),
					serverConfs: serverInfo,
					roleId: role.id
				}
			}));
		}

		uEl.appendChild(remBtn);
        // userItem.textContent = `User: ${user.name}, UID: ${user.uid}`;
        userList.appendChild(uEl);
    });
    roleDiv.appendChild(userList);

    return roleDiv;
}


async function displayBanned(data) {
	// close the settings modal
	document.querySelector('.close').click();

	//#region CREATE THE MODAL
	const modal = document.createElement("div");
    modal.setAttribute("id", "bannedUsersModal");
    modal.setAttribute("class", "modal");

    // Create modal content container
    const modalContent = document.createElement("div");
    modalContent.setAttribute("class", "modal-content");

    // Close button
    const closeButton = document.createElement("span");
    closeButton.setAttribute("class", "close");
    closeButton.innerHTML = "&times;";
    closeButton.onclick = () => (document.getElementById('bannedUsersModal').remove());

    // Modal title
    const title = document.createElement("h2");
    title.textContent = "Banned Users";

    // User list container
    const listContainer = document.createElement("div");
    listContainer.setAttribute("id", "bannedUsersList");

    // Append elements to modal content
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(listContainer);

    modal.appendChild(modalContent);
	//#endregion

	for (const user of data.banned) listContainer.appendChild(createBannedUserCard(user));

	document.getElementById('maincontent').appendChild(modal);
}


async function createRolePopup(data) {
	const modal = document.createElement("div");
    modal.setAttribute("class", "modal");
    modal.setAttribute("id", "roledispmodal");

	// Create modal content container
    const modalContent = document.createElement("div");
    modalContent.setAttribute("class", "modal-content");
	modalContent.style.textAlign = 'center';

	const closeButton = document.createElement("span");
    closeButton.setAttribute("class", "close");
    closeButton.innerHTML = "&times;";
    closeButton.onclick = () => (document.getElementById('roledispmodal').remove());
	modalContent.append(closeButton);

	const h3 = document.createElement('h3');
	h3.innerText = 'Change Roles';
	h3.style.textAlign = 'center';
	h3.style.marginBottom = '0px';
	modalContent.appendChild(h3);

	for (const role of data.roles) {
		const roleInp = document.createElement('input');
		roleInp.type = 'checkbox';
		roleInp.id = `roleInp${role.id}`;
		roleInp.name = `roleInp${role.id}`;
		
		const tag = document.createElement('label');
		tag.innerText = role.name;
		tag.for = `roleInp${role.id}`;
		tag.style.fontSize = '20px';

		modalContent.append(tag, roleInp, document.createElement('br'));
	}

	const submitbtn = document.createElement('button');
	submitbtn.className = 'saveBtn';
	submitbtn.innerText = 'Save';
	submitbtn.onclick = (e) => {
		e.preventDefault();

		for (const el of modalContent.querySelectorAll('input')) {
			ws.send(JSON.stringify({
				code: 6,
				op: 10,
				actioncode: 4,
				data: {
					sid: localStorage.getItem('sessionid'),
					serverConfs: data.serverConfs,
					roleId: el.id.replace('roleInp', ''),
					adding: el.checked
				}
			}));
		}

		closeButton.click();
	}
	modalContent.appendChild(submitbtn);

	const pEl = document.getElementById('chatMain');
	pfpCloseFnct();

	setTimeout(() => {
		modal.appendChild(modalContent);
		pEl.appendChild(modal);
	}, 500);
}


async function displayRoles(data) {	
	const {serverConfs, roles} = data;
	// close the settings modal
	document.querySelector('.close').click();

	//#region CREATE THE MODAL
	const modal = document.createElement("div");
    modal.setAttribute("id", "rolesModal");
    modal.setAttribute("class", "modal");

    // Create modal content container
    const modalContent = document.createElement("div");
    modalContent.setAttribute("class", "modal-content");

    // Close button
    const closeButton = document.createElement("span");
    closeButton.setAttribute("class", "close");
    closeButton.innerHTML = "&times;";
    closeButton.onclick = () => (document.getElementById('rolesModal').remove());

    // Modal title
    const title = document.createElement("h2");
    title.textContent = "Roles";

    // User list container
    const listContainer = document.createElement("div");
    listContainer.setAttribute("id", "rolesList");

    // Append elements to modal content
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(listContainer);

    modal.appendChild(modalContent);
	//#endregion

	roles.sort((r) => r.pos);

	for (const role of roles) listContainer.appendChild(createRoleCard(serverConfs, role));

	document.getElementById('maincontent').appendChild(modal);
}


async function handleActionCode(data) {
	console.log(data);

	switch (data.actioncode) {
		case 3: displayBanned({banned: [
			{
				"status": "ehe >:3",
				"icon": "",
				"username": "ION606",
				"uid": "5aa9b536-e0fb-4d61-9145-07f192ca2cf3",
			  	"reasonforban": "too gay"
			  }
		]});
		break;
	}
}