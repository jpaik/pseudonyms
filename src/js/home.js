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
      inputValidator: function(value) {
        return new Promise(function(resolve, reject) {
          if (value) {
            resolve();
          } else {
            reject('Please enter a name.');
          }
        });
      },
      preConfirm: function(name) {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            if (name === 'false') {
              reject('Game room full')
            } else {
              resolve()
            }
          }, 2000)
        })
      },
    }).then(function(name) {
      swal({
        type: 'success',
        html: 'Creating Room for ' + name
      });
      //window.location.href = /game/ + code
    }).catch(swal.noop);
  }); //Create game click

  //Join Existing Game
  $('.btn.join').on('click', function(e) {

    e.preventDefault();
    swal({
      title: 'Join a Game',
      html: '<input id="swal-input_name" class="swal2-input" placeholder="Your Name">' +
        '<input id="swal-input_code" class="swal2-input" placeholder="Game Code">',
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
        return new Promise(function(resolve, reject) {
          if ($('#swal-input_name').val() === "") {
            $('#swal-input_name').focus();
            reject('Please enter your name.');
          }
          else if ($('#swal-input_code').val() === "") {
            $('#swal-input_code').focus();
            reject('Please enter game code.');
          }
          else{
            resolve([
              $('#swal-input_name').val(),
              $('#swal-input_code').val()
            ]);
          }
        })
      }
    }).then(function(result) {
      swal({
        type: 'success',
        html: 'Joining Room for ' + result[0] + ' in room: ' + result[1]
      });
      //window.location.href = /game/ + code
    }).catch(swal.noop);

  }); //join button click


}); //Ends $function
