let globalVar = {};

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
  $("#divLogout").append($(`<p id="welcome">Welcome to BookSwap ${name}!</p>`));
  $("#menuUL").append($(`<li id="logout"><a href="#" onclick="loggedOut()">Logout</a></li>`));
}

function loggedOut() {
  if (globalVar["userID"]) {
    delete globalVar["userID"];    
    $("#divLogin").toggle();
    $("#welcome").remove();    
    $("#username").val('');
    $("#password").val('');
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