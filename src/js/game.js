$(function() {
  //Blue Team Color: #2980b9;
  //Red Team Color:  #c0392b;

  var socket = io();

  /*
  ====================
  Global Checks
  ====================
  */
  socket.emit('join', {
    userId: Cookies.get('userId'),
    gameCode: Cookies.get('gameCode')
  });

  /*
  ====================
  Lobby View
  ====================
  */
  $('view.lobby span.gameCode').text(Cookies.get('gameCode').toUpperCase()); //Shows game's code
  //Client Events
  let currentTeam = "",
    currentRole = "player",
    currentReady = false,
    currentUserId = Cookies.get('userId');
  let userView = $('view.lobby .users');
  $('view.lobby').on('click tap', '.users h1', function(e) { //Changes teams
      let team = $(this).parent().data('team'); //Gets teams name
      if (!team || currentTeam === team) return; //If team doesn't exist or they're on the team already, then don't do anything.
      currentTeam = team; //Change team to new team.
      currentRole = "player"; //Resets user to player role.
      joinTeam();
      e.preventDefault();
    })
    .on('click tap', 'ul.master > li .btn', function(e) {
      let role = $(this).data('role');
      if (role === "master") { //Player wants to join as master
        currentRole = "master";
      } else { //Master wants to switch to player
        currentRole = "player";
      }
      switchRole();
      e.preventDefault();
    })
    .on('click tap', '.buttons .btn', function(e) {
      let type = $(this).data('type');
      if (type === "ready") {
        if (currentReady) { //User clicked Unready
          currentReady = false;
          $(this).toggleClass('btn-success btn-danger').text('Ready Up');
          socket.emit('unready');
        } else { //User clicked Ready Up
          currentReady = true;
          $(this).toggleClass('btn-success btn-danger').text('Unready');
          socket.emit('ready');
        }
        playerToggleReady(currentUserId, currentReady);
      } else if (type === "leave") {
        socket.emit('leave');
      }
      e.preventDefault();
    });


  //Client Functions
  function joinTeam() { //handles user joining team
    socket.emit('teamswitch', {
      teamName: currentTeam
    });
  }

  function currentUserSwitchTeam() { //Switches user to team on confirm
    $(userView).find('[data-id="' + currentUserId + '"]').remove(); //Delete from list
    let user = createUser(currentUserId, Cookies.get('name'));
    $(user).appendTo($(userView).find('.' + currentTeam + " ul.player"));

    $(userView).find('h1 .pull-right').show(); //Show the join icon
    $(userView).find('.' + currentTeam + " h1 .pull-right").hide(); //Hide this team's join icon

    checkSpymasters();
    updateThemeColor(currentTeam);
    if (currentReady) $('view.lobby .btn[data-type="ready"]').click(); //Unready the user if they were ready on team switch.
  }

  function switchRole() { //handles user switching role
    socket.emit('roleswitch', {
      roleName: currentRole
    });
  }

  function currentUserSwitchRole() {
    $(userView).find('[data-id="' + currentUserId + '"]').remove(); //Delete from list
    let user = createUser(currentUserId, Cookies.get('name'), currentRole);
    $(user).appendTo($(userView).find('.' + currentTeam + " ul." + currentRole));
    checkSpymasters();
    if (currentRole === "master") {
      $(userView).find('[data-id="' + currentUserId + '"]').append('<span class="spymaster"><a data-role="player" class="btn btn-default" href="#">Become Player</a></span>')
    }
    console.log("Current Role: " + currentRole);
    if (currentReady) $('view.lobby .btn[data-type="ready"]').click(); //Unready the user if they were ready on team switch.
  }

  function playerSwitchedTeam(id, team) { //handles other user switching team. team = red/blue
    let user = $(userView).find('[data-id="' + id + '"]');
    let uname = $(user).data('name');
    $(user).remove();
    let switchedUser = createUser(id, uname);
    $(switchedUser).appendTo($(userView).find('.' + team + " ul.player"));
    checkSpymasters();
  }

  function playerSwitchedRoles(id, role) { //handles other user switching role. role=player/master
    let user = $(userView).find('[data-id="' + id + '"]');
    let uname = $(user).data('name'),
      team = $(user).closest('.team').data('team');
    $(user).remove();
    let switchedUser = createUser(id, uname, role);
    $(switchedUser).appendTo($(userView).find('.' + team + " ul." + role));
    checkSpymasters();
  }

  function playerJoined(id, name, team) { //handles user joining. name = username, team = red/blue
    $(createUser(id, name)).appendTo($(userView).find('.' + team + " ul.player"));
  }

  function playerLeft(id) { //handles user  leaving
    let switchedUser = $(userView).find('[data-id="' + id + '"]');
    $(userView).find('[data-id="' + id + '"]').remove();
    checkSpymasters();
  }

  function playerToggleReady(id, isReady) { //handles any user ready/not ready. isReady = boolean
    let user = $(userView).find('[data-id="' + id + '"]');
    if (isReady) {
      $(user).find('.toggleReady').addClass('fa-check-square-o').removeClass('fa-square-o');
    } else {
      $(user).find('.toggleReady').removeClass('fa-check-square-o').addClass('fa-square-o');
    }
  }

  function checkSpymasters() { //Checks if there are spymasters on the team. If not, then shows placeholder.
    var noMasterHtml = `
      <li class="nomaster">
        <i class="fa fa-user-secret"></i>&nbsp; No Spymaster
        <span class="collapse spymaster"><a data-role="master" class="btn btn-default" href="#">Become Spymaster</a></span>
      </li>
    `;
    $(userView).find('ul.master li.nomaster').remove();
    ['red', 'blue'].forEach(function(t) {
      // console.log("Checking masters: " + t);
      if ($(userView).find('.' + t + " ul.master li:not('.nomaster')").length < 1) {
        $(noMasterHtml).appendTo($(userView).find('.' + t + " ul.master"));
      }
    });
    $(userView).find('ul.master .spymaster').hide(); //Hide other team's join spymater button
    $(userView).find('.' + currentTeam + " ul.master .spymaster").show(); //Show this team's join spymaster button
  }

  var createUser = function(id, name, role = "player", ready = false) { //role = player unless it's a master, ready = false unless they're ready
    let html = `
      <li data-id="${id}" data-name="${name}">
        <span class="pull-right"><i class="toggleReady fa ${ready ? "fa-check-square-o" : "fa-square-o"}"></i></span>
        <i class="fa ${role === "player" ? "fa-user-o" : "fa-user-secret"}"></i>&nbsp; ${role === "master" ? "Spymaster:" : ""}&nbsp;${name}
      </li>
      `;
    return html;
  }

  function initUsers(users) { //users = array of users from confirmjoin
    users.forEach(function(user) {
      let existingUser = createUser(user.userId, user.name, user.roleName, user.ready);
      $(existingUser).appendTo($(userView).find('.' + user.teamName + " ul." + user.roleName));
    });
  }


  //Socket Events
  socket.on('confirmjoin', function(data) { //User joined successfully. Generate game.
      console.log('Joined Game');
      if (data.gameState === "lobby") { //lobby so append users
        initUsers(data.users); //Appends all existing users
        currentTeam = data.teamName;
        joinTeam(); //Creates user
        checkSpymasters(); //Checks Spymasters
      } else { // Mid game
        console.log("Mid Game?");
        currentTeam = data.teamName;
        //TODO: Might need to add user.roleName in case user was a game master.
        socket.emit('getboard');
        initGame();
      }
    })
    .on('confirmleave', function() {
      Cookies.remove('userId');
      Cookies.remove('gameCode');
      window.location.href = "/";
    })
    .on('failjoin', function() { //User didn't join successfully. Redirect to home.
      console.log('Failed to Join Game');
    })
    .on('confirmteamswitch', function() { //Confirmed Current User Team Switch
      console.log("Confirm Team Switch");
      currentUserSwitchTeam();
    })
    .on('failteamswitch', function() { //Failed Current User Team Switch
      console.log("Failed Team Switch");
      currentTeam = (currentTeam === "red" ? "blue" : "red");
      currentUserSwitchTeam();
    })
    .on('confirmroleswitch', function() { //Confirmed Current User Role Switch
      console.log("Confirm Role Switch");
      currentUserSwitchRole();
    })
    .on('failroleswitch', function() { //Failed Current User Role Switch
      console.log("Failed Role Switch");
      currentRole = (currentRole === "player" ? "master" : "player");
      currentUserSwitchRole();
      checkSpymasters();
    })
    .on('failready', function() { //If the ready/unready request fails, then revert it.
      console.log("Failed Ready");
      if (currentReady) $('view.lobby .btn[data-type="ready"]').click();
    })
    .on('failunready', function() { //If the ready/unready request fails, then revert it.
      console.log("Failed Unrady");
      if (!currentReady) $('view.lobby .btn[data-type="ready"]').click();
    })
    .on('player_join', function(data) { //Another player joined.
      console.log('Player Joined Game');
      playerJoined(data.userId, data.name, data.teamName);
    })
    .on('player_leave', function(data) { //Another player left.
      console.log('Player Left Game');
      playerLeft(data.userId);
    })
    .on('player_teamswitch', function(data) { //Another player switched teams.
      console.log('Player Switched Teams');
      playerSwitchedTeam(data.userId, data.teamName);
    })
    .on('player_roleswitch', function(data) { //Another player switched roles.
      console.log('Player Switched Roles');
      playerSwitchedRoles(data.userId, data.roleName);
    })
    .on('player_ready', function(data) { //Another player pressed ready.
      console.log('Player Readied');
      playerToggleReady(data.userId, true);
    })
    .on('player_unready', function(data) { //Another player pressed unready.
      console.log('Player Unreadied');
      playerToggleReady(data.userId, false);
    })
    .on('startgame', function(data) { //Starting the game.
      console.log('Game Started');
      initGame();
    });


  /*
  ====================
  Game View
  ====================
  */
  let gameView = $('view.game');
  //displays, gameContainer, actions are sub classes
  /*
    @class displays = On the top that shows Hint, team, Score, etc
    @class gameContainer = Cards view that holds cards
    @class actions = On the bottom that has button actions 'Skip', etc
  */
  $('view.game .actions').on('click', '.btn', function(e){
    var type = $(this).data('type');
    if(type === "leave"){
      swal({
        title: 'Leave Game?',
        text: 'You will not be able to join in again',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Leave',
        cancelButtonText: 'Stay',
        confirmButtonClass: 'btn btn-default',
        cancelButtonClass: 'btn btn-default',
        buttonsStyling: false,
      }).then(function(){
        socket.emit('leave');
      });
    }
    e.preventDefault();
  });

  $(gameView).on('click', '.card', function(e){
    e.stopPropagation();
    var word = $(this).data('word');
    if($(this).data('color') || !word) return; //Don't do anything if card was revealed or not a card

    swal({
      html: true,
      title: 'Contact Publisher',
      html: 'Do you want to relay top secret data to: <div style="font-size:1.25em;margin-top:5px;">' + word + "?</div>",
      showCancelButton: true,
      confirmButtonText: 'Send Data',
      cancelButtonText: 'Cancel',
      confirmButtonClass: 'btn btn-default',
      cancelButtonClass: 'btn btn-default',
      buttonsStyling: false,
    }).then(function(){
      chooseWord(word);
    });
  });

  function initGame(){ //Starts and renders game view
    $('view.lobby').hide();
    $(gameView).show();
    $(gameView).parent().removeClass('col-md-4 col-md-offset-4').addClass('col-md-8 col-md-offset-2');
  }

  let initBoardState = {};
  function renderGameView(){ //Creates the cards and appends them onto the game container
    console.log(initBoardState);
    for(var word in initBoardState){
      $('view.game .gameContainer').append(generateWordCard(word, initBoardState[word]));
    }
  }

  function generateWordCard(word, data){ //Render HTML of word card
    let color = data.revealed ? data.color : "";
    let html = `
      <div class="card" data-id="${data.Id}" data-word="${word}" data-color="${color}">
        <div class="row">
          <div class="col-xs-12">${word}</div>
        </div>
      </div>
    `;
    return html;
  }

  function sendHint(data){ //Game Master will choose a hint and number to send.
    if(currentRole === "player") return; //Quick frontend check
    socket.emit('hint', {
      word: data.word,
      number: data.number
    });
  }

  function chooseWord(word){ //Player will choose the word.
    if(currentRole !== "player") return; //Quick frontend check
    socket.emit('chooseword', {
      word: word
    });
  }

  function votePass(){ //Pass the turn. Majority need to check this.
    if(currentRole !== "player") return;
    socket.emit('votepass');
  }

  function revealWord(id, color){
    $(gameView).find('.card[data-id="'+id+'"]').attr('data-color', color).data('color', color);
  }

  //Game Socket Events
  socket.on('get_board', function(data){
    initBoardState = data.board;
    renderGameView();
  })
  .on('word_reveal', function(data){
    let wordId = data.id,
        wordColor = data.color;
    revealWord(wordId, wordColor);
  })
  .on('hint_display', function(data){
    //data.hint, data.number
  })
  .on('switch_turn', function(data){
    //data.teamName
  })
  .on('endgame', function(data){
    //data.teamName (team that won)
  })


  /*
  ====================
  Misc Functions
  ====================
  */
  function updateThemeColor(team) {
    $('meta[name=theme-color]').add('meta[name=msapplication-navbutton-color]').remove();
    let color = "#333333";
    if (team === "red") {
      color = '#c0392b';
    } else if (team === "blue") {
      color = '#2980b9';
    }
    $('head').append('<meta name="theme-color" content="' + color + '" /> <meta name="msapplication-navbutton-color" content="' + color + '" />');
  }

  function showBotAnimation(){

  }
});
