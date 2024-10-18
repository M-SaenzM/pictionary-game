const express = require('express');
/* const { Socket } = require('socket.io'); */
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

const http = require('http');
const xss = require('xss');

app.use(express.static(path.join(__dirname,"client")))
//attached http server to the socket.io

const server = http.createServer(app);
const io = require("socket.io")(server);

let currentPlayerIndex = 0;
let playerList = [];
let isGameStarted = false;

let master_user = '';
let drawingUser = '';
let words = [
    'horse', 'house', 'wasp', 'car', 'boat', 'toilet', 'dinosaur', 'plane', 'jacket', 'microwave',
    'tree', 'sun', 'moon', 'star', 'apple', 'banana', 'cat', 'dog', 'elephant', 'giraffe',
    'chair', 'table', 'lamp', 'television', 'computer', 'phone', 'clock', 'book', 'pen', 'pencil',
    'shoes', 'socks', 'shirt', 'pants', 'hat', 'glasses', 'umbrella', 'backpack', 'wallet', 'purse',
    'mountain', 'river', 'lake', 'ocean', 'beach', 'desert', 'forest', 'volcano', 'island', 'cave',
    'flower', 'butterfly', 'bee', 'spider', 'snake', 'lizard', 'frog', 'fish', 'bird', 'bat',
    'pizza', 'hamburger', 'sandwich', 'spaghetti', 'cake', 'ice cream', 'cookie', 'donut', 'pie', 'chocolate',
    'bicycle', 'motorcycle', 'bus', 'train', 'truck', 'helicopter', 'rocket', 'submarine', 'spaceship', 'tractor',
    'football', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'volleyball', 'hockey', 'rugby', 'swimming',
    'doctor', 'nurse', 'firefighter', 'police', 'chef', 'teacher', 'artist', 'musician', 'athlete', 'scientist'
];
let wordToDraw = '';
/* let wrongGuessResponses = ["Sorry, try again.", "Not quite right.", "Better luck next time.", 
                          "Close, but no cigar.", "Keep trying", "Ah, too bad.", "Boo hoo.",
                          "Well, that's not right", "Don't give up."]
 */
function getRandomInt(max) {
return Math.floor(Math.random() * max);
}

const newPlayer = (player, socket, io) => {
    //setting master user
  is_master_user = false;
   
  
  console.log(playerList);
  if (playerList.length === 0) {
   
    master_user = socket.id;
    is_master_user = true;
    //console.log(playerList.length,master_user,is_master_user);
  }
  playerList.push({player, id:socket.id})
    //console.log(playerList.length,master_user,is_master_user);
   
    if(isGameStarted){
       
        socket.emit('userJoined',JSON.stringify({ player, is_master_user, isGameStarted, drawingUser, wordToDraw }));
    } else {
        socket.emit('userJoined',JSON.stringify({ player, is_master_user, isGameStarted }));
    }
   
    io.sockets.emit('newPlayer',JSON.stringify(player));
    io.sockets.emit('playerList', JSON.stringify(playerList));
    //io.to(socket.id).emit('yourTurn');
}

const reloadPlayers = (socket,io) =>{
    const index = playerList.findIndex(u => u.id === socket.id);
       
    playerList.splice(index, 1);
    io.sockets.emit('playerList', JSON.stringify(playerList));
    
}

const playerExit = (socket,io) => {
    const index = playerList.findIndex(u => u.id === socket.id);
    const userLeaving = playerList[index];
    io.sockets.emit('userLeft', JSON.stringify(userLeaving));
}

//create a new connection
io.on('connection', (socket) =>{
    console.log('A user connected');
   
    socket.on('playerListRequest', ()=>{
        io.sockets.emit('playerList', JSON.stringify(playerList));
    
    })

    socket.on('userJoin',name => {
        const player = JSON.parse(name);
        newPlayer(player, socket, io);
        
    });

   
     // Listen for drawing data from clients
     socket.on('draw', (data) => {
        // Broadcast the drawing data to all other clients except the sender
        socket.broadcast.emit('draw', data);
        
    });


    socket.on('StartGame', () =>{
        drawingUser = playerList[getRandomInt(playerList.length)].id;
        wordToDraw = words[getRandomInt(words.length)];
        isGameStarted = true;
        io.sockets.emit('GameStarted',JSON.stringify({ drawingUser, wordToDraw, isGameStarted  }))
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        if(drawingUser === socket.id){
            drawingUser = '';
            playerExit(socket,io);
            isGameStarted = false;
            io.sockets.emit('reloadAll');
            reloadPlayers(socket, io);
            socket.disconnect();
            
           
        } else {
             // const { socketId } = JSON.parse(data);
            console.log('A user disconnected', socket.id);
            
        
            // Remove the player from the players array 
            playerExit(socket,io);
            
            reloadPlayers(socket, io);
            if(playerList.length === 0){
                isGameStarted = false
            }
        
            socket.disconnect();
        }
      
      
    });

    
    socket.on('RequestClean', () =>{
        io.sockets.emit('cleanApproved');
    })

    socket.on('GuessWord', w =>{
        guessing = JSON.parse(w);

        if(wordToDraw === guessing.guessWord){
            io.sockets.emit('rightGuess',JSON.stringify({
                player: guessing.user.name,
                word:guessing.guessWord
            }))
            
            drawingUser = playerList[getRandomInt(playerList.length)].id;
            wordToDraw = words[getRandomInt(words.length)];
           
            io.sockets.emit('newGame',JSON.stringify({ drawingUser, wordToDraw }))
            //console.log(guessing.user.name, guessing.guessWord,"match");
        } else {
            io.sockets.emit('wrongGuess',JSON.stringify({
                player: guessing.user.name,
                word:guessing.guessWord
            }))
            //console.log(wordToDraw, guessing.guessWord,"no match");
        }
    })

    

});



server.listen(PORT, () =>{
    console.log(`App listening on port ${PORT}`);
})