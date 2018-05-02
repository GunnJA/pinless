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
      $.get(`/mytrades?id=${globalVar.userID}`, function(obj) {
        if (obj.error) {
          console.log(obj.error);
        } else {
          console.log(obj);
          tradeDisplay(obj,$("#tradeList"));
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
  $("#menuUL").append($(`<li id="mybooks"><a onclick="hrefLinks('mybooks')">Add Book</a></li>`));
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
    location.href = '/';
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
      location.reload();
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
  let htmlStrOwned = `<ul id="myBookShelf">`;
  for (i=0; i<arr.length; i+=1) {
    let obj = arr[i];
    if (obj.owner !== undefined && obj["owner"] == globalVar.userID) {
      htmlStrOwned += bookHTML(obj,true);
    } else {
      htmlStr += bookHTML(obj,false);
    }
  }
  htmlStr += '</ul>'
  htmlStrOwned += '</ul><hr>'  
  $anchor.append($(htmlStrOwned));
  $anchor.append($(htmlStr));  
}

function bookHTML(obj,ownedBool) {
  console.log(obj);
  let str = '';
  let ulClass = "bookList";
  let butt2 = "";
  let authors;
  if (obj.authors !== undefined) {
    let authArr = obj.authors;
    authors = `Authors: ${authArr.join(",<br>")}<br>`;
  } else {
    authors = `Authors: Unknown<br>`;
  }
  if (obj.owner !== undefined) {
    let owner = obj.owner;
    if (ownedBool) {
      ulClass = "owned";
      butt2 = `<button class="bookButt"><a onclick="removeBook('${obj.id}')">Remove</a></button></p></li>`;
    } else {
      butt2 = `<button class="bookButt"><a onclick="tradeBook('${obj.id}')">Trade</a></button></p></li>`;
    }
  } else {
    butt2 = `<button class="bookButt"><a onclick="addBook('${i}')">Add Book</a></button></p></li>`;
  }
  str += `<li class="${ulClass}"><img class="bookImage" src="${obj.image}" alt="${obj.title}">`;
  str += `<p><b>${obj.title}</b><br>`;
  str += authors;
  str += `Published Date: ${obj.publishedDate}<br>`;
  str += `<button class="bookButt"><a href="${obj.link}">Preview</a></button><br>`;
  str += butt2;
  return str;
}

function tradeDisplay(arr,$anchor) {
  let htmlStr = `<ul id="tradesUl">`;
  for (i=0; i<arr.length; i+=1) {
    let obj = arr[i];
    console.log("obj",obj);
    let butt;
    if (obj.success == null) {
      if (obj.initiator == globalVar.userID) {
        // add cancel button
        htmlStr += `<li class="tradeList">Requesting book '${obj.title}'`
        htmlStr += `<button class="tradeButt"><a onclick="cancelTrade('${obj.id}')">Cancel</a></button></li>`
      } else {
        // add accept button
        htmlStr += `<li class="tradeList">Request for book '${obj.title}'`
        htmlStr += `<button class="tradeButt"><a onclick="resultTrade('${obj.id}',true)">Accept</a></button>`  
        htmlStr += `<button class="tradeButt"><a onclick="resultTrade('${obj.id}',false)">Decline</a></button></li>`   
      }
    } else {
      if (obj.success) {
        htmlStr += `<li class="tradeList">Request for '${obj.title}' successful</li>`
      } else {
        htmlStr += `<li class="tradeList">Request for '${obj.title}' was unsuccessful</li>`
      }
    }
  }
  htmlStr += '</ul>'
  $anchor.append($(htmlStr));  
}

function addBook(item) {
  let book = globalVar.searchArr[item];
  book['owner'] = globalVar.userID;
  $.get(`/addbook?`,book, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
      window.alert("book added.");
    }
  console.log("book",book)
  });
}

function removeBook(bookID) {
  $.get(`/removebook?bookid=${bookID}&id=${globalVar.userID}`, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
      window.alert("book removed.");
      location.reload();
    }
  });
}

function tradeBook(bookID) {
  $.get(`/tradebook?bookid=${bookID}&id=${globalVar.userID}`, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
      window.alert("Trade request sent.");
      location.reload();
    }
  });
}

function cancelTrade(tradeID) {
  $.get(`/traderemove?tradeid=${tradeID}&id=${globalVar.userID}`, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
      window.alert("Trade cancelled.");
      location.reload();
    }
  });
}

function resultTrade(tradeID,bool) {
  let alertStr;
  if (bool) {
    alertStr = "Trade accepted!";
  } else {
    alertStr = "Trade declined.";
  }
  $.get(`/trade?tradeid=${tradeID}&accept=${bool}&id=${globalVar.userID}`, function(data) {
    if (data.error) {
      window.alert(data.error);
    } else {
      console.log(data);
      window.alert(alertStr);
      location.reload();
    }
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