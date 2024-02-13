function newServerPopup() {
    const br = (el) => el.appendChild(document.createElement('br'));

    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'profileoutlinediv';
    br(wrapperDiv);
    window.addEventListener('mousedown', pfpCloseFnct);

    // text section
    const form = document.createElement('form');
    form.className = 'serverSelectForm';
    form.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    const serverInpNameTitle = document.createElement('label');
    serverInpNameTitle.for = 'serverNameInp';
    serverInpNameTitle.innerText = 'Server Name';
    form.appendChild(serverInpNameTitle);

    const serverNameInp = document.createElement('input');
    serverNameInp.type = 'text';
    serverNameInp.className = 'serverNameInp';
    serverNameInp.name = 'serverNameInp';
    serverNameInp.id = 'serverNameInp';
    form.appendChild(serverNameInp);

    // privacy section
    wrapperDiv.appendChild(document.createElement('br'));

    form.className = 'serverSelectForm';
    const label = document.createElement('label');
    label.for = 'serverPrivacyInp';
    label.innerText = 'Server Privacy';
    label.style.marginTop = '20px';

    const serverPrivacySelect = document.createElement('select');
    serverPrivacySelect.name = 'serverPrivacyInp';
    serverPrivacySelect.id = 'serverPrivacyInp';
    serverPrivacySelect.className = 'serverPrivacyInp';
    const privacies = ['private', 'public'];

    for (const p of privacies) {
        const opt = document.createElement('option');
        opt.className = 'serverPrivacyOpt';
        opt.innerText = p;
        opt.id = p;
        serverPrivacySelect.appendChild(opt);
    }

    form.appendChild(label);
    form.appendChild(serverPrivacySelect);

    const btnwrapperdiv = document.createElement('div');
    const submitBtn = document.createElement('button');
    submitBtn.className = 'groupDMSubmitBtn';
    submitBtn.innerText = 'Create new server!';
    btnwrapperdiv.appendChild(submitBtn);

    wrapperDiv.appendChild(form);

    submitBtn.onclick = (e) => {
        const serverTitle = document.getElementById('serverNameInp').value;
        if (!serverTitle) return alert("Please provide a title!");

        const serverPrivacyInp = document.getElementById('serverPrivacyInp');
        const serverPrivacy = serverPrivacyInp.options[serverPrivacyInp.selectedIndex].text;
        if (!serverPrivacy) return alert("No privacy provided!");

        ws.send(JSON.stringify({
            code: 6,
            op: 0,
            data: {
                title: serverTitle,
                isPrivate: (serverPrivacy == 'private')
            },
            sid: localStorage.getItem('sessionid')
        }));

        e.target.innerText = 'Creating Server...';
        e.target.disabled = true;
        e.target.style.color = 'white';
        e.target.style.fontSize = 'auto';
    };

    wrapperDiv.appendChild(btnwrapperdiv);
    document.body.prepend(wrapperDiv);
}


function createServerSettingsModal(serverInfo) {
	// Create modal container
	const modal = document.createElement("div");
	modal.setAttribute("id", "serverSettingsModal");
	modal.setAttribute("class", "modal");

	// Create modal content container
	const modalContent = document.createElement("div");
	modalContent.setAttribute("class", "modal-content");

	// Close button
	const closeButton = document.createElement("span");
	closeButton.setAttribute("class", "close");
	closeButton.innerHTML = "&times;";
	closeButton.onclick = function () {
		modal.remove();
	};

	// Add title
	const title = document.createElement("h2");
	title.textContent = "Server Settings";

	// Add form
	const form = document.createElement("form");

	// Server Name
	form.appendChild(createInputField("Server Name:", "serverName", "text", serverInfo.configs.name));

	// Server Icon
	form.appendChild(createFileInputField("New Server Icon:", "serverIcon"));

	// Server Privacy
	form.appendChild(createSelectField("Server Privacy:", "serverPrivacy", ["Public", "Private"]));

	// View Banned Members Button
    const btnDiv = document.createElement('div');
    btnDiv.style.textAlign = 'center';

	const viewBannedButton = document.createElement("button");
	viewBannedButton.setAttribute("type", "button");
	viewBannedButton.innerText = "Edit Bans";
	viewBannedButton.id = "viewBanned";
    viewBannedButton.classList = 'viewBaseBtn viewBanned';
    viewBannedButton.onclick = (e) => {
        e.preventDefault();

        // get banned users
        ws.send(JSON.stringify({
            code: 6,
            op: 10,
            actioncode: 3,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverConfs: serverInfo.configs
            }
        }));
    };
	btnDiv.appendChild(viewBannedButton);

    const roleBtn = document.createElement('button');
    roleBtn.innerText = 'Roles';
    roleBtn.id = 'viewRoles';
    roleBtn.className = 'viewBaseBtn';
    roleBtn.onclick = (e) => {
        e.preventDefault();
        // get banned users
        ws.send(JSON.stringify({
            code: 6,
            op: 11,
            actioncode: 3,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverConfs: serverInfo.configs
            }
        }));
    };
    btnDiv.appendChild(roleBtn);

	// Submit Button
	const submitButton = document.createElement("button");
	submitButton.innerText = "Save Changes";
    submitButton.className = 'saveBtn';
	submitButton.onclick = (e) => {
        e.preventDefault();

		const serverName = document.getElementById("serverName").value || serverInfo.configs.name;
		const serverIcon = document.getElementById("serverIcon").files[0]; // This will be a File object
		const serverPrivacy = document.getElementById("serverPrivacy").value;

        // send the file here
        console.log('%c TODO: SEND SERVER FILE', 'color: #c061cb');

		ws.send(JSON.stringify({
            code: 6,
            op: 1,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverConfs: serverInfo.configs,
                serverName: serverName,
                serverIcon: serverIcon?.name,
                serverPrivacy: serverPrivacy
            }
		}));
	}
	btnDiv.appendChild(submitButton);
	form.appendChild(btnDiv);

	// Append elements
	modalContent.appendChild(closeButton);
	modalContent.appendChild(title);
	modalContent.appendChild(form);
	modal.appendChild(modalContent);

	document.body.appendChild(modal);
}


function createInputField(labelText, id, type, placeholder = undefined) {
	var label = document.createElement("label");
	label.setAttribute("for", id);
    label.style.marginRight = '5px';
	label.textContent = labelText;

	var input = document.createElement("input");
	input.setAttribute("type", type);
	input.setAttribute("id", id);
	input.setAttribute("name", id);
	if (placeholder) input.placeholder = placeholder;

	var container = document.createElement("div");
    container.className = 'serverSettingContainer';
	container.appendChild(label);
	container.appendChild(input);
	return container;
}


const createFileInputField = (labelText, id) => createInputField(labelText, id, "file");


function createSelectField(labelText, id, options) {
	const label = document.createElement("label");
	label.setAttribute("for", id);
	label.textContent = labelText;
    label.style.marginRight = '5px';

	const select = document.createElement("select");
	select.setAttribute("id", id);
	select.setAttribute("name", id);

	options.forEach((optionText) => {
		var option = document.createElement("option");
		option.setAttribute("value", optionText.toLowerCase());
		option.textContent = optionText;
		select.appendChild(option);
	});

	const container = document.createElement("div");
    container.className = 'serverSettingContainer';
	container.appendChild(label);
	container.appendChild(select);
	return container;
}


/**
 * @param {function} f 
 */
const createServerConfBtn = (f, btntxt, serverInfo = undefined) => {
	const newChannelLink = document.createElement('a');
	newChannelLink.href = '';
	newChannelLink.classList.add('pageSwitchLink');
	newChannelLink.classList.add('unselectable');
	newChannelLink.innerText = btntxt;
	newChannelLink.onclick = (e) => {
		e.preventDefault();
		f(serverInfo);
	}
	return newChannelLink;
}


function createServerSideBar(data) {
    const info = data.serverInfo;
    const sidebar = document.getElementById('channels');
    const serverId = data.serverInfo.configs.serverId;

    const isOwner = JSON.parse(localStorage.getItem('user')).uid == data.serverInfo.configs.owner;
    if (isOwner) {
        // admin stuff
        sidebar.appendChild(createServerConfBtn(showNewChannelPopup, 'NEW CHANNEL'));
        sidebar.appendChild(createServerConfBtn(createServerSettingsModal, 'SETTINGS', data.serverInfo));
    }

    for (const channelRaw in info.channels) {
        const channelLink = document.createElement('a');
        channelLink.innerText = channelRaw;
        channelLink.id = info.channels[channelRaw].channelId;

        channelLink.onclick = (e) => {
            const openChannel = {
                code: 6,
                op: 4,
                data: {
                    serverId: serverId,
                    channelId: e.target.id,
                    sid: localStorage.getItem('sessionid')
                }
            };

            ws.send(JSON.stringify(openChannel));
        }

        // edit the channel if has perms
// TODO: have this sent from the back-end
        if (isOwner) {
            const editico = document.createElement('button');
            editico.innerText = '⚙';
            editico.className = 'ceditico'
            
            editico.onclick = (e) => {
                if (document.getElementsByClassName('msgdropdown').length != 0) {
                    document.getElementsByClassName('msgdropdown')[0].remove();
                }
                
                showEditChannelPopup(e.target.parentNode.id, e.target.parentNode.innerText.replace(e.target.innerText, ""));
                e.preventDefault();
            }
            channelLink.appendChild(editico);

            // make this a context menu and an icon
            channelLink.addEventListener('contextmenu', (e) => {
                if (document.getElementsByClassName('msgdropdown').length != 0) {
                    document.getElementsByClassName('msgdropdown')[0].remove();
                }
                
                showEditChannelPopup(channelLink.id, channelLink.innerText);
                e.preventDefault();
            });
        }

        sidebar.appendChild(channelLink);
    }
}


function createServerConfMain(serverInfo) {
    const rootElement = document.getElementById('serverInfoContainer');
    const header = document.createElement('h1');
    header.textContent = `Welcome to ${serverInfo.configs.name}!`;
    rootElement.appendChild(header);

    const channelHeader = document.createElement('h2');
    channelHeader.textContent = "Check out these channels:";
    rootElement.appendChild(channelHeader);

    const channelsList = document.createElement('ul');
    for (const channelName in serverInfo.channels) {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = "";
        link.id = serverInfo.channels[channelName]['channelId'];
        link.textContent = channelName;
        link.onclick = (e) => {
            e.preventDefault();
            const openChannel = {
                code: 6,
                op: 4,
                data: {
                    serverId: serverInfo.configs.serverId,
                    channelId: e.target.id,
                    sid: localStorage.getItem('sessionid')
                }
            };

            ws.send(JSON.stringify(openChannel));
        }
        listItem.appendChild(link);
        channelsList.appendChild(listItem);
    }

    rootElement.appendChild(channelsList);
}


function initializeServersPage(response) {
    createServerSideBar(response.data);
    console.log(response.data);

    // create the "welcome" screen
    const serverId = response.data.serverInfo.configs.serverId;
    createServerConfMain(response.data.serverInfo);
    createNewChannelPopup(serverId);
    createEditChannelPopup(serverId);

    clearInterval(loadingAnimInterval);
    document.getElementById('loadingdiv').style.display = 'none';
    document.getElementById('maincontent').style.display = 'block';
}