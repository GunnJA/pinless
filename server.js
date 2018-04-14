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

// User Functionality -------
// signup routing
app.get("/signup", function (req, res) {
  let user = req.query.user;
  let pass = req.query.pass;
  exists(collectUser,{"user":user}).then(function(bool) {
    if (bool) {
      // already exists
      res.send({"error": `user ${user} already exists`})
    } else {
      // doesn't exist
      console.log("signup bool", bool);
      dbInsert(collectUser,{"user":user,"pass":pass});
      res.send({"loggedIn": true});
    }
  })
});

// login routing
app.get("/login", function (req, res) {
  let user = req.query.user;
  let pass = req.query.pass;
  exists(collectUser,{"user":user, "pass":pass}).then(function(bool) {
    if (bool) {
      // password match
      res.send({"loggedIn": true});
    } else {
      // password incorrect
      res.send({"error":`password for user ${user} incorrect`});
    }
  })
});

// logout routing
app.get("/logout", function (req, res) {
    res.send({"loggedIn": false});
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


const queryDB = function(table) {
  return function(options) {
    return new Promise(function(resolve,reject) {
      let string;
      console.log(options)
      if (options.field !== undefined) {
        string = `select ${options.field}`;
      } else {
        string = 'select *';
      }
      let result = client.query(`${string} from ${table} where ${options.key}=${options.value};`);
      console.log(`${string} from ${table} where ${options.key}=${options.value};`)
      resolve(result);
    });
  }
}

const queryBook = queryDB("books");
queryBook({ value: 1, key: "id"}).then(function(result) {
  console.log("queryBook",result.rows);
});

// sudo service postgresql start
// psql
// \c bookdb
// \password
// create table books (id serial primary key,title varchar not null,author varchar not null,owner varchar);
// insert into books values(default,'Black Skies','Arnaldur Indridason',null);
// update books set owner = 1 where id=1;