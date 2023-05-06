function send() {
    const element = document.getElementById('textinp');
    if (!element.value) return;
    const authorID = getUidFromSid(localStorage.getItem('sessionid'));
    const username = JSON.parse(localStorage.getItem('user')).username;
    const channelID = localStorage.getItem('currentChatID');
    const msg = {author: {username: username, uid: authorID}, channelID: channelID, content: element.value, timestamp: (new Date()).toISOString()}

    ws.send(JSON.stringify({code: 5, data: msg}));
    element.value = "";
}