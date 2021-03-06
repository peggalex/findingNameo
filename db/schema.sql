CREATE TABLE name (
	name VARCHAR(60) NOT NULL,
	isMale INTEGER NOT NULL,
	pop INTEGER,
	rank INTEGER,
	creator VARCHAR(20) NOT NULL,
	nid INTEGER PRIMARY KEY,
	FOREIGN KEY (creator) REFERENCES user(username)
);

CREATE TABLE user (
	username VARCHAR(20) PRIMARY KEY,
	nickname VARCHAR(20),
	password CHAR(128) NOT NULL
);

CREATE TABLE pushSubscription (
	username VARCHAR(20) NOT NULL,
	endpoint VARCHAR(500) PRIMARY KEY,
	p256dh VARCHAR(100) NOT NULL,
	auth VARCHAR(50) NOT NULL,
	FOREIGN KEY (username) REFERENCES user(username)
);

CREATE TABLE rating (
	username VARCHAR(20),
	rating NUMERIC NOT NULL,
	timestamp CHAR(24) NOT NULL,
	nid INTEGER,
	PRIMARY KEY (username, nid),	
	FOREIGN KEY (username) REFERENCES user(username),
	FOREIGN KEY (nid) REFERENCES name(nid)
);

CREATE TABLE partnerRequest(
	requestor VARCHAR(20) PRIMARY KEY,
	requestee VARCHAR(20) NOT NULL,
	FOREIGN KEY (requestor) REFERENCES user(username),
	FOREIGN KEY (requestee) REFERENCES user(username)
);

CREATE TABLE partners (
	partner1 VARCHAR(20),
	partner2 VARCHAR(20),
	PRIMARY KEY (partner1, partner2),
	FOREIGN KEY (partner1) REFERENCES user(username),
	FOREIGN KEY (partner2) REFERENCES user(username)
);

CREATE TRIGGER deleteUserTrigger
BEFORE DELETE ON user
FOR EACH ROW
BEGIN
    DELETE FROM name WHERE creator=OLD.username AND creator<>'<default>';
    DELETE FROM rating WHERE rating.username=OLD.username;
    DELETE FROM partners WHERE OLD.username in (partner1, partner2);
    DELETE FROM partnerRequest WHERE OLD.username = requestor;

END