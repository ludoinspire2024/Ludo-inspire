const API = "https://ludo-inspire.onrender.com";

let roomTimer = null;
let currentRoomId = null;
let currentRoom = null;
let currentGame = null;
let currentDice = null;


// ===============================
// BASIC HELPERS
// ===============================

function $(id){
  return document.getElementById(id);
}

function getToken(){
  return localStorage.getItem("token");
}

function getUser(){
  try{
    return JSON.parse(localStorage.getItem("user") || "null");
  }catch{
    return null;
  }
}

function getCurrentUserId(){

  const user = getUser();

  if(user && user.id){
    return Number(user.id);
  }

  const token = getToken();

  if(!token) return null;

  try{

    const payload =
      JSON.parse(
        atob(
          token.split(".")[1]
            .replace(/-/g,"+")
            .replace(/_/g,"/")
        )
      );

    return Number(
      payload.id ||
      payload.userId ||
      payload.sub
    );

  }catch{
    return null;
  }
}


function escapeHtml(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


// ===============================
// API
// ===============================

async function api(path, options = {}){

  const headers = {
    "Content-Type":"application/json",
    ...(options.headers || {})
  };

  const token = getToken();

  if(token){
    headers.Authorization =
      "Bearer " + token;
  }

  const response =
    await fetch(API + path,{
      ...options,
      headers
    });

  let data = {};

  try{
    data = await response.json();
  }catch{}

  if(!response.ok){

    throw new Error(
      data.message ||
      data.error ||
      "Request failed"
    );

  }

  return data;
}


// ===============================
// AUTH
// ===============================

function showLogin(){

  $("loginForm").hidden = false;
  $("registerForm").hidden = true;

  $("loginTab").classList.add("active");
  $("registerTab").classList.remove("active");

  if($("authMsg")){
    $("authMsg").innerText = "";
  }

}


function showRegister(){

  $("loginForm").hidden = true;
  $("registerForm").hidden = false;

  $("loginTab").classList.remove("active");
  $("registerTab").classList.add("active");

  if($("authMsg")){
    $("authMsg").innerText = "";
  }

}


async function register(){

  const username =
    $("regUser").value.trim();

  const email =
    $("regEmail").value.trim();

  const password =
    $("regPass").value;

  if(!username || !email || !password){

    $("authMsg").innerText =
      "Please fill all fields.";

    return;
  }

  if(password.length < 6){

    $("authMsg").innerText =
      "Password must be at least 6 characters.";

    return;
  }

  try{

    $("authMsg").innerText =
      "Creating account...";

    const data =
      await api("/api/auth/register",{
        method:"POST",
        body:JSON.stringify({
          username,
          email,
          password
        })
      });

    if(data.token){

      localStorage.setItem(
        "token",
        data.token
      );

    }

    if(data.user){

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    }

    $("authMsg").innerText =
      "Account created successfully.";

    await loadProfile();

    showProfilePage();

  }catch(error){

    $("authMsg").innerText =
      error.message;

  }

}


async function login(){

  const email =
    $("email").value.trim();

  const password =
    $("password").value;

  if(!email || !password){

    $("authMsg").innerText =
      "Enter email and password.";

    return;
  }

  try{

    $("authMsg").innerText =
      "Logging in...";

    const data =
      await api("/api/auth/login",{
        method:"POST",
        body:JSON.stringify({
          email,
          password
        })
      });

    if(data.token){

      localStorage.setItem(
        "token",
        data.token
      );

    }

    if(data.user){

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    }

    $("authMsg").innerText =
      "Login successful.";

    await loadProfile();

    showProfilePage();

  }catch(error){

    $("authMsg").innerText =
      error.message;

  }

}


function logout(){

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  currentRoomId = null;
  currentRoom = null;
  currentGame = null;

  if(roomTimer){

    clearInterval(roomTimer);
    roomTimer = null;

  }

  showHomePage();

}


// ===============================
// PROFILE
// ===============================

async function loadProfile(){

  if(!getToken()) return;

  try{

    const data =
      await api("/api/me");

    const user =
      data.user || data;

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    if($("profileName")){

      $("profileName").innerText =
        user.username ||
        user.name ||
        "Player";

    }

    if($("profileEmail")){

      $("profileEmail").innerText =
        user.email || "";

    }

    const coins =
      user.virtualCoins ??
      user.coins ??
      user.balance ??
      0;

    if($("cashWon")){
      $("cashWon").innerText = coins;
    }

    if($("coinTop")){
      $("coinTop").innerText = coins;
    }

    if($("walletCoins")){
      $("walletCoins").innerText = coins;
    }

    if($("bonusTop")){
      $("bonusTop").innerText =
        user.bonusCoins ?? 0;
    }

    if($("battles")){
      $("battles").innerText =
        user.battles ?? 0;
    }

    if($("referrals")){
      $("referrals").innerText =
        user.referrals ?? 0;
    }

  }catch(error){

    console.log("Profile:",error.message);

  }

}


function showProfilePage(){

  if(!getToken()){

    showLoginPage();
    return;

  }

  if(typeof hideAllPages === "function"){
    hideAllPages();
  }

  if($("profilePage")){
    $("profilePage").hidden = false;
  }

  loadProfile();

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


// ===============================
// HOME LOGIN
// ===============================

function ensureLogin(){

  if(!getToken()){

    showLoginPage();
    return false;

  }

  return true;

}


// ===============================
// CREATE ROOM
// ===============================

async function createRoom(){

  if(!ensureLogin()) return;

  try{

    setRoomMessage(
      "Creating room..."
    );

    const data =
      await api("/api/rooms",{
        method:"POST",
        body:JSON.stringify({
          name:"Ludo Inspire Room"
        })
      });

    const room =
      data.room || data;

    currentRoomId =
      room.id ||
      room.roomId ||
      room.code;

    if(!currentRoomId){

      throw new Error(
        "Room ID not received."
      );

    }

    await refreshRoom();

    startRoomPolling();

  }catch(error){

    setRoomMessage(
      error.message
    );

  }

}


// ===============================
// JOIN ROOM
// ===============================

async function joinRoomFromInput(){

  if(!ensureLogin()) return;

  const input =
    $("joinRoomInput");

  const roomId =
    input.value.trim();

  if(!roomId){

    setRoomMessage(
      "Enter Room ID first."
    );

    return;
  }

  await joinRoom(roomId);

}


async function joinRoom(roomId){

  try{

    setRoomMessage(
      "Joining room..."
    );

    const data =
      await api(
        "/api/rooms/" +
        encodeURIComponent(roomId) +
        "/join",
        {
          method:"POST"
        }
      );

    const room =
      data.room || data;

    currentRoomId =
      room.id ||
      room.roomId ||
      roomId;

    await refreshRoom();

    startRoomPolling();

  }catch(error){

    setRoomMessage(
      error.message
    );

  }

}


// ===============================
// ROOM DISPLAY
// ===============================

function setRoomMessage(message){

  if($("roomMessage")){
    $("roomMessage").innerText =
      message;
  }

}


function showRoom(room){

  currentRoom = room;

  const roomId =
    room.id ||
    room.roomId ||
    room.code ||
    currentRoomId;

  currentRoomId = roomId;

  if($("roomArea")){
    $("roomArea").hidden = false;
  }

  if($("roomIdDisplay")){
    $("roomIdDisplay").innerText =
      roomId;
  }


  const players =
    room.players ||
    room.room_players ||
    [];


  renderPlayers(players);


  const me =
    getCurrentUserId();


  const creatorId =
    Number(
      room.createdBy ??
      room.created_by ??
      room.ownerId ??
      room.owner_id
    );


  const playerCount =
    players.length;


  if($("startGameBtn")){

    $("startGameBtn").hidden =
      !(
        creatorId &&
        me &&
        creatorId === me &&
        playerCount === 2
      );

  }


  if(playerCount < 2){

    setRoomMessage(
      "Waiting for Player 2..."
    );

  }else{

    setRoomMessage(
      "2 players joined. Player 1 can start."
    );

  }

}


function renderPlayers(players){

  const box =
    $("playerList");

  if(!box) return;

  if(!players.length){

    box.innerHTML =
      "<p>No players yet.</p>";

    return;

  }

  box.innerHTML =
    players.map(
      (player,index)=>{

        const color =
          player.color ||
          (index === 0
            ? "green"
            : "red");

        const username =
          player.username ||
          player.name ||
          player.user?.username ||
          "Player " + (index+1);

        return `
          <div class="player-row">

            <span class="player-dot ${
              color === "green"
                ? "player-green"
                : "player-red"
            }"></span>

            <b>
              ${escapeHtml(username)}
            </b>

            <span style="margin-left:auto">
              ${
                color === "green"
                  ? "🟢"
                  : "🔴"
              }
            </span>

          </div>
        `;

      }
    ).join("");

}


// ===============================
// REFRESH ROOM
// ===============================

async function refreshRoom(){

  if(!currentRoomId) return;

  try{

    const data =
      await api(
        "/api/rooms/" +
        encodeURIComponent(currentRoomId)
      );

    const room =
      data.room || data;

    showRoom(room);

    if(
      room.status === "started" ||
      room.gameStarted === true
    ){

      showBoard();

      await refreshGameState();

    }

  }catch(error){

    console.log(
      "Room refresh:",
      error.message
    );

  }

}


// ===============================
// ROOM POLLING
// ===============================

function startRoomPolling(){

  if(roomTimer){

    clearInterval(roomTimer);

  }

  roomTimer =
    setInterval(
      refreshRoom,
      2500
    );

}


function stopRoomPolling(){

  if(roomTimer){

    clearInterval(roomTimer);

    roomTimer = null;

  }

}


// ===============================
// START GAME
// ===============================

async function startGame(){

  if(!currentRoomId){

    setRoomMessage(
      "Room not found."
    );

    return;
  }

  try{

    setRoomMessage(
      "Starting game..."
    );

    await api(
      "/api/rooms/" +
      encodeURIComponent(currentRoomId) +
      "/start",
      {
        method:"POST"
      }
    );

    showBoard();

    await refreshGameState();

    startRoomPolling();

  }catch(error){

    setRoomMessage(
      error.message
    );

  }

}


// ===============================
// GAME BOARD
// ===============================

function showBoard(){

  if($("boardArea")){
    $("boardArea").hidden = false;
  }

  if($("roomArea")){
    $("roomArea").hidden = false;
  }

}


function hideBoard(){

  if($("boardArea")){
    $("boardArea").hidden = true;
  }

}


function setGameStatus(text){

  if($("gameStatus")){
    $("gameStatus").innerText =
      text;
  }

}


// ===============================
// GAME STATE
// ===============================

async function refreshGameState(){

  if(!currentRoomId) return;

  try{

    const data =
      await api(
        "/api/rooms/" +
        encodeURIComponent(currentRoomId) +
        "/state"
      );

    currentGame =
      data.game ||
      data;

    renderGame();

  }catch(error){

    console.log(
      "Game state:",
      error.message
    );

  }

}


function renderGame(){

  if(!currentGame) return;

  showBoard();


  const turn =
    currentGame.turn ??
    currentGame.currentTurn ??
    currentGame.current_player;


  const me =
    getCurrentUserId();


  let status =
    "Game in progress";


  if(
    currentGame.status === "finished" ||
    currentGame.winner
  ){

    status =
      "🏆 Winner: " +
      (
        currentGame.winnerName ||
        currentGame.winner ||
        "Player"
      );

  }else if(
    turn &&
    me &&
    Number(turn) === Number(me)
  ){

    status =
      "🎯 Your turn";

  }else{

    status =
      "⏳ Opponent's turn";

  }


  setGameStatus(status);


  renderTokens(
    currentGame.tokens ||
    currentGame.playerTokens ||
    {}
  );


  if(
    currentGame.dice !== undefined &&
    currentGame.dice !== null
  ){

    currentDice =
      currentGame.dice;

    renderDice(
      currentGame.dice
    );

  }

}


// ===============================
// DICE
// ===============================

async function rollDice(){

  if(!currentRoomId){

    alert("Join a room first.");
    return;

  }

  try{

    const data =
      await api(
        "/api/rooms/" +
        encodeURIComponent(currentRoomId) +
        "/dice",
        {
          method:"POST"
        }
      );

    const game =
      data.game ||
      data;

    currentGame = {
      ...(currentGame || {}),
      ...game
    };

    const dice =
      data.dice ??
      game.dice ??
      data.value;

    if(dice){

      currentDice = dice;

      renderDice(dice);

    }

    await refreshGameState();

  }catch(error){

    setGameStatus(
      error.message
    );

  }

}


function renderDice(value){

  const diceFaces = {
    1:"⚀",
    2:"⚁",
    3:"⚂",
    4:"⚃",
    5:"⚄",
    6:"⚅"
  };

  if($("diceResult")){

    $("diceResult").innerText =
      diceFaces[value] ||
      "🎲";

  }

}


// ===============================
// TOKENS
// ===============================

function renderTokens(tokens){

  const area =
    $("tokensArea");

  if(!area) return;


  let myTokens = [];


  const me =
    getCurrentUserId();


  if(Array.isArray(tokens)){

    myTokens = tokens;

  }else if(tokens[me]){

    myTokens =
      tokens[me];

  }else{

    const keys =
      Object.keys(tokens);

    if(keys.length){

      myTokens =
        tokens[keys[0]];

    }

  }


  if(!Array.isArray(myTokens)){

    myTokens =
      [-1,-1,-1,-1];

  }


  area.innerHTML =
    myTokens.map(
      (position,index)=>{

        let text;

        if(position === -1){

          text =
            "🏠 Home";

        }else if(position >= 56){

          text =
            "🏆 Finished";

        }else{

          text =
            "Path " + position;

        }


        return `
          <button
            class="token-btn"
            onclick="moveToken(${index})">

            🟢 Token ${index + 1}
            <br>
            <small>${text}</small>

          </button>
        `;

      }
    ).join("");

}


// ===============================
// MOVE TOKEN
// ===============================

async function moveToken(tokenIndex){

  if(!currentRoomId){

    alert("Room not found.");
    return;

  }

  if(currentDice === null){

    alert("Roll the dice first.");
    return;

  }

  try{

    const data =
      await api(
        "/api/rooms/" +
        encodeURIComponent(currentRoomId) +
        "/move",
        {
          method:"POST",
          body:JSON.stringify({
            tokenIndex,
            dice:currentDice
          })
        }
      );

    const game =
      data.game ||
      data;

    currentGame = {
      ...(currentGame || {}),
      ...game
    };

    currentDice = null;

    if($("diceResult")){

      $("diceResult").innerText =
        "🎲";

    }

    await refreshGameState();

  }catch(error){

    setGameStatus(
      error.message
    );

  }

}


// ===============================
// WALLET
// ===============================

async function refreshWallet(){

  await loadProfile();

}


// ===============================
// HISTORY
// ===============================

async function loadHistory(){

  if(!getToken()) return;

  try{

    const data =
      await api(
        "/api/games/history"
      );

    const games =
      data.games ||
      data.history ||
      [];

    const box =
      $("historyList");

    if(!box) return;

    if(!games.length){

      box.innerText =
        "No games yet.";

      return;

    }

    box.innerHTML =
      games.map(
        game => {

          return `
            <div class="player-row">

              <span>
                🎲
              </span>

              <div>
                <b>
                  ${
                    escapeHtml(
                      game.result ||
                      game.status ||
                      "Game"
                    )
                  }
                </b>

                <small>
                  ${
                    escapeHtml(
                      game.created_at ||
                      game.createdAt ||
                      ""
                    )
                  }
                </small>
              </div>

            </div>
          `;

        }
      ).join("");

  }catch(error){

    console.log(
      "History:",
      error.message
    );

  }

}


// ===============================
// REFERRAL
// ===============================

function renderReferral(user){

  if(!$("referralCode")) return;

  const code =
    user?.referralCode ||
    user?.referral_code ||
    user?.username ||
    "-";

  $("referralCode").innerText =
    code;

}


// ===============================
// STARTUP
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  async ()=>{

    if(getToken()){

      await loadProfile();

      const user =
        getUser();

      renderReferral(user);

    }

  }
);


// ===============================
// SAFETY: CLOSE ROOM POLLING
// ===============================

window.addEventListener(
  "beforeunload",
  ()=>{
    stopRoomPolling();
  }
);
