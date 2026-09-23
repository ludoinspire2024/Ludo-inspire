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
    return res.status(409).json({error:"Game is not playing"});

  if(r.currentTurn!==req.user.id)
    return res.status(403).json({error:"Not your turn"});

  if(!r.diceValue)
    return res.status(409).json({error:"Roll dice first"});

  if(!Number.isInteger(tokenIndex)||tokenIndex<0||tokenIndex>3)
    return res.status(400).json({error:"Invalid token"});

  let state={positions:{}};

  try{
    if(r.gameState)
      state=JSON.parse(r.gameState);
  }catch{}

  if(!state.positions)
    state.positions={};

  if(!state.positions[req.user.id])
    state.positions[req.user.id]=[-1,-1,-1,-1];

  const pos=state.positions[req.user.id][tokenIndex];

  if(pos<0 && r.diceValue!==6)
    return res.status(409).json({
      error:"Token home me hai. 6 chahiye."
    });

  const newPos=Math.min(
    56,
    pos<0 ? 0 : pos+r.diceValue
  );

  state.positions[req.user.id][tokenIndex]=newPos;
  state.lastMove={
    userId:req.user.id,
    tokenIndex,
    dice:r.diceValue
  };

  const won=
    state.positions[req.user.id]
      .every(x=>x===56);

  if(won){

    state.winner=req.user.id;

    db.prepare(`
      UPDATE users
      SET wins=wins+1
      WHERE id=?
    `).run(req.user.id);

    db.prepare(`
      UPDATE rooms
      SET status='finished',
          dice_value=NULL,
          game_state=?
      WHERE id=?
    `).run(JSON.stringify(state),id);

  }else{

    const i=r.players.findIndex(
      x=>x.id===req.user.id
    );

    const nextPlayer=
      r.players[(i+1)%r.players.length].id;

    db.prepare(`
      UPDATE rooms
      SET current_turn=?,
          dice_value=NULL,
          game_state=?
      WHERE id=?
    `).run(
      nextPlayer,
      JSON.stringify(state),
      id
    );
  }

  res.json({
    room:room(id)
  });
});
app.get("/api/rooms/:id/state",auth,(req,res)=>{
  const r=room(+req.params.id);

  if(!r)
    return res.status(404).json({
      error:"Room not found"
    });

  let state={
    positions:{}
  };

  try{
    if(r.gameState)
      state=JSON.parse(r.gameState);
  }catch{}

  r.gameState=state;

  res.json({
    room:r
  });
});
