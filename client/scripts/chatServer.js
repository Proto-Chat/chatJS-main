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


function createServerSideBar(data) {
    const info = data.serverInfo;
    const sidebar = document.getElementById('channels');
    const serverId = data.serverInfo.configs.serverId;

    const isOwner = JSON.parse(localStorage.getItem('user')).uid == data.serverInfo.configs.owner;
    if (isOwner) {
        // admin stuff
        const newChannelLink = document.createElement('a');
        newChannelLink.href = '';
        newChannelLink.classList.add('pageSwitchLink');
        newChannelLink.classList.add('unselectable');
        newChannelLink.innerText = 'NEW CHANNEL';
        newChannelLink.onclick = (e) => {
            e.preventDefault();
            showNewChannelPopup();
        }
        sidebar.appendChild(newChannelLink);
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
            channelLink.addEventListener('contextmenu', (e) => {
                if (document.getElementsByClassName('msgdropdown').length != 0) {
                    document.getElementsByClassName('msgdropdown')[0].remove();
                }
                
                showEditChannelPopup(e.target.id, e.target.innerText);
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