export function initCallSockets(server) {
    const io = require('socket.io')(server, {
        cors: {
            origin: "https://chatjsrctclient.itamarorenn.com", // was "*"
        }
    });


    function temp() {
        try {
            /*
            const response = await require('axios').get('https://api.namefake.com/');

            if (response.status === 200) {
                const data = response.data;
                //   console.log(data);

                //TODO replace uid with either the userID or the session token
                return { name: data.name, fakeProfileURL: data.url }; //, uid: require('crypto').randomUUID()
            } else {
                console.error('Failed to fetch data from the API.');
                return null;
            }
            */
            const names = [
                "Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Hannah", "Isaac", "Jane",
                "Kevin", "Linda", "Mike", "Nancy", "Oliver", "Patricia", "Quincy", "Rachel", "Sam", "Tina",
                "Ursula", "Victor", "Wendy", "Xavier", "Yvonne", "Zane",
                "Alex", "Beth", "Cameron", "Daisy", "Ethan", "Fiona", "George", "Holly", "Ivy", "Jack",
                "Katie", "Leo", "Megan", "Nina", "Oscar", "Penny", "Quinn", "Riley", "Sophia", "Tyler"
            ];

            return { name: names[Math.floor(Math.random() * names.length)], fakeProfileURL: "" };
        }
        catch (error) {
            console.error('An error occurred:', error);
        }
    }

    io.on('connection', async (socket) => {
        // console.log('A user connected with ID:', socket.id);
        socket.emit('connection');

        //TODO replace this with either the userID or the session token
        socket.on('establishConnection', async (data) => {
            console.log(data.uid, users, data.uid in users)

            if (data && data.uid && data.uid in users) {
                // maybe just ignore incoming connection intead
                users[data.uid]['socketid'] = socket.id;
                socketsToUsers[socket.id] = data.uid;
            } else {
                const uObj = temp();
                if (!uObj) return console.log("RANDOM NAME GENERATOR ERROR");
                console.log(data.uid);

                const uid = (data && data.uid) ? data.uid : uObj.uid;

                users[uid] = uObj;
                users[uid]['socketid'] = socket.id;
                // console.log(users);

                socket.emit('yourData', users[uid]);
                io.sockets.emit('allUsers', users);
                socketsToUsers[socket.id] = uid;
            }
        });

        socket.on('disconnect', () => {
            const uid = socketsToUsers[socket.id];
            const toSend = users[uid];

            delete users[uid];
            delete socketsToUsers[socket.id];

            io.sockets.emit('userDisconnected', toSend);
        });

        socket.on('callUser', (data) => {
            // console.log("CALLING USER");
            // console.log("TO:", data.userToCall);
            // console.log("FROM:", data);
            // console.log(users[data.from]);

            // MAYBE CHANGE THIS
            const uConf = users[data.from];
            const uToCall = users[data.userToCall];
            if (!uToCall) return;

            io.to(uToCall['socketid']).emit('callUser', { signal: data.signalData, from: uConf });
        });

        socket.on('acceptCall', (data) => {
            io.to(data.to).emit('callAccepted', data.signal);
        });

        socket.on('connAlrExists', (data) => {
            if (!data.socketId in users) return io.to(data.socketId).emit("RESET");

            delete users[data.socketId];
        });

        socket.on('rejectCall', data => {
            io.to(data.to).emit('callRejected');
        });

        socket.on('endCall', data => {
            io.to(data.to).emit('callEnded');
        });

    });

    return io;
}