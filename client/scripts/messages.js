function messageRecieved(response) {
    if (response.data.channelID != localStorage.getItem('currentChatID')) return;

    switch(response.op) {
        case 0: addMessage(response.data);
        break;

        case 1: deleteMsg(response.data.msgid)
        break;
    }
}


function deleteMsg(msgid) {
    const msg = document.getElementById(msgid);
    msg.remove();
}


function createContextMenu(e) {
    const target = e.target;
    const dropdown = document.createElement('div');
    dropdown.className = "msgdropdown";

    //#region COMPONENTS
    
    const copyid = document.createElement('a');
    copyid.onclick = () => {
        navigator.clipboard.writeText(target.id);
    }
    copyid.innerText = "copy message id";
    dropdown.appendChild(copyid);
    dropdown.appendChild(document.createElement('br'));

    const deletemsg = document.createElement('a');
    deletemsg.onclick = () => {
        const userRaw = localStorage.getItem('user');
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
    const p = document.createElement('p');
    p.className = 'msg';
    p.id = msg.id;
    p.addEventListener('contextmenu', (e) => {
        if (document.getElementsByClassName('msgdropdown').length != 0) {
            document.getElementsByClassName('msgdropdown')[0].remove();
        }
        
        e.preventDefault();
        createContextMenu(e);
    });
    p.innerText = `${msg.author.username}: ${msg.content}`;
    return p;
}


function addMessage(msg, author = null) {
    const element = document.getElementById('chatMain');
    const inpBox = element.lastElementChild;
    inpBox.remove();

    if (author) msg.author = author;
    element.appendChild(createNewMessage(msg));
    element.appendChild(inpBox);
}


// function removeMessage(data) {
//     ws.send(JSON.stringify(data));
// }