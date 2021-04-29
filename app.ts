// @ts-ignore
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";

// import socialRoutes from "@colyseus/social/express"

import { GameRoom } from "./src/GameRoom";
import {RoyalMarriage} from "./src/RM_Room"; 
import {RoyalThreeDifference} from "./src/RTD_Room"; 

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json({limit:1024*1024*50}));

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

// register your room handlers
gameServer.define('ORG', GameRoom).filterBy(['maxClients']);
gameServer.define('RM', RoyalMarriage).filterBy(['maxClients']);
gameServer.define('RTD', RoyalThreeDifference).filterBy(['maxClients']);

// register colyseus monitor AFTER registering your room handlers
app.use("/colyseus", monitor());
//app.use('/api', require('./dbscripts/src/routes'))

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)
