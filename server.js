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

var crypto = require('crypto');
const percentObj = {
    "!":"%21",
    "#":"%23",
    "$":"%24",
    "&":"%26",
    "'":"%27",
    "(":"%28",
    ")":"%29",
    "*":"%2A",
    "+":"%2B",
    ",":"%2C",
    "/":"%2F",
    ":":"%3A",
    ";":"%3B",
    "=":"%3D",
    "?":"%3F",
    "@":"%40",
    "[":"%5B",
    "]":"%5D",
    " ":"%20"
}

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

function percentEncode(str) {
  let arr = str.split("");
  let keysArr = Object.keys(percentObj);
  let newStr = "";
  for (i=0;i<arr.length;i+=1) {
    let char = arr[i];
    if (keysArr.includes(char)) {
      newStr += percentObj[char];
    } else {
      newStr += char;
    }
  }
  console.log(newStr);
  return newStr;  
}
percentEncode("An encoded string!");
percentEncode("Dogs, Cats & Mice");

function getNonce() {
  return new Promise(function(resolve,reject) {
    crypto.randomBytes(16, function(err, buffer) {
      let nonce = buffer.toString('hex');
      resolve(nonce);
    });
  });
}

function getTimestamp() {
  let d = new Date();
  let seconds = Math.round(d.getTime() / 1000);
  return seconds.toString();
}

function oauthHeaders(obj,options) {
  return new Promise(function(resolve,reject) {
    let oauth_callback = 'oob';
    let oauth_consumer_key = 'UygfFg8iiu0T5x76q26aerrZ5'
    //nonce              
    getNonce().then(function(nonce) {
      obj["oauth_nonce"] = nonce;
      let sigArr = Object.keys(obj).map(function(key) {
        let str = `${key}=${obj[key]}`;
        return str;
      });
      //signature
      let signature = options.method + '&' + percentEncode(options.url) + '&' + percentEncode(sigArr.join("&"));
      console.log("signature",signature)
      let key = percentEncode('Bs56K2ZUEfoReIRAGQXscyY5rgKmidcLGjRMtkp44iG0brP7ps') + "&"
      if (obj.oauth_token) {
        key += percentEncode(obj.oauth_token);
      }
      console.log("key",key)
      let final = crypto.createHmac('sha1', key).update(signature).digest('base64');
      obj["oauth_signature"] = final;
      let authArr = Object.keys(obj).map(function(key) {
        let str = `${percentEncode(key)}="${percentEncode(obj[key])}"`;
        return str;
      });
      authArr.sort();
      let authStr = authArr.join(", ");
      resolve(authStr);
    });
  });
}

function twitterAccess(token,verifier) {
  return new Promise(function(resolve,reject) {
    let obj =   { oauth_token: token,
                  oauth_consumer_key: 'UygfFg8iiu0T5x76q26aerrZ5',
                  oauth_nonce: "",
                  oauth_signature_method: 'HMAC-SHA1',
                  oauth_timestamp: getTimestamp(),
                  oauth_version: '1.0'}
    let options = { method: 'POST',
                    url: 'https://api.twitter.com/oauth/access_token',
                    qs: {  oauth_verifier: verifier }}
    oauthHeaders(obj,options).then(function(str) {
      options['headers'] = {Authorization: "OAuth " + str};
      console.log("options",options)
      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log("body",body);
        let bodyArr = body.split("&");
        for (i=0; i<bodyArr.length; i += 1) {
          let item = bodyArr[i];
          let itemArr = item.split("=");
          if (itemArr[0] === "screen_name") {
            console.log("name",itemArr[1]);
            resolve(itemArr[1]);
          }
        }
      });
    });
  });
}

function twitterRequest() {
  return new Promise(function(resolve,reject) {
    let obj =   { oauth_callback: 'oob',
                  oauth_consumer_key: 'UygfFg8iiu0T5x76q26aerrZ5',
                  oauth_nonce: "",
                  oauth_signature_method: 'HMAC-SHA1',
                  oauth_timestamp: getTimestamp(),
                  oauth_version: '1.0'}
    let options = { method: 'POST',
                    url: 'https://api.twitter.com/oauth/request_token'}
    oauthHeaders(obj,options).then(function(str) {
      options['headers'] = {Authorization: "OAuth " + str};
      console.log("options",options)
      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        let bodyArr = body.split("&");
        let urlRedirect = `https://api.twitter.com/oauth/authenticate?${bodyArr[0]}`;
        console.log("tokenP",urlRedirect)//,'response',response);
        resolve(urlRedirect)
      });
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

function dbQuery(queryStr) {
  return new Promise(function(resolve,reject) {
    client.query(queryStr, (err, res) => {
      resolve(res.rows);
    });
  });
}

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

let simpleCreatePost = simpleCreate("posts");

function deletePost(id,user) {
  return new Promise(function(resolve,reject) {
    client.query('BEGIN', (err) => {
      if (err) return;
      client.query(`delete from posts where id = '${id}' and username = '${user}' returning id;`, (err, res) => {
        if (err) {
          console.log(`rollback, err ${err}`);
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

function heartPost(id,user) {
  return new Promise(function(resolve,reject) {
    dbQuery(`select hearts from posts where id='${id}';`).then(function(result) {
      let arr = result[0].hearts;
      let heart;
      let updateStr = 'set hearts='
      if (arr == undefined) {
        updateStr += `ARRAY['${user}']`
        heart = true;
      } else {
        if (arr.includes(user)) {
          heart = false;
          let newArr = arr.filter(item => item != user);
          if (newArr.length === 0) {
            updateStr += `null`
          } else {
            updateStr += `ARRAY[${newArr}]`
          }
        } else {
          heart = true;
          arr.push(user);
          updateStr += `ARRAY[${arr}]`
        }
      }
      client.query('BEGIN', (err) => {
        if (err) return;
        updateStr += ` where id=${id};`
        console.log("updateStr",`update posts ${updateStr}`)
        client.query(`update posts ${updateStr}`, (err, res) => {
          if (err) {
            console.log("err",err);
            rollBackDB();
          } else {
            let result = res.rows;
            console.log("result:",result);
            commitDB();
            resolve({ heart: heart});
          }
        });
      });
    });
  });
}


// ----- Twitter Routes------
// twitter login
app.get("/login", function (req, res) {
  twitterRequest().then(function(obj) {
    res.send(obj);
  });
});

// twitter access
app.get("/access", function (req, res) {
  let qObj = req.query;
  twitterAccess(qObj.token,qObj.verifier).then(function(obj) {
    res.send(obj);
  });
});

// ----- Post Routes ------
// all posts route
app.get("/allposts", function (req, res) {
  dbQuery("select * from posts order by id DESC;").then(function(obj) {
    res.send(obj);
  });
});

// my posts route
app.get("/myposts", function (req, res) {
  let qObj = req.query;
  dbQuery(`select * from posts where username='${qObj.user}' order by id DESC;`).then(function(obj) {
    res.send(obj);
  });
});

// new post route
app.get("/newpost", function (req, res) {
  let qObj = req.query;
  let fixedTitle = qObj['title'].replace("'","''");
  let fixedComment = qObj['comment'].replace("'","''");  
  let createStr = `default,'${fixedTitle}','${qObj.user}','${qObj.url}','${fixedComment}',null`;
  console.log('createstr',createStr);
  simpleCreatePost(createStr).then(function(obj) {
        let result = obj["0"];
        res.send(result);
  });
});

// delete post route
app.get("/delpost", function (req, res) {
  let qObj = req.query;
  deletePost(qObj.id,qObj.user).then(function(obj) {
        let result = obj["0"];
        res.send(result);
  });
});

// like post route
app.get("/heart", function (req, res) {
  let qObj = req.query;
  heartPost(qObj.id,qObj.user).then(function(obj) {
    res.send(obj);
  })
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

createTable("posts", "id serial primary key,title varchar not null,username varchar not null, url varchar not null, comment varchar, hearts varchar[]");
//createTable("books", "id serial primary key,title varchar,authors varchar[], image varchar, link varchar, publisheddate varchar, owner varchar");
//createTable("users", "id serial primary key, firstname varchar, lastname varchar, city varchar, state varchar, username varchar,password varchar");
//createTable("trades", "id serial primary key,book varchar,title varchar, initiator varchar, receiver varchar, success boolean");
