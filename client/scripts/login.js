function showLogin() {
    clearInterval(loadingAnimInterval);
    const loadingdiv = document.getElementById('loadingdiv');
    for (const k of loadingdiv.children) { loadingdiv.removeChild(k); }
    loadingdiv.style.display = 'none';
    
    const element = document.getElementById('loginDiv');
    element.style.textAlign = 'center';

    const uinp = document.createElement('input');
    uinp.placeholder = "username";
    uinp.className = 'uinp';

    const upass = document.createElement('input');
    upass.placeholder = "password";
    upass.style.margin = '10px';
    upass.type = 'password';
    upass.className = 'uinp';
    
    const submitbtn = document.createElement('button');
    submitbtn.innerText = "login";
    submitbtn.onclick = () => {
        const username = uinp.value;
        const password = upass.value;

        if (!username || !password) return;
        sessionStorage.setItem('pass', password);
        ws.send(JSON.stringify({code: 0, op: 0, username: username, password: password }));
    }
    submitbtn.style.marginLeft = '10px';
    submitbtn.className = 'loginbtn'; 
    
    const signupbtn = document.createElement('button');
    signupbtn.innerText = "sign up";
    signupbtn.onclick = () => { window.location.href = '/join'; }
    signupbtn.style.marginLeft = '10px';
    signupbtn.className = 'signupbtn';
    
    const d1 = document.createElement('div');
    d1.appendChild(uinp);
    element.appendChild(uinp);

    const d2 = document.createElement('div');
    d2.appendChild(upass)
    element.appendChild(d2);
    
    const d3 = document.createElement('div');
    d3.appendChild(submitbtn);
    element.appendChild(d3);
    
    const d4 = document.createElement('div');
    d4.style.marginTop = '5vh';
    const hSep = document.createElement('h2');
    hSep.innerText = 'Don\'t have an account?'
    d4.appendChild(hSep);
    d4.appendChild(signupbtn);
    element.appendChild(d4);
    element.style.display = 'block';
}


async function logout() {
    const db = await getDB();
    if (db) {
        await db.close();
        console.log(db);
        await idb.deleteDB(db.name, {
            async blocked() {
                // window.location.reload();
                await db.close();
                idb.deleteDB(db.name, {});
            }
        });
    }

    const sid = localStorage.getItem('sessionid');
    if (!sid || sid.length == 0) {
        localStorage.removeItem('sessionid');
        window.location.reload();
        return;
    }

    localStorage.clear();

    ws.send(JSON.stringify({
        code: 2,
        op: 1,
        data: {sid: sid}
    }));
}