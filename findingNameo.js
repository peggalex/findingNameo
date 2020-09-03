const publicVapidKey = "BJ2XSl6yFWZV9fSzKYGcvUtlEbnYiUo2k0RFtetCpLj3q62YF6YsHwK62G5T7CbQKX4PHPgHgEa3CyPPmnxJWp4";
const privateVapidKey = "KRkJ7DjHVUUgmw22oSCMkoAUL5Iig4ARPwsbgO_jpQc"; //for push notifications
const webpush = require('web-push');
webpush.setVapidDetails('mailto:alexpomelopegg@gmail.com', publicVapidKey, privateVapidKey);

var process = require('process');

// nodejs ftd.js PORT_NUMBER
var port = parseInt(process.argv[2]); 
var express = require('express');
const path = require('path');

var app = express();

const sqlite3 = require('sqlite3').verbose();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//app.use(express.static('static_files')); 

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
			} else if (row === null || row === undefined){
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
			let result = await queryGet(queryString, params);
			resolve(Boolean(result));
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
		let usernamePassword = url.match(/\/\?username=(.+)&password=(.+).*/i);

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
		if (this.isConnected(key)){
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

class DynamicRating {
	constructor(name, isMale, username, rating){
		this.name = name;
		this.isMale = isMale;
		this.username = username;
		this.rating = rating;
	}
}
//app.use('/',express.static('static_files')); // this directory has files to be returned
var WebSocketServer = require('ws').Server;

// ================================================================================

const webSocketConnections = new WebSocketConnections();
var wsPort = port + 1; 
const webSocket = new WebSocketServer({port: wsPort});

webSocket.on('connection', async function(ws, req) {
	
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
	ws.pushNotifications = false;

	ws.endpoint = decodeURI(endpoint);
	ws.p256dh = decodeURI(p256dh);
	ws.auth = decodeURI(auth);

	webSocketConnections.addConnection(username, ws);
	
	ws.on('close', function(){
		console.log(`'${ws.username}' messages websocket disconnected.`)
		webSocketConnections.removeConnection(username, ws);
	});
	console.log(`'${username}' message websocket connected.`);

	let match = url.match(/\/\?username=.+&password=.+&endpointUrlEncoded=(.+)&p256dh=(.+)&auth=(.+)/i);
	ws.hasPushNotifications = match == null;
	if (match == null) return;
	
	let [_, endpoint, p256dh, auth] = match;
	ws.endpoint = decodeURI(endpoint);
	ws.p256dh = decodeURI(p256dh);
	ws.auth = decodeURI(auth);
});

// ================================================================================
// ================================================================================
// ================================================================================

getPartner = async (username) => (await queryGet(
	`SELECT partner1 AS partner
	FROM partners
	WHERE partner2 =?

	UNION

	SELECT partner2 AS partner
	FROM partners 
	WHERE partner1 =?`,
	[username, username]
)).partner;

async function sendPartnerRequest(requestor, requestee){

	let requestorHasPartner = await queryExists(
		'SELECT * FROM partners WHERE ? IN (partner1, partner2)',
		[requestor]
	);
	if (requestorHasPartner) throw new ForbiddenError('requestor already has partner');

	let requesteeHasPartner = await queryExists(
		'SELECT * FROM partners WHERE ? IN (partner1, partner2)',
		[requestee]
	);
	if (requesteeHasPartner) throw new ConflictError('requestee already has partner');

	let isPartnerRequested = await queryExists(
		'SELECT * FROM partnerRequest WHERE requestor=? AND requestee=?',
		[requestee, requestor]
	);
	
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

// partnerRequest api
app.get('/partnerRequest/:u/password/:p/partner/:partner', async function(req, res) {
	let username = req.params.u,
		password = req.params.p,
		partner = req.params.partner;

	try {
		await authenticate(username, password);

		let hasPartner;
		try {
			await sendPartnerRequest(username, partner);
			hasPartner = false;
		} catch (e) {
			if (e instanceof ConflictError){
				hasPartner = true;
			} else {
				throw e;
			}
		}

		res.status(200);
		res.send({hasPartner: hasPartner});

	} catch (e) {
		handleResponseErrors(e, res);
	}
});
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
	console.log('rating exists', ratingExists);
	let timeStr = new Date().toISOString();
	if (ratingExists){
		await queryRun(
			`UPDATE rating
			SET rating = ?, timestamp = ?
			WHERE username = ? AND nid = ?`,
			[rating, timeStr, username, nid]
		);
	} else {
		await queryRun(
			`INSERT INTO rating(username, rating, timestamp, nid)
			VALUES(?, ?, ?, ?)`,
			[username, rating, timeStr, nid]
		);
	}

	let dynamicRating = new DynamicRating(name, isMale, username, rating);
	let msg = JSON.stringify({
		type: 'rating',
		dynamicRating: dynamicRating
	})

	webSocketConnections.tryToSend(username, msg);
	try {
		let partner = await getPartner(username);
		webSocketConnections.tryToSend(partner, msg);
	} catch (e) {
		if (!(e instanceof NotFoundError)) throw e;
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

app.get('/login/:u/password/:p/endpoint/:e/p256dh/:h/auth/:a', async function(req, res) {

	let username = req.params.u,
		password = req.params.p,
		endpoint = req.params.e,
		p256dh = req.params.h,
		auth = req.params.a;

	try {
		await authenticate(username, password);

		await queryRun('BEGIN TRANSACTION');

		let exists = await queryExists(`
			SELECT * FROM pushSubscription 
			WHERE endpoint = ?
		`, [endpoint]);

		if (exists){
			queryRun(`
				UPDATE * FROM pushSubscription
				SET username = ?
				WHERE endpoint = ?
			`, [username, endpoint])
		} else {
			await queryRun(`
				INSERT INTO pushSubscription(
					username, 
					endpoint, 
					p256dh, 
					auth) 
				VALUES(?, ?, ?, ?)
			`, [username, endpoint, p256dh, auth]);
		}

		await queryRun('END TRANSACTION');


		res.status(200);
		res.send({success: `logged in, push service ${(exists) ? 'updated' : 'subscribed'}.`});
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

createQueryStr = (selectQueries, fromQuery, whereQueries, orderByQuery, limitQuery) => `
	SELECT ${selectQueries.join(', ')}
	${fromQuery}
	${whereQueries.length > 0 ? "WHERE " + whereQueries.join(" AND ") : "" }
	${orderByQuery}
	${limitQuery}
`
.replace(/\t/g, '')
.replace(/\n/g, '\n');

async function getRatings(req,res){

	let username = req.params.u, 
		password = req.params.p, filter = req.params.f,
		subFilter = req.params.sf, search = req.params.s,
		range = req.params.r, rangeStart = req.params.rs;

	try {
		await authenticate(username, password);

		for (param of [filter, subFilter, search, range, rangeStart]){
			if (!isAlphaNumeric(param)){
				throw new InputError(`${param} should be alpha numeric.`)
			}
		}

		let partner;
		try {
			partner = await getPartner(username);
		} catch (e) {
			if (!(e instanceof NotFoundError)) throw e;
		}
	
		let selectQueries = [
			'n1.name AS name', 'n1.isMale AS isMale',
			'n1.pop AS pop', 'n1.rank AS rank', 
			'n1.rating AS myRating',
			(partner!==undefined ? 'n2.rating' : 'NULL') + ' AS partnerRating'
		];

		let fromQuery = `
			FROM (
				SELECT *
				FROM name
				LEFT JOIN rating
					ON name.nid = rating.nid
					AND rating.username = '${username}'
				WHERE creator IN ('<default>', '${username}')
			) n1
		`
		let whereQueries = [];
		if (search!==undefined && search!='') whereQueries.push(`n1.name LIKE '${search}%'`);

		let orderByQuery = '';
		let limitQuery = `LIMIT ${parseInt(range)+1} OFFSET ${rangeStart}`;

		let checkSubFilter = (subFilter, ...args) => {
			if (!args.some(s => s==subFilter)) throw new Error(
				`Bad order by filter/subfilter: '${filter}/${subFilter}'.`
			);
		}

		switch(filter){
			case ("popularity"):
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = `ORDER BY n1.rank ${subFilter.toUpperCase()}`;
				whereQueries.push("n1.creator = '<default>'");
				break;

			case ("name"):
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = `ORDER BY n1.name ${subFilter.toUpperCase()}`; 
				break;

			case ("gender"):
				let isMaleFlag;
				switch (subFilter){
					case 'male':
						isMaleFlag = 1; break;
					case 'female':
						isMaleFlag = 0; break;
					case 'unisex':
						isMaleFlag = -1; break;
					default:
						throw new Error(`Bad order by filter/subfilter: '${filter}/${subFilter}'.`);
				}
				whereQueries.push(`n1.isMale = ${isMaleFlag}`);
				orderByQuery = 'ORDER BY n1.rank'; 
				break;

			case ("myrating"):
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = `ORDER BY n1.rating ${subFilter.toUpperCase()}`;
				whereQueries.push('n1.rating IS NOT NULL')
				break;

			case ("partnerrating"):
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = (partner===undefined) ? '' : `ORDER BY n2.rating ${subFilter.toUpperCase()}`;
				whereQueries.push('n2.rating IS NOT NULL')
				break;

			case ("avgrating"):
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = `ORDER BY (CASE
					${orderByQuery = (partner===undefined) ? '' : 'WHEN (n1.rating IS NOT NULL AND n2.rating IS NOT NULL) THEN (n1.rating + n2.rating)'}
					WHEN n1.rating IS NOT NULL THEN n1.rating
					${orderByQuery = (partner===undefined) ? '' : 'WHEN n2.rating IS NOT NULL THEN n2.rating'}
					ELSE (0-n1.rank)
				END) ${subFilter.toUpperCase()} NULLS LAST`; 
				// don't average the rating so that average comes
				// before 
				break;

			case "recent":
				checkSubFilter(subFilter, "asc", "desc");
				orderByQuery = `ORDER BY (CASE
					WHEN ${orderByQuery = (partner===undefined) ? '' : '(n1.timestamp IS NOT NULL AND n2.timestamp IS NOT NULL) THEN MAX(n1.timestamp, n2.timestamp)'}
					WHEN n1.timestamp IS NOT NULL THEN n1.timestamp
					${orderByQuery = (partner===undefined) ? '' : 'WHEN n2.timestamp IS NOT NULL THEN n2.timestamp'}
					ELSE (0-n1.rank)
				END) ${subFilter.toUpperCase()} NULLS LAST`; 
				break;

			default:
				throw new Error(`Bad order by filter ${filter}.`);
		}

		if (partner!==undefined){

			fromQuery += `
				 JOIN (
					SELECT *
					FROM name
					LEFT JOIN rating
						ON name.nid = rating.nid
						AND rating.username = '${partner}'
					WHERE creator IN ('<default>', '${partner}')
				) n2
					ON n1.name = n2.name
					AND n1.isMale = n2.isMale
			`;
		}

		console.log('queryStr:', createQueryStr(
			selectQueries,
			fromQuery,
			whereQueries,
			orderByQuery,
			limitQuery
		));

		let ratings = await queryAll(createQueryStr(
			selectQueries,
			fromQuery,
			whereQueries,
			orderByQuery,
			limitQuery
		), []);

		res.status(200);
		res.send({ratings: ratings.slice(0, range), isMore: ratings.length==parseInt(range)+1});

	} catch (e) {
		handleResponseErrors(e, res);
	}
}

app.get('/ratings/:u/password/:p/filter/:f/subFilter/:sf/range/:r/rangeStart/:rs/search/:s', getRatings);
app.get('/ratings/:u/password/:p/filter/:f/subFilter/:sf/range/:r/rangeStart/:rs/search/', getRatings);

app.get('/getName/:u/password/:p/name/:n/isMale/:m', async (req, res)=>{
	let username = req.params.u,
	password = req.params.p,
	name = req.params.n,
	isMale = req.params.m;

	try {
		await authenticate(username, password);

		for (param of [name, isMale]){
			if (!isAlphaNumeric(param)){
				throw new InputError(`${param} should be alpha numeric.`)
			}
		}

		let partner;
		try {
			partner = await getPartner(username);
		} catch (e) {
			if (!(e instanceof NotFoundError)) throw e;
		}
		
		let selectQueries = [];

		[	
			'name AS name',
			'isMale AS isMale', 
			'pop AS pop', 
			'rank AS rank'
		].forEach((s) => {
			//selectQueries.push(`${partner===undefined ? "n1" : "n2"}.${s}`);
			selectQueries.push(`n1.${s}`);
		});

		selectQueries.push('n1.rating AS myRating',
		(partner !== undefined ? 'n2.rating' : 'NULL') + ' AS partnerRating')

		let fromQuery = `
			FROM (
				SELECT *
				FROM name
					LEFT JOIN rating
						ON name.nid = rating.nid
						AND rating.username = '${username}'
				WHERE creator IN ('<default>', '${username}')
			) n1 `
		let whereQueries = [`${(partner !== undefined) ? 'n2' : 'n1'}.name = '${name}'`, `${(partner !== undefined) ? 'n2' : 'n1'}.isMale = ${isMale}`];

		if (partner !== undefined){

			fromQuery += ` 
				LEFT JOIN (
					SELECT *
					FROM name
					LEFT JOIN rating
						ON name.nid = rating.nid
						AND rating.username = '${partner}'
					WHERE creator IN ('<default>', '${partner}')
				) n2
					ON n1.name = n2.name
					AND n1.isMale = n2.isMale
			`;
		}
		let queryStr = createQueryStr(
			selectQueries,
			fromQuery,
			whereQueries,
			'',
			''
		);

		console.log('queryStr:', queryStr);

		let rating = await queryGet(queryStr);

		console.log('rating', rating);
		
		/*
		let rating = await queryGet(createQueryStr(
			[
				'name', 
				'isMale', 
				'pop', 
				'rank', 
				'n1.rating as myRating',
				 `${(partner == undefined) ? 'NULL' : 'n2.rating'} as partnerRating`
			],
			`FROM name 
				INNER JOIN rating r1
					ON r1.nid = name.nid
					 
			`
		));
		*/

		res.status(200);
		res.send({rating: rating});

	} catch (e) {
		handleResponseErrors(e, res);
	}
});


app.get('/randomName/:u/password/:p/gender/:g', async (req, res)=>{
	let username = req.params.u,
		password = req.params.p,
		gender = req.params.g;
	
	try {
		await authenticate(username, password);

		let partner;
		try {
			partner = await getPartner(username);
		} catch (e) {
			if (!(e instanceof NotFoundError)) throw e;
		}

		selectQueries =  ['NULL AS myRating'];

		_fromQuery = `
			(
				SELECT *
				FROM name
				LEFT JOIN rating
					ON name.nid = rating.nid
					AND rating.username = '${username}'
				WHERE creator IN ('<default>', '${username}')
			) n1 
		`;

		whereQueries = ['n1.rating IS NULL'];

		switch (gender){
			case 'male':
				whereQueries.push('n1.isMale = 1');
				break;
			case 'female':
				whereQueries.push('n1.isMale = 0');
				break;
			case 'unisex':
				whereQueries.push('n1.isMale = -1');
				break;
			case 'any':
				break;
			default:
				throw new InputError(`gender "${gender}" not in {male, female, unisex, any}`);
		}

		let partnerRatingsExist;

		if (partner !== undefined){
			selectQueries.push('n2.rating AS partnerRating');
			_fromQuery = `
				 (
					SELECT *
					FROM name
					LEFT JOIN rating
						ON name.nid = rating.nid
						AND rating.username = '${partner}'
					WHERE creator IN ('<default>', '${partner}')
				) n2 LEFT JOIN ${_fromQuery}
					ON n1.name = n2.name
					AND n1.isMale = n2.isMale
			`;

			partnerRatingsExist = await queryExists(createQueryStr(
				['*'],
				'FROM ' + _fromQuery,
				[...whereQueries, `n2.creator = '${partner}'`],
				'',
				''
			));
		} else {
			selectQueries.push('NULL AS partnerRating');
			partnerRatingsExist = false;
		}

		if (!partnerRatingsExist && gender == 'unisex'){
			res.status(200);
			res.send({name: null});
			return;
		}

		let isCreatedName = (
			partner !== undefined && 
			partnerRatingsExist && 
			(Math.round(Math.random()) || gender == 'unisex')
		);

		[	
			'name AS name',
			'isMale AS isMale', 
			'pop AS pop', 
			'rank AS rank'
		].forEach((s) => {
			selectQueries.push(`${partner===undefined ? "n1" : "n2"}.${s}`);
		});

		whereQueries.push(`${(partner===undefined) ? 'n1' : 'n2'}.creator = '${isCreatedName ? partner : "<default>"}'`);

		console.log('query:', createQueryStr(
			selectQueries,
			'FROM ' + _fromQuery,
			whereQueries,
			'',
			''
		));
		let name; 
		if (isCreatedName){
			let { total } = await queryGet(createQueryStr(
				['COUNT(*) AS total'],
				'FROM ' + _fromQuery,
				whereQueries,
				'',
				''
			), []);

			let target = Math.floor(Math.random()*total);
			name = await queryGet(createQueryStr(
				selectQueries,
				'FROM ' + _fromQuery,
				whereQueries,
				'',
				'LIMIT 1 OFFSET ' + target
			), []);

		} else {

			let { totalSquared } = await queryGet(createQueryStr(
				['SUM(n1.pop*n1.pop) AS totalSquared'],
				'FROM ' + _fromQuery,
				whereQueries,
				'',
				''
			), []);

			let target = Math.floor(Math.random()*(totalSquared+1));
			let totalRef = { runningTotal: 0, row: null }

			let eachStr = createQueryStr(
				selectQueries,
				'FROM ' + _fromQuery,
				whereQueries,
				'ORDER BY n1.pop DESC',
				''
			);

			await new Promise(async (resolve, reject) => db.each(eachStr, [], (err, row) => {
					if (err) reject(new DatabaseError(err));
					if (totalRef.row) return;
					let popSquared = parseInt(row.pop)**2;
					if (
						totalRef.runningTotal <= target && 
						target <= totalRef.runningTotal + popSquared
					){
						totalRef.row = row;
						resolve();
					}
					totalRef.runningTotal += popSquared;
				},
				resolve
			));
			name = totalRef.row;
		}

		res.status(200);
		res.send(name);

	} catch (e) {
		handleResponseErrors(e, res);
	}
});

app.post('/subscribe', (req, res) => {
	const subscription = req.body;
	res.status(201).json({});
	const payload = JSON.stringify({ title: 'test' });

	console.log(subscription);

	webpush.sendNotification(subscription, payload).catch(error => {
		console.error(error.stack);
	});
});

app.use('/', express.static('react_app/build'));

app.get('/worker.js', function(req, res) {
	res.sendFile(path.join(__dirname, 'static_files', 'worker.js'));
  });

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'react_app/build', 'index.html'));
});
