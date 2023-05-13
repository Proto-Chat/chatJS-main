function send() {
    const element = document.getElementById('textinp');
    const content = element.value.trim();
    if (!content) {
        element.parentElement.style.borderColor = 'red';
        element.parentElement.style.borderStyle = 'solid';
        element.value = "";
        return;
    }
    const authorID = getUidFromSid(localStorage.getItem('sessionid'));
    const username = JSON.parse(localStorage.getItem('user')).username;
    const channelID = localStorage.getItem('currentChatID');
    const msg = {author: {username: username, uid: authorID}, id: crypto.randomUUID(), channelID: channelID, content: content, timestamp: (new Date()).toISOString()}

    ws.send(JSON.stringify({code: 5, op: 0, data: msg}));
    element.value = "";
}