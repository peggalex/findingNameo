rm package*
rm -fr node_modules

npm init

npm install --save express
npm install --save JSON
npm install --save ws
npm install --save url
npm install --save http
npm install --save body-parser
npm install --save sqlite3
npm install --save react
npm install --save react-dom

sqlite3 db/database.db < db/schema
sqlite3 <<END_COMMANDS
.open db/database.db
.mode csv
.import db/yob2018.txt.formatted name
END_COMMANDS