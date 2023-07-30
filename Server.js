//As of 7/15/2023 there is not an official node implementation of webgpu so I scrapped compute shaders on the server side for now.
//Eventually you would want to use native gpu stuff since you know the server's gpu.

var express = require('express');
var path = require('path');
var app = express();

app.use(express.static(path.join(__dirname, 'frontend')));

var http = require('http');
var server = http.createServer(app);
var Server = require("socket.io").Server;
var io = new Server(server);
app.get('/', function (req, res) {
    res.sendFile(__dirname + 'frontend/index.html');
});

const defaultShipSchematic = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 6, 5, 5, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 6, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

let shipSchematics = [];
let shipCount = 0;

let lobbyPlayerCount = 0;
const lobbyPlayerMax = 16;
let lobbyMapName = "Unnamed Map";
let pressedKeys = [];
let clientUsernames = [];

//let playerClientMap = {};
let clientPlayerMap = {};

function AssignClientID(pSocketID) {
    /*
    for(let i = 0; i < clientIDsTaken.length; i++) {
        if (clientIDsTaken[i] == false) {
            //Add to playerClientMap so that it can be used in server loop
            playerClientMap[i] = socketID;
            return i;
        }
    }

    */
    const nextPlayer = shipVectorArray.length/shipVectorSize;

    //playerClientMap[nextPlayer] = socketID;
    clientPlayerMap[pSocketID] = nextPlayer;

    //return nextPlayer;
    //return -1;
}

io.on('connection', function (socket) {
    console.log('a user connected');
    let socketID = socket.id;
    let assignedGameInfo = false;
    let clientTeam;
    socket.on("firstContact", function(data) {
        console.log(data);
        lobbyPlayerCount += 1;

        socket.emit("initialInformation", lobbyPlayerCount, lobbyPlayerMax);
    });
    socket.on("playerInfo", function(data) {
        console.log(data);
        assignedGameInfo = true;

        AssignClientID(socket.id);
        pressedKeys.push(new Set());

        clientUsernames.push(data.proposedUsername); //username could be checked for profanity on server side
        clientTeam = Number(data.team);

        //console.log(clientUsernames);

        shipCount += 1;

        const shipSpawnX = 0.2*(shipCount-1);
        const shipSpawnY = 0.2*(shipCount-1);

        shipVectorArray.push(shipSpawnX, shipSpawnY, 0, 0, clientTeam, 0, 512, 0, 0, standardShipWidth*standardShipHeight/2, shipSpawnX, shipSpawnY);

        let newSchematic = JSON.parse(data.shipSchematic);

        if (newSchematic.length == standardShipWidth*standardShipHeight) {
            shipSchematics.push(newSchematic);
        }
        else {
            shipSchematics.push(defaultShipSchematic);
        }

        for (let i = 0; i < standardShipWidth*standardShipHeight; i++) {
            const whichShip = shipCount - 1;
            const whereInShip = i;
        
            console.log("Line 95", shipCount);
            let cellType = shipSchematics[whichShip][whereInShip];
    
            cellStateArray.push(cellType);
    
            if (cellType == hubCellIndex) {
                shipVectorArray[whichShip*shipVectorSize + 9] = whereInShip;
            }
            if (cellType == thrusterCellIndex) {
                shipVectorArray[whichShip*shipVectorSize + 5] += 1;
            }
            if (cellType > numTileTextures) {
                cellType = 0;
            }
        }
        socket.emit("synchronizeInformation", shipVectorArray, cellStateArray, bulletVectorArray, shipCount, bulletIndex, step, clientPlayerMap[socketID], clientUsernames, true);
    });
    socket.on("playerUpdate", function(data) {
        console.log(data);
        
        pressedKeys[clientPlayerMap[socketID]] = new Set(data.pressedKeys);

        shipVectorArray[clientPlayerMap[socketID]*shipVectorSize + 10] = data.aimPoint.x;
        shipVectorArray[clientPlayerMap[socketID]*shipVectorSize + 11] = data.aimPoint.y;
    });
    socket.on("disconnect", function(data) {
        console.log(data);
        console.log("disconnect");

        if (!assignedGameInfo) {
            return;
        }
        const leavingPlayerID = clientPlayerMap[socketID];
        
        const clientPlayerMapArray = Object.keys(clientPlayerMap);

        clientPlayerMapArray.forEach((client) => {
            //console.log(`SocketID = ${client}`);
            if (clientPlayerMap[client] > leavingPlayerID) {
                clientPlayerMap[client] -= 1;
            }
        });

        //playerClientMap[clientID] = 
        shipCount -= 1;

        delete clientPlayerMap[socketID];

        pressedKeys.splice(leavingPlayerID, 1);
        clientUsernames.splice(leavingPlayerID, 1);
        shipVectorArray.splice(leavingPlayerID*shipVectorSize, shipVectorSize);
        cellStateArray.splice(leavingPlayerID*standardShipWidth*standardShipHeight, standardShipWidth*standardShipHeight);
        shipSchematics.splice(leavingPlayerID*standardShipWidth*standardShipHeight, standardShipWidth*standardShipHeight);
    });
});
server.listen(50000, function () {
    console.log('listening on *:50000');
});

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Rectangle {
    x;
    y;
    w;
    h;
    
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    containsPoint(point) {
        //Check if x and y of the point are within the rectangle
        if((point.x > this.x) && (point.x < this.x + this.w) && (point.y > this.y) && (point.y < this.y + this.h)){
            return true;
        }
        return false;
    }

    overlapsRectangle(rect){
        // Takes in a rectangle and checks if it overlaps
        if(this.x < rect.x + rect.w && this.x + this.w > rect.x && this.y  > rect.y + rect.h && this.y + this.h < rect.y){
            return true;
        }
        return true;
    }

}

const standardShipWidth = 16;
const standardShipHeight = 8;

let lockMouse = true;
let focusMouse = true;

const thrusterForce = 0.001;
const bulletSpeed = 0.006;
const standardCellSize = 0.02;

//Armor ranges from destroyedCellIndex to highestArmorIndex
//Each shot lowers block value by 1
const destroyedCellIndex = 0; 
const highestArmorIndex = 5;
const thrusterCellIndex = 7;
const gunCellIndex = 6;
const hubCellIndex = 8;

//Create an array of "vectors" representing the active state of each ship.
const shipVectorSize = 12;
//0  x
//1  y
//2  xvel
//3  yvel
//4  team
//5  thruster count
//6  mass
//7  x mass moment
//8  y mass moment
//9  hub index
//10 x aim spot
//11 y aim spot
const shipVectorArray = []; //Need to implement different ship sizes later

//Create an array of "vectors" representing the active state of each bullet.
const maximumBullets = 256;
const bulletVectorSize = 5;
//0  x
//1  y
//2  xvel
//3  yvel
//4  team
let bulletVectorArray = [];

//MADE UP BULLETS
bulletVectorArray.push(0.3, 0.3, 0, 0, 1);
bulletVectorArray.push(0.3, 0.5, 0, 0, 1);

//Massive array of all cells/blocks within all ships. Assumes standard ship size
let cellStateArray = [];

const numTileTextures = 18;

function MakeUpInformation() {
    //UNUSED
    //For reference
    shipVectorArray[0] = 0.1; //x
    shipVectorArray[1] = 0.1; //y
    shipVectorArray[2] = 0; //xvel
    shipVectorArray[3] = 0; //yvel
    shipVectorArray[4] = 0; //team
    shipVectorArray[5] = 0; //thrusters
    shipVectorArray[6] = 512; //mass
    shipVectorArray[7] = 0; //x area moment
    shipVectorArray[8] = 0; //y area moment
    shipVectorArray[9] = standardShipWidth*standardShipWidth/2; //hub index

    shipVectorArray[10] = 0.7;
    shipVectorArray[11] = 0.7;
    shipVectorArray[12] = 0.0000;
    shipVectorArray[13] = 0;
    shipVectorArray[14] = 1;
    shipVectorArray[15] = 0;
    shipVectorArray[16] = 512;
    shipVectorArray[17] = 0; //x area moment
    shipVectorArray[18] = 0; //y area moment
    shipVectorArray[19] = standardShipWidth*standardShipWidth/2;

    bulletVectorArray[0] = 0.3;
    bulletVectorArray[1] = 0.3;
    bulletVectorArray[2] = 0.000;
    bulletVectorArray[3] = 0.000;
    bulletVectorArray[4] = 1;

    bulletVectorArray[5] = 0.3;
    bulletVectorArray[6] = 0.5;
    bulletVectorArray[7] = -0.000;
    bulletVectorArray[8] = 0.000;
    bulletVectorArray[9] = 1;

    shipSchematics = [[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 0, 0, 0, 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 0, 0, 0, 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 6, 5, 5, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 6, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]];

    for (let i = 0; i < cellStateArray.length; i++) {
        //const whichShip = Math.floor((i*numShips)/cellStateArray.length);
        //const whereInShip = (i*numShips)%cellStateArray.length;
        const whichShip = indexToShip(i, shipCount, cellStateArray.length);
        const whereInShip = totalIndexToShipIndex(i, shipCount, cellStateArray.length);
    
        let cellType = shipSchematics[whichShip][whereInShip];

        cellStateArray[i] = cellType;

        if (cellType == hubCellIndex) {
            shipVectorArray[whichShip*shipVectorSize + 9] = whereInShip;
        }
        if (cellType > numTileTextures) {
            cellType = 0;
        }
    }
}

function GridConnectednessCheck(grid, startPoints, numShips) {
    let BFScolors = Array.from(grid); //Using a copy of the ship grid because that narrows out already-destroyed blocks.
    //We can ignore destroyed and already-discovered blocks when we check for a connection

    //Version of breadth-first-search / flood fill search
    for (let i = 0; i < numShips; i++) {

        const gridIndexOffset = i*standardShipWidth*standardShipHeight;

        let BFSqueue = [];

        if(BFScolors[startPoints[i] + gridIndexOffset] == destroyedCellIndex) {
            continue;
        }

        BFSqueue.push(shipIndexToGridLocation(startPoints[i], standardShipWidth));
        while(BFSqueue.length != 0) {
            let u = BFSqueue[0];
            let v = new Point(u.x - 1, u.y);
            let gridIndex = v.y*standardShipWidth + v.x + gridIndexOffset;
            //console.log(gridIndex);
            if (v.x >= 0 && BFScolors[gridIndex] != -1 && BFScolors[gridIndex] != destroyedCellIndex) {
                BFScolors[gridIndex] = -1; //Setting to -1 since no ship grid block uses that index. This means it is reserved for this
                BFSqueue.push(v);
            }
            v = new Point(u.x + 1, u.y);
            gridIndex = v.y*standardShipWidth + v.x + gridIndexOffset;
            if (v.x <= standardShipWidth - 1 && BFScolors[gridIndex] != -1 && BFScolors[gridIndex] != destroyedCellIndex) {
                BFScolors[gridIndex] = -1;
                BFSqueue.push(v);
            }
            v = new Point(u.x, u.y - 1);
            gridIndex = v.y*standardShipWidth + v.x + gridIndexOffset;
            if (v.y >= 0 && BFScolors[gridIndex] != -1 && BFScolors[gridIndex] != destroyedCellIndex) {
                BFScolors[gridIndex] = -1;
                BFSqueue.push(v);
            }
            v = new Point(u.x, u.y + 1);
            gridIndex = v.y*standardShipWidth + v.x + gridIndexOffset;
            if (v.y <= standardShipHeight - 1 && BFScolors[gridIndex] != -1 && BFScolors[gridIndex] != destroyedCellIndex) {
                BFScolors[gridIndex] = -1;
                BFSqueue.push(v);
            }
            BFSqueue.shift();
        }
    }

    return BFScolors;
}

const UPDATE_INTERVAL = 50;
let step = 0; //Track how many simulation steps have been run

let bulletIndex = 10;

const SYNC_UPDATE_INTERVAL = 400; //Make this a multiple of the UPDATE_INTERVAL so it runs in integer steps

const SLOW_UPDATE_INTERVAL = 1000; //Make this a multiple of the UPDATE_INTERVAL so it runs in integer steps

const SLOW_SYNC_UPDATE_INTERVAL = 4000; //Make this a multiple of the SLOW_UPDATE_INTERVAL so it runs in integer steps

function totalIndexToShipIndex(index, numShips, totalArrayLength) {
    
    //const whereInShip = (index*numShips)%cellStateArray.length;
    const whereInShip = index%(cellStateArray.length/numShips);
    //Returns point within ship given the grid information, index of the entire all-ships array, and which ship
    //const startingIndex = gridXSize*gridYSize*whichShip;
    return whereInShip;//new Point(whereInShip%gridXSize, Math.floor(whereInShip/gridXSize))
}

function shipIndexToGridLocation(shipIndex, gridWidth) {
    return new Point(shipIndex%gridWidth, Math.floor(shipIndex/gridWidth));
}

function indexToShip(index, numShips, totalArrayLength) { //Could be combined with function above but doesnt matter.
    return Math.floor((index*numShips)/totalArrayLength);
}

function shipAndLocationToIndex(whichShip, gridWidth, gridHeight, x, y) {
    return whichShip*gridWidth*gridHeight + y*gridWidth + x;
}

let serverLoop;
//serverLoop = setInterval(ServerLoop, UPDATE_INTERVAL);
expectedServerLoopTime = Date.now() + UPDATE_INTERVAL;
clientLoopTimeout = setTimeout(ServerLoop, UPDATE_INTERVAL);//setInterval(ClientLoop, UPDATE_INTERVAL);
//MakeUpInformation();

//let oldTime = Date.now();

function ServerLoop() {
    //https://stackoverflow.com/questions/29971898/how-to-create-an-accurate-timer-in-javascript
    const drift = Date.now() - expectedServerLoopTime; //Drift (positive means it took too long)
    if (drift > UPDATE_INTERVAL) {
        //Possibly special handling to avoid futile "catch up" run
    }
    ServerFrame();
    step++;
    //const timeElapsed = Date.now()-oldTime;
    //console.log(timeElapsed/step);
    //console.log(step);

    expectedServerLoopTime += UPDATE_INTERVAL;
    clientLoopTimeout = setTimeout(ServerLoop, Math.max(0, UPDATE_INTERVAL - drift));
}

// Move all of our rendering code into a function
function ServerFrame() {         
    //CPU version of the bullet compute shader
    //Cell shader unnecessary
    for(let i=0; i < bulletVectorArray.length; i+=bulletVectorSize) {

        bulletVectorArray[i] += bulletVectorArray[i + 2];
        bulletVectorArray[i + 1] += bulletVectorArray[i + 3];

        //TODO: Add checking the team of the bullet
        for(let j=0; j<shipCount; j++) {
            if (bulletVectorArray[i + 4] == shipVectorArray[j*shipVectorSize + 4]) {
                continue;
            }
            let shipBoundingBox = new Rectangle(shipVectorArray[j*shipVectorSize], shipVectorArray[j*shipVectorSize + 1], standardCellSize*standardShipWidth, standardCellSize*standardShipHeight);
            let bulletPoint = new Point(bulletVectorArray[i], bulletVectorArray[i + 1])
            //console.log("containtsPoint");
            /*
            let bulletPoint = new Point(bulletVectorArray[i], bulletVectorArray[i + 1])
            if(bulletVectorArray[i] >0) {
                console.log(bulletPoint);
            }
            console.log(shipBoundingBox.containsPoint(bulletPoint));*/
            if(shipBoundingBox.containsPoint(bulletPoint)) {
                //console.log("containsPoint");
                const xBlocksInside = Math.floor((bulletVectorArray[i]-shipVectorArray[j*shipVectorSize]) / standardCellSize);
                const yBlocksInside = Math.floor((bulletVectorArray[i + 1]-shipVectorArray[j*shipVectorSize + 1]) / standardCellSize);

                //console.log("xBlocksInside:"+xBlocksInside);

                const cellHit = shipAndLocationToIndex(j, standardShipWidth, standardShipHeight, xBlocksInside, yBlocksInside)
                if (cellStateArray[cellHit] != destroyedCellIndex) {
                    if (cellStateArray[cellHit] <= highestArmorIndex) {
                        cellStateArray[cellHit] -= 1;
                    }
                    else {
                        cellStateArray[cellHit] = destroyedCellIndex;
                    }
                    bulletVectorArray[i] = 0;
                    bulletVectorArray[i + 1] = 0;
                    bulletVectorArray[i + 2] = 0;
                    bulletVectorArray[i + 3] = 0;
                    bulletVectorArray[i + 4] = 0;
                }
            }
        }
    }

    //console.log("shipVectorArray.length",shipVectorArray.length);
    for(let i = 0; i < shipVectorArray.length; i+= shipVectorSize) {
        let impartedXVel = 0;
        let impartedYVel = 0;
        //console.log("i/shipVectorSize",i/shipVectorSize);
        if(pressedKeys[i/shipVectorSize].has(65)){
            impartedXVel -= 1;
        }
        if(pressedKeys[i/shipVectorSize].has(68)) {
            impartedXVel += 1;
        }
        if(pressedKeys[i/shipVectorSize].has(87)) {
            impartedYVel += 1;
        }
        if(pressedKeys[i/shipVectorSize].has(83)){
            impartedYVel -= 1;
        }
        const impartedVelNormalizer = (impartedXVel**2 + impartedYVel**2)**0.5;
        impartedXVel *= impartedVelNormalizer*thrusterForce*shipVectorArray[5]/shipVectorArray[6];
        impartedYVel *= impartedVelNormalizer*thrusterForce*shipVectorArray[5]/shipVectorArray[6];

        if (Math.abs(4*impartedXVel+shipVectorArray[i+2]) < Math.abs(shipVectorArray[i+2])) {
            impartedXVel*=4;
        }
        if (Math.abs(4*impartedYVel+shipVectorArray[i+3]) < Math.abs(shipVectorArray[i+3])) {
            impartedYVel*=4;
        }

        if (Math.abs(shipVectorArray[i+2]) < 0.05/shipVectorArray[i+6] && !pressedKeys[i/shipVectorSize].has(65) && !pressedKeys[i/shipVectorSize].has(68)) { //can probably move this somewhere else
            shipVectorArray[i+2] = 0;
        }
        if (Math.abs(shipVectorArray[i+3]) < 0.05/shipVectorArray[i+6] && !pressedKeys[i/shipVectorSize].has(87) && !pressedKeys[i/shipVectorSize].has(83)) {
            shipVectorArray[i+3] = 0;
        }
        shipVectorArray[i+2] += impartedXVel;
        shipVectorArray[i+3] += impartedYVel;

        shipVectorArray[i] += shipVectorArray[i + 2];
        shipVectorArray[i+1] += shipVectorArray[i + 3];
    }
    
    if (step % (SYNC_UPDATE_INTERVAL/UPDATE_INTERVAL) == 0) {
        const socketIDArray = Object.keys(clientPlayerMap);
        for (let i =0; i < socketIDArray.length; i++) {
            io.to(socketIDArray[i]).emit("updateInformation", shipVectorArray, clientPlayerMap[socketIDArray[i]]);
        }
    }

    if (step % (SLOW_UPDATE_INTERVAL/UPDATE_INTERVAL) == 0) {
        let shipHubs = []

        for (let i = 0; i < shipCount; i += 1) {
            shipHubs.push(shipVectorArray[shipVectorSize*i + 9]);
        }

        //I wanted to keep GridConnectednessCheck as a function on the entire cellData as opposed to running it once per ship.
        //This explains the shipHubs parameter
        let BFScolorsResult = GridConnectednessCheck(cellStateArray, shipHubs, shipCount);

        for (let i = 0; i < shipCount; i += 1) { //disgusting programming
            shipVectorArray[shipVectorSize*i + 6] = 1;
            shipVectorArray[shipVectorSize*i + 5] = 0;
            shipVectorArray[shipVectorSize*i + 7] = 0;
            shipVectorArray[shipVectorSize*i + 8] = 0;
            for (let j = 0; j < BFScolorsResult.length/shipCount; j += 1) {
                const offset = standardShipHeight*standardShipWidth*i;
                if (BFScolorsResult[j+offset] !== destroyedCellIndex) {
                    shipVectorArray[shipVectorSize*i + 6] += 1;
                    const gridLocationOfCell = shipIndexToGridLocation(j, standardShipWidth);
                    shipVectorArray[shipVectorSize*i + 7] += 1*gridLocationOfCell.x;
                    shipVectorArray[shipVectorSize*i + 8] += 1*gridLocationOfCell.y;
                    if (BFScolorsResult[j+offset] !== -1) {
                        cellStateArray[j+offset] = destroyedCellIndex;
                    }
                    if (cellStateArray[j+offset] == thrusterCellIndex) {
                        shipVectorArray[shipVectorSize*i + 5] += 1;
                    }
                }
            }
        }

        for (let i = 0; i < shipCount; i += 1) { //each ship
            //console.log(shipVectorArray);
            const shipXPos = shipVectorArray[i*shipVectorSize];
            const shipYPos = shipVectorArray[i*shipVectorSize + 1];
            const shipXVel = shipVectorArray[i*shipVectorSize + 2];
            const shipYVel = shipVectorArray[i*shipVectorSize + 3];

            const shipTeam = shipVectorArray[i*shipVectorSize + 4];
            const xHubPos = shipXPos+(shipVectorArray[i*shipVectorSize + 9]%standardShipWidth)*standardCellSize; //eventually each ship should have different hub
            const yHubPos = shipYPos+(Math.floor(shipVectorArray[i*shipVectorSize + 9]/standardShipWidth))*standardCellSize;

            const spotToHitX = shipVectorArray[i*shipVectorSize + 10];//(cameraUniformArray[0])/2 + drawMouseX-standardCellSize/2;
            const spotToHitY = shipVectorArray[i*shipVectorSize + 11];//(cameraUniformArray[1])/2 + drawMouseY-standardCellSize/2;

            let xSpawnVel = spotToHitX - xHubPos;
            let ySpawnVel = spotToHitY - yHubPos;

            let velocityNormalizer = Math.pow(Math.pow(xSpawnVel, 2) + Math.pow(ySpawnVel, 2), 0.5);

            xSpawnVel = 0.01 * xSpawnVel/velocityNormalizer;
            ySpawnVel = 0.01 * ySpawnVel/velocityNormalizer;
            for (let j = 0; j < standardShipHeight*standardShipWidth; j += 1) { //each index within ship
                if (cellStateArray[j + standardShipHeight*standardShipWidth*i] == gunCellIndex) {
                    //const locationInGrid = indexToGridLocation(standardShipWidth, i);
                    const locationInGrid = shipIndexToGridLocation(j, standardShipWidth);

                    const xSpawnPos = shipXPos+locationInGrid.x*standardCellSize;
                    const ySpawnPos = shipYPos+locationInGrid.y*standardCellSize;

                    if(focusMouse) {

                        const relativeX = spotToHitX - xSpawnPos;
                        const relativeY = spotToHitY - ySpawnPos;

                        const a = shipXVel**2 + shipYVel**2 - bulletSpeed**2
                        const b = -2 * ((shipXVel*relativeX) + (shipYVel*relativeY));
                        const c = relativeX ** 2 + relativeY**2;

                        let t = 0;
                        if (a == 0) {
                            t = -c/b;
                        }
                        else {
                            const discriminant = (b ** 2) - (4 * a * c);
                            if (discriminant >= 0) {
                                const sqrtDiscriminant = Math.sqrt(discriminant);
                                const t1 = (-b - sqrtDiscriminant) / (2 * a);
                                const t2 = (-b + sqrtDiscriminant) / (2 * a);
                                t = Math.max(t1, t2);
                            } else {
                                // The target is not reachable
                                // Handle this case accordingly
                                console.log("Target is not reachable");
                            }
                        }


                        const targetFutureX = spotToHitX - (shipXVel * t);
                        const targetFutureY = spotToHitY - (shipYVel * t);
                    
                        xSpawnVel = targetFutureX - xSpawnPos;
                        ySpawnVel = targetFutureY - ySpawnPos;

                        velocityNormalizer = Math.pow(Math.pow(xSpawnVel, 2) + Math.pow(ySpawnVel, 2), 0.5);

                        xSpawnVel = bulletSpeed * xSpawnVel/velocityNormalizer + shipXVel;
                        ySpawnVel = bulletSpeed * ySpawnVel/velocityNormalizer + shipYVel;
                    }

                    bulletVectorArray[bulletIndex] = xSpawnPos;
                    bulletVectorArray[bulletIndex + 1] = ySpawnPos;
                    bulletVectorArray[bulletIndex + 2] = xSpawnVel; //xvel
                    bulletVectorArray[bulletIndex + 3] = ySpawnVel; //yvel
                    bulletVectorArray[bulletIndex + 4] = shipTeam; //team
                    bulletIndex+= bulletVectorSize;
                    if (bulletIndex >= maximumBullets*bulletVectorSize) {
                        bulletIndex = 0;
                    }
                }
            }
        }

        if (step % (SLOW_SYNC_UPDATE_INTERVAL/UPDATE_INTERVAL) == 0) {
            const socketIDArray = Object.keys(clientPlayerMap);
            for (let i =0; i < socketIDArray.length; i++) {
                io.to(socketIDArray[i]).emit("synchronizeInformation", shipVectorArray, cellStateArray, bulletVectorArray, shipCount, bulletIndex, step, clientPlayerMap[socketIDArray[i]], clientUsernames, false);
            }
            //io.emit("synchronizeInformation", shipVectorArray, cellStateArray, bulletVectorArray, shipCount, bulletIndex, step, clientPlayerMap[socketID], false);
        }
    }
    //console.log(step);
}