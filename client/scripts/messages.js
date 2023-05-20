function messageRecieved(response) {
    if (response.data.channelID != localStorage.getItem('currentChatID')) return;

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


async function createContextMenu(e, editable = true) {
    const target = (e.target.tagName == 'VIDEO') ? e.target.parentElement : e.target;
    const dropdown = document.createElement('div');
    dropdown.className = "msgdropdown";

    //#region COMPONENTS
    var currentString;
    const isGif = (target.firstChild.tagName == 'VIDEO');

    if (!isGif) {
        currentString = String(target.innerText.substring(target.innerText.indexOf(':') + 1));
    } else {
        currentString = String(target.firstChild.src);
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
    } else msgContentContainer.innerText = `${msg.content}`;

    container.appendChild(msgContentContainer);
    
    return container;
}


function addMessage(msg, author = null) {
    //Check if the message already exists (deals with "note-to-self")
    if (document.getElementById(msg.id)) return;
    const element = document.getElementById('messages');
    if (author) msg.author = author;
    const newMsg = createNewMessage(msg);
    element.appendChild(newMsg);

    if (isValidUrl(newMsg.innerText)) {
        console.log(newMsg.lastChild.lastChild.height);
        element.scrollTop = element.scrollHeight + newMsg.lastChild.lastChild.height;
    } else {
        element.scrollTop = element.scrollHeight + newMsg.style.height;
    }
    
}