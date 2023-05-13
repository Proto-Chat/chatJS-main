function createPendingResponseBar(uobj) {
    const element = document.getElementById('accept');

    const toolbar = document.getElementsByClassName('toolbar')[0];

    if (toolbar.children.length <= 2) {
        const acceptRequest = document.createElement('a');
        acceptRequest.onclick = () => { switchDiv('accept'); }
        acceptRequest.innerText = 'Friend Requests';
        toolbar.appendChild(acceptRequest);
    }

    const fdiv = document.getElementById('accept');
    for (const k of fdiv.children) { if (k.id == uobj.uid) return; }

    const utoappend = document.createElement('div');
    utoappend.id = uobj.uid;
    utoappend.innerText = uobj.username;
    utoappend.className = 'ufriendRequest';

    const cancelbtn = document.createElement('a');
    cancelbtn.classList.add('cancelbtn');
    cancelbtn.innerText = 'cancel';
    cancelbtn.onclick = () => {
        ws.send(JSON.stringify({
            code: 4,
            op: 4,
            data: {
                sid: localStorage.getItem('sessionid'),
                otherUid: utoappend.id
            }
        }));
    }

    utoappend.appendChild(cancelbtn);
    element.appendChild(utoappend);
}


function initializeSocialLayout(ws, response) {
    const data = response.data;
    
    const element = document.getElementById('friends');
    for (const k of data.friends) {
        addToFriendsList(k, element);
    }

    if (data.requests.length > 0) {
        for (const k of data.requests) {
            const uobj = {uid: k.other.uid, username: k.other.username};
            if (k.isRequestor) {
                createPendingResponseBar(uobj);
            } else {
                recieveNewFriendRequest(ws, {
                    requester: uobj
                });
            }
        }
    }

    setUpUser(JSON.parse(localStorage.getItem('user')));
}


function addToFriendsList(friend, element) {
    const friendElem = document.createElement('a');
    friendElem.classList.add('friendlist');
    friendElem.classList.add('unselectable');
    const div = document.createElement('div');
    div.innerText = friend.username;
    div.id = friend.uid;
    friendElem.appendChild(div);
    element.appendChild(friendElem);
}


function getAddFriendInp(e) {
    if(e.key != 'Enter') return;
    const val = e.target.value.trim();

    if (!val.length) return;
    if (val.indexOf(" ") != -1) return alert("username can't contain spaces!");

    ws.send(JSON.stringify({code: 4, op: 1, sid: localStorage.getItem('sessionid'), otherUname: val}));
}


function getFriendRequestResponse(ws, response) {
    if (response.op == "404") return alert("USERNAME NOT FOUND!");
    
    const data = response.data;
    const user = data.users.find((u) => {
        const element = document.getElementById(u.uid);
        return (element && element.parentElement.id == 'accept');
    });

    //This is the acceptor/rejector's client
    if (user) {
        const userInvObj = document.getElementById(user.uid);

        if (response.op == 2) userInvObj.style.backgroundColor = 'green';
        else if (response.op == 3) userInvObj.style.backgroundColor = '#a50000';
        else if (response.op == 4) userInvObj.style.backgroundColor = 'darkgrey';

        setTimeout(() => {userInvObj.remove()}, 5000);
    }

    // request accepted
    if (response.op == 2) {
        const myid = JSON.parse(localStorage.getItem('user')).uid;
        var friendToAdd = (user) ? user : data.users.find((u) => u.uid != myid);
        const friendsList = document.getElementById('friends');
        addToFriendsList(friendToAdd, friendsList);
    }
    
    //Request denied
    else if (response.op == 3) {
        if (!user) alert("fren request denied ;-;");
    }
}


function recieveNewFriendRequest(ws, response) {
    const element = document.getElementsByClassName('toolbar')[0];

    if (element.children.length <= 2) {
        const acceptRequest = document.createElement('a');
        acceptRequest.onclick = () => { switchDiv('accept'); }
        acceptRequest.innerText = 'Friend Requests';
        element.appendChild(acceptRequest);
    }

    const fdiv = document.getElementById('accept');
    for (const k of fdiv.children) { if (k.id == response.requester.uid) return; }

    const utoappend = document.createElement('div');
    utoappend.id = response.requester.uid;
    utoappend.innerText = response.requester.username;
    utoappend.className = 'ufriendRequest';

    //Accept/reject buttons
    const rejectbtn = document.createElement('a');
    rejectbtn.classList.add('rejctbtn');
    rejectbtn.innerText = 'N';
    rejectbtn.onclick = () => {
        ws.send(JSON.stringify({
            code: 4,
            op: 3,
            data: {
                sid: localStorage.getItem('sessionid'),
                otherUid: utoappend.id
            }
        }));
    }
    utoappend.appendChild(rejectbtn);

    const accptbtn = document.createElement('a');
    accptbtn.classList.add('accptbtn');
    accptbtn.innerText = 'Y';
    accptbtn.onclick = () => {
        ws.send(JSON.stringify({
            code: 4,
            op: 2,
            data: {
                sid: localStorage.getItem('sessionid'),
                otherUid: utoappend.id
            }
        }));
    }
    utoappend.appendChild(accptbtn);

    fdiv.appendChild(utoappend);
}