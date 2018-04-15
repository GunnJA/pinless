//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var request = require("request");

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

app.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function bookSearch(searchTerm) {
  return new Promise(function(resolve,reject) {
  var options = { method: 'GET',
  url: 'https://www.googleapis.com/books/v1/volumes',
  qs: { q: searchTerm },
  headers: 
   { 'postman-token': '058558ba-b48e-d2c0-7250-8af94d7ace42',
     'cache-control': 'no-cache',
     key: 'AIzaSyArBEjA_Zz4DgI8bt_hE10ggt8mrdxvb2Q' } };
     
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    let newStr = body.toString();
    let newJson = JSON.parse(newStr);
    let items = newJson["items"];
    let volumes = [];
    for (i=0;i<items.length;i+=1) {
      let obj = {};
      let volume = items[i].volumeInfo;
      obj['id'] = items[i].id;
      obj['title'] = volume.title;
      obj['subTitle'] = volume.subtitle;
      obj['authors'] = volume.authors;
      obj['publishedDate'] = volume.publishedDate;
      obj['imageLinks'] = volume.imageLinks;
      obj['link'] = volume.previewLink;
      volumes.push(obj);
    }
    //console.log(volumes);
    resolve(volumes);
    });
  });
}

//bookSearch("lord").then(function(volumes) {
//  console.log(volumes);
//});

var pg = require('pg');
var conString = `postgres://ubuntu:pgpass@localhost:5432/bookdb`;
var client = new pg.Client(conString);
client.connect();
//queries are queued and executed one after another once the connection becomes available


const simpleQuery = function(table) {
  return function(options) {
    return new Promise(function(resolve,reject) {
      let string;
      let queryEnd;      
      if (options.field !== undefined) {
        string = options.field;
      } else {
        string = '*';
      }
      if (options.key2 !== undefined && options.value2 !== undefined) {
        queryEnd = ` and ${options.key2}='${options.value2}';`
      } else {
        queryEnd = ";"
      }
      let queryStr = `select ${string} from ${table} where ${options.key1}='${options.value1}'${queryEnd}`
      console.log("queryStr",queryStr);
      let result = client.query(queryStr, (err, res) => {
        console.log(res.rows)
        resolve(res.rows);
      });
    });
  }
}

const queryUsers = simpleQuery("users");
const queryBook = simpleQuery("books");

function rollBackDB() {
  client.query('ROLLBACK', (err) => {
    if (err) { console.log("rollback error:",err);
    }
  })
}

function commitDB() {
  client.query('COMMIT', (err) => {
    if (err) { console.log("commit error:",err);
    } else {
      console.log("commited"); 
    }
  });
}

const simpleCreate = function(table) {
  return function(insertStr) {
    return new Promise(function(resolve,reject) {
      client.query('BEGIN', (err) => {
        if (err) return;
        client.query(`insert into users values(${insertStr}) returning id`, (err, res) => {
          if (err) {
            rollBackDB();
          } else {
            let result = res.rows;
            console.log("result:",result);
            commitDB();
            resolve(result)
          }
        });
      });
    });
  }
}

const simpleCreateUser = simpleCreate("user");
//queryBook({ value1: 1, key1: "id"}).then(function(result) {
//  console.log("queryBook",result.rows);
//});

// User Functionality -------
// signup routing
app.get("/signup", function (req, res) {
  let user = req.query.user;
  let pass = req.query.pass;
  queryUsers({key1:"username", value1:user}).then(function(arr) {
    if (arr[0]) {
      // already exists
      res.send({"error": `user ${user} already exists`})
    } else {
      // doesn't exist
      simpleCreateUser(`default,null,null,null,null,'${user}','${pass}'`).then(function(obj) {
        let result = obj["0"];
        res.send(result);
      });
    }
  })
});

// login routing
app.get("/login", function (req, res) {
  let user = req.query.user;
  let pass = req.query.pass;
  queryUsers({field:"id", key1:"username", value1:user, key2:"password", value2:pass}).then(function(obj) {
    console.log("resultArr",obj[0]);
    if (obj[0]) {
      // password match
      res.send(obj[0]);
    } else {
      // password incorrect
      res.send({"error":`username or password incorrect`});
    }
  })
});

queryUsers({key1:"username", value1:"jono", key2:"password", value2:"mate"}).then(function(arr) {
  console.log(arr.rows);
});

// logout routing
app.get("/logout", function (req, res) {
    res.send({"loggedIn": false});
});


// sudo service postgresql start
// psql
// \c bookdb
// \password
// create table books (id serial primary key,title varchar not null,author varchar not null,owner varchar);
// insert into books values(default,'Black Skies','Arnaldur Indridason',null);
// update books set owner = 1 where id=1;
// ALTER TABLE table_name ADD COLUMN new_column_name data_type;