function sendDmCreateRequest(e) {
    e.preventDefault();
    const selectionDiv = document.getElementById('groupdDMSelectionDiv');
    const toAdd = [];

    for (const child of selectionDiv.children) {
        if (child.tagName == 'BR') continue;
        const checkBox = child.firstChild;
        if (checkBox && checkBox.checked) {
            const uid = checkBox.id.split('|')[1];
            if (!uid) continue;
            toAdd.push(uid);
        }
    }

    if (toAdd.length < 2) return alert("please select at least two users!");
    if (toAdd.length > 9) return alert("please select at most ten users!");

    ws.send(JSON.stringify({
        code: 4,
        op: 8,
        data: {
            sid: localStorage.getItem('sessionid'),
            uids: toAdd
        }
    }));
}


function displayFriendsList(response) {
    const br = (el) => el.appendChild(document.createElement('br'));
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'profileoutlinediv';
    br(wrapperDiv);

    const title = document.createElement('h1');
    title.innerText = "Please select users";
    title.style.textAlign = 'center';
    const titleWrapper = document.createElement('div');
    titleWrapper.style.marginLeft = '25%';
    titleWrapper.appendChild(title);

    wrapperDiv.appendChild(titleWrapper);
    window.addEventListener('mousedown', pfpCloseFnct);

    const user = response.data.user;

    const selectionDiv = document.createElement('div');
    selectionDiv.id = 'groupdDMSelectionDiv';
    selectionDiv.style.marginTop = '80px';
    const friends = response.data.friends;
    friends.sort((f1, f2) => (f1.username.toLowerCase() > f2.username.toLowerCase()));

    for (const friend of friends) {
        if (friend.uid == user.uid) continue;

        const uWrapper = document.createElement('span');
        uWrapper.className = 'uSelectWrapper';
        
        const uCheckBox = document.createElement('input');
        const id = `groupdmuser|${friend.uid}`;
        uCheckBox.id = id;
        uCheckBox.type = 'checkbox';

        const uLabel = document.createElement('label');
        uLabel.for = id;
        uLabel.innerText = friend.username;

        uWrapper.appendChild(uCheckBox);
        uWrapper.appendChild(uLabel);
        
        selectionDiv.appendChild(uWrapper);
        br(selectionDiv);
    }
    wrapperDiv.appendChild(selectionDiv);

    const btnwrapperdiv = document.createElement('div');
    const submitBtn = document.createElement('button');
    submitBtn.className = 'groupDMSubmitBtn';
    submitBtn.innerText = 'Create Group DM';
    btnwrapperdiv.appendChild(submitBtn);


    submitBtn.onclick = sendDmCreateRequest;

    wrapperDiv.appendChild(btnwrapperdiv);

    document.body.prepend(wrapperDiv);
}


function setupGroupDM(response) {
    const data = response.data;
    const user = JSON.parse(localStorage.getItem('user'));
    const others = data.configs.uids.filter((o) => (o != user.id));

    response.data.other = {
        description: "",
        icon: data.configs.icon,
        status: "",
        uid: others.join("|"),
        username: data.configs.displayname,
        othernames: data.unames
    }
    response.data.chatID = data.configs.dmId;

    setupDM(response);
}