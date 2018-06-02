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
    $("#menuFilter").remove();
    $("#menuNew").remove();
    $("#logout").remove();    
    loadPosts();
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
  $('#gridHolder').empty();
  $('#gridHolder').append($(`<div class="grid"></div>`));
  let getStr = "/allposts";
  if (user !== undefined) {
    $("#menuFilter a").attr("onclick","loadPosts()").text("All Posts");
    getStr = `/myposts?user=${user}`
  } else {
    if (globalVar.userID != undefined) {
      $("#menuFilter a").attr("onclick",`loadPosts('${globalVar.userID}')`).text("My Posts");
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
        postStr += poster(item.id,item.username,item.url,item.title,item.comment,item.hearts);
      }
      $('.grid').append($(postStr));
      $('.grid').imagesLoaded(function() {
        $('.grid').masonry(gridOpt)
      });
    }
  });
}


function poster(id,user,url,title,comment,likeArr) {
  // create post html
  let heart = "heart";
  let hCount = 0;
  if (likeArr != null) {
    heart += "Filled";
    hCount += likeArr.length;
  }
  console.log("user",user,'global',globalVar.userID);
  let str = `<div class="grid-item">`
  str += `<a class="title">${title}</a><br>`  
  str += `<img class="tile" src="${url}"><br><a class="comment">${comment}</a><br><a>(${user})</a>`
  if (user == globalVar.userID && globalVar.userID != undefined) {
    str += `<br><button data-id="${id}" class="delButt">delet this</button>`
  }
  str += `<a class="iconT">${hCount}</a>`
  str += `<img class="icon" id="${id}" src="/img/${heart}.png"></div>`
  return str;
}

let gridOpt = {
  itemSelector: '.grid-item',
  percentPosition: true
}

$(document).on("click",".icon", function () {
  if (globalVar.userID != undefined) {
    let $this = $(this);
    let $prev = $this.prev();
    $.get(`/heart?id=${$this.attr("id")}&user=${globalVar.userID}`, function(obj) {
        if (obj.error) {
          window.alert(obj.error);
        } else {
          console.log(obj);
          if (obj.heart) {
            $this.attr("src","/img/heartFilled.png");
            let newTot = parseInt($prev.text()) + 1;
            $prev.text(newTot);
          } else {
            $this.attr("src","/img/heart.png");
            let newTot = parseInt($prev.text()) - 1;
            $prev.text(newTot);
          }
        }
    });
  } else {
    window.alert("need to log in brah");
  }
});

$(document).on("click",".delButt", function () {
  if (globalVar.userID != undefined) {
    let $this = $(this);
    let id = $this.attr("data-id");
    console.log("id",id);
    $.get(`/delpost?id=${id}&user=${globalVar.userID}`, function(obj) {
        if (obj.error) {
          window.alert(obj.error);
        } else {
          console.log(obj);
          window.alert("post deleted");
          loadPosts(globalVar.userID);
        }
    });
  } else {
    window.alert("need to log in brah");
  }
});

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