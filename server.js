try{
  db.exec("ALTER TABLE rooms ADD COLUMN game_state TEXT");
}catch{}
app.post("/api/rooms/:id/dice",auth,(req,res)=>{
  const id=+req.params.id;
  const r=room(id);

  if(!r)
    return res.status(404).json({error:"Room not found"});

  if(r.status!=="playing")
    return res.status(409).json({error:"Game is not playing"});

  if(r.currentTurn!==req.user.id)
    return res.status(403).json({error:"Not your turn"});

  if(r.diceValue)
    return res.status(409).json({error:"Move your token first"});

  const d=1+Math.floor(Math.random()*6);

  db.prepare(`
    UPDATE rooms
    SET dice_value=?
    WHERE id=?
  `).run(d,id);

  res.json({
    dice:d,
    room:room(id)
  });
});
app.post("/api/rooms/:id/move",auth,(req,res)=>{
  const id=+req.params.id;
  const tokenIndex=Number(req.body?.tokenIndex);
  const r=room(id);

  if(!r)
    return res.status(404).json({error:"Room not found"});

  if(r.status!=="playing")
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET || "ludo-inspire-secret";

const dbFile = path.resolve("./data/ludo-inspire.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("foreign_keys=ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  premium INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'waiting',
  current_turn INTEGER,
  dice_value INTEGER,
  created_by INTEGER NOT NULL,
  game_state TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  color TEXT NOT NULL,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(room_id,user_id),
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  user_id INTEGER,
  result TEXT,
  dice_rolls INTEGER DEFAULT 0,
  played_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function sign(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Missing bearer token"
    });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Invalid token"
    });
  }
}

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Ludo Inspire 2 Player API",
    players: 2,
    cashGaming: false
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    appName: "Ludo Inspire",
    players: 2,
    monetization: {
      ads: true,
      subscriptions: true,
      realMoneyGaming: false
    },
    virtualCoins: true,
    features: {
      multiplayer: true,
      tournaments: false,
      leaderboard: true,
      chat: false
    }
  });
});

/* ---------------- AUTH ---------------- */

app.post("/api/auth/register", async (req, res) => {
  const {
    username,
    email,
    password
  } = req.body || {};

  if (
    !username ||
    !email ||
    !password ||
    password.length < 6
  ) {
    return res.status(400).json({
      error: "Username, email and 6+ character password required"
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users
      (username,email,password_hash)
      VALUES (?,?,?)
    `).run(
      username.trim(),
      email.trim().toLowerCase(),
      passwordHash
    );

    const user = db.prepare(`
      SELECT
        id,
        username,
        email,
        coins,
        wins,
        losses,
        premium
      FROM users
      WHERE id=?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      user,
      token: sign(user)
    });

  } catch {
    res.status(409).json({
      error: "Username or email already exists"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  const password = String(req.body?.password || "");

  const user = db.prepare(`
    SELECT *
    FROM users
    WHERE email=?
  `).get(email);

  if (
    !user ||
    !(await bcrypt.compare(password, user.password_hash))
  ) {
    return res.status(401).json({
      error: "Invalid credentials"
    });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      wins: user.wins,
      losses: user.losses,
      premium: user.premium
    },
    token: sign(user)
  });
});

app.get("/api/me", auth, (req, res) => {
  const user = db.prepare(`
    SELECT
      id,
      username,
      email,
      coins,
      wins,
      losses,
      premium,
      created_at AS createdAt
    FROM users
    WHERE id=?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  res.json({ user });
});

/* ---------------- ROOM HELPER ---------------- */

function getRoom(roomId) {
  const room = db.prepare(`
    SELECT
      id,
      name,
      max_players AS maxPlayers,
      status,
      current_turn AS currentTurn,
      dice_value AS diceValue,
      created_by AS createdBy,
      game_state AS gameState
    FROM rooms
    WHERE id=?
  `).get(roomId);

  if (!room) return null;

  room.players = db.prepare(`
    SELECT
      u.id,
      u.username,
      p.color
    FROM room_players p
    JOIN users u
      ON u.id=p.user_id
    WHERE p.room_id=?
    ORDER BY p.joined_at
  `).all(roomId);

  if (room.gameState) {
    try {
      room.gameState = JSON.parse(room.gameState);
    } catch {
      room.gameState = null;
    }
  }

  return room;
}

/* ---------------- CREATE ROOM ---------------- */

app.post("/api/rooms", auth, (req, res) => {
  const name =
    String(req.body?.name || "Ludo Room").trim();

  const result = db.prepare(`
    INSERT INTO rooms
    (name,max_players,created_by)
    VALUES (?,2,?)
  `).run(name, req.user.id);

  db.prepare(`
    INSERT INTO room_players
    (room_id,user_id,color)
    VALUES (?,?,?)
  `).run(
    result.lastInsertRowid,
    req.user.id,
    "green"
  );

  res.status(201).json({
    room: getRoom(result.lastInsertRowid)
  });
});

/* ---------------- ROOM LIST ---------------- */

app.get("/api/rooms", auth, (req, res) => {
  const rooms = db.prepare(`
    SELECT
      r.id,
      r.name,
      r.status,
      COUNT(p.user_id) AS playerCount,
      2 AS maxPlayers
    FROM rooms r
    LEFT JOIN room_players p
      ON p.room_id=r.id
    WHERE r.status='waiting'
    GROUP BY r.id
    ORDER BY r.id DESC
  `).all();

  res.json({ rooms });
});

/* ---------------- ROOM DETAIL ---------------- */

app.get("/api/rooms/:id", auth, (req, res) => {
  const room = getRoom(Number(req.params.id));

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  res.json({ room });
});

/* ---------------- JOIN ROOM ---------------- */

app.post("/api/rooms/:id/join", auth, (req, res) => {
  const roomId = Number(req.params.id);

  const room = getRoom(roomId);

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  if (room.status !== "waiting") {
    return res.status(409).json({
      error: "Game already started"
    });
  }

  if (
    room.players.some(
      player => player.id === req.user.id
    )
  ) {
    return res.json({
      room
    });
  }

  if (room.players.length >= 2) {
    return res.status(409).json({
      error: "Room full"
    });
  }

  db.prepare(`
    INSERT INTO room_players
    (room_id,user_id,color)
    VALUES (?,?,?)
  `).run(
    roomId,
    req.user.id,
    "red"
  );

  res.json({
    room: getRoom(roomId)
  });
});

/* ---------------- START GAME ---------------- */

app.post("/api/rooms/:id/start", auth, (req, res) => {
  const roomId = Number(req.params.id);

  const room = getRoom(roomId);

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  if (room.createdBy !== req.user.id) {
    return res.status(403).json({
      error: "Only room creator can start"
    });
  }

  if (room.players.length !== 2) {
    return res.status(409).json({
      error: "Exactly 2 players are required"
    });
  }

  const firstPlayer = room.players[0];

  const gameState = {
    players: {
      [room.players[0].id]: {
        color: room.players[0].color,
        tokens: [-1, -1, -1, -1],
        finished: 0
      },

      [room.players[1].id]: {
        color: room.players[1].color,
        tokens: [-1, -1, -1, -1],
        finished: 0
      }
    }
  };

  db.prepare(`
    UPDATE rooms
    SET
      status='playing',
      current_turn=?,
      dice_value=NULL,
      game_state=?
    WHERE id=?
  `).run(
    firstPlayer.id,
    JSON.stringify(gameState),
    roomId
  );

  res.json({
    room: getRoom(roomId)
  });
});

/* ---------------- GAME STATE ---------------- */

app.get("/api/rooms/:id/state", auth, (req, res) => {
  const room = getRoom(Number(req.params.id));

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  const player = room.players.find(
    p => p.id === req.user.id
  );

  if (!player) {
    return res.status(403).json({
      error: "You are not in this room"
    });
  }

  res.json({
    room
  });
});

/* ---------------- DICE ---------------- */

app.post("/api/rooms/:id/dice", auth, (req, res) => {
  const roomId = Number(req.params.id);

  const room = getRoom(roomId);

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  if (room.status !== "playing") {
    return res.status(409).json({
      error: "Game is not playing"
    });
  }

  if (room.currentTurn !== req.user.id) {
    return res.status(403).json({
      error: "Not your turn"
    });
  }

  const dice = 1 + Math.floor(Math.random() * 6);

  db.prepare(`
    UPDATE rooms
    SET dice_value=?
    WHERE id=?
  `).run(dice, roomId);

  res.json({
    dice,
    room: getRoom(roomId)
  });
});

/* ---------------- MOVE TOKEN ---------------- */

app.post("/api/rooms/:id/move", auth, (req, res) => {
  const roomId = Number(req.params.id);

  const tokenIndex = Number(
    req.body?.tokenIndex
  );

  const room = getRoom(roomId);

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  if (room.status !== "playing") {
    return res.status(409).json({
      error: "Game is not playing"
    });
  }

  if (room.currentTurn !== req.user.id) {
    return res.status(403).json({
      error: "Not your turn"
    });
  }

  if (
    !Number.isInteger(tokenIndex) ||
    tokenIndex < 0 ||
    tokenIndex > 3
  ) {
    return res.status(400).json({
      error: "Invalid token"
    });
  }

  const dice = Number(room.diceValue);

  if (!dice) {
    return res.status(409).json({
      error: "Roll dice first"
    });
  }

  const state = room.gameState;

  if (!state || !state.players[req.user.id]) {
    return res.status(400).json({
      error: "Game state unavailable"
    });
  }

  const playerState =
    state.players[req.user.id];

  let position =
    playerState.tokens[tokenIndex];

  /*
    -1 = home
    0-56 = board
    57 = finished
  */

  if (position === -1) {
    if (dice !== 6) {
      return res.status(409).json({
        error: "You need a 6 to bring token out"
      });
    }

    position = 0;
  } else {
    position += dice;
  }

  if (position > 56) {
    position = 56;
  }

  playerState.tokens[tokenIndex] = position;

  if (position === 56) {
    playerState.finished += 1;
  }

  let winner = null;

  if (playerState.finished >= 4) {
    winner = req.user.id;

    db.prepare(`
      UPDATE users
      SET wins=wins+1
      WHERE id=?
    `).run(req.user.id);

    const opponent = room.players.find(
      p => p.id !== req.user.id
    );

    if (opponent) {
      db.prepare(`
        UPDATE users
        SET losses=losses+1
        WHERE id=?
      `).run(opponent.id);
    }

    db.prepare(`
      UPDATE rooms
      SET
        status='finished',
        game_state=?
      WHERE id=?
    `).run(
      JSON.stringify(state),
      roomId
    );

  } else {

    const currentIndex =
      room.players.findIndex(
        p => p.id === req.user.id
      );

    const nextPlayer =
      room.players[
        (currentIndex + 1) %
        room.players.length
      ];

    db.prepare(`
      UPDATE rooms
      SET
        current_turn=?,
        dice_value=NULL,
        game_state=?
      WHERE id=?
    `).run(
      nextPlayer.id,
      JSON.stringify(state),
      roomId
    );
  }

  res.json({
    winner,
    room: getRoom(roomId)
  });
});

/* ---------------- LEADERBOARD ---------------- */

app.get("/api/leaderboard", auth, (req, res) => {
  const leaderboard = db.prepare(`
    SELECT
      id,
      username,
      coins,
      wins,
      losses,
      premium,
      CASE
        WHEN wins + losses = 0 THEN 0
        ELSE ROUND(
          100.0 * wins /
          (wins + losses),
          2
        )
      END AS winRate
    FROM users
    ORDER BY wins DESC, coins DESC
    LIMIT 100
  `).all();

  res.json({
    leaderboard
  });
});

/* ---------------- HISTORY ---------------- */

app.get("/api/games/history", auth, (req, res) => {
  const games = db.prepare(`
    SELECT
      id,
      room_id AS roomId,
      result,
      dice_rolls AS diceRolls,
      played_at AS playedAt
    FROM games
    WHERE user_id=?
    ORDER BY id DESC
    LIMIT 100
  `).all(req.user.id);

  res.json({
    games
  });
});

/* ---------------- 404 ---------------- */

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found"
  });
});

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(
    `Ludo Inspire 2 Player API running on port ${PORT}`
  );
});
