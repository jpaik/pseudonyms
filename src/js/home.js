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
      onClose: function(){
        // $('.row.buttons a').blur();
      },
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
            resolve(data.code); //Returns name and code to redirect
          }).fail(function() {
            reject('Something went wrong... Try again.');
          });
        })
      }
    }).then(function(code) { //Gets game code and redirects there.
      window.location.href = '/game/' + code;
    }).catch(swal.noop);
  }); //End Create game click

  //Join Existing Game
  $('.btn.join').on('click', function(e) {
    e.preventDefault();
    swal({
      title: 'Join a Game',
      html: '<input id="swal-input_name" class="swal2-input" placeholder="Your Name" type="text">' +
        '<input id="swal-input_code" class="swal2-input" placeholder="Game Code" type="text" maxlength="4" pattern="[a-zA-Z]*">',
      confirmButtonText: "Join",
      showCancelButton: true,
      showLoaderOnConfirm: true,
      confirmButtonClass: 'btn btn-default',
      cancelButtonClass: 'btn btn-default',
      buttonsStyling: false,
      onOpen: function() {
        $('#swal-input_name').focus();
        $('#swal-input_code').unbind('keyup keydown').on('keyup', function(){ //Force Limit to 4 characters
          if($(this).val().length > 4) $(this).val($(this).val().substring(0,4));
        }).on('keydown', function(e){
          if(e.which === 13) swal.clickConfirm();
        });
      },
      onClose: function(){
        // $('.row.buttons a').blur();
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
          }).done(function() {
            resolve($('#swal-input_code').val().toLowerCase());
          }).fail(function(jqXHR) {
            if(jqXHR.status === 400){
              reject('Game not found.');
            }else{
              reject('Something went wrong... Try again.');
            }
          });
        })
      }
    }).then(function(code) {
      window.location.href = '/game/' + code;
    }).catch(swal.noop);

  }); //End join button click

}); //Ends $function
