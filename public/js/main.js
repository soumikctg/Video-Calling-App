const createUserBtn =  document.getElementById('create-user');
const userName =  document.getElementById('username');
const allUsersHtml = document.getElementById('allusers');

const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const endCallBtn = document.getElementById('end-call-btn');
let localStream;
let caller = [];



const PeerConnection = (function(){
    let peerConnection;

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                { 
                    urls: 'stun:stun.l.google.com:19302' 
                }
            ]
        }
        peerConnection = new RTCPeerConnection(config);
        // add local stream to peer connection
        localStream.getTracks().forEach(track => { 
            peerConnection.addTrack(track, localStream);
        });
        //listen to remote stream and add to peer connection
        peerConnection.ontrack = function(event) {
            remoteVideo.srcObject = event.streams[0];
        }
        //listen to ice candidates and send to other peer
        peerConnection.onicecandidate = function(event) {
            if(event.candidate){
                console.log('New Ice Candidate', event.candidate);
                socket.emit('icecandidate', event.candidate);
            }
        }
        return peerConnection;
    }
    return {
        getInstance: () => {
            if(!peerConnection){
                peerConnection = createPeerConnection();
            }
            return peerConnection;
        }
    }
})();


//handle browser events

createUserBtn.addEventListener('click', () => {
    if(userName.value !== ''){
        const userNameContainer = document.querySelector('.username-input');
        socket.emit('join-user', userName.value);
        userNameContainer.style.display = 'none';
    }
});

endCallBtn.addEventListener('click', () => {
    socket.emit('call-ended', caller);
});

socket.on('joined', (allUsers) => {
    console.log({allUsers});
    const createUsersHtml = () =>{
        allUsersHtml.innerHTML = "";
        for(let user in allUsers){
            const li = document.createElement('li');
            li.textContent = `${user} ${user === userName.value ? '(You)' : ''}`;
            if(user !== userName.value){
                const button = document.createElement('button');
                button.classList.add('call-btn');
                button.addEventListener('click', () => {
                    startCall(user);
                    console.log('Call button clicked');
                });
                const img = document.createElement('img');
                img.setAttribute('src', '/images/phone.png');
                img.setAttribute('width', 20);
                button.appendChild(img);
                li.appendChild(button);
            }
            allUsersHtml.appendChild(li);
        }
        
    }

    createUsersHtml();
});


socket.on('offer', async ({from, to, offer}) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', {from, to, answer: pc.localDescription});
});

socket.on('answer', async ({from, to, answer}) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);
    endCallBtn.style.display = 'block';
    socket.emit('end-call', {from, to});
    caller = [from, to];
});

socket.on('icecandidate', async (candidate) => {
    console.log('New Ice Candidate', {candidate});
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('end-call', ({from, to}) => {
    endCallBtn.style.display = 'block';
});

socket.on('call-ended', (caller) => {
    endCall();
});


const startCall = async (user) => {
    console.log('Call started with ' + user);
    const pc = PeerConnection.getInstance();
    const offer = await pc.createOffer();
    console.log('Offer created', {offer});
    await pc.setLocalDescription(offer);
    socket.emit('offer', {from: userName.value, to: user, offer: pc.localDescription});
}

const endCall = () => {
    const pc = PeerConnection.getInstance();
    if(pc){
        pc.close();
    }
    
    remoteVideo.srcObject = null;
    endCallBtn.style.display = 'none';
};

const startMyVideo = async () => {
    try{
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        console.log('Stream received', {stream});
        localStream = stream;
        localVideo.srcObject = stream;

    } catch(e){
        console.log(e);
    }
}
startMyVideo();