/* 
 * What about serving up static content, kind of like apache? 
 * This time, you are required to present a user and password to the login route
 * before you can read any static content.
 */

var process = require('process');
// run ftd.js as 

// nodejs ftd.js PORT_NUMBER
var port = parseInt(process.argv[2]); 
var express = require('express');
var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser()); // parse cookies before processing other middleware

const sqlite3 = require('sqlite3').verbose();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static('static_files')); 

var db = new sqlite3.Database('db/database.db', (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to the database.');
});

function arrayRemove(array, element){

	let index = array.indexOf(element);
	if(index!=-1) array.splice(index,1);
}


// ================================================================================
// ================================================================================
// ================================================================================

class MyErrors{
	constructor(msg = '', statusCode){
		this.message = `Error: ${msg}`;
		this.statusCode = statusCode;
	}
}

// some user-defined errors
class DatabaseError extends MyErrors{
	constructor(msg){super(msg, 500);}
}
class InputError extends MyErrors{
	constructor(msg){super(msg, 400);}
}
class NotFoundError extends MyErrors{
	constructor(msg){super(msg, 404);}
}
class BadAuthError extends MyErrors{
	constructor(msg){super(msg, 401);}
}
class ForbiddenError extends MyErrors{
	constructor(msg){super(msg, 403);}
}
class ConflictError extends MyErrors{
	constructor(msg){super(msg, 409);}
}
class BadWebSocketError extends MyErrors{
	constructor(msg){super(msg, null);}
}

/* throws DatabaseError */
async function queryAll(queryString, params = []){
	return new Promise((resolve, reject) => db.all(
		queryString, 
		params, 
		(err, rows) => (err) ? reject(new DatabaseError(err)) : resolve(Array.from(rows))
	));
}

/* throws DatabaseError */
async function queryRun(queryString, params = []){
	return new Promise(async (resolve, reject) => db.run(
		queryString, 
		params, 
		(err) => (err) ? reject(new DatabaseError(err)) : resolve() 
	));
} 

/* throws DatabaseError, NotFoundError */
async function queryGet(queryString, params = []){
	return new Promise((resolve, reject) => db.get(
		queryString,
		params, 
		(err, row) => {
			if (err){
				reject(new DatabaseError(err));
			} else if (row == null){
				reject(new NotFoundError(`${queryString} < ${params} not found.`));
				// potential security risk ^, don't let client see schema
			} else {
				resolve(row);
			}
		}
	));
}

async function queryExists(queryString, params = []){
	return new Promise(async (resolve, reject) => {
		try {
			await queryGet(queryString, params);
			resolve(true);
		} catch (e) {
			if (e instanceof NotFoundError) {
				resolve(false);
			} else {
				reject(e);
			}
		}
	})
}

// input sanitisation
isAlphaNumeric = (str) => RegExp(/^[\da-z]+$/i).test(str);
isHex = (str) => RegExp(/^[\da-f]+$/i).test(str);
isUsername = (str) => RegExp(/^[\da-z_]{1,20}$/i).test(str);
isNickname = (str) => RegExp(/^[\da-z_ ]{1,20}$/i).test(str);

/* throws InputError, NotFoundError */
async function usernameExists(username){
	if (!isAlphaNumeric(username)){
		throw new InputError(`bad username: ${username}.`);
	}
	try {
		await queryGet(
			'SELECT username FROM user WHERE username =?;',
			[username]
		);
		return true;
	} catch (e){
		if (e instanceof NotFoundError){
			return false;
		} else {
			throw e;
		}
	}
}

/* throws InputError, NotFoundError, BadAuthError */
async function authenticate(username, password){
	if (!isUsername(username)){
		throw new InputError(`bad username: '${username}'.`);
	}
	if (!isHex(password)){
		throw new InputError(`bad password hash: '${password}'.`);
	}
	let user = await queryGet(
		'SELECT password FROM user WHERE username =?;',
		[username]
	);

	if (user.password != password){
		throw new BadAuthError(
			`bad username/password hash combo: '${username}'/'${password}'.`
		);
	}
}

async function handleResponseErrors(e, res){
	if (e instanceof MyErrors){
		res.status(e.statusCode);
	} else {
		res.status(500);
	}
	res.send({error: e.message});
	console.log(e.message);
}


// ================================================================================
// ================================================================================
// ================================================================================
const EventEmitter = require('events');

/* throws BadWebSocket */
class WebSocketStuff {

	static getUsernamePassword(url){
		let usernamePassword = url.match(/\/\?username=(.+)&password=(.+)/i);

		// check if username is defined
		if (usernamePassword == null){
			throw new BadWebSocketError(
				'Someone attempted connection without username and password parameter.'
			);
		}
		return {
			username: usernamePassword[1],
			password: usernamePassword[2]
		}
	}

	static async auth(url, ws){
		try {
			var {username, password} = WebSocketStuff.getUsernamePassword(url);
		} catch (e) {
			ws.send('Format is "/?username=<name>&password=<pass>".');
			throw(e);
		}
		//check if username exists
		try {
			await authenticate(username, password);
		} catch (e) {
			let msg;
			if (e instanceof InputError){
				msg = `attempted connection with bad username/password string: '${username}'/'${password}'.`;
			} else if (e instanceof NotFoundError){
				msg = `attempted connection with unavailable username: '${username}'.`;
			} else if (e instanceof BadAuthError){
				msg = `attempted connection with invalid password: '${password}' for user: '${username}'.`;
			} else {
				throw e;
			}
			ws.send(msg);
			throw new BadWebSocketError('Someone ' + msg);
		}
	}
}

class WebSocketConnections extends EventEmitter{
	constructor(){
		super();
		this.connections = {};
	}

	addConnection(key, webSocket){
		let conn = this.connections[key];

		if (conn){
			conn.add(webSocket);
		} else {
			this.emit('connected', key);
			this.connections[key] = new WebSocketConnection(
				key,
				webSocket
			);
		}
	}

	removeConnection(key, webSocket){
		let conn = this.connections[key];

		conn.remove(webSocket);

		if (conn.isEmpty()){
			this.emit('disconnected', key);
			delete this.connections[key];
		}

	}

	do = (key, func) => this.connections[key].do(func);

	tryToDo(key, func){
		if (isConnected(key)){
			this.do(key, func);
		}
	}

	tryToSend(key, msg){
		this.tryToDo(key, (ws) => ws.send(msg));
	}

	isConnected = (key) => this.connections[key] !== undefined;
}

class WebSocketConnection{
	constructor(key, initial = null){
		this.key = key;
		this.webSockets = (initial) ? [initial] : [];
	}

	add = (newWebSocket) => this.webSockets.push(newWebSocket);
	
	remove = (oldWebSocket) => arrayRemove(this.webSockets, oldWebSocket);

	isEmpty = () => (this.webSockets.length == 0);

	//do = (func) => this.webSockets.forEach(func);
	do = (func) => {
		for (let webSocket of this.webSockets){
			func(webSocket);
		}
	}
	
}

app.use('/',express.static('static_files')); // this directory has files to be returned
var WebSocketServer = require('ws').Server;

// ================================================================================

const ratingConnections = new WebSocketConnections();
var messagePort = port + 1; 
const ratingWebSocket = new WebSocketServer({port: messagePort});

ratingWebSocket.on('connection', async function(ws, req) {
	
	try {
		await WebSocketStuff.auth(req.url, ws);
	} catch (e) {
		ws.close();
		if (e instanceof BadWebSocketError) {
			console.log(e.message);
			return;
		}
		throw e;
	}
	let {username, password} = WebSocketStuff.getUsernamePassword(req.url);

	ws.username = username;
	ratingConnections.addConnection(username, ws);

	
	ws.on('message', async (msgStr) => {
		let msg = JSON.parse(msgStr); // TODO: catch json parse error

		for (let expectedKey of ['username', 'password', 'name', 'isMale', 'rating', 'creator']){
			if (msg[expectedKey] == undefined){
				console.log(`Message: '${msg}' missing parameter '${expectedKey}'`);
				return;
			}
		}
		try {
			await authenticate(msg.sender, msg.password);

			console.log('received message:', msg);
			await receiveMessage(
				msg.sender, 
				msg.recipient, 
				msg.messageEncrypted, 
				msg.encryption_iv
			);
		} catch (e) {
			ws.send(JSON.stringify({error: e.message}));
		}
	});
	ws.on('close', function(){
		console.log(`'${ws.username}' messages websocket disconnected.`)
		ratingConnections.removeConnection(username, ws);
	});
	console.log(`'${username}' message websocket connected.`);
});


/*
var friendPort = port + 2; 
const friendConnections = new WebSocketConnections();
const friendWebSocket = new WebSocketServer({port: friendPort});

friendWebSocket.on('connection', async function(ws, req) {
	try {
		await WebSocketStuff.auth(req.url, ws);
	} catch (e) {
		ws.close();
		if (e instanceof BadWebSocketError) {
			console.log(e.message);
			return;
		}
		throw e;
	}
	let {username, password} = WebSocketStuff.getUsernamePassword(req.url);

	ws.username = username;
	friendConnections.addConnection(username, ws);

	ws.on('close', function(){
		console.log(`'${ws.username}' friend websocket disconnected.`)
		friendConnections.removeConnection(username, ws);
	});
	console.log(`'${username}' friends websocket connected.`);
});
*/

var partnerRequestPort = port + 3; 
const partnerConnections = new WebSocketConnections();
const partnerWebSocket = new WebSocketServer({port: partnerRequestPort});

partnerWebSocket.on('connection', async function(ws, req) {
	try {
		await WebSocketStuff.auth(req.url, ws);
	} catch (e) {
		ws.close();
		if (e instanceof BadWebSocketError) {
			console.log(e.message);
			return;
		}
		throw e;
	}
	let {username, password} = WebSocketStuff.getUsernamePassword(req.url);

	ws.username = username;
	partnerConnections.addConnection(username, ws);

	ws.on('message', async (msgStr) => {
		let msg = JSON.parse(msgStr);
		for (let expectedKey of ['sender', 'password', 'recipient']){
			if (msg[expectedKey] == undefined){
				console.log(`Message: '${msg}' missing parameter '${expectedKey}'`);
				return;
			}
		}
		if (msg.sender != ws.username){
			console.log(`'${ws.username}' tried to send message with username: '${msg.sender}'.`);
			return;
		}
		try {
			await authenticate(msg.sender, msg.password);

			await sendPartnerRequest(
				msg.sender, 
				msg.recipient
			);
		} catch (e) {
			ws.send(JSON.stringify({error: e.message}));
			console.log(e.message);
		}
	});

	ws.on('close', function(){
		console.log(`'${ws.username}' friend request websocket disconnected.`)
		partnerConnections.removeConnection(username, ws);
	});
	console.log(`'${username}' friend request websocket connected.`);
});


var friendsOnlinePort = port + 4; 
const friendsOnlineConnections = new WebSocketConnections();
const friendsOnlineWebSocket = new WebSocketServer({port: friendsOnlinePort});

friendsOnlineWebSocket.on('connection', async function(ws, req) {
	try {
		await WebSocketStuff.auth(req.url, ws);
	} catch (e) { 
		ws.close();
		if (e instanceof BadWebSocketError) {
			console.log(e.message);
			return;
		}
		throw e;
	}
	let {username, passwordHash} = WebSocketStuff.getUsernamePassword(req.url);

	ws.username = username;
	friendsOnlineConnections.addConnection(username, ws);

	try {
		let friends = await(getFriends(username));
		for (let friend of friends){
			if (messageConnections.isConnected(friend.username)) {
				let message = JSON.stringify({
					username: friend.username,
					connected: true
				});
				ws.send(message);
			}
		}
	} catch (e) {
		console.log(e);
	}

	ws.on('close', function(){
		console.log(`'${ws.username}' friends online websocket disconnected.`)
		friendsOnlineConnections.removeConnection(username, ws);
	});
	console.log(`'${username}' friends online websocket connected.`);
});


// ================================================================================
// ================================================================================
// ================================================================================

getPartner = (username) => queryGet(
	`SELECT partner1 AS partner
	FROM partners
	WHERE partner2 =?

	UNION

	SELECT partner2 AS partner
	FROM partners 
	WHERE partner1 =?`,
	[username, username]
);

async function sendPartnerRequest(requestor, requestee){

	await usernameExists(requestee);

	let isPartnerRequested;

	try {
		let partner = await getPartner(requestor);
		if (partner.username == requestee){
			throw new ConflictError('Tried to send partner request to partners.');
		}
	} catch (e){
		if (!(e instanceof NotFoundError)) throw e;
	}

	try {
		let partnerRequests = await queryGet(
			'SELECT * FROM partnerRequest WHERE requestor=? AND requestee=?',
			[requestor, requestee]
		);
		isPartnerRequested = true;

	} catch (e){
		if (e instanceof NotFoundError){
			isPartnerRequested = false;
		} else {
			throw e;
		}
	}
	
	if (isPartnerRequested){
		// if the other user requested a friend request,
		// make them friends and delete the previous request
		await queryRun('BEGIN TRANSACTION');

		await queryRun(
			'INSERT INTO partners(partner1, partner2) VALUES (?, ?);',
			[requestor, requestee]
		);

		await queryRun(
			`DELETE FROM partnerRequest
			WHERE ? = requestee 
			AND ? = requestor;`,
			[requestor, requestee]
		);

		await queryRun('END TRANSACTION');

	} else {
		// otherwise, just add a friend request to friendRequests
		await queryRun(
			'INSERT INTO partnerRequest(requestor, requestee) VALUES (?, ?);',
			[requestor, requestee]
		);
		sendRequest(sender, recipient, true);
		sendRequest(recipient, sender, false);
	}
}

function sendRequest(username, friend, isRequester){
	let msg = {
		username: friend, 
		isRequester: isRequester
	}

	friendRequestConnections.tryToDo(
		username, 
		(ws)=>ws.send(JSON.stringify(msg))
	);
}

async function createOrUpdateRating(username, name, isMale, rating){
	let nid = (await queryGet(
		`SELECT nid
		FROM name
		WHERE name = ? AND isMale = ? AND creator in (?, '<default>')`,
		[name, isMale, username]
	)).nid;

	let ratingExists = await queryExists(
		`SELECT *
		FROM rating
		WHERE username = ? AND nid = ?`,
		[username, nid]
	);
	let timeStr = new Date().toISOString();
	if (ratingExists){
		await queryRun(
			`UPDATE rating
			SET rating = ?, timestamp = ?
			WHERE username = ? AND nid = ?`,
			[rating, timestamp, username, nid]
		);
	} else {
		await queryRun(
			`INSERT INTO rating(username, rating, timestamp, nid)
			VALUES(?, ?, ?, ?)`,
			[username, rating, timeStr, nid]
		);
	}
}

async function rate(username, name, isMale, rating){

	name = name.toLowerCase();
	let creator, nameExists;

	for (creator of ['<default>', username]){
		nameExists = await queryExists(
			`SELECT *
			FROM name
			WHERE name = ? AND isMale = ? AND creator = ?`,
			[name, isMale, creator]
		);
		if (nameExists) break;
	}
	if (!nameExists){
		await queryRun(
			`INSERT INTO name(name, isMale, rank, creator)
			VALUES(?, ?, ?, ?)`,
			[name, isMale, null, username]
		);
		console.log(
			`New name ${name} with gender ${isMale} and creator ${creator}.`
		);
	}
	createOrUpdateRating(username, name, isMale, rating);
}

// register api
app.put('/rate/:u/password/:p/name/:n/isMale/:m/rating/:r', async function(req, res) {
	let username = req.params.u,
		password = req.params.p,
		name = req.params.n,
		isMale = req.params.m,
		rating = req.params.r;

	try {
		await authenticate(username, password);

		await rate(username, name, isMale, rating);

		res.status(200);
		res.send({success: `rated ${name}, gender ${isMale}`});

	} catch (e) {
		handleResponseErrors(e, res);
	}
});

app.listen(port, function () {
  console.log('Example app listening on port '+port);
});



app.get('/login/:u/password/:p', async function(req, res) {

	let username = req.params.u,
		password = req.params.p;

	try {
		await authenticate(username, password);

		res.status(200);
		res.send({success: 'logged in'});
	} catch (e) {
		handleResponseErrors(e, res);
	}
});

// register api
app.put('/register/:u/nickname/:n/password/:p', async function(req, res) {
	let username = req.params.u,
		nickname = req.params.n,
		password = req.params.p

	try {
		if (await usernameExists(username)){
			throw new ConflictError(`username: '${username}' already taken.`);
		}
		if (!isNickname(nickname)){
			throw new InputError(`nickname: '${nickname}' is not a valid nickname.`);
		}
		if (!isHex(password)) {
			throw new InputError(`password: '${password}' is not a hex string.`);
		}
		//TODO: check lengths of inputs

		await queryRun(
			'INSERT INTO user(username, nickname, password) VALUES (?, ?, ?);',
			[username, nickname, password]
		);

		res.status(200);
		res.send({success: 'registered'});

	} catch (e) {
		handleResponseErrors(e, res);
	}
});

async function getRating(req,res){

	let username = req.params.u,
		password = req.params.p,
		filter = req.params.f,
		subFilter = req.params.sf,
		search = req.params.s,
		range = req.params.r,
		rangeStart = req.params.rs;

	let whereQuery = '',
		orderByQuery = '';

	switch(`${filter} ${subFilter}`){
		case ("popularity asc"):
			orderByQuery = 'rank';
			break;

		case ("popularity desc"):
			orderByQuery = 'rank DESC';
			break;
		
		case ("name asc"):
			orderByQuery = 'name';
			break;

		case ("name desc"):
			orderByQuery = 'name DESC';
			break;

		case ("gender male"):
			whereQuery = 'isMale = 1';
			orderByQuery = 'rank';
			break;

		case ("gender female"):
			whereQuery += 'isMale = 0';
			orderByQuery = 'rank';
			break;

		case ("gender unisex"):
			whereQuery += 'isMale = -1';
			orderByQuery = 'rank';
			break;

		default:
			throw new Exception('bad order by.');
	}

	if (search) {
		let regex = `name LIKE '${search}%'`
		whereQuery = whereQuery ? `${whereQuery} AND ${regex}` : regex; 
	}

	console.log('debug query:\n', `SELECT *
	FROM name
	${whereQuery!='' ? 'WHERE ' + whereQuery : ''}
	${orderByQuery!='' ? 'ORDER BY ' + orderByQuery : ''}
	LIMIT ${parseInt(range)+1}
	OFFSET ${rangeStart}`);
	
	try {
		await authenticate(username, password);

		for (param of [filter, subFilter, search, range, rangeStart]){
			if (!isAlphaNumeric(param)){
				throw new InputError(`${param} should be alpha numeric.`)
			}
		}
		let ratings = await queryAll(
			`SELECT *
			FROM name
			${whereQuery!='' ? 'WHERE ' + whereQuery : ''}
			${orderByQuery!='' ? 'ORDER BY ' + orderByQuery : ''}
			LIMIT ?
			OFFSET ?`,
			[parseInt(range)+1, rangeStart]
		);

		res.status(200);
		res.send({ratings: ratings.slice(0, range), isMore: ratings.length==parseInt(range)+1});

	} catch (e) {
		handleResponseErrors(e, res);
	}
}

app.get('/ratings/:u/password/:p/filter/:f/subFilter/:sf/range/:r/rangeStart/:rs/search/:s', getRating);
app.get('/ratings/:u/password/:p/filter/:f/subFilter/:sf/range/:r/rangeStart/:rs/search/', getRating);