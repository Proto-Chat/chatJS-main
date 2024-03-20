const getRoles = (serverId) => {
    return new Promise((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open('POST', `${window.location.origin}/serverroles`, true);
        req.responseType = 'text';
    
        req.onloadend = () => {
            try {
                const r = JSON.parse(req.response);
                if (!r.roles) throw "NO ROLES";
                resolve(r.roles);
            }
            catch(err) {
                console.error(err);
                console.log(req.response);
                reject();
                alert("ERROR!");
            }
        }
    
        req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
        req.setRequestHeader('serverid', serverId);
        req.setRequestHeader('getroles', 'true');
        req.send();
    });
}


//#region New Channel
async function createNewChannelPopup(serverId) {
    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.id = 'newChannelPopupContainer';
    popupContainer.className = 'popup-container';
    popupContainer.style.display = 'none';

    // Create popup box
    const popup = document.createElement('div');
    popup.className = 'popup';

    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Add a New Channel';
    header.style.display = 'block';
    popup.appendChild(header);

    // Add input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'newChannelInput';
    input.placeholder = 'Channel Name';
    popup.appendChild(input);

    // choose roles
    const btn = document.createElement('button');
    btn.onclick = async (_) => {
        const roles = await getRoles(serverId);
        const roleDiv = document.createElement('div');
        roleDiv.style = "position:absolute;margin-top:10px;background:#5c5c5c;padding:10px;text-align:left;border:solid black 1px;";

        const rtba = (popup.dataset.rtba) ? JSON.parse(popup.dataset.rtba) : null;

        for (const role of roles) {
            const d =  document.createElement('div');
            const opt = document.createElement("input");
            opt.type = 'checkbox';
            opt.name = role.id;
            opt.value = role.id;

            if (rtba && rtba.includes(role.id)) opt.checked = true;
    
            const label = document.createElement('label');
            label.setAttribute("for", role.id);
            label.innerText = role.name;
            label.style = "display:inline;margin:10px;";

            d.append(opt, label);
            roleDiv.appendChild(d);
        }
        const btnDone = document.createElement('button');
        btnDone.innerText = "done";
        btnDone.onclick = (_) => {
            // roles to be added
            popup.dataset.rtba = JSON.stringify(Array.from(roleDiv.querySelectorAll("input")).map(o => (o.checked) ? o.value : undefined)
                                        .filter(o => o));
            roleDiv.remove();
        }
        roleDiv.appendChild(btnDone);
        popup.append(roleDiv);
    }
    btn.innerText = "Choose Roles";
    popup.appendChild(btn);

    // Add Add button
    const addButton = document.createElement('button');
    addButton.id = 'newChannelAddBtn';
    addButton.textContent = 'Add Channel';
    addButton.addEventListener('click', () => { addNewChannel(serverId) });
    popup.appendChild(addButton);

    // Add Close button
    const closeButton = document.createElement('button');
    closeButton.id = 'newChannelCloseBtn';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', hideNewChannelPopup);
    popup.appendChild(closeButton);

    // Append popup to container
    popupContainer.appendChild(popup);

    // Append container to body
    document.body.appendChild(popupContainer);
}

function showNewChannelPopup() {
    document.getElementById('newChannelPopupContainer').style.display = 'block';
}

function hideNewChannelPopup() {
    document.getElementById('newChannelPopupContainer').style.display = 'none';
}

function addNewChannel(serverId, rolesAllowed) {
    const channelName = document.getElementById('newChannelInput').value;
    if (channelName) {
        ws.send(JSON.stringify({
            code: 6,
            op: 2,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverId: serverId,
                channelName: channelName,
                rolesAllowed
            }
        }));

        hideNewChannelPopup();
    } else {
        alert("Please enter a channel name!");
    }
}

//#endregion


function createEditChannelPopup(serverId) {
    // Create edit channel popup container
    const popupContainer = document.createElement('div');
    popupContainer.id = 'editChannelPopupContainer';
    popupContainer.className = 'popup-container';
    popupContainer.style.display = 'none';

    // Create edit channel popup box
    const popup = document.createElement('div');
    popup.className = 'popup';

    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Edit Channel';
    popup.appendChild(header);

    // Add input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'editChannelInput';
    input.placeholder = 'New Channel Name';
    popup.appendChild(input);

    // Add Save button
    const saveButton = document.createElement('button');
    saveButton.id = 'editChannelSaveBtn';
    saveButton.textContent = 'Save Changes';
    saveButton.addEventListener('click', () => {
        const channelId = document.getElementById('editChannelPopupContainer').dataset.channelId;
        saveChannelChanges(channelId, serverId);
    });
    popup.appendChild(saveButton);

    // Add Delete button
    const deleteButton = document.createElement('button');
    deleteButton.id = 'editChannelDeleteBtn';
    deleteButton.textContent = 'Delete Channel';
    deleteButton.addEventListener('click', () => {
        const channelId = document.getElementById('editChannelPopupContainer').dataset.channelId;
        deleteChannel(channelId, serverId);
    });
    popup.appendChild(deleteButton);

    const roleButton = document.createElement('button');
    roleButton.innerText = 'Roles';
    roleButton.onclick = (e) => {
        e.preventDefault();
        const channelId = document.getElementById('editChannelPopupContainer').dataset.channelId;

        ws.send(JSON.stringify({
            code: 6,
            op: 11,
            actioncode: 3,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverConfs: {serverId},
                channelId
            }
        }));
    }
    popup.appendChild(roleButton);

    // Add Close button
    const closeButton = document.createElement('button');
    closeButton.id = 'editChannelCloseBtn';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => hidePopup('editChannelPopupContainer'));
    popup.appendChild(closeButton);

    // Append popup to container
    popupContainer.appendChild(popup);

    // Append container to body
    document.body.appendChild(popupContainer);
}

function showEditChannelPopup(channelId, channelName) {
    document.getElementById('editChannelInput').value = channelName;
    document.getElementById('editChannelPopupContainer').style.display = 'block';
    document.getElementById('editChannelPopupContainer').dataset.channelId = channelId;
}

function createRoleChangeBtn(role) {
    const rembtn = document.createElement('button');
    rembtn.innerText = (role.isInChannel) ? 'remove' : 'add';

    rembtn.classList = 'viewBaseBtn viewBanned';
    rembtn.style = 'display: inline; border: none; margin: 10px; cursor: pointer;';
    rembtn.id = `changeRoleInChannel${role.id}`;

    if (!role.isInChannel) rembtn.style.backgroundColor = '#06bf06';
    rembtn.style.padding = '5px 15px';
    rembtn.style.fontSize = '13px';
    return rembtn;
}

function dispChannelRoles(data) {
    console.log("ROLES", data);
    document.getElementById("rolepopup").style.display = "block";
    const roleContainer = document.getElementById("dataContainer");
    roleContainer.innerHTML = '<h1 style="text-align: center; margin-bottom: 0px;">Users and Roles</h1>';

    // roleContainer.innerHTML = '<h3>Roles</h3>';
    const rolesSorted = data.roles.sort((r1, r2) => (r2.pos < r1.pos));
    for (const role of rolesSorted) {
        const div = document.createElement('div');
        div.dataset.roleid = role.id;

        const h3 = document.createElement('h3');
        h3.style = `color: ${role.color}; margin-bottom: 0px;`;
        h3.innerText = role.name;

        h3.appendChild(createRoleChangeBtn(role));
        div.appendChild(h3);
        div.dataset.isinchannel = role.isInChannel;
        
        const uList = document.createElement('ul');
        uList.style.maxHeight = '100px';
        uList.style.overflowY = 'scroll';
        uList.style.marginTop = '0px';
        uList.style.border = 'solid black 1px';

        role.users = role.users.map((uid => data.serverConfs.usersAll.find(u => u.uid == uid)));
        role.users.forEach(user => {
            const li = document.createElement('li');
            li.dataset.uid = user.uid;
            li.innerText = user.username;
            uList.appendChild(li);
        });

        const addUBtn = document.createElement('button');
        addUBtn.className = "gobtn"

        // div.innerHTML += '<h4 style="margin: 0px 0px 1px 30px;">Users in Role</h4>';
        div.appendChild(uList);
        roleContainer.appendChild(div);
    }

    const remfnct = (e) => {
        if (!e.target.classList.contains('viewBanned')) return;
        const btn = e.target.parentElement.parentElement;
        const {roleid, isinchannel} = btn.dataset;
        if (!roleid) return alert("ERROR!");

        ws.send(JSON.stringify({
            code: 6,
            op: 8,
            data: {
                roleToChange: roleid,
                serverId: data.serverConfs.serverId,
                channelId: data.channelId,
                sid: localStorage.getItem('sessionid'),
                isAdding: (isinchannel != 'true')
            }
        }));
    }

    document.addEventListener('click', remfnct);

    roleContainer.innerHTML += '<h3>Users</h3>';
    data.users.forEach(user => {
        roleContainer.innerHTML += `<div data-uid="${user.uid}">${user.uname}</div>`;
    });

    document.getElementsByClassName("close-btn")[0].addEventListener("click", function () {
        document.getElementById("rolepopup").style.display = "none";
        document.removeEventListener('click', remfnct)
    });
}

function hidePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function saveChannelChanges(channelId, serverId) {
    const newChannelName = document.getElementById('editChannelInput').value;
    if (newChannelName) {
        ws.send(JSON.stringify({
            code: 6,
            op: 8,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverId: serverId,
                channelId: channelId,
                newName: newChannelName
            }
        }));
        hidePopup('editChannelPopupContainer');
    } else {
        alert("Please enter a new channel name.");
    }
}

function deleteChannel(channelId, serverId) {
    ws.send(JSON.stringify({
        code: 6,
        op: 9,
        data: {
            sid: localStorage.getItem('sessionid'),
            serverId: serverId,
            channelId: channelId,
        }
    }));
    hidePopup('editChannelPopupContainer');
}


function adjustSidebarHeight() {
    const inputBox = document.querySelector('.msginp');
    const sidebar = document.querySelector('.member-sidebar');

    if (inputBox && sidebar) {
        const inputBoxTop = inputBox.getBoundingClientRect().top;
        sidebar.style.height = `${inputBoxTop}px`;
    }
}


/**
 * @param {HTMLElement} toColl 
 */
function createCollapsable(toColl, collLeft = true) {
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapseSidebarBtn';
    collapseBtn.innerText = (collLeft) ? "<" : ">";
    const oldWidth = toColl.style.width || '200px';

    const mainElement = document.querySelector('.main');
    const inpelement = document.querySelector('.msginp');
    const oldMainMarLeft = mainElement?.style.marginLeft;
    const oldInpWidth = inpelement?.style.width;

    if (!collLeft) {
        collapseBtn.style.right = '0px';
        // collapseBtn.style.top = '75px';
    }

    collapseBtn.style.top = '20px';
    collapseBtn.style.height = 'calc(100% - 150px)';

    const posBtn = (isCollapsed) => {
        if (collLeft) collapseBtn.style.marginLeft = (!isCollapsed) ? '170px' : '0px';
        else collapseBtn.style.marginRight = (!isCollapsed) ? '180px' : '0px';
    }

    posBtn(false);

    collapseBtn.onclick = () => {
        toColl.classList.toggle("sidebar-collapsed");
        const isCollapsed = toColl.style.width == '0px';
        const newWidth = (isCollapsed) ? oldWidth : '0px';

        toColl.childNodes.forEach((c) => { if (c.style) c.style.display = (isCollapsed) ? 'block' : 'none' });
        if (collLeft) {
            document.getElementsByClassName('backBtn')[0].style.display = (isCollapsed) ? 'block' : 'none';

            // resize and move the input box and chat
            if (!isCollapsed) {
                // move the main box over
                mainElement.style.marginLeft = '0px';

                // resize the input box
                inpelement.style.width = '93%';
            }
            else {
                mainElement.style.marginLeft = oldMainMarLeft;
                inpelement.style.width = oldInpWidth;
            }
        }

        toColl.style.transition = 'width 0.3s';
        toColl.style.setProperty('width', newWidth, 'important');

        posBtn(!isCollapsed);

        collapseBtn.innerText = (isCollapsed) ? ((collLeft) ? '<' : '>') : ((collLeft) ? '>' : '<');
        collapseBtn.style.height = (isCollapsed) ? 'calc(100% - 80px)' : '100%';
    }
    document.getElementById('maincontent').appendChild(collapseBtn);
}


async function createUCard(uObj, serverConfs, isOwner) {
    // Create the main card container
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    userCard.id = uObj.uid;

    // Create the image element
    const icon = document.createElement('img');
    icon.src = uObj.icon;
    icon.alt = 'User Icon';
    icon.className = 'user-icon';
    if (!uObj.icon) icon.src = 'https://github.com/ION606/chatJS/blob/main/client/assets/nopfp.jpg?raw=true';
    else {
        const i2 = await getFriendPFP(uObj.uid);
        icon.src = i2.src;
    }
    console.log(uObj);

    userCard.onclick = async () => {
        const user = inChannel.find(m => (m.uid == userCard.id));

        const img = await getFriendPFP(user.uid);
        const uProfResponse = await getUProf(user.uid);
        if (uProfResponse == 'Not Found') return alert("User Not Found!");
        const uProf = JSON.parse(uProfResponse);
        
        createProfilePopup({
            icourl: img.src,
            editing: false,
            username: uProf.username,
            status: uProf.status,
            description: uProf.description,
            icon: true,
            me: false
        });

        if (isOwner) {
            const uEl = document.getElementsByClassName('profileoutlinediv')[0];
            if (!uEl) return;
            const addRoleBtn = document.createElement('button');
            addRoleBtn.className = 'saveBtn';
            addRoleBtn.innerText = 'Add Role';
            addRoleBtn.onclick = (e) => {
                e.preventDefault();

                e.preventDefault();
                ws.send(JSON.stringify({
                    code: 6,
                    op: 11,
                    actioncode: 3,
                    data: {
                        sid: localStorage.getItem('sessionid'),
                        serverConfs: serverConfs,
                    }
                }));
                console.log("ADDING ROLE TO", user.uid);
            }
            uEl.appendChild(addRoleBtn);
        }
    }

    // Create the user info container
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    // Create and add the username and status
    const username = document.createElement('p');
    username.className = 'username';
    username.textContent = uObj.username;

    const status = document.createElement('p');
    status.className = 'status';
    status.textContent = uObj.status;

    // Append elements to the card
    userInfo.appendChild(username);
    userInfo.appendChild(status);
    userCard.appendChild(icon);
    userCard.appendChild(userInfo);

    // Append the card to the sidebar or any other container
    document.querySelector('.member-sidebar').appendChild(userCard);
}


async function fillUSideBar(serverConfs) {
    const { serverOwner } = serverConfs;
    const isOwner = JSON.parse(localStorage.getItem('user')).uid == serverOwner;

    return new Promise((resolve) => {
        try {
            for (const uObj of inChannel) createUCard(uObj, serverConfs, isOwner);
            resolve(true);
        } catch(err) {
            console.error(err);
            resolve(false);
        }
    });
}


// a modified setupDM
function setUpChannel(response) {
    console.log("SETUPCHANNEL", response);

    if (!response.channelconfs || !response.messages) return alert("ERROR!");
    const channelConfigs = response.channelconfs.find(o => o._id == 'channelConfigs');

    // global
    inChannel = response.channelconfs.find(o => o._id == 'inChannel').users;
    const data = response.messages;

    // hide the "welcome" stuff
    document.getElementById('serverInfoContainer').style.display = 'none';

    // highlight the current one and make all others not active
    var currentlyActive = document.getElementsByClassName('activechat')[0];
    if (currentlyActive) currentlyActive.classList.remove('activechat');

    currentlyActive = document.getElementById(channelConfigs.channelId);
    currentlyActive.classList.add('activechat');

    localStorage.setItem('currentChatID', channelConfigs.channelId);
    localStorage.setItem('currentChatIsServer', true);

    // IMPLEMENT LATER
    // if (currentlyActive.classList.contains('unread')) {
    //     ws.send(JSON.stringify({
    //         code: 3,
    //         op: 3,
    //         data: {
    //             dmid: data.chatID,
    //             sid: localStorage.getItem('sessionid')
    //         }
    //     }));

    //     currentlyActive.classList.remove('unread')
    // }

    const element = document.getElementById('chatMain');
    element.innerHTML = "";

    // IMPLEMENT LATER
    // element.appendChild(createDMTopBar(data));

    const messages = document.createElement('div');
    messages.id = 'messages';

    let lastVideo;
    var counter = 0;
    for (const msg of data) {
        const msgElement = createNewMessage(msg);
        messages.appendChild(msgElement);

        if (msgElement.lastChild.lastChild && msgElement.lastChild.lastChild.tagName == 'VIDEO') {
            lastVideo = msgElement.lastChild.lastChild;

            counter++;
            if (msgElement.children.length > counter) { lastVideo = undefined; }
        }
    }

    const inpwrapper = document.createElement('div');
    inpwrapper.className = 'msgInpContainer';

    // CHECK CHANNEL PERMS HERE LATER
    if (true) {
        const inpelement = document.createElement('textarea');
        inpelement.id = 'textinp';

        var keys = {};
        function handleEnter(e) {
            let { which, type } = e || Event; // to deal with IE
            let isKeyDown = (type == 'keydown');
            keys[which] = isKeyDown;

            if (isKeyDown && keys[13]) {
                if (!keys[16]) send(channelConfigs.serverId);
            }
            else if (isKeyDown) {
                e.target.parentElement.style.borderColor = 'black';
            }
            else {
                e.target.style.height = "1px";
                e.target.style.height = (e.target.scrollHeight) + "px";
                messages.scrollTop = messages.scrollHeight - messages.clientHeight;
            }

            adjustSidebarHeight();
        }
        inpelement.onkeydown = handleEnter;
        inpelement.onkeyup = handleEnter;

        inpelement.addEventListener('paste', async (e) => {
            const cData = e.clipboardData;
            if (cData.getData('Text')) return;
            if (cData.files.length == 0) return;
            for (const file of cData.files) {
                handlePastedImage(file);
            }
        });

        inpelement.onfocus = () => {
            inpelement.style.border = "none";
        }

        const gifBtn = document.createElement('button');
        gifBtn.innerText = "GIF";
        gifBtn.onclick = (e) => {
            e.preventDefault();
            if (document.getElementsByClassName('gifpopup').length > 0) return;
            const gifpopup = createGifPopup();
            gifpopup.style.right = e.target.style.right;
            e.target.parentElement.appendChild(gifpopup);
        }
        gifBtn.className = 'msgbtnsend';
        gifBtn.style.marginRight = '5px';

        const inpbtn = document.createElement('button');
        inpbtn.onclick = (e) => {
            e.preventDefault();
            send();
        };
        inpbtn.className = 'msgbtnsend';
        inpbtn.innerText = "SEND";
        inpbtn.style.minWidth = '60px';
        inpbtn.style.marginRight = '1px';
        // const i = document.createElement('i');
        // i.className = 'fa-duotone fa-paper-plane-top';
        // inpbtn.appendChild(i);

        const upload = document.createElement('input');
        upload.style.display = 'none';
        upload.type = 'file';
        upload.id = 'fileuploadinp';
        upload.accept = 'image/*';
        upload.addEventListener('change', (e) => {
            if (e.target.files.length == 0) return;
            for (const file of e.target.files) {
                handlePastedImage(file);
            }
        });

        const uploadbtn = document.createElement('button');
        uploadbtn.className = 'fileUploadBtn';
        uploadbtn.innerText = "+";

        uploadbtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('fileuploadinp').click();
        }

        const inpdiv = document.createElement('form');
        inpdiv.className = 'msginp';
        inpdiv.appendChild(upload);
        inpdiv.appendChild(uploadbtn);
        inpdiv.appendChild(inpelement);
        inpdiv.appendChild(gifBtn);
        inpdiv.appendChild(inpbtn);
        inpwrapper.appendChild(inpdiv);
    } else {
        const inpdiv = document.createElement('form');
        inpdiv.className = 'msginp';
        inpdiv.style = 'align-content: center;justify-content: center;';

        const h1 = document.createElement('h4');
        h1.style = 'align-content: center; margin: 20px;';
        h1.innerText = 'YOU CAN\'T SEND MESSAGES HERE!';
        inpdiv.appendChild(h1);

        inpwrapper.appendChild(inpdiv);
    }

    // messages.onchange = () => {messages.lastChild.lastChild.scrollIntoView();}

    // create the "inChannel" sidebar
    const memsidebar = document.getElementsByClassName('member-sidebar')[0];
    if (!memsidebar) {
        const memberSideBar = document.createElement('div');
        memberSideBar.className = 'member-sidebar';
        const memTitle = document.createElement('div');
        memTitle.innerText = 'users';
        memTitle.className = 'memTitle';
        memberSideBar.appendChild(memTitle);
    
        document.getElementById('maincontent').appendChild(memberSideBar);
        createCollapsable(memberSideBar, false);
    }
    else {
        console.log("EXISTS");
        // clear sidebar
        memsidebar.querySelectorAll('.user-card').forEach((el) => el.remove());
    }
    
    // add the users asynchronously
    fillUSideBar(channelConfigs).then((res) => console.log((res) ? 'added all users to sidebar!' : 'failed to add all users to sidebar!'));

    if (messages && messages.lastChild) {
        if (lastVideo) {
            lastVideo.addEventListener('playing', () => {
                lastVideo.scrollIntoView();
                const lastChild = messages.lastChild.lastChild.lastChild;
                if (lastChild != lastVideo) messages.lastChild.scrollIntoView();
            });
        }
        else if (messages.lastChild.lastChild.firstChild && messages.lastChild.lastChild.firstChild.tagName == 'IMG') {
            //#FIXME DOES NOT TRIGGER
            const lastChild = messages.lastChild.lastChild.firstChild.tagName;
            lastChild.scrollIntoView();
            messages.scrollTop += lastChild.height + 1000;
        } else {
            if (messages.lastChild) messages.lastChild.lastChild.scrollIntoView();
            messages.scrollTop += 1000;
        }
    }


    // modified `createContextMenu()`
    messages.querySelectorAll('.msgauthor').forEach((el) => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            const dropdown = document.createElement('div');
            dropdown.className = "msgdropdown";

            window.addEventListener('click', (e2) => {
                if (e2.target == dropdown) return;
                dropdown.remove();
            });

            const createActionBtn = (txt, actioncode) => {
                const btn = document.createElement('a');
                btn.onclick = () => {
                    ws.send(JSON.stringify({
                        code: 6,
                        op: 10,
                        actioncode,
                        data: {
                            sid: localStorage.getItem('sessionid'),
                            target: el.id,
                            serverId: channelConfigs.serverId,
                        }
                    }));
                }
                btn.innerText = txt;
                return btn
            }

            dropdown.append(createActionBtn('kick', 0), createActionBtn('ban', 1)); 
            e.target.appendChild(dropdown);
        });
    });

    element.appendChild(messages);
    element.appendChild(inpwrapper);
    if (!memsidebar) createCollapsable(document.getElementById('channels'));
    element.style = 'display: block;';
}


window.addEventListener('DOMContentLoaded', adjustSidebarHeight);