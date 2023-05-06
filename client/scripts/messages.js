function createNewMessage(msg) {
    const p = document.createElement('p');
    p.style = 'color: red; margin: 10px;';
    p.innerText = `${msg.author.username}: ${msg.content}`;
    return p;
}


function addMessage(msg, author = null) {
    if (msg.channelID != localStorage.getItem('currentChatID')) return;
    const element = document.getElementById('chatMain');
    const inpBox = element.lastElementChild;
    inpBox.remove();

    if (author) msg.author = author;
    element.appendChild(createNewMessage(msg));
    element.appendChild(inpBox);
}