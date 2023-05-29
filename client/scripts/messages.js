function messageRecieved(response) {
    if (response.op != 0 && response.data.channelID != localStorage.getItem('currentChatID')) return;

    switch(response.op) {
        case 0: addMessage(response.data);
        break;

        case 1: deleteMsg(response.data.msgid)
        break;

        case 2: edit(response.data);
        break;

        default: //do nothing
    }
}


function showNotif(username, content) {
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


function edit(data) {
    const element = document.getElementById(data.msgid);
    if (!element.tagName == 'INPUT') return;

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

    //#region COMPONENTS
    var currentString;
    const isGif = (target.firstChild.tagName == 'VIDEO');
    const isImg = (target.firstChild.tagName == 'IMG');

    if (isGif) {
        currentString = String(target.firstChild.src);
    }
    else if (isImg) {
        editable = false;
    }
    else {
        currentString = String(target.innerText.substring(target.innerText.indexOf(':') + 1));
    }

    const copyid = document.createElement('a');
    copyid.onclick = () => {
        navigator.clipboard.writeText(target.id);
    }
    copyid.innerText = "copy message id";
    dropdown.appendChild(copyid);
    const userRaw = localStorage.getItem('user');

    const deletemsg = document.createElement('a');
    deletemsg.onclick = () => {
        if (!userRaw) return;

        ws.send(JSON.stringify({
            type: 0,
            code: 5,
            op: 1,
            data: {
                user: JSON.parse(userRaw),
                chatid: localStorage.getItem('currentChatID'),
                msgid: target.id
            }
        }));
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
            newinpdiv.style.height = (newinpdiv.rows * 25)+"px";
            
            const oldMsg = target;
            var keys = {};
            newinpdiv.onkeydown = (e) => {
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
        
                if(isKeyDown && keys[13] && !keys[16]) {
                    if (newinpdiv.value == oldMsg.innerText) return switchBackFromInp();
    
                    ws.send(JSON.stringify({
                        code: 5,
                        op: 2,
                        data: {
                            content: newinpdiv.value,
                            user: JSON.parse(userRaw),
                            chatid: localStorage.getItem('currentChatID'),
                            msgid: target.id
                        }
                    }));
                } else if (e.code == 'Escape') {
                    switchBackFromInp();
                }
            }
    
            newinpdiv.onkeyup = (e) => {
                let { which, type } = e || Event; // to deal with IE
                let isKeyDown = (type == 'keydown');
                keys[which] = isKeyDown;
    
                e.target.style.height = "1px";
                e.target.style.height = (e.target.scrollHeight)+"px";
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
            window.open(e.target.src,'Image','resizable=1');}
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
    else msgContentContainer.innerText = `${msg.content}`;

    container.appendChild(msgContentContainer);
    
    return container;
}


function addMessage(msg, author = null) {
    //Check if the message already exists (deals with "note-to-self")
    if (document.getElementById(msg.id)) return;
    const element = document.getElementById('messages');

    //DM is not open
    if (!document.getElementById(msg.author.uid)) {
        const dmLink = createDmLink(msg.author);
        const dmBar = document.getElementById('dms');
        dmBar.insertBefore(dmLink, dmBar.childNodes[2]);
    }

    const uid = JSON.parse(localStorage.getItem('user')).uid;
    var other_id = msg.channelID.split('|').filter((o) => (o && o != uid)).join("|");
    
    //account for "not-to-self" dm
    if (!other_id && msg.channelID.split('|').indexOf(uid) != -1) other_id = uid;
    
    const otherSplit = other_id.split("|");
    if (otherSplit[0] == otherSplit[1]) other_id = otherSplit[0];
    if (!other_id) return console.log(`ID "${msg.author.uid}" not found!`);

    //DM is not the current DM
    if (msg.channelID != localStorage.getItem('currentChatID') || !document.hasFocus()) {
        const dmToHighlight = document.getElementById(other_id);
        dmToHighlight.classList.add('unread');

        showNotif(msg.author.username, msg.content);
        return;
    }

    //mark it as read
    ws.send(JSON.stringify({
        code: 3,
        op: 3,
        data: {
            dmid: other_id,
            sid: localStorage.getItem('sessionid')
        }
    }));

    const dmToDeHighlight = document.getElementById(other_id);
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


function createDmLink(dmRaw) {
    const a = document.createElement('a');
    a.innerText = dmRaw.username;
    a.id = dmRaw.uid;
    a.onclick = (e) => {
        if (!closeDMBtn.contains(e.target)) {
            requestDM(a.id);
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
    };
    a.classList.add('unselectable');

    //Get the PFP
    var req = new XMLHttpRequest();
    req.open('GET', `${window.location.origin}/getpfp`, true);

    req.responseType = 'arraybuffer';

    req.onloadend = () => {
        const blob = new Blob([req.response]);
        const img = document.createElement('img');
        img.src = (blob.size > 0) ? URL.createObjectURL(blob) : 'https://github.com/ION606/chatJS/blob/main/client/assets/nopfp.jpg?raw=true';
        img.className = 'pfpsmall';
        img.id = `dmpfp-${dmRaw.uid}`;

        a.prepend(img);
    }
    
    req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
    req.setRequestHeader('otherid', dmRaw.uid);
    req.send();

    if (dmRaw.unread) a.classList.add('unread');

    const closeDMBtn = document.createElement('button');
    closeDMBtn.className = 'closeBtn';
    closeDMBtn.innerText = "X";
    a.appendChild(closeDMBtn);
    return a;
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
    if (fname.length === 1 || ( fname[0] === "" && fname.length === 2 ) ) {
        return alert("please provide a valid file!");
    }

    req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
    req.setRequestHeader('channelid', localStorage.getItem('currentChatID'));
    req.setRequestHeader('fext', fname.pop());
    req.setRequestHeader('username', JSON.parse(localStorage.getItem('user')).username);
    req.setRequestHeader('Content-Type', 'application/octet-stream');
    req.send(await file.arrayBuffer());
}