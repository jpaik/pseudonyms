$(function(){
  //Blue Team Color: #2980b9;
  //Red Team Color:  #c0392b;

  $('h1').on('click', function(){
    updateThemeColor(Math.round(Math.random()) == 1 ? "red" : "blue");
  });

  function updateThemeColor(team){
    $('meta[name=theme-color]').remove();
    var color = "#333333";
    if(team === "red"){
      color = '#c0392b';
    }else if(team === "blue"){
      color = '#2980b9';
    }
    $('head').append('<meta name="theme-color" content="'+color+'">');
  }
});
