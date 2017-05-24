# Pseudonyms
Pseudonyms is a game.

## Tools
We'll use nginx as our reverse proxy and pm2 as our app process manager.  
We'll use git for version control and management.  

## git
Login as your user and go to default directory.  
Don't do this on root. Root is James.  
Use `git config user.email "[Your email]"` to set your email ( no brackets ).  
Use `git config user.name "[Your name]"` to set your name.  
Google git if you need help.  
Don't delete stuff from .gitignore please.

## pm2
Use `pm2 restart www` in order to restart app if you made changes to backend.  
Use `pm2 log www` in order to see all logs from our app and real time log streams.  
Google pm2 for more info.

## nginx
You will probably never have to touch nginx, but if you ever need to restart it use `sudo systemctl restart nginx`  

---

## Setup
`app.js` is the default. `/bin/www` is what pm2 runs (it calls app.js).  
`public` is where the static files will be rendered and generated.  
`routes` is the controller and routing files  
`src` is where precompiled files go to compile into `public` folder.  
`views` is pugjs layouts and what gets rendered for user.
