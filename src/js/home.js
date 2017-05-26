$(function() {
  //Create Game
  $('.btn.new').on('click', function(e) {
    e.preventDefault();
    swal({
      title: 'Create a New Game',
      input: 'text',
      showCancelButton: true,
      showLoaderOnConfirm: true,
      inputPlaceholder: "Your Name",
      confirmButtonText: "Create",
      confirmButtonClass: 'btn btn-default',
      cancelButtonClass: 'btn btn-default',
      buttonsStyling: false,
      inputValidator: function(value) { //Checks if name is not null.
        return new Promise(function(resolve, reject) {
          if (value) {
            resolve();
          } else {
            reject('Please enter a name.');
          }
        });
      },
      preConfirm: function(name) {
        return new Promise(function(resolve, reject) { //Returns a promise object, rejects if error and resolves if created.
          $.ajax({
            type: 'POST',
            url: '/game/create',
            data: {
              name: name
            }
          }).done(function(data) {
            Cookie.set('game_uuid', data.uuid, {expires: 1}); //Stores Session Unique ID
            Cookie.set('game_code', data.code, {expires: 1}); //Stores game's code for resjoining
            resolve([name, data.code]); //Returns name and code to redirect
          }).fail(function() {
            reject('Something went wrong... Try again.');
          });
        })
      },
    }).then(function(data) { //data = name and code
      swal({
        type: 'success',
        html: 'Creating Room for ' + data[0] + " | Code: " + data[1]
      });
      //window.location.href = /game/ + code
    }).catch(swal.noop);
  }); //End Create game click

  //Join Existing Game
  $('.btn.join').on('click', function(e) {
    e.preventDefault();
    swal({
      title: 'Join a Game',
      html: '<input id="swal-input_name" class="swal2-input" placeholder="Your Name">' +
        '<input id="swal-input_code" class="swal2-input" placeholder="Game Code" maxlength="4">',
      confirmButtonText: "Join",
      showCancelButton: true,
      showLoaderOnConfirm: true,
      confirmButtonClass: 'btn btn-default',
      cancelButtonClass: 'btn btn-default',
      buttonsStyling: false,
      onOpen: function() {
        $('#swal-input_name').focus();
      },
      preConfirm: function() {
        return new Promise(function(resolve, reject) { //Returns a promise object, rejects if error and resolves if game exists.
          if ($('#swal-input_name').val() === "") {
            $('#swal-input_name').focus();
            reject('Please enter your name.');
            return;
          }
          if ($('#swal-input_code').val() === "") {
            $('#swal-input_code').focus();
            reject('Please enter game code.');
            return;
          }
          $.ajax({
            type: 'POST',
            url: '/game/join',
            data: {
              name: $('#swal-input_name').val(),
              code: $('#swal-input_code').val().toLowerCase()
            }
          }).done(function(data, jqXHR) {
            Cookie.set('game_code', data.code, {expires: 1});
            Cookie.set('game_uuid', data.uuid, {expires: 1});
            resolve([
              $('#swal-input_name').val(),
              $('#swal-input_code').val()
            ]);
          }).fail(function(jqXHR) {
            if(jqXHR.status === 400){
              reject('Game not found.');
            }else{
              reject('Something went wrong... Try again.');
            }
          });
        })
      }
    }).then(function(result) {
      swal({
        type: 'success',
        html: 'Joining Room for ' + result[0] + ' in room: ' + result[1]
      });
      //window.location.href = /game/ + code
    }).catch(swal.noop);

  }); //End join button click

}); //Ends $function
