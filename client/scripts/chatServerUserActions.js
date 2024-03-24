const br = () => document.createElement('br');


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
	userDiv.dataset.uid = user.uid;

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


// abstracted for readability
const createRolePopupBtn = (serverInfo) => {
	const addRoleBtn = document.createElement('button');
	addRoleBtn.className = 'saveBtn';
	addRoleBtn.onclick = (e) => {
		// create popup
		const { modal, modalContent } = createModal("addRoleModal");
		modal.appendChild(modalContent);

		const createInp = (id, txt, type) => {
			const inp = document.createElement('input');
			inp.type = type;
			inp.name = id;
			inp.id = id;
			const l = document.createElement('label');
			l.innerText = txt;
			l.for = id;

			const p = document.createElement('p');
			p.style.margin = '10px';
			p.append(l, inp);
			p.style.display = 'table-row';
			p.style.margin = '10px';
			return p;
		}

		const topRow = document.createElement('p');
		topRow.style.display = 'table-row';
		modalContent.firstChild.style.float = '';
		modalContent.firstChild.style.display = 'table-cell';

		modalContent.classList.add('newrolediv');
		const t = document.createElement('h2');
		t.innerText = 'New Role';
		topRow.append(t, modalContent.firstChild);

		const d1 = createInp('newrolename', 'Name', 'text');
		const d2 = createInp('newrolecol', 'Color', 'color');

		const submitbtn = document.createElement('button');
		submitbtn.className = 'saveBtn';
		submitbtn.innerText = 'Save';
		submitbtn.onclick = (e2) => {
			e2.preventDefault();

			const rolename = document.getElementById('newrolename')?.value;
			const rolecol = document.getElementById('newrolecol')?.value;

			if (!rolename && rolecol) return alert("please fill out all fields!");
			ws.send(JSON.stringify({
				code: 6,
				op: 11,
				actioncode: 0,
				data: {
					sid: localStorage.getItem('sessionid'),
					serverConfs: serverInfo,
					rolename, rolecol
				}
			}));
		};
		modalContent.append(topRow, d1, d2, submitbtn);
		document.getElementById('rolesModal').appendChild(modal);
	}

	addRoleBtn.innerText = 'Add Role';
	return addRoleBtn;
}


async function createUserSelectionDropdown(users, roleId, serverConfs, btnToSwap) {
	const createUserOpt = (u) => {
		const newOpt = document.createElement('a');
		newOpt.href = '';
		newOpt.innerText = u.username;
		newOpt.value = u.uid;

		const swapSel = () => newOpt.parentElement.parentElement.replaceWith(btnToSwap);

		newOpt.onclick = (e) => {
			e.preventDefault();

			ws.send(JSON.stringify({
				code: 6,
				op: 10,
				actioncode: 4,
				data: {
					adding: true,
					sid: localStorage.getItem('sessionid'),
					roleId,
					serverConfs
				}
			}));

			swapSel();
		}

		document.addEventListener('keyup', (e) => {
			if (e.key == 'Escape') swapSel();
			document.removeEventListener('keyup', this);
		});
		return newOpt;
	}

	const dropdownDiv = document.createElement('div');
	dropdownDiv.className = 'dropdown';
	dropdownDiv.id = 'userlistdropdown';

	const closeIfClick = (e) => {
		if (!dropdownDiv.matches(":hover")) dropdownDiv.remove();
		document.removeEventListener('click', closeIfClick);
	}

	document.addEventListener('click', closeIfClick);

	const dropdown = document.createElement('div');
	dropdown.className = 'dropdown-content';

	const inp = document.createElement('input');
	inp.type = 'text';
	inp.placeholder = 'Search..';
	inp.id = 'uSearchInp';
	inp.onkeyup = (e) => {
		var filter, a, i;

		filter = inp.value.toUpperCase();
		a = dropdown.getElementsByTagName("a");
		for (i = 0; i < a.length; i++) {
			txtValue = a[i].textContent || a[i].innerText;
			if (txtValue.toUpperCase().indexOf(filter) > -1) {
				a[i].style.display = "";
			} else {
				a[i].style.display = "none";
			}
		}
	}

	dropdown.appendChild(inp);
	await Promise.all(users.map(u => dropdown.appendChild(createUserOpt(u))));

	dropdownDiv.appendChild(dropdown);
	return dropdownDiv;
}


function addUcardToRole(roleId, user, userList, serverInfo) {
	const uEl = createBannedUserCard(user, user.username);
	const remBtn = document.createElement('button');
	remBtn.innerText = 'Remove';
	remBtn.className = 'viewBaseBtn viewBanned';
	remBtn.style.fontSize = '';
	remBtn.style.margin = '5px'
	remBtn.style.marginLeft = '10px';
	remBtn.onclick = (e) => {
		e.preventDefault();
		ws.send(JSON.stringify({
			code: 6,
			op: 10,
			actioncode: 4,
			data: {
				sid: localStorage.getItem('sessionid'),
				serverConfs: serverInfo,
				roleId
			}
		}));
	}

	uEl.appendChild(remBtn);
	// userItem.textContent = `User: ${user.name}, UID: ${user.uid}`;
	userList.appendChild(uEl);
}


/**
 * @param {{name: String, id: String, users: {name: String, uid: String}[]}} role
 */
const createRoleCard = (serverInfo, role) => {
	const roleDiv = document.createElement('div');
	roleDiv.className = 'role-item';
	roleDiv.dataset.roleid = role.id;

	const roleName = document.createElement('h3');
	roleName.textContent = `Role: ${role.name}`;
	roleName.style.color = role.color;
	roleDiv.appendChild(roleName);

	const userList = document.createElement('ul');
	userList.className = 'user-list';
	role.users.forEach(user => addUcardToRole(role.id, user, userList, serverInfo));
	roleDiv.appendChild(userList);

	const addToRole = document.createElement('button');
	addToRole.onclick = async (e) => {
		e.preventDefault()
		// need the info now
		var req = new XMLHttpRequest();
		req.open('POST', `${window.location.origin}/serverroles`, true);

		req.responseType = 'text';

		req.onloadend = async () => {
			console.log(req.response);

			// display the users
			const users = JSON.parse(req.response);
			if (!users || typeof users == 'string') return alert("ERROR!");
			console.log(users, '---->', role.users);
			const uDropDown = await createUserSelectionDropdown(users.filter(u => (!role.users.find(u2 => (u2.uid == u.uid)))), role.id, serverInfo, addToRole);
			addToRole.replaceWith(uDropDown);
		}

		req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
		req.setRequestHeader('serverid', serverInfo.serverId);
		req.send();
	}

	addToRole.className = 'addubtn';
	addToRole.innerText = 'Add User';
	roleDiv.appendChild(addToRole);

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

/**
 * @returns the modal **CONTENT**
 */
function createModal(mid = "roledispmodal") {
	const modal = document.createElement("div");
	modal.setAttribute("class", "modal");
	modal.setAttribute("id", mid);

	// Create modal content container
	const modalContent = document.createElement("div");
	modalContent.setAttribute("class", "modal-content");
	modalContent.style.textAlign = 'center';

	const closeButton = document.createElement("span");
	closeButton.setAttribute("class", "close");
	closeButton.innerHTML = "&times;";
	closeButton.onclick = () => (document.getElementById(mid).remove());
	modalContent.append(closeButton);

	return { modal, modalContent };
}


async function createRolePopup(data, shouldRet = false) {
	return new Promise((resolve) => {
		const { modal, modalContent } = createModal();

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
			tag.setAttribute('for', `roleInp${role.id}`);
			tag.style.fontSize = '20px';

			const container = document.createElement('div');
			container.append(tag, roleInp);
			modalContent.append(container, br());
		}

		const submitbtn = document.createElement('button');
		submitbtn.className = 'saveBtn';
		submitbtn.innerText = 'Save';
		submitbtn.onclick = (e) => {
			e.preventDefault();
			const toRet = [];

			for (const el of modalContent.querySelectorAll('input')) {
				if (shouldRet) toRet.push({ roleId: el.id.replace('roleInp', ''), adding: el.checked });
				else ws.send(JSON.stringify({
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

			document.getElementsByClassName('closeButton')[0].click();
			if (shouldRet) resolve(toRet);
		}
		modalContent.appendChild(submitbtn);

		const pEl = document.getElementById('chatMain');
		pfpCloseFnct();

		setTimeout(() => {
			modal.appendChild(modalContent);
			pEl.appendChild(modal);
		}, 500);
	});
}


async function displayRoles(data) {
	const { serverConfs, roles, users } = data;
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

	for (const role of roles) {
		role.users = role.users.map((uid => users.find(u => u.uid == uid)));
		listContainer.appendChild(createRoleCard(serverConfs, role));
	}
	listContainer.appendChild(createRolePopupBtn(serverConfs));

	document.getElementById('maincontent').appendChild(modal);
}


/*
{
	banned: [
		{
			"status": "ehe >:3",
			"icon": "",
			"username": "ION606",
			"uid": "5aa9b536-e0fb-4d61-9145-07f192ca2cf3",
			"reasonforban": "too gay"
		}
	]
}
*/
async function handleActionCode(data) {
	console.log(data);

	switch (data.actioncode) {
		case 3: displayBanned(data.banned);
			break;
	}
}