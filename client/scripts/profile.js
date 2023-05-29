const createTitle = (txt) => {
    const desctitle = document.createElement('h5');
    desctitle.style = 'margin-top: 15px;';
    desctitle.className = 'unselectable';
    desctitle.innerText = txt;
    return desctitle;
}


function createEditBtn(iid) {
    const editbtn = document.createElement('a');
    editbtn.innerText = '✎';
    editbtn.onclick = (e) => {
        const p = e.target.parentNode;
        const oldmsg = p;
        e.target.style.display = 'none';

        //Remove the edit from the icon
        const editinp = document.createElement('textarea');
        // editinp.className = '';
        editinp.value = p.innerText;
        editinp.onkeydown = (e) => {
            if (e.code == 'Escape') {
                oldmsg.children[0].style.display = 'inline';
                return editinp.replaceWith(oldmsg);
            }
            handleEnter(e, oldmsg);
        };
        editinp.onkeyup = handleEnter;
        editinp.className = 'editinp';
        editinp.id = iid;

        p.replaceWith(editinp);
    };
    
    return editbtn;
}


/**
 * @param {*} udata 
 * @param {*} titletxt 'status'
 * @param {*} btnid 'statedit'
 * @returns 
 */
function createContentWrapper(udata, titletxt, btnid, fullwrapper = true) {
    var wrapper;
    var title;

    if (fullwrapper) {
        wrapper = document.createElement('span');
        title = createTitle(titletxt);
        wrapper.appendChild(title);
    }

    const content = document.createElement('p');
    content.innerText = (titletxt.toLowerCase() == 'status') ? udata.status : udata.description;

    if (content.innerText == 'undefined') content.innerText = "";

    if (udata.editing) {
        const editbtn = createEditBtn(btnid);
        editbtn.className = 'editbtn';
        content.appendChild(editbtn);
    }

    if (!fullwrapper) return content;

    wrapper.appendChild(content);
    return wrapper;
}


async function editComponent(component) {
    var id = component.id;
    if (!id) return;
    id = id.replace('edit', '');
    if (component.value.length == 0) return;
    const newVal = component.value.trim();

    // Remember ws is a global
    const toSend = {
        code: 4,
        op: 5,
        data: {
            sid: localStorage.getItem('sessionid'),
            fieldChanged: id,
            newVal: newVal
        }
    }

    //DEAL WITH THE SERVER SIDE TMW
    ws.send(JSON.stringify(toSend));
}


var keys = {};
function handleEnter(e, oldmsg) {
    let { which, type } = e || Event; // to deal with IE
    let isKeyDown = (type == 'keydown');
    keys[which] = isKeyDown;

    if(isKeyDown && keys[13]) {
        if (!keys[16]) {
            e.preventDefault();
            editComponent(e.target);
            if (oldmsg) oldmsg.remove();
        }
    } else if(isKeyDown) {
        e.target.parentElement.style.borderColor = 'black';
    } else {
        e.target.style.height = "1px";
        e.target.style.height = (e.target.scrollHeight)+"px";
        messages.scrollTop = messages.scrollHeight - messages.clientHeight;
    }
}


const pfpCloseFnct = () => {
    const outlineDiv = document.getElementsByClassName('profileoutlinediv')[0];
    const udivCorner = document.getElementsByClassName('userprofile')[0];
    if (!outlineDiv.matches(":hover") && !udivCorner.matches(":hover")) {
        // window.location.reload();
        closeUserPopup(outlineDiv, udivCorner);
        const uClickable = document.getElementsByClassName('userprofile')[0];
        if (uClickable) {
            uClickable.style.borderRight = 'black';
            uClickable.style.width = '200px';
        }
    }
}


function closeUserPopup(outlineDiv) {
    document.body.style.backgroundColor = "#5c5c5c";
    
    const maincontent = document.getElementById('maincontent');
    const msgs = document.getElementById('messages');

    if (maincontent) maincontent.style.color = "var(--offwite)";
    if (msgs) msgs.style.color = "var(--offwite)";

    outlineDiv.remove();
    window.removeEventListener('mousedown', pfpCloseFnct);
}


async function createProfilePopup(udata) {
    if (document.getElementsByClassName('profileoutlinediv').length > 0) return;

    const udivCorner = document.getElementsByClassName('userprofile')[0];
    const outlineDiv = document.createElement('div');
    outlineDiv.className = 'profileoutlinediv';
    window.addEventListener('mousedown', pfpCloseFnct);

    //#region Title and icon
    const pfptitlediv = document.createElement('div');

    if (udata.icon != undefined) {
        const icon = document.createElement('img');
        icon.className = 'pfp';
        setPFP(undefined, icon, udata.icourl);
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'pfpcrop';
        iconWrapper.appendChild(icon);
        pfptitlediv.appendChild(iconWrapper);

        if (udata.editing) {
            const l = await createPFPChangeInp();
            iconWrapper.appendChild(l);
            iconWrapper.addEventListener('mouseenter', () => {
                iconWrapper.style.opacity = 0.6;
            });

            iconWrapper.addEventListener('mouseleave', () => {
                iconWrapper.style.opacity = 1;
            });
        }
    }


    const username = document.createElement('h1');
    username.className = 'unselectable';
    username.innerText = udata.username;
    pfptitlediv.appendChild(username);
    outlineDiv.appendChild(pfptitlediv);

    const br = document.createElement('br');
    br.style = 'clear: both;';
    outlineDiv.appendChild(br);

    //#region Status
    if (udata.status != undefined) {
        const statuswrapper = createContentWrapper(udata, 'status', 'statedit');
        outlineDiv.appendChild(statuswrapper);
    }

    //#region Description
    if (udata.description != undefined) {
        const descwrapper = createContentWrapper(udata, 'description', 'descedit');
        // descwrapper.id = 'abtmewrapper';

        outlineDiv.appendChild(descwrapper);
    }

    document.body.prepend(outlineDiv);

    //Deal with the rest
    //Apply "dark shade" filter to the body
    document.body.style.backgroundColor = "rgba(0,0,0,0.8)";

    const maincontent = document.getElementById('maincontent');
    const msgs = document.getElementById('messages');

    if (maincontent) maincontent.style.color = "rgba(0,0,0)";
    if (msgs) msgs.style.color = "rgba(0,0,0)";
    udivCorner.style.width = (udivCorner.offsetWidth - 1) + 'px'
    udivCorner.style.borderRight = "solid";
    udivCorner.style.borderWidth = "1px";
}


function initialShow(udata) {
    createProfilePopup(udata);
}


//Update the profile upon broadcast
function updateField(response) {
    const data = response.data;
    const outlineDiv = document.getElementsByClassName('profileoutlinediv')[0];
    
    if (!outlineDiv) {
        var localData;
        if (!localStorage.getItem('profileConfigs')) localData = {status: "", description: "", icon: ""};
        else localData = JSON.parse(localStorage.getItem('profileConfigs'));
        localData[data.fieldname] = data.newContent;

        localStorage.setItem('profileConfigs', JSON.stringify(localData));
    }
    else {
        if (data.fieldname == 'icon') return;

        var params = {title: "", description: "", status: "", btnid: ""};
        if (data.fieldname == 'desc') {
            params.title = 'description';
            params.description = data.newContent;
            params.btnid = 'descedit';
        }
        else {
            params.title = 'status';
            params.status = data.newContent;
            params.btnid = 'statedit';
        }

        const inpEl = document.getElementById(params.btnid);
        inpEl.replaceWith(createContentWrapper(params, params.title, params.btnid, false))
    }
}



/**
 *  send an http request with the sessionid, file and filename.
 *  This can ONLY be used to set the user icon, something
 *  else should be done for chat, maybe send the message with a
 *  flag over ws, then post the image using a http request?
 */
async function createPFPChangeInp() {
    const imgUploadInp = document.createElement('input');
    imgUploadInp.type = 'file';
    imgUploadInp.accept = 'image/*';

    imgUploadInp.onchange = (e) => {
        let file = e.target.files[0];

        if (!file) return;

        if (file.size > 10000000) {
            return alert('File should be smaller than 10MB')
        }

        const reader = new FileReader();

        reader.onload = () => {
            const data = reader.result;

            const image = new Image();
            image.onload = (e) => {
                var req = new XMLHttpRequest();
                req.open('POST', `${window.location.origin}/updatepfp`, true); //CHANGE THIS LATER
                
                req.onloadend = () => {
                    URL.revokeObjectURL(file);
                    const pfp = document.getElementsByClassName('pfp')[0];
                    pfp.src = image.src;
                    if (image.width <= 1.2 * image.height) pfp.style.marginLeft = "0px";
                    // URL.revokeObjectURL(file);
                }
                
                req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
                req.setRequestHeader('code', 4);
                req.setRequestHeader('op', 0);
                req.setRequestHeader('filename', file.name);
                req.setRequestHeader('Content-Type', 'application/octet-stream');
                req.send(new Blob([data]));
            };

            image.onerror = () => {
                alert('Invalid image');
            };

            image.src = URL.createObjectURL(file);
            
        };

        reader.readAsArrayBuffer(file);
    };

    imgUploadInp.id = 'newpfp';
    const l = document.createElement('label');
    l.for = 'pfpupload';
    l.className = 'pfpupload'
    l.innerText = '✎';
    l.appendChild(imgUploadInp);
    return l;
}

//#region PFP

function setPFP(message = undefined, iconElement = undefined, iconURL = undefined) {
    if (message) {
        const element = document.getElementsByClassName('pfp')[0];

        window.sessionStorage.setItem('pfp', message);
        if (element) {
            element.src = uri;
            if (element.width <= 1.2 * element.height) element.style.marginLeft = "0px";
            else element.style.marginLeft = '-25px';
        }
    }
    else {
        if (!iconElement) {
            iconElement.src = 'https://github.com/ION606/chatJS/blob/main/client/assets/nopfp.jpg?raw=true';
        } else {
            const uri = (iconURL) ? iconURL : window.sessionStorage.getItem('pfp');
            iconElement.src = uri;
        }
    }
}


async function getPFP() {
    var req = new XMLHttpRequest();
    req.open('GET', `${window.location.origin}/getpfp`, true);

    req.responseType = 'arraybuffer';

    req.onloadend = () => {
        const blob = new Blob([req.response]);
        const url = URL.createObjectURL(blob);
        setPFP(url);
    }
    
    req.setRequestHeader('sessionid', localStorage.getItem('sessionid'));
    req.send();
}

//#endregion