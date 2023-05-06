function initializeLayout(ws, response) {
    clearInterval(loadingAnimInterval);
    const data = response.data;
    const element = document.getElementById('dms');
    for (const k of element.childNodes) { k.remove(); }

    localStorage.setItem("user", JSON.stringify(data.user));

    for (const i of data.dms) {
        const a = document.createElement('a');
        a.innerText = i.username;
        a.id = i.uid;
        a.onclick = () => {
            requestDM(a.id);
        }
        element.appendChild(a);
    }

    document.getElementById('loadingdiv').style.display = 'none';
    document.getElementById('maincontent').style.display = 'block';
}


function setupDM(response) {
    const data = response.data;
    //Set who the other user is
    const other = data.other;
    localStorage.setItem('currentChatID', data.chatID);

    const element = document.getElementById('chatMain');
    element.innerHTML = "";


    for (const msg of data.messages) {
        element.appendChild(createNewMessage(msg));
    }

    const inpelement = document.createElement('input');
    inpelement.innerHTML = '<input id="textinp"><button onclick="send()">S E N D</button>';
    inpelement.id = 'textinp';
    inpelement.className = "msginp";

    const inpbtn = document.createElement('button');
    inpbtn.onclick = send;
    inpbtn.innerText = "S E N D";

    const inpdiv = document.createElement('span');
    inpdiv.appendChild(inpelement);
    inpdiv.appendChild(inpbtn);
    element.appendChild(inpdiv);
    element.style = 'display: block;';
}