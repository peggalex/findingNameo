rm db/database.db

sqlite3 db/database.db < db/schema.sql
sqlite3 <<END_COMMANDS
.open db/database.db
.mode csv
.import db/yob2018.txt.formatted name
END_COMMANDS
