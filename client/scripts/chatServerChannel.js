//#region New Channel
function createNewChannelPopup(serverId) {
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
    popup.appendChild(header);

    // Add input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'newChannelInput';
    input.placeholder = 'Channel Name';
    popup.appendChild(input);

    // Add Add button
    const addButton = document.createElement('button');
    addButton.id = 'newChannelAddBtn';
    addButton.textContent = 'Add Channel';
    addButton.addEventListener('click', () => {addNewChannel(serverId)});
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

function addNewChannel(serverId) {
    const channelName = document.getElementById('newChannelInput').value;
    if (channelName) {
        ws.send(JSON.stringify({
            code: 6,
            op: 2,
            data: {
                sid: localStorage.getItem('sessionid'),
                serverId: serverId,
                channelName: channelName
            }
        }));

        hideNewChannelPopup();
    } else {
        alert("Please enter a channel name.");
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

function hidePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function saveChannelChanges(channelId, serverId) {
    const newChannelName = document.getElementById('editChannelInput').value;
    if (newChannelName) {
        ws.send(JSON.stringify({
            code: 6,
            op: 6,
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
        op: 7,
        data: {
            sid: localStorage.getItem('sessionid'),
            serverId: serverId,
            channelId: channelId,
        }
    }));
    hidePopup('editChannelPopupContainer');
}


// a modified setupDM
function setUpChannel(response) {
    console.log(response);

    if (!response.channelconfs || !response.messages) return alert("ERROR!");
    const channelConfigs = response.channelconfs.find(o => o._id == 'channelConfigs');
    const inChannel = response.channelconfs.find(o => o._id == 'inChannel');
    const data = response.messages;

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
                if (!keys[16]) {
                    send(channelConfigs.serverId);
                }
            }
            else if (isKeyDown) {
                e.target.parentElement.style.borderColor = 'black';
            }
            else {
                e.target.style.height = "1px";
                e.target.style.height = (e.target.scrollHeight) + "px";
                messages.scrollTop = messages.scrollHeight - messages.clientHeight;
            }
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


    element.appendChild(messages);
    element.appendChild(inpwrapper);
    element.style = 'display: block;';
}