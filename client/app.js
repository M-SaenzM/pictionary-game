
const q = selector => {return document.querySelector(selector);}

const frmLogin = q('#frmLogin');
const loginDiv = q('#loginDiv');
const gameboardDiv = q('#gameboardDiv');
const waitingRoomDiv = q('#waitingRoomDiv');
const waitlist = q('#waitlist');
const startGameBtn = q('#startGame');
const txtPlayer = q('#txtPlayer');
const chatSection = q('#chatSection');
const drawerTxt = q('#drawer');
const wordToDrawTxt = q('#wordToDraw');
const chatInput = q('#chatInput');
const sendChatBtn = q('#sendChatBtn');
const frmChat = q('#frmChat')
const canvas = q('#canvas');
const drawingSection = q('#drawing-section')
const clearButton = q('#clearButton');

let is_master_user = false;
let drawingUser = '';
let wordToDraw = '';
let username = '';
let isDrawingUser = false;
let isGameStarted = false;

const socket = io();


let playerList = [];

const loadUsers = users => {
    waitlist.innerHTML = '';
    playerList = users;
    console.log(users);
    for(const u of playerList){
        //waitlist.innerHTML += `<span>${u.player.name}:${u.id}</span><br>`
        waitlist.innerHTML += `<span>${u.player.name}</span>`;
    }
    
}
 
const userJoin = player => {
    chatSection.innerHTML += `<span class="text-info"><b>${player.name}</b> joined the game!</span><br>`
}

const userLeft = player => {
    chatSection.innerHTML += `<span class="text-muted"><b>${player.name}</b> left the game!</span><br>`
}


const printDrawer = playerId => {
    
    if(socket.id === playerId){
        drawerTxt.innerHTML = `<span >Drawer: <b class="text-success">You!</b></span><br>`;
    } else {
        console.log(playerList);
        const index = playerList.findIndex(u => u.id === playerId);
        const player = playerList[index].player;
        drawerTxt.innerHTML = `<span >Drawer: <b >${player.name}</b></span><br>`;
    }
   
}

const showDrawingWord = word => {
    if(socket.id === drawingUser){
        wordToDrawTxt.innerHTML = `<span >Word to draw: <b class="text-success">${word}</b></span><br>`
    } else {
        wordToDrawTxt.innerHTML = ``;
    }
}

const printGuessRight = (data) => {
    chatSection.innerHTML += `<div class="guessword-true "><span> <i class="fa fa-check-circle text-success"></i> ${data.player}: <b>${data.word}</b></span></div>`
}
const printGuessWrong = (data) => {
    chatSection.innerHTML += `<div class="guessword-false "><span> <i class="fa fa-times-circle text-danger"></i> ${data.player}: <b>${data.word}</b></span></div>`
}

 function resizeCanvas() {
         canvas.width = drawingSection.clientWidth;
        canvas.height = drawingSection.clientHeight * 0.95;
    }

    window.addEventListener("resize", resizeCanvas);
window.addEventListener("load", e => {
  
    
    frmLogin.addEventListener('submit', e => {
   
        e.preventDefault();
        /* socket = io(); */
        socket.emit('playerListRequest');
    
        socket.emit('userJoin', JSON.stringify({
            name: txtPlayer.value
        }));
        
        
        
        socket.on('userJoined', userJoined => {
            socket.emit('playerListRequest');
           const data = JSON.parse(userJoined);
            is_master_user = data.is_master_user;
            isGameStarted = data.isGameStarted;

           if(isGameStarted){
                console.log("entro");
                loginDiv.classList.toggle('hide');
                gameboardDiv.classList.toggle('hide');
                
                resizeCanvas();
                console.log(data, playerList);
                
                drawingUser = data.drawingUser;
                printDrawer(data.drawingUser);
                clearButton.disabled = true;
        
                wordToDraw = data.wordToDraw;
                showDrawingWord(data.wordToDraw);

                
            } else {
                loginDiv.classList.toggle('hide');
                waitingRoomDiv.classList.toggle('hide');
            }       

            if (is_master_user) {
                startGameBtn.classList.toggle('hide');
            }
        })

        
        socket.on('newPlayer', player => {
             userJoin(JSON.parse(player)); 
             
        })
    
        socket.on('playerList', players => {
            const data = JSON.parse(players)                     
            
            loadUsers(data);
        });
    });
    
    
    const ctx = canvas.getContext("2d");

    //Resizing
    /* canvas.height = window.innerHeight / 2;
    canvas.width = window.innerWidth / 2; */
    resizeCanvas();
    
    //variables
    let painting = false;
    let prevPos;
    
    // Send drawing data to the server
    function sendDrawData(pos) {
    if (!prevPos) return;
    socket.emit('draw', { startPos: prevPos, endPos: pos });
    prevPos = pos;
    }

    // Receive drawing data from the server and draw it
    socket.on('draw', (data) => {
        const { startPos, endPos } = data;
        drawLine(startPos, endPos);
    });


    function startPosition(e){
        //if (socket.id === drawingUser) return; // Check if it's the player's turn
        painting = true;
        prevPos = getMousePos(canvas, e);
    }

    function finishedPosition(){
        painting = false;
        prevPos = null;
        
    }

    function draw(e) {
        if(socket.id === drawingUser){
            if (!painting) return;
            const currentPos = getMousePos(canvas, e);
            drawLine(prevPos, currentPos);
            sendDrawData(currentPos);
            prevPos = currentPos;
        }
        
    }

    function drawLine(startPos, endPos) {
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "black";

        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        ctx.closePath();
    }

    // Utility function to get mouse position relative to the canvas
    function getMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /****  Function to clear the canvas *******/
     function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
   
    }

    function requestCleanCanvas(){
        socket.emit('RequestClean');
    }

    socket.on('cleanApproved',()=>{
        clearCanvas()
    })

    socket.on('playerList', players => {
        const data = JSON.parse(players)
        loadUsers(data);
    });
   
    
        /****** Functions to disconnect ******* */
    window.addEventListener('beforeunload', function(event) {
        socket.emit('disconnect',JSON.stringify({socket}))
      
        // Cancel the event to prevent the default browser behavior (optional)
        event.preventDefault();
    });    


    socket.on('userLeft', (player) => {
        const data = JSON.parse(player)
        userLeft(data.player);
    })

    socket.on('reloadAll', () => {
         window.location.reload();
    })
   

    function startGame(){
        
        socket.emit('StartGame');
    }

    socket.on('GameStarted', e =>{
        const data = JSON.parse(e);
        console.log(data);
        waitingRoomDiv.classList.toggle('hide');
        gameboardDiv.classList.toggle('hide');
        isGameStarted = data.isGameStarted;
        resizeCanvas();

        drawingUser = data.drawingUser;
        printDrawer(data.drawingUser);

        clearButton.disabled = (socket.id !== drawingUser);
        
        wordToDraw = data.wordToDraw;
        showDrawingWord(data.wordToDraw);
        
    });

        function getUser() {
                const index = playerList.findIndex(u => u.id === socket.id);
                const player = playerList[index].player;
                return player;
            
        }
        socket.on('rightGuess', e => {
            const data = JSON.parse(e);
            printGuessRight(data);
            
        });

        socket.on('newGame',e => {
            const data = JSON.parse(e);
            drawingUser = data.drawingUser;
            printDrawer(data.drawingUser);
            requestCleanCanvas();

            if(socket.id !== drawingUser){
                clearButton.disabled = true;
            } else {
                clearButton.disabled = false;
            }

            wordToDraw = data.wordToDraw;
            showDrawingWord(data.wordToDraw);
        })

        socket.on('wrongGuess', e => {
            const data = JSON.parse(e);
            printGuessWrong(data);
        });

        frmChat.addEventListener("submit", e => {
            e.preventDefault();
            let player = getUser();
            //console.log(player);
            
            socket.emit('GuessWord', JSON.stringify({
                user: player,
                guessWord: chatInput.value
            }));

            chatInput.value = "";
            
        });

    //eventlisteners
    canvas.addEventListener("mousedown", startPosition);
    window.addEventListener("mouseup", finishedPosition);
    canvas.addEventListener("mousemove", draw);
    // Event listener for a button or any trigger to clear the canvas
   
    clearButton.addEventListener("click", requestCleanCanvas);
    startGameBtn.addEventListener("click", startGame);
   
});









  