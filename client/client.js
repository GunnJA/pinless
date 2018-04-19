let globalVar = {};

$( window ).load(function() {
  if (window.location.hash) {
    let hash = window.location.hash;
    hash = hash.replace('#','');
    globalVar["userID"] = parseInt(hash);
    if ($("#divSettings").length) {
      $.get(`/user?id=${parseInt(hash)}`, function(obj) {
        if (obj.error) {
          window.alert(obj.error);
        } else {
          globalVar["userObj"] = obj;
          $("#formSettings").children(":input").each(function() {
            let item = $(this).attr("id");
            $(this).val(obj[item]);
          });
        }
      });
    }
    if ($("#divLogin").length) {
      loggedIn(parseInt(hash),"champ");
    }
    if ($("#bookListAll").length) {
      $.get(`/allbooks`, function(obj) {
        if (obj.error) {
          window.alert(obj.error);
        } else {
          console.log(obj);
          bookDisplay(obj,$("#bookListAll"));
        }
      });
    }
  }
});

// login/out handlers
$("#loginSwap").click(function(event) {
  event.preventDefault();
  $("#divSwapLog").toggle();
  $("#divSwapSign").toggle();
  $("#formLogin button").text("Log In").attr("id","login");
});

$("#signupSwap").click(function(event) {
  event.preventDefault();
  $("#divSwapLog").toggle();
  $("#divSwapSign").toggle();
  $("#formLogin button").text("Sign Up").attr("id","signup");
});

$("#formLogin button").click(function(event) {
  event.preventDefault();
  if (!globalVar["userID"]) {  
    let $this = $(this);
    let username = $("#username").val();
    let password = $("#password").val();
    $.get(`/${$this.attr("id")}?user=${username}&pass=${password}`, function(obj) {
      if (obj.error) {
        window.alert(obj.error);
      } else {
        loggedIn(obj.id,username);
      }
    });
  } else {
    window.alert("Already logged in");
  }
});

function loggedIn(id,name) {
  $("#divLogin").toggle();
  globalVar["userID"] = id;
  console.log('logged in as ID:',id);
  $("#menuUL").append($(`<li id="allbooks"><a onclick="hrefLinks('allbooks')">All Books</a></li>`));  
  $("#menuUL").append($(`<li id="mybooks"><a onclick="hrefLinks('mybooks')">My Books</a></li>`));
  $("#menuUL").append($(`<li id="settings"><a onclick="hrefLinks('settings')">Settings</a></li>`));  
  $("#menuUL").append($(`<li id="logout"><a onclick="loggedOut()">Logout</a></li>`));
  if (name !== "champ") {
    $("#divLogout").append($(`<p id="welcome">Welcome to BookSwap ${name}!</p>`));
  }
}

function loggedOut() {
  if (globalVar["userID"]) {
    delete globalVar["userID"];    
    $("#divLogin").toggle();
    $("#welcome").remove();    
    $("#username").val('');
    $("#password").val('');
    $("#allbooks").remove();
    $("#mybooks").remove();
    $("#settings").remove();
    $("#logout").remove();    
    console.log('logged out');
    $("#logout").remove();
    } else {
    window.alert("Not logged in");
  }
}

// menu
let $select = $("<select></select>");
$("#menu").append($select);

$("#menu a").each(function(){
  let $this = $(this);
  //Create an option
  let $option = $("<option></option>");
  
  if ($this.parent().hasClass("selected")) {
    $option.prop("selected", true);
  };
  //options value is the href
  $option.val($this.attr("href"));
  //options text is the text of link
  $option.text($this.text());
  //append option to select
  $select.append($option);
});

function hrefLinks(destination) {
  if (globalVar["userID"]) {
    window.location = `/${destination}.html#${globalVar["userID"]}`
  } else {
    window.location = `/${destination}.html`;
  }
}

$("#update").click(function(event) {
  event.preventDefault();
  let updateStr = `/userupdate?id=${globalVar["userID"]}`;
  $("#formSettings").children(":input" ).each(function() {
    let value = $(this).val();
    if (value && $(this).attr("readonly") != "readonly") {
      let field = $(this).attr("id");
      updateStr += `&${field}=${value}`;
    }
  });
  console.log(updateStr);
  $.get(updateStr, function(obj) {
    if (obj.error) window.alert(obj.error);
    else {
      window.alert(obj.message);
    }
  });
});

$("#bookSearch").click(function(event) {
  event.preventDefault();
  let bookStr = $("#bookInput").val();
  if (bookStr === "") {
    window.alert("You need type something in the searchbox bro");
  } else {
    $.get(`/booksearch?qstr=${bookStr}`, function(obj) {
      if (obj.error) {
        window.alert(obj.error);
      } else {
        console.log(obj);
        bookDisplay(obj,$("#bookList"));
        globalVar["searchArr"] = obj;
      }
    });
  }
});

function bookDisplay(arr,$anchor) {
  let htmlStr = `<ul id="bookShelf">`;
  for (i=0; i<arr.length; i+=1) {
    let obj = arr[i];
    htmlStr += bookHTML(obj)
  }
  htmlStr += '</ul>'
  console.log('htmlStr',htmlStr);
  $anchor.append($(htmlStr));
}

function bookHTML(obj) {
  console.log(obj);
  let str = '';
  let authors = obj.authors;
  str += `<li class="bookList"><img class="bookImage" src="${obj.image}" alt="${obj.title}">`;
  str += `<p><b>${obj.title}</b><br>`;
  str += `Authors: ${authors.join(",<br>")}<br>`;
  str += `Published Date: ${obj.publishedDate}<br>`;
  str += `<button class="bookButt"><a href="${obj.link}">Preview</a></button><br>`;
  str += `<button class="bookButt"><a onclick="addBook('${i}')">Add Book</a></button></p></li>`;
  return str;
}

function addBook(item) {
  let book = globalVar.searchArr[item];
  book['owner'] = globalVar.userID;
  $.get(`/addbook?`,book, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
    }
  console.log("book",book)
  });
}

//function ChatController($scope) {
//        var socket = io.connect();

//        $scope.messages = [];
//        $scope.roster = [];
//        $scope.name = '';
//        $scope.text = '';

//        socket.on('connect', function () {
//          $scope.setName();
//        });

//        socket.on('message', function (msg) {
//          $scope.messages.push(msg);
//          $scope.$apply();
//        });

//        socket.on('roster', function (names) {
//          $scope.roster = names;
//          $scope.$apply();
//        });

//        $scope.send = function send() {
//          console.log('Sending message:', $scope.text);
//          socket.emit('message', $scope.text);
//          $scope.text = '';
//        };

//        $scope.setName = function setName() {
//          socket.emit('identify', $scope.name);
//        };
//}