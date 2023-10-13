import React from 'react';

function createWSPath() {
  const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
  var echoSocketUrl = socketProtocol + `//${window.location.hostname}`;
  if (window.location.port) echoSocketUrl += `:${window.location.port}`;
  echoSocketUrl += '/websocket';
  return echoSocketUrl;
}

let ws: WebSocket;

/**
 * Connect to the server's websocket.
 */
function connectSocket() {
  ws = new WebSocket(createWSPath());
  // Ping the server, to determine if there is a stable connection.
  setInterval(() => { ws.send(JSON.stringify({ code: 10 })); }, 30000);

  ws.addEventListener('open', () => {
      console.log("Websocket connection established!");
      const sessionID = localStorage.getItem('sessionid') ?? 'undefined';

      if (sessionID === "undefined") {
          showLogin();
      } else {
          // If the user is already logged in, the user must go to the main
          // page.
          window.location.href = "/";
      }
  });

  ws.addEventListener('message', message => {
      const response = JSON.parse(message.data);

      // If the response does not have a code 0, we do not care about it.
      if (response.code != 0) {
          console.log("UNKNOWN RESPONSE ", response);
          return;
      }

      switch (response.op) {
          // Invalid password.
          case 401: {
              const el = document.getElementsByClassName('uinp')[1];
              el.style.borderColor = 'red';
              el.style.borderStyle = 'solid';
          } break;
          // Invalid session ID.
          case 403: {
              localStorage.clear();
              window.location.reload();
          } break;
          // Invalid username.
          case 404: {
              const el = document.getElementsByClassName('uinp')[0];
              el.style.borderColor = 'red';
              el.style.borderStyle = 'solid';
          } break;
          // We assume any other code is a success.
          default: {
              localStorage.setItem('sessionid', response.sessionid);
              window.location.href = "/";
          } break;
      }
  });

  ws.addEventListener('close', (ev) => {
      console.log(ev);
      console.log(`WEBSOCKET CLOSED WITH CODE ${ev.code}`);

      const bar = document.getElementById('reconnectingbar');
      bar.style.display = 'block';

      // Attempt to reconnect.
      const timer = setInterval(() => {
          connectSocket();

          ws.addEventListener('open', () => {
              clearInterval(timer);
              window.location.reload();
          });
      }, 1000);
  });
}

/**
 * Connect to the server's websocket.
 */
function useSocket(onConnect: any, onDisconnect, onMessage) {
  const ws = React.useRef<WebSocket>(null);

  React.useEffect(() => {
    socket.addEventListener('open', () => {
        console.log("Websocket connection established!");
        onConnect();
    });

    socket.addEventListener('message', message => {
        const response = JSON.parse(message.data);

        // If the response does not have a code 0, we do not care about it.
        if (response.code != 0) {
            console.log("UNKNOWN RESPONSE ", response);
            return;
        }

        switch (response.op) {
            // Invalid password.
            case 401: {
                const el = document.getElementsByClassName('uinp')[1];
                el.style.borderColor = 'red';
                el.style.borderStyle = 'solid';
            } break;
            // Invalid session ID.
            case 403: {
                localStorage.clear();
                window.location.reload();
            } break;
            // Invalid username.
            case 404: {
                const el = document.getElementsByClassName('uinp')[0];
                el.style.borderColor = 'red';
                el.style.borderStyle = 'solid';
            } break;
            // We assume any other code is a success.
            default: {
                localStorage.setItem('sessionid', response.sessionid);
                window.location.href = "/";
            } break;
        }
    });

    socket.addEventListener('close', (ev) => {
        console.log(ev);
        console.log(`WEBSOCKET CLOSED WITH CODE ${ev.code}`);

        const bar = document.getElementById('reconnectingbar');
        bar.style.display = 'block';

        // Attempt to reconnect.
        const timer = setInterval(() => {
            connectSocket();

            ws.addEventListener('open', () => {
                clearInterval(timer);
                window.location.reload();
            });
        }, 1000);
    });
  }, []);
}

/**
 * Get the user's ID from their session ID.
 * @param {string} sid The session ID.
 * @returns {string} Returns the user's ID.
 */
function getUidFromSid(sid) {
    return atob(sid.split("?")[1], 'base64');
}

/** @type {number} The timer for the loading animation. */
const loadingAnimInterval = setInterval(() => {
    const element = document.getElementById('loadingdiv').firstElementChild;
    element.style.color = '#' + (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6)
}, 1000);

/**
 * Construct the login page.
 */
function showLogin() {
    clearInterval(loadingAnimInterval);
    document.getElementById('logindiv').hidden = false;
    document.getElementById('loadingdiv').hidden = true;
}

/**
 * Handle when the user attempts to login.
 * @param {SubmitEvent} e The form.
 */
function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();

    const username = e.target.elements.namedItem('username').value;
    const password = e.target.elements.namedItem('password').value;

    if (!username || !password) return;
    ws.send(JSON.stringify({
        code: 0,
        op: 0,
        username: username,
        password: password
    }));
}

function App() {
  const socket = React.useRef<WebSocket>(new WebSocket(createWSPath()));
  return (
    <form action="#" id="logindiv">
      <label htmlFor="username">
        Username
        <input name="username" />
      </label>
      <label htmlFor="password">
        Password
        <input name="password" />
      </label>
      <button type="submit">Login</button>
      <div>
        <h2>Don't have an account?</h2>
        <a href="/join">sign up</a>
      </div>
    </form>
  );
}

export default App;
