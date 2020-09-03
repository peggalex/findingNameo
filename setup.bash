rm package*
rm -fr node_modules

npm init

npm install --save express
npm install --save JSON
npm install --save body-parser
npm install --save path

npm install --save ws

npm install --save sqlite3

npm install --save react
npm install --save react-dom

sudo npm install --save -g web-push

rm db/database.db

sqlite3 db/database.db < db/schema.sql
sqlite3 <<END_COMMANDS
.open db/database.db
.mode csv
.import db/yob2018.txt.formatted name
END_COMMANDS
