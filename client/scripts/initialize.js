function initializeLayout(response) {
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
        a.classList.add('unselectable');
        element.appendChild(a);
    }

    // localStorage.setItem('desc', data.configs.desc)
    const profileConfigs = data.configs.find((c) => c._id == 'myprofile');

    if (profileConfigs) {
        delete profileConfigs._id;
        localStorage.setItem('profileConfigs', JSON.stringify(profileConfigs));
    }
    
    document.getElementById('loadingdiv').style.display = 'none';
    document.getElementById('maincontent').style.display = 'block';
    setUpUser(response.data.user);
}


function setUpUser(user) {
    const element = document.getElementsByClassName('userprofile')[0];
    const uname = document.createElement('h1');
    uname.innerText = user.username;
    element.appendChild(uname);

    const settingsTrigger = document.createElement('p');
    settingsTrigger.innerText = '⚙';
    settingsTrigger.className = 'settingsTrigger';

    const profileConfigs = {
        username: "",
        status: "",
        desc: "",
        icon: "",
        editing: false
    }

    profileConfigs.username = JSON.parse(localStorage.getItem('user')).username;
    const localConfigs = JSON.parse(localStorage.getItem('profileConfigs'));
    
    profileConfigs.description = localConfigs?.description || "";
    profileConfigs.status = localConfigs?.status || "";
    profileConfigs.icon = localConfigs?.icon || "";

    element.onclick = () => {
        if (!settingsTrigger.matches(":hover")) {
            // initialShow(user);
            initialShow(profileConfigs);
        } else {
            profileConfigs.editing = true;
            initialShow(profileConfigs);
        }
    }

    const optbar = document.createElement('div');
    optbar.style.paddingLeft = '10px';
    optbar.appendChild(settingsTrigger);

    element.appendChild(optbar);
}


function setupDM(response) {
    const data = response.data;

    // highlight the current one and make all others not active
    var currentlyActive = document.getElementsByClassName('activechat')[0];
    if (currentlyActive) currentlyActive.classList.remove('activechat');
    
    currentlyActive = document.getElementById(data.other);
    currentlyActive.classList.add('activechat');
    
    localStorage.setItem('currentChatID', data.chatID);

    const element = document.getElementById('chatMain');
    element.innerHTML = "";

    const messages = document.createElement('div');
    messages.id = 'messages';
    for (const msg of data.messages) {
        messages.appendChild(createNewMessage(msg));
    }

    messages.scrollTop = messages.scrollHeight - messages.clientHeight;
    const inpelement = document.createElement('textarea');
    inpelement.id = 'textinp';

    var keys = {};
    function handleEnter(e) {
        let { which, type } = e || Event; // to deal with IE
        let isKeyDown = (type == 'keydown');
        keys[which] = isKeyDown;

        if(isKeyDown && keys[13]) {
            if (!keys[16]) {
                send();
            }
        } else if(isKeyDown) {
            e.target.parentElement.style.borderColor = 'black';
        } else {
            e.target.style.height = "1px";
            e.target.style.height = (e.target.scrollHeight)+"px";
            messages.scrollTop = messages.scrollHeight - messages.clientHeight;
        }
    }
    inpelement.onkeydown = handleEnter;
    inpelement.onkeyup = handleEnter;

    
    inpelement.onfocus = () => {
        inpelement.style.border = "none";
    }

    const inpbtn = document.createElement('button');
    inpbtn.onclick = (e) => {
        e.preventDefault();
        send();
    };
    inpbtn.className = 'msgbtnsend';
    inpbtn.innerText = "S E N D";
    // const i = document.createElement('i');
    // i.className = 'fa-duotone fa-paper-plane-top';
    // inpbtn.appendChild(i);
    
    const inpwrapper = document.createElement('div');
    const inpdiv = document.createElement('form');
    inpdiv.className = 'msginp';
    inpdiv.appendChild(inpelement);
    inpdiv.appendChild(inpbtn);
    inpwrapper.appendChild(inpdiv);
    
    element.appendChild(messages);
    element.appendChild(inpwrapper);
    element.style = 'display: block;';
}