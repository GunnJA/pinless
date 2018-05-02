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
      //obj['subTitle'] = volume.subtitle;
      obj['authors'] = volume.authors;
      obj['published'] = volume.publishedDate;
      if (volume.imageLinks) {
        obj['image'] = volume['imageLinks'].smallThumbnail;
      } else {
        obj['image'] = "/img/blankBook1.jpg";
      }
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

// DB Functionality -------
var pg = require('pg');
var conString = process.env.DATABASE_URL;
var client = new pg.Client(conString);
client.connect();

const simpleQuery = function(table) {
  return function(options) {
    return new Promise(function(resolve,reject) {
      let string;
      let query1 = "";
      let query2 = "";      
      let queryEnd = ";"      
      if (options.field !== undefined) {
        string = options.field;
      } else {
        string = '*';
      }
      if (options.operator === undefined) {
        options['operator'] = 'and'
      }
      if (options.operator1 === undefined) {
        options['operator1'] = 'and'
      }      
      if (options.key1 !== undefined && options.value1 !== undefined) {
        query1 = ` where ${options.key1}='${options.value1}'`
      }
      if (options.key2 !== undefined && options.value2 !== undefined) {
        query2 = ` ${options.operator} ${options.key2}='${options.value2}'`
      }
      if (options.key3 !== undefined && options.value3 !== undefined) {
        queryEnd = ` ${options.operator1} ${options.key3}='${options.value3}';`
      }
      let queryStr = `select ${string} from ${table}${query1}${query2}${queryEnd}`
      console.log("queryStr",queryStr);
      client.query(queryStr, (err, res) => {
        resolve(res.rows);
      });
    });
  }
}

const queryUsers = simpleQuery("users");
const queryBook = simpleQuery("books");
const queryTrades = simpleQuery("trades");

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
        client.query(`insert into ${table} values(${insertStr}) returning id`, (err, res) => {
          if (err) {
            console.log(`${table} rollback, err ${err}`);
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

const simpleDelete = function(table) {
  return function(id) {
    return new Promise(function(resolve,reject) {
      client.query('BEGIN', (err) => {
        if (err) return;
        client.query(`delete from ${table} where id = '${id}' returning id`, (err, res) => {
          if (err) {
            console.log(`${table} rollback, err ${err}`);
            rollBackDB();
          } else {
            let result = res.rows;
            console.log("deleted:",result);
            commitDB();
            resolve(result)
          }
        });
      });
    });
  }
}

const simpleUpdate = function(table) {
  return function(arr,id) {
    return new Promise(function(resolve,reject) {
      client.query('BEGIN', (err) => {
        if (err) return;
        let updateStr = 'set'
        for (i=0;i<arr.length;i+=1) {
          let item = arr[i];
          updateStr += ` ${item[0]} = '${item[1]}'`;
          if (i !== arr.length - 1) {
            updateStr += ','
          }
        }
        updateStr += ` where id = ${id}`;
        console.log("updateStr",updateStr)
        client.query(`update ${table} ${updateStr}`, (err, res) => {
          if (err) {
            console.log("err",err);
            rollBackDB();
          } else {
            let result = res.rows;
            console.log("result:",result);
            commitDB();
            resolve("User details updated");
          }
        });
      });
    });
  }
}

// splay obj into arr of key:value pairs
function splay(obj) {
  return new Promise(function(resolve,reject) {
    let resultArr = Object.keys(obj).map(function(key) {
      let arr = [];
      arr.push(key);
      arr.push(obj[key]);
      return arr;
    });
    resolve(resultArr);
  });
}
//update books set owner = 1 where id=1
const simpleUpdateUser = simpleUpdate('users');
const simpleCreateUser = simpleCreate('users');
const simpleCreateBook = simpleCreate('books');
const simpleUpdateBook = simpleUpdate('books');
const simpleDeleteBook = simpleDelete('books');
const simpleCreateTrade = simpleCreate('trades');
const simpleUpdateTrade = simpleUpdate('trades');
const simpleDeleteTrade = simpleDelete('trades');
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
      res.send({error:`username or password incorrect`});
    }
  });
});

// logout routing
app.get("/logout", function (req, res) {
    res.send({"loggedIn": false});
});

// user details routing
app.get("/user", function (req, res) {
  let id = req.query.id;
  queryUsers({key1:"id", value1:id}).then(function(arr) {
    if (arr[0]) {
      res.send(arr[0]);
    } else {
      res.send({error: "user not found"});
    }
  });
});

// update user details routing
app.get("/userupdate", function (req, res) {
  let id = req.query.id;
  let pass = req.query.pass;
  delete req.query["__proto__"];
  delete req.query["id"];
  delete req.query["pass"];  
  queryUsers({field:"id", key1:"id", value1:id, key2:"password", value2:pass}).then(function(obj) {
    console.log("resultArr",obj[0]);
    if (obj[0]) {
      // password match
      splay(req.query).then(function(arr) {
        simpleUpdateUser(arr,id).then(function(str) {
          res.send({message: str});
        });
      })
    } else {
      // password incorrect
      res.send({error:`password incorrect`});
    }
  });
});

// search books route
app.get("/booksearch", function (req, res) {
  let qstr = req.query.qstr;
  bookSearch(qstr).then(function(arr) {
    if (arr[0]) {
      res.send(arr);
    } else {
      res.send({error: "no books found"});
    }
  });
});

// add books route
app.get("/addbook", function (req, res) {
  console.log("addbook",req.query)
  let qObj = req.query;
  let fixedTitle = qObj['title'].replace("'","''");
  let createStr = `default,'${fixedTitle}','{${qObj.authors}}','${qObj.image}','${qObj.link}','${qObj.published}','${qObj.owner}'`;
  console.log('createstr',createStr);
  simpleCreateBook(createStr).then(function(obj) {
        let result = obj["0"];
        res.send(result);
  });
});

// remove books route
app.get("/removebook", function (req, res) {
  console.log("removebook",req.query)
  let qObj = req.query;
  queryBook({key1:"id", value1:qObj.bookid, key2:"owner", value2:qObj.id}).then(function(arr) {
    if (arr[0]) {
      simpleDeleteBook(qObj.bookid).then(function(obj) {
        let result = obj["0"];
        res.send(result);
      });
    } else {
      res.send({error: "book not found"});
    }
  });
});


// all books route
app.get("/allbooks", function (req, res) {
  queryBook({}).then(function(obj) {
        res.send(obj);
  });
});


// trade route
app.get("/tradebook", function (req, res) {
  let qObj = req.query;
  queryBook({key1:"id", value1: qObj.bookid}).then(function(obj) {
    console.log("resultArr",obj[0]);
    if (obj[0]) {
      // book found
      let createStr = `default,'${qObj.bookid}','${obj[0].title}','${qObj.id}','${obj[0].owner}',null`
      console.log("createstr",createStr);
      simpleCreateTrade(createStr).then(function(obj) {
        let result = obj["0"];
        res.send(result);
      });
    } else {
      // password incorrect
      res.send({error:`book not found`});
    }
  });
});

// get my trades route
app.get("/mytrades", function (req, res) {
  let qObj = req.query;
  queryTrades( { operator: "or", key1:"initiator", value1: qObj.id, key2:"receiver", value2: qObj.id}).then(function(obj) {
    console.log("resultArr",obj[0]);
    if (obj[0]) {
      console.log(obj);
      // trade found
        res.send(obj);
    } else {
      // password incorrect
      res.send({error:`no trades found`});
    }
  });
});


// trade remove
app.get("/traderemove", function (req, res) {
  let qObj = req.query;
  queryTrades({key1:"id", value1: qObj.tradeid, key2: "initiator", value2: qObj.id}).then(function(obj) {
    console.log("resultArr",obj[0]);
    if (obj[0]) {
      // trade found
      simpleDeleteTrade(qObj.tradeid).then(function(obj) {
        let result = obj["0"];
        res.send(result);
      });
    } else {
      // password incorrect
      res.send({error:`book not found`});
    }
  });
});

// trade route
app.get("/trade", function (req, res) {
  let qObj = req.query;
  qObj["bool"] = (qObj.accept === "true");
  queryTrades({key1:"id", value1: qObj.tradeid, key2: "receiver", value2: qObj.id}).then(function(obj) {
    if (obj[0]) {
      // trade found
      console.log([["success",qObj.bool]]);
      simpleUpdateTrade([["success",qObj.bool]],qObj.tradeid).then(function(tradeObj) {
        if (qObj.bool) {
          simpleUpdateBook([["owner",obj[0].initiator]],obj[0].book).then(function(bookObj) {
            res.send(bookObj["0"]);
            });
        } else {
          res.send(tradeObj["0"]);
        }
      });
    } else {
      // password incorrect
      res.send({error:`trade not found`});
    }
  });
});

// sudo service postgresql start
// psql
// \c bookdb
// \password
// create table books (id serial primary key,title varchar not null,author varchar not null,owner varchar);
// insert into books values(default,'Black Skies','Arnaldur Indridason',null);
// update books set owner = 1 where id=1;
// ALTER TABLE table_name ADD COLUMN new_column_name data_type;
// create table books (id serial primary key,title varchar not null,authors varchar[] not null, image varchar, link varchar, publisheddate varchar, owner varchar);  

function createTable(table,str) {
    return new Promise(function(resolve,reject) {
      client.query('BEGIN', (err) => {
        if (err) return;
        client.query(`create table ${table} (${str});`, (err, res) => {
          if (err) {
            console.log(`${table} rollback, err ${err}`);
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

createTable("books", "id serial primary key,title varchar not null,authors varchar[] not null, image varchar, link varchar, publisheddate varchar, owner varchar");
createTable("users", "id serial primary key,username varchar not null,password varchar not null, firstname varchar, lastname varchar, city varchar, state varchar");
createTable("trades", "id serial primary key,book varchar not null,title varchar not null, initiator varchar not null, receiver varchar not null, success boolean");
