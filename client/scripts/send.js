async function send(serverId = undefined) {
    const element = document.getElementById('textinp');
    const content = element.value.trim();
    if (!content) {
        element.parentElement.style.borderColor = 'red';
        element.parentElement.style.borderStyle = 'solid';
        element.value = "";
        return;
    }
    const authorID = getUidFromSid(localStorage.getItem('sessionid'));

    if (!localStorage.getItem('user')) {
        alert("A user error has occured, please try again!");
        window.location.href = '/';
    }

    const username = JSON.parse(localStorage.getItem('user')).username;
    const channelId = localStorage.getItem('currentChatID');

    // encrypt the data
    const encContent = (serverId) ? content : await encryptMsg(await getSymmKey(), content);

    var msg = {author: {username: username, uid: authorID}, id: crypto.randomUUID(), channelId: channelId, content: encContent, timestamp: (new Date()).toISOString()};

    if (serverId) {
        msg['serverId'] = serverId;
        ws.send(JSON.stringify({code: 6, op: 5, data: msg}));
    } else ws.send(JSON.stringify({code: 5, op: 0, data: msg}));

    element.value = "";
    element.innerText = "";
}


function sendGif(element) {
    const authorID = getUidFromSid(localStorage.getItem('sessionid'));
    const username = JSON.parse(localStorage.getItem('user')).username;
    const channelId = localStorage.getItem('currentChatID');
    const msg = {
        author: {username: username, uid: authorID},
        id: crypto.randomUUID(),
        channelId: channelId,
        content: {
            url: element.src, // the PREVIEW url
            id: element.id
        },
        timestamp: (new Date()).toISOString()
    }

    ws.send(JSON.stringify({code: 5, op: 0, data: msg}));
}