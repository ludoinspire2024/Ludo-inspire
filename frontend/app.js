const API="https://ludo-inspire.onrender.com";

let token=localStorage.getItem("ludo_token");
let currentRoom=null;
let pollTimer=null;

const $=id=>document.getElementById(id);

async function api(path,opt={}){
  opt.headers={
    ...(opt.headers||{}),
    "Content-Type":"application/json"
  };

  if(token){
    opt.headers.Authorization="Bearer "+token;
  }

  const r=await fetch(API+path,opt);
  const d=await r.json().catch(()=>({}));

  if(!r.ok) throw Error(d.error||"Request failed");

  return d;
}

function showLogin(){
  $("loginForm").hidden=false;
  $("registerForm").hidden=true;

  $("loginTab").classList.add("active");
  $("registerTab").classList.remove("active");
}

function showRegister(){
  $("loginForm").hidden=true;
  $("registerForm").hidden=false;

  $("loginTab").classList.remove("active");
  $("registerTab").classList.add("active");
}

async function register(){

  $("authMsg").textContent="Creating account...";

  try{

    const d=await api("/api/auth/register",{
      method:"POST",
      body:JSON.stringify({
        username:$("regUser").value.trim(),
        email:$("regEmail").value.trim(),
        password:$("regPass").value
      })
    });

    token=d.token;

    localStorage.setItem("ludo_token",token);

    await showHome();

  }catch(e){

    $("authMsg").textContent=e.message;

  }
}

async function login(){

  $("authMsg").textContent="Signing in...";

  try{

    const d=await api("/api/auth/login",{
      method:"POST",
      body:JSON.stringify({
        email:$("email").value.trim(),
        password:$("password").value
      })
    });

    token=d.token;

    localStorage.setItem("ludo_token",token);

    await showHome();

  }catch(e){

    $("authMsg").textContent=e.message;

  }
}

async function showHome(){

  try{

    await loadProfile();
    await loadRooms();
    await loadLeaderboard();

    $("auth").hidden=true;
    $("home").hidden=false;
    $("gameView").hidden=true;
    $("status").textContent="Online";

  }catch(e){

    logout();
    $("authMsg").textContent=e.message;

  }
}

async function loadProfile(){

  const d=await api("/api/me");
  const u=d.user;

  $("profile").innerHTML=`
    <b>${u.username}</b><br>
    🪙 ${u.coins} virtual coins<br>
    🏆 ${u.wins} wins · ${u.losses} losses
  `;
}

async function loadLeaderboard(){

  const d=await api("/api/leaderboard");

  $("leaderboard").innerHTML=
    d.leaderboard.slice(0,10).map((u,i)=>`
      <div class="rank">
        <span>${i+1}. <b>${u.username}</b></span>
        <span>${u.wins} wins</span>
      </div>
    `).join("") || "No players yet.";
}

async function loadRooms(){

  const d=await api("/api/rooms");

  $("rooms").innerHTML=
    d.rooms.map(r=>`
      <div class="room">

        <b>${r.name}</b><br>

        <small>
          ${r.playerCount}/${r.maxPlayers} players · ${r.status}
        </small><br>

        <button onclick="joinRoom(${r.id})">
          Join Room
        </button>

      </div>
    `).join("") || "No rooms available.";
}

async function createRoom(){

  try{

    const d=await api("/api/rooms",{
      method:"POST",
      body:JSON.stringify({
        name:"Ludo Room",
        maxPlayers:4
      })
    });

    openGame(d.room);

  }catch(e){

    alert(e.message);

  }
}

async function joinRoom(id){

  try{

    const d=await api(`/api/rooms/${id}/join`,{
      method:"POST"
    });

    openGame(d.room);

  }catch(e){

    alert(e.message);

  }
}

function openGame(room){

  currentRoom=room;

  $("home").hidden=true;
  $("auth").hidden=true;
  $("gameView").hidden=false;

  $("gameTitle").textContent=room.name;

  $("gamePlayers").textContent=
    `${room.players.length}/${room.maxPlayers} players`;

  renderGame();

  startPolling();
}

function leaveGame(){

  stopPolling();

  currentRoom=null;

  showHome();
}

function startPolling(){

  stopPolling();

  refreshGame();

  pollTimer=setInterval(
    refreshGame,
    1200
  );
}

function stopPolling(){

  if(pollTimer){
    clearInterval(pollTimer);
  }

  pollTimer=null;
}

async function refreshGame(){

  if(!currentRoom) return;

  try{

    const d=await api(
      `/api/rooms/${currentRoom.id}/state`
    );

    currentRoom=d.room;

    renderGame();

  }catch(e){

    console.log(e.message);

  }
}

function myId(){

  try{

    const payload=token.split(".")[1];

    let base64=payload
      .replace(/-/g,"+")
      .replace(/_/g,"/");

    while(base64.length%4){
      base64+="=";
    }

    return Number(
      JSON.parse(atob(base64)).id
    );

  }catch{

    return null;

  }
}

function renderGame(){

  if(!currentRoom) return;

  const state=currentRoom.gameState;

  const colors=[
    "red",
    "green",
    "blue",
    "yellow"
  ];

  const playerText=
    currentRoom.players.map((p,i)=>
      `${["🔴","🟢","🔵","🟡"][i]||"⚪"} ${p.username}`
    ).join(" · ");

  $("game").innerHTML=`

    <div class="players-line">
      ${playerText}
    </div>

    <div class="board" id="board"></div>

    <div class="dicebox">

      <div id="dice" class="dice">
        ${
          currentRoom.diceValue
          ? `🎲 ${currentRoom.diceValue}`
          : "🎲"
        }
      </div>

      <button
        class="game-btn"
        id="startBtn"
        onclick="startGame(${currentRoom.id})">

        Start Game

      </button>

      <button
        class="game-btn"
        id="rollBtn"
        onclick="rollDice(${currentRoom.id})">

        Roll Dice

      </button>

      <div id="turn" class="turn"></div>

    </div>

    <div
      id="tokenActions"
      class="token-actions">
    </div>

    <div class="hint">
      Game state server par sync ho raha hai.
    </div>
  `;

  drawBoard(state);

  updateControls();
}

function drawBoard(state){

  const b=$("board");

  if(!b) return;

  b.innerHTML="";

  for(let r=0;r<15;r++){

    for(let c=0;c<15;c++){

      const x=document.createElement("div");

      x.className="cell";

      if(r<6 && c<6)
        x.classList.add("base-red");

      else if(r<6 && c>8)
        x.classList.add("base-green");

      else if(r>8 && c<6)
        x.classList.add("base-blue");

      else if(r>8 && c>8)
        x.classList.add("base-yellow");

      else if(
        r>=6 &&
        r<=8 &&
        c>=6 &&
        c<=8
      )
        x.classList.add("center");

      b.appendChild(x);
    }
  }

  if(!state?.positions) return;

  const colors=[
    "red",
    "green",
    "blue",
    "yellow"
  ];

  currentRoom.players.forEach((p,i)=>{

    (state.positions[p.id]||[]).forEach(pos=>{

      if(pos<0) return;

      const n=Math.min(224,pos);

      const t=document.createElement("div");

      t.className=
        `token ${colors[i%4]}`;

      t.title=p.username;

      if(b.children[n]){
        b.children[n].appendChild(t);
      }

    });

  });
}

function updateControls(){

  const state=currentRoom.gameState;

  const me=myId();

  const myTurn=
    currentRoom.currentTurn===me;

  const turnPlayer=
    currentRoom.players.find(
      p=>p.id===currentRoom.currentTurn
    );

  $("startBtn").style.display=
    currentRoom.status==="waiting"
    ? "inline-block"
    : "none";

  $("rollBtn").disabled=!(
    currentRoom.status==="playing" &&
    myTurn &&
    !currentRoom.diceValue
  );

  if(currentRoom.status==="waiting"){

    $("turn").textContent=
      "Waiting for players...";

  }

  else if(currentRoom.status==="finished"){

    const w=
      currentRoom.players.find(
        p=>p.id===state?.winner
      );

    $("turn").textContent=
      `🏆 Winner: ${w?.username||"Player"}`;

  }

  else{

    $("turn").textContent=
      myTurn
      ? "👉 Your turn"
      : "⏳ "+(turnPlayer?.username||"Player")+"'s turn";

  }

  const box=$("tokenActions");

  box.innerHTML="";

  if(
    currentRoom.status==="playing" &&
    myTurn &&
    currentRoom.diceValue
  ){

    for(let i=0;i<4;i++){

      const b=
        document.createElement("button");

      b.className=
        "game-btn token-btn";

      b.textContent=
        `Token ${i+1} Move`;

      b.onclick=()=>moveToken(i);

      box.appendChild(b);
    }
  }
}

async function startGame(id){

  try{

    const d=await api(
      `/api/rooms/${id}/start`,
      {
        method:"POST"
      }
    );

    currentRoom=d.room;

    renderGame();

  }catch(e){

    alert(e.message);

  }
}

async function rollDice(id){

  try{

    const d=await api(
      `/api/rooms/${id}/dice`,
      {
        method:"POST"
      }
    );

    currentRoom=d.room;

    renderGame();

  }catch(e){

    alert(e.message);

  }
}

async function moveToken(index){

  try{

    const d=await api(
      `/api/rooms/${currentRoom.id}/move`,
      {
        method:"POST",
        body:JSON.stringify({
          tokenIndex:index
        })
      }
    );

    currentRoom=d.room;

    renderGame();

    if(currentRoom.status==="finished"){

      await loadProfile();
      await loadLeaderboard();

    }

  }catch(e){

    alert(e.message);

  }
}

function logout(){

  stopPolling();

  token=null;
  currentRoom=null;

  localStorage.removeItem(
    "ludo_token"
  );

  $("home").hidden=true;
  $("gameView").hidden=true;
  $("auth").hidden=false;
  $("status").textContent="Offline";

  showLogin();
}

if(token){

  showHome();

}else{

  showLogin();

}
