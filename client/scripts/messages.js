function messageRecieved(response) {
    // transform for server
    if (response.code == 6) return console.error("SERVER MESSAGES SHOULD NOT GO THROUGH HERE!");

    if (response.op != 0 && response.data.channelId != localStorage.getItem('currentChatID')) return;

    switch (response.op) {
        case 0: addMessage(response.data);
            break;

        case 1: deleteMsg(response.data.id)
            break;

        case 2: edit(response.data);
            break;

        default: //do nothing
    }
}


function showNotif(username, content, reason = "msg") {
    if ('Notification' in window) {
        // Request permission to show notifications
        Notification.requestPermission().then(function (permission) {
            if (permission === 'granted') {
                var notifContent = content;
                if (!notifContent) return;
                if (notifContent.length > 20) {
                    notifContent = notifContent.substring(0, 20) + '. . .';
                }

                // Create a new notification
                var notification = new Notification(username, {
                    body: notifContent,
                });

                playNotification(reason);

                notification.onclick = (e) => {
                    if (window.location.pathname != '/') window.location.href = '/';
                }
            }
        });
    }
}


function deleteMsg(msgid) {
    const msg = document.getElementById(msgid);
    msg.parentElement.remove();
}


async function edit(data) {
    const element = document.getElementById(data.id);
    if (!element || element.tagName != 'TEXTAREA') return;

    // encryption
    // const symmKeyEnc = await getSymmKey();

    const msgContent = data.content; //(data.serverId) ? data.content : await decryptMsg(symmKeyEnc, data.content);
    data.content = msgContent;
    if (!data.author && data.user) data.author = data.user;

    const newMessageContainer = createNewMessage(data);
    const newMessage = newMessageContainer.children.item(2);
    element.replaceWith(newMessage);
}


function createDMTopBar(data) {
    const bar = document.createElement('div');
    bar.classList.add('dmBar');
    bar.classList.add('unselectable');

    const pfp = document.createElement('img');
    pfp.src = document.getElementById(`dmpfp-${data.other.uid}`).src;
    pfp.className = 'dmbarpfp';
    bar.appendChild(pfp);

    const unamep = document.createElement('p');
    unamep.className = 'dmbaruname';
    unamep.innerText = data.other.username;
    bar.appendChild(unamep);

    const ustatus = document.createElement('p');
    ustatus.className = 'dmbarstat';
    ustatus.innerText = data.other.status;
    bar.appendChild(ustatus);

    bar.onclick = (e) => {
        createProfilePopup({
            icourl: pfp.src,
            editing: false,
            username: data.other.username,
            status: data.other.status,
            description: data.other.description,
            icon: true,
            me: false,
            isGroupDM: data.isGroupDM,
            isOwner: (data.configs) ? JSON.parse(localStorage.getItem('user')).uid == data.configs.owner : undefined,
            gdmuids: (data.configs) ? data.configs.users : undefined
        });
    }

    return bar;
}


async function createContextMenu(e, editable = true) {
    var target;
    if (e.target.tagName == 'VIDEO' || e.target.tagName == 'IMG') { target = e.target.parentElement }
    else target = e.target;
    const dropdown = document.createElement('div');
    dropdown.className = "msgdropdown";

    const serverId = target.dataset.serverId;

    //#region COMPONENTS
    var currentString;
    const isGif = (target.firstChild.tagName == 'VIDEO');
    const isImg = (target.firstChild.tagName == 'IMG');

    if (isGif) {
        currentString = String(target.firstChild.src);
    }
    else if (isImg) { editable = false; }
    else {
        currentString = String(target.innerText.substring(target.innerText.indexOf(':') + 1));
    }

    const copyid = document.createElement('a');
    copyid.onclick = () => {
        if (serverId) navigator.clipboard.writeText(`${serverId}/${target.id}`);
        else navigator.clipboard.writeText(target.id);
    }
    copyid.innerText = "copy message id";
    dropdown.appendChild(copyid);
    const userRaw = localStorage.getItem('user');

    const deletemsg = document.createElement('a');
    deletemsg.onclick = () => {
        if (!userRaw) return;

        if (serverId) {
            ws.send(JSON.stringify({
                type: 0,
                code: 6,
                op: 7,
                data: {
                    user: JSON.parse(userRaw),
                    id: target.id,
                    channelId: localStorage.getItem('currentChatID'),
                    serverId: serverId,
                    sid: localStorage.getItem('sessionid')
                }
            }));
        }
        else {
            ws.send(JSON.stringify({
                type: 0,
                code: 5,
                op: 1,
                data: {
                    user: JSON.parse(userRaw),
                    chatid: localStorage.getItem('currentChatID'),
                    id: target.id,
                    sid: localStorage.getItem('sessionid')
                }
            }));
        }
    }
    deletemsg.innerText = "delete message";
    dropdown.appendChild(deletemsg);

    if (editable) {
        const editmsg = document.createElement('a');
        editmsg.innerText = "edit message";
        editmsg.onclick = () => {
            const newinpdiv = document.createElement('textarea');
            newinpdiv.className = 'editingdiv';
            newinpdiv.value = currentString;

            //Set initial height
            newinpdiv.style.height = (newinpdiv.rows * 25) + "px";

            const oldMsg = target;
            var keys = {};
            newinpdiv.onkeydown = async (e) => {
                const switchBackFromInp = () => {
                    if (newinpdiv.nextSibling.nodeName == "BR") newinpdiv.nextSibling.remove();

                    //Video autoplay stuff
                    if (oldMsg.firstChild.tagName == 'VIDEO') {
                        oldMsg.firstChild.play();
                    }
                    newinpdiv.replaceWith(oldMsg);
                }

                let { which, type } = e || Event; // to deal with IE
                let isKeyDown = (type == 'keydown');
                keys[which] = isKeyDown;

                if (isKeyDown && keys[13] && !keys[16]) {
                    if (newinpdiv.value == oldMsg.innerText) return switchBackFromInp();

                    // const symmEncKey = await getSymmKey();
                    // if (!symmEncKey) return alert("ENCRYPTION ERROR!");

                    if (serverId) {
                        ws.send(JSON.stringify({
                            type: 0,
                            code: 6,
                            op: 6,
                            data: {
                                user: JSON.parse(userRaw),
                                id: target.id,
                                channelId: localStorage.getItem('currentChatID'),
                                serverId: serverId,
                                content: newinpdiv.value,  // UNENCRYPTED FOR NOW
                                sid: localStorage.getItem('sessionid')
                            }
                        }));
                    }
                    else {
                        ws.send(JSON.stringify({
                            code: 5,
                            op: 2,
                            data: {
                                content: newinpdiv.value, //await encryptMsg(symmEncKey, newinpdiv.value),
                                user: JSON.parse(userRaw),
                                chatid: localStorage.getItem('currentChatID'),
                                id: target.id,
                                sid: localStorage.getItem('sessionid')
                            }
                        }));
                    }
                } else if (e.code == 'Escape') {
                    switchBackFromInp();
                }
            }

            newinpdiv.onkeyup = (e) => {
                let { which, type } = e || Event; // to deal with IE
                let isKeyDown = (type == 'keydown');
                keys[which] = isKeyDown;

                e.target.style.height = "1px";
                e.target.style.height = (e.target.scrollHeight) + "px";
            }

            newinpdiv.id = String(target.id);
            target.replaceWith(newinpdiv, document.createElement('br'));
        }
        dropdown.appendChild(editmsg);
    }

    if (isGif) {
        dropdown.classList.add('msgdropdowngif');
        const copyGiflink = document.createElement('a');
        copyGiflink.innerText = "copy GiF link";
        copyGiflink.onclick = async () => {
            const url = await getGif(null, target.firstChild.id, false);
            navigator.clipboard.writeText(url.url);
        }
        dropdown.appendChild(copyGiflink);
    }
    else if (isImg) {
        dropdown.classList.add('msgdropdowngif');
        const openImgLink = document.createElement('a');
        openImgLink.innerText = "open image";
        openImgLink.onclick = () => {
            window.open(e.target.src, 'Image', 'resizable=1');
        }
        dropdown.appendChild(openImgLink);
    }

    //#endregion

    window.addEventListener('click', (e2) => {
        if (e2.target == dropdown) return;
        dropdown.remove();
    });

    dropdown.offsetLeft = e.offsetLeft;
    dropdown.offsetTop = e.offsetTop;

    target.appendChild(dropdown);
}


function isValidUrl(str) {
    let url;
    try {
        url = new URL(str);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}


function createNewMessage(msg) {
    const container = document.createElement('div');
    const msgContentContainer = document.createElement('span');
    msgContentContainer.className = 'msg';
    msgContentContainer.id = msg.id;
    if (msg.serverId) msgContentContainer.dataset.serverId = msg.serverId;

    msgContentContainer.addEventListener('contextmenu', (e) => {
        if (document.getElementsByClassName('msgdropdown').length != 0) {
            document.getElementsByClassName('msgdropdown')[0].remove();
        }

        e.preventDefault();
        createContextMenu(e);
    });


    const userDisplay = document.createElement('a');
    userDisplay.innerText = `${msg.author.username}`;
    userDisplay.className = 'msgauthor';
    userDisplay.id = msg.author.uid;
    userDisplay.onclick = async (e) => {
        const uconfigs = JSON.parse(localStorage.getItem('user'));

        if (msg.serverId) {
            if (inChannel) {
                const user = inChannel.find(m => (m.uid == e.target.id));
                const img = await getFriendPFP(user.uid);
                const uProfResponse = await getUProf(user.uid);
                if (uProfResponse == 'Not Found') return alert("User Not Found!");
                const uProf = JSON.parse(uProfResponse);
                console.log(uProf);

                createProfilePopup({
                    icourl: img.src,
                    editing: false,
                    username: uProf.username,
                    status: uProf.status,
                    description: uProf.description,
                    icon: true,
                    me: false
                });
            }
            return;
        }

        if (e.target.id == uconfigs.uid) {
            const uelement = document.getElementsByClassName('userprofile')[0];
            if (!uelement) return;

            uelement.click();
            return;
        }

        const target = document.getElementById('chatMain');
        if (!target) return;

        const dmBar = target.children.item(0);
        if (!dmBar) return;
        dmBar.click();
    }

    container.className = 'messageContainer';
    container.appendChild(userDisplay);
    container.appendChild(document.createElement('br'));

    if (msg.content.url && isValidUrl(msg.content.url) && msg.content.url.indexOf('media.tenor.com') != -1) {
        msgContentContainer.appendChild(createGIF(msg.content));
        msgContentContainer.style.height = '200px';
    }
    else if (msg.content.filename) {
        //Get file
        var req = new XMLHttpRequest();
        req.open('GET', `${window.location.origin}/msgImg?fname=${msg.content.filename}`, true);
        req.responseType = 'arraybuffer';

        req.onloadend = () => {
            const fileBuf = req.response;
            if (!fileBuf) return;

            msgContentContainer.appendChild(createImage(fileBuf));
            msgContentContainer.style.height = '200px';
        }

        req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
        req.setRequestHeader('channelid', localStorage.getItem('currentChatID'));
        req.setRequestHeader('username', JSON.parse(localStorage.getItem('user')).username);
        req.send();
    }
    else if (isValidUrl(msg.content)) {
        msgContentContainer.innerHTML = `<a href=${msg.content} target="_blank" class="msgcontentlink">${msg.content}</a>`;
    }
    else msgContentContainer.innerText = `${msg.content}`;

    container.appendChild(msgContentContainer);

    return container;
}


async function addMessage(msg, author = null) {
    //Check if the message already exists (deals with "note-to-self")
    if (document.getElementById(msg.id)) return;
    const element = document.getElementById('messages');

    // encryption
    /* if (!msg.content['filename'] && !msg.serverId) {
        const symmKeyEnc = await getSymmKey();

        const msgContent = await decryptMsg(symmKeyEnc, msg.content);
        msg.content = msgContent;
    }
    */

    //DM is not open
    if (!document.getElementById(msg.author.uid)) {
        const dmLink = await createDmLink(msg.author);
        const dmBar = document.getElementById('dms');
        if (dmBar) dmBar.insertBefore(dmLink, dmBar.childNodes[2]);
    }

    const uid = JSON.parse(localStorage.getItem('user')).uid;
    const otherid = localStorage.getItem('currentChatID');

    // if (!otherid) return console.log(`ID "${msg.author.uid}" not found!`);
    

    //DM is not the current DM
    //  || !document.hasFocus()
    if (msg.channelId != localStorage.getItem('currentChatID')) {
        const dmToHighlight = document.getElementById(otherid);
        dmToHighlight?.classList?.add('unread');

        showNotif(msg.author.username, msg.content);
        return;
    }

    //mark it as read
    ws.send(JSON.stringify({
        code: 3,
        op: 3,
        data: {
            dmid: otherid,
            sid: localStorage.getItem('sessionid')
        }
    }));

    const dmToDeHighlight = document.getElementById(otherid);
    if (dmToDeHighlight) dmToDeHighlight.classList.remove('unread');

    //If the user is not on top, say smth

    //FIXME it snaps down anyways, maybe make it so that it only does that for the person sending the message

    // console.log(element.scrollHeight - element.scrollTop);
    // if (element.scrollHeight - element.scrollTop) console.log('new message recieved in this DM!');


    if (author) msg.author = author;
    const newMsg = createNewMessage(msg);
    element.appendChild(newMsg);

    if (isValidUrl(newMsg.innerText)) {
        element.scrollTop = element.scrollHeight + newMsg.lastChild.lastChild.height;
    } else {
        element.scrollTop = element.scrollHeight + newMsg.style.height;
    }

}


function closeDM(response) {
    try {
        const dmEl = document.getElementById(response.data.other_id);
        dmEl.remove();
    } catch (err) {
        console.log(err);
        // window.location.reload();
    }
}


function openDM(id) {
    try {
        const toSend = {
            code: 3,
            op: 2,
            data: {
                sid: localStorage.getItem('sessionid'),
                other_id: id
            }
        }

        ws.send(JSON.stringify(toSend));
    } catch (err) {
        console.log(err);
        // window.location.reload();
    }
}


async function createDmLink(dmRaw, isServer = false) {
    const a = document.createElement('a');
    a.innerText = (!isServer) ? dmRaw.username : dmRaw.name;
    a.id = (!isServer) ? dmRaw.uid : dmRaw.serverId.replace('S|', '');
    a.onclick = (e) => {
        if (!closeDMBtn.contains(e.target)) {
            if (!isServer) requestDM(a.id);
            else {
                // don't show the reconnecting bar
                document.getElementById('reconnectingbar')?.remove();
                window.location.pathname = `/server/${a.id}`;

                // var req = new XMLHttpRequest();
                // req.open('GET', `${window.location.origin}/server/${a.id}`, true);

                // req.responseType = 'document';
                // req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
                // req.send();
            }
        }
        else {
            if (isServer) {
                const conf = confirm(`Are you sure you'd like to leave "${dmRaw.name}"?`);
                if (!conf) return;

                // TODO: implement this
                console.log(`leaving server: "${dmRaw.name}" (ID: "${a.id}")`);
            }
            else {
                const closeDMWSObj = {
                    code: 3,
                    op: 1,
                    data: {
                        other_id: e.target.parentElement.id,
                        sid: localStorage.getItem('sessionid')
                    }
                };
    
                ws.send(JSON.stringify(closeDMWSObj));
            }
        }   
    };
    a.classList.add('unselectable');

    //Get the PFP
    a.prepend(await getFriendPFP(dmRaw.uid));

    if (dmRaw.unread) a.classList.add('unread');

    const closeDMBtn = document.createElement('button');
    closeDMBtn.className = 'closeBtn';
    closeDMBtn.innerText = "X";
    a.appendChild(closeDMBtn);
    return a;
}


function getUProf(uid) {
    return new Promise((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open('GET', `${window.location.origin}/getUser`, true);

        req.onloadend = () => {
            resolve(req.response);
        };

        req.setRequestHeader('uid', uid);
        req.setRequestHeader('otherid', uid);
        req.send();
    });
}


function getFriendPFP(uid) {
    return new Promise((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open('GET', `${window.location.origin}/getpfp`, true);

        req.responseType = 'arraybuffer';

        req.onloadend = () => {
            const blob = new Blob([req.response]);
            const img = document.createElement('img');
            img.src = (blob.size > 0) ? URL.createObjectURL(blob) : 'https://github.com/ION606/chatJS/blob/main/client/assets/nopfp.jpg?raw=true';
            img.className = 'pfpsmall';
            img.id = `dmpfp-${uid}`;

            resolve(img);
        };

        req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
        req.setRequestHeader('otherid', uid);
        req.send();
    });
}

/**
 * @param {File} file 
 */
async function handlePastedImage(file) {
    var req = new XMLHttpRequest();
    req.open('PUT', `${window.location.origin}/msgImg`, true); //CHANGE THIS LATER
    // req.responseType = 'arraybuffer';
    req.responseType = 'text';

    req.onloadend = () => {
        if (req.response != "OK") alert("request failed!");
    }

    var fname = file.name.split(".");
    if (fname.length === 1 || (fname[0] === "" && fname.length === 2)) {
        return alert("please provide a valid file!");
    }

    req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
    req.setRequestHeader('channelid', localStorage.getItem('currentChatID'));
    req.setRequestHeader('fext', fname.pop());
    req.setRequestHeader('username', JSON.parse(localStorage.getItem('user')).username);
    req.setRequestHeader('Content-Type', 'application/octet-stream');
    req.send(await file.arrayBuffer());
}