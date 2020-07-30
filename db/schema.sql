CREATE TABLE name (
	name VARCHAR(60),
	isMale INTEGER,
	rank INTEGER,
	creator VARCHAR(20),
	nid INTEGER PRIMARY KEY,
	FOREIGN KEY (creator) REFERENCES user(username)
);

CREATE TABLE user (
	username VARCHAR(20) PRIMARY KEY,
	nickname VARCHAR(20),
	password CHAR(128)
);

CREATE TABLE rating (
	username VARCHAR(20),
	rating NUMERIC,
	timestamp CHAR(24),
	nid INTEGER,
	PRIMARY KEY (username, nid),	
	FOREIGN KEY (username) REFERENCES user(username),
	FOREIGN KEY (nid) REFERENCES name(nid)
);

CREATE TABLE partnerRequest(
	requestor VARCHAR(20) PRIMARY KEY,
	requestee VARCHAR(20),
	FOREIGN KEY (requestor) REFERENCES user(username),
	FOREIGN KEY (requestee) REFERENCES user(username)
)

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