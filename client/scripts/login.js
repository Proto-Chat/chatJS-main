function showLogin() {
    clearInterval(loadingAnimInterval);
    const element = document.getElementById('loadingdiv');
    for (const k of element.children) { element.removeChild(k); }
    
    const uinp = document.createElement('input');
    uinp.placeholder = "username";
    uinp.style.marginLeft = '10px';

    const upass = document.createElement('input');
    upass.placeholder = "password";
    upass.style.margin = '10px';
    upass.type = 'password';

    const showPassBtn = document.createElement('input');
    showPassBtn.type = 'checkbox';
    showPassBtn.onclick = () => {
        if (upass.type === "password") {
            upass.type = "text";
          } else {
            upass.type = "password";
          }
    }
    
    const submitbtn = document.createElement('button');
    submitbtn.innerText = "login";
    submitbtn.onclick = () => {
        const username = uinp.value;
        const password = upass.value;

        if (!username || !password) return;
        ws.send(JSON.stringify({code: 0, username: username, password: password }));
    }
    submitbtn.style.marginLeft = '10px';
    
    element.appendChild(uinp);
    element.appendChild(document.createElement('br'));
    element.appendChild(upass);
    element.appendChild(showPassBtn);
    element.appendChild(document.createElement('br'));
    element.appendChild(submitbtn);
}


function logout() {
    const sid = localStorage.getItem('sessionid')
    if (!sid || sid.length == 0) {
        localStorage.removeItem('sessionid');
        window.location.reload();
        return;
    }

    ws.send(JSON.stringify({
        code: 2,
        data: {sid: sid}
    }));
}