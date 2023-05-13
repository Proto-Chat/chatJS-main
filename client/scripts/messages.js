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


function createContextMenu(e) {
    const target = e.target;
    const dropdown = document.createElement('div');
    dropdown.className = "msgdropdown";

    //#region COMPONENTS
    const currentString = String(target.innerText.substring(target.innerText.indexOf(':') + 1));
    
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

    //#endregion

    window.addEventListener('click', (e2) => {
        if (e2.target == dropdown) return;
        dropdown.remove();
    });
    
    dropdown.offsetLeft = e.offsetLeft;
    dropdown.offsetTop = e.offsetTop;
    target.appendChild(dropdown);
}


function createNewMessage(msg) {
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
    msgContentContainer.innerText = `${msg.content}`;

    const userDisplay = document.createElement('a');
    userDisplay.innerText = `${msg.author.username}`;
    userDisplay.className = 'msgauthor';

    const container = document.createElement('div');
    container.className = 'messageContainer';
    container.appendChild(userDisplay);
    container.appendChild(document.createElement('br'));
    container.appendChild(msgContentContainer);
    
    return container;
}


function addMessage(msg, author = null) {
    const element = document.getElementById('messages');
    if (author) msg.author = author;
    element.appendChild(createNewMessage(msg));
}


// function removeMessage(data) {
//     ws.send(JSON.stringify(data));
// }