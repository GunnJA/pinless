let globalVar = {};

$( window ).load(function() {
  loadPosts();
});

function loggedIn(id) {
  $("#twitterButt").toggle();
  $("#formLogin").toggle();
  globalVar["userID"] = id;
  console.log('logged in as ID:',id);
  $("#menuUL").append($(`<li id="menuFilter"><a onclick="loadPosts('${id}')">My Posts</a></li>`));  
  $("#menuUL").append($(`<li id="menuNew"><a onclick="newPost()">New Post</a></li>`));
  $("#menuUL").append($(`<li id="logout"><a onclick="loggedOut()">Logout</a></li>`));
}

function loggedOut() {
  if (globalVar["userID"]) {
    delete globalVar["userID"];
    $("#twitterButt").toggle();
    $("#myPost").remove();
    $("#newPost").remove();
    $("#logout").remove();    
    console.log('logged out');
    } else {
    window.alert("Not logged in");
  }
}

function twitterLogin() {
  $.get(`/login`, function(obj) {
    if (obj.error) {
      window.alert(obj.error);
    } else {
      console.log(obj);
      let tokenArr = obj.split("=");
      let tokenStr = tokenArr[1];
      console.log(tokenStr);
      globalVar["tokenStr"] = tokenStr;
      window.open(obj, "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400");
    }
  });
}

$("#twitterButt").click(function(event) {
  twitterLogin();
  $("#formLogin").toggle();
});

$("#formLogin button").click(function(event) {
  event.preventDefault();
  if ($("#pin").val().length > 0 ) {
      let pin = $("#pin").val();
      $.get(`/access?token=${globalVar.tokenStr}&verifier=${pin}`, function(obj) {
        if (obj.error) {
          window.alert(obj.error);
        } else {
          loggedIn(obj);
        }
      });
  } else {
    window.alert("Please enter Twitter pin");
  }
});

function filter(id) {
  // filter posts by users id
}

$('.grid').masonry({
  itemSelector: '.grid-item',
  columnWidth: '.grid-sizer',
  percentPosition: true
});

function poster(id,url,title,comment,likeArr) {
  // create post html
  let heart = "heart";
  if (likeArr !== undefined) {
    heart += "filled";
  }
  let str = `<div class="grid-item-content">`
  str += `<a class="title">${title}</a><br>`  
  str += `<img src="${url}"><br><a class="comment">${comment}</a>`
  str += `<br><a>(${id})</a><img class="icon" src="/img/${heart}.png"></div>`
  return str;
}


function newPost() {
  // write a form to create a new post
  $("#divNew").empty();
  let htmlStr = `<form id="formNew">`
  htmlStr += `Title:<input type="text" id="newTitle"><br>`  
  htmlStr += `Image URL:<input type="text" id="newImg"><br>`
  htmlStr += `Message:<input type="text" id="newTxt"><br>` 
  htmlStr += `<button type="submit" id="newPost">Post</button></form>`
  $("#divNew").append(htmlStr);
}

$("#divNew").submit(function(event) {
  event.preventDefault();
  let title = $("#newTitle").val();
  let url = $("#newImg").val();
  let comment = $("#newTxt").val();
  if (title === "" || url === "") {
    window.alert("You need type something in the boxes bro");
  } else {
    $.get(`/newpost?title=${title}&user=${globalVar.userID}&url=${url}&comment=${comment}`, function(obj) {
      if (obj.error) {
        window.alert(obj.error);
      } else {
        console.log(obj);
        loadPosts();
        $("#divNew").empty();
      }
    });
  }
});

function loadPosts(user) {
  let getStr = "/allposts";
  if (user !== undefined) {
    $("#menuFilter a").attr("onclick","loadPosts()").text("All Posts");
    getStr = `/myposts?user=${user}`
  } else {
    if (globalVar.userID != undefined) {
      $("#menuFilter a").attr("onclick","loadPosts('${globalVar.userID}')").text("My Posts");
    }
  }
  $.get(getStr, function(obj) {
    if (obj.error) {
      window.alert(obj.error);
    } else {
      console.log("allposts",obj);
      let postStr = '';
      for (i=0; i<obj.length; i += 1) {
        let item = obj[i];
        postStr += poster(item.username,item.url,item.title,item.comment,item.likeArr);
      }
      $("#grid0").empty().append($(postStr));
    }
  });
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
  $anchor.empty();
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