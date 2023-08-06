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
    for (const channelRaw in info.channels) {
        const channelLink = document.createElement('a');
        channelLink.innerText = channelRaw;
        channelLink.id = info.channels[channelRaw].channelId;

        channelLink.onclick = (e) => {
            console.log(e.target.id);
        }

        sidebar.appendChild(channelLink);
    }
}


function initializeServersPage(response) {
    console.log(response.data);
    createServerSideBar(response.data);

    clearInterval(loadingAnimInterval);
    document.getElementById('loadingdiv').style.display = 'none';
    document.getElementById('maincontent').style.display = 'block';
}