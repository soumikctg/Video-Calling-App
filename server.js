import express from 'express';
import { createServer } from 'https';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';


const options = {
    key: fs.readFileSync('./certs/install-key.pem'),
    cert: fs.readFileSync('./certs/install.pem')
};

const app = express();
const server = createServer(options, app);
const io =  new Server(server);
const allUsers = {};

const _dirName = dirname(fileURLToPath(import.meta.url));

//exposing public directory to outside world

app.use(express.static('public'));

app.get('/', (req, res) => {
    console.log('Get request received');
    res.sendFile(join(_dirName, '/app/index.html'));
});


//handle socket connection  
io.on('connection', (socket) => {
    console.log('Socket connection established with id: ' + socket.id);

    socket.on('join-user', (username) => {
        console.log('User joined: ' + username);
        allUsers[username] = {username, id: socket.id};
        //inform all users that a new user has joined
        io.emit('joined', allUsers);
    });

    socket.on('offer', ({from, to , offer}) => {
        console.log({from, to, offer});                               
        io.to(allUsers[to].id).emit('offer', {from, to, offer});
    });

    socket.on('answer', ({from, to , answer}) => {
        console.log({from, to, answer});
        io.to(allUsers[from].id).emit('answer', {from, to, answer});
    });

    socket.on('end-call', ({from, to}) => {
        io.to(allUsers[to].id).emit('end-call', {from, to});
    });

    socket.on('call-ended', (caller) => {
        console.log('Call ended by: ', caller);
        const [from, to] = caller;
        io.to(allUsers[from].id).emit('call-ended');
        io.to(allUsers[to].id).emit('call-ended');
    });

    socket.on('icecandidate', (candidate) => {
        console.log({candidate});
        //broadcast to other peers
        socket.broadcast.emit('icecandidate', candidate);
    });

    socket.on('message', (msg) => {
        console.log(msg);
        io.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
});



server.listen(9000, () => {
    console.log('Server is running on port 9000');
})