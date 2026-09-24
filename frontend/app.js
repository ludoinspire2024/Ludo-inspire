const API =
"https://ludo-inspire.onrender.com";

let token =
localStorage.getItem("ludo_token");


async function api(path,options={}){

  options.headers={
    ...(options.headers || {}),
    "Content-Type":"application/json"
  };

  if(token){

    options.headers.Authorization =
      "Bearer " + token;

  }

  const response =
    await fetch(API + path,options);

  const data =
    await response.json()
    .catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error || "Request failed"
    );

  }

  return data;
}


/* LOGIN */

function openLogin(){

  document.getElementById(
    "loginModal"
  ).style.display="grid";

}


function closeLogin(){

  document.getElementById(
    "loginModal"
  ).style.display="none";

}


/* REGISTER */

async function register(){

  const email =
    document.getElementById("email")
    .value.trim();

  const password =
    document.getElementById("password")
    .value;

  const username =
    document.getElementById("username")
    .value.trim();

  try{

    const data =
      await api(
        "/api/auth/register",
        {
          method:"POST",

          body:JSON.stringify({
            username,
            email,
            password
          })
        }
      );

    token=data.token;

    localStorage.setItem(
      "ludo_token",
      token
    );

    closeLogin();

    openGame();

  }catch(error){

    document.getElementById(
      "message"
    ).textContent=
      error.message;

  }

}


/* LOGIN */

async function login(){

  const email =
    document.getElementById("email")
    .value.trim();

  const password =
    document.getElementById("password")
    .value;

  try{

    const data =
      await api(
        "/api/auth/login",
        {
          method:"POST",

          body:JSON.stringify({
            email,
            password
          })
        }
      );

    token=data.token;

    localStorage.setItem(
      "ludo_token",
      token
    );

    closeLogin();

    openGame();

  }catch(error){

    document.getElementById(
      "message"
    ).textContent=
      error.message;

  }

}


/* GAME */

async function openGame(){

  const panel =
    document.getElementById(
      "panel"
    );

  const content =
    document.getElementById(
      "panel-content"
    );

  panel.style.display="block";

  if(!token){

    content.innerHTML=`
      <h3>🎲 Ludo Game</h3>

      <p>
        Game start karne ke liye
        pehle Login/Register karein.
      </p>

      <button
        onclick="openLogin()">

        LOGIN

      </button>
    `;

    return;
  }


  try{

    const profile =
      await api("/api/me");

    const rooms =
      await api("/api/rooms");


    let html=`

      <h3>
        Welcome
        ${profile.user.username} 👋
      </h3>

      <p>
        🪙
        ${profile.user.coins}
        virtual coins
      </p>

      <button
        onclick="createRoom()">

        CREATE ROOM

      </button>

      <hr>

      <h3>
        Available Rooms
      </h3>

    `;


    if(!rooms.rooms.length){

      html +=
        "<p>No rooms available.</p>";

    }


    rooms.rooms
      .slice(0,10)
      .forEach(room=>{

        html += `

          <div
            style="
            padding:9px;
            border-top:1px solid #54233f;
            "
          >

            <b>
              ${room.name}
            </b>

            <br>

            ${room.playerCount}/
            ${room.maxPlayers}
            players

            <button
              onclick="
              joinRoom(${room.id})
              ">

              JOIN

            </button>

          </div>

        `;

      });


    content.innerHTML=html;

  }catch(error){

    content.innerHTML=
      "<p>"+error.message+"</p>";

  }

}


/* CREATE ROOM */

async function createRoom(){

  try{

    await api(
      "/api/rooms",
      {
        method:"POST",

        body:JSON.stringify({
          name:"Ludo Room",
          maxPlayers:4
        })
      }
    );

    openGame();

  }catch(error){

    alert(error.message);

  }

}


/* JOIN ROOM */

async function joinRoom(id){

  try{

    await api(
      "/api/rooms/"+id+"/join",
      {
        method:"POST"
      }
    );

    openGame();

  }catch(error){

    alert(error.message);

  }

}


/* LEADERBOARD */

async function leaderboard(){

  const panel =
    document.getElementById(
      "panel"
    );

  const content =
    document.getElementById(
      "panel-content"
    );

  panel.style.display="block";


  if(!token){

    openLogin();

    return;

  }


  try{

    const data =
      await api(
        "/api/leaderboard"
      );


    let html=`

      <h3>
        🏆 Leaderboard
      </h3>

    `;


    data.leaderboard
      .slice(0,10)
      .forEach((user,index)=>{

        html += `

          <div
            style="
            padding:8px;
            border-bottom:
            1px solid #54233f;
            "
          >

            ${index+1}.
            <b>
              ${user.username}
            </b>

            —
            ${user.wins}
            wins

            ·

            ${user.coins}
            coins

          </div>

        `;

      });


    content.innerHTML=html;

  }catch(error){

    content.innerHTML=
      "<p>"+error.message+"</p>";

  }

}


/* CLOSE PANEL */

function closePanel(){

  document.getElementById(
    "panel"
  ).style.display="none";

}
