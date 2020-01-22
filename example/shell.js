var conflux         = require('../')
var repl            = require('@primeeuler/repl');
var BitMask         = require('bit-mask');
var network         = new conflux() //network
var shell           = new repl()
var username        = function(text,callback){ return callback(true) }
var password        = function(text,callback){ return callback(true) }
var authenticate    = function(shell){ 
            //prompt username:
            shell.ask('username', function( user ){
                username(user, function(accept){
                    shell.access.user = user
                    if(accept){
                        //prompt password:
                        shell.ask('password', function( pass ){
                            password(pass, function(accept){
                                shell.access.accept = accept
                                if(accept){
                                    if(!network.inodes[shell.id]){
                                        network.inodes[shell.id] = {
                                            id:shell.id,
                                            umask: new BitMask.OwnershipMask('755'),
                                            userID:user,
                                            groupID:user,
                                            deviceID:'/dev/pty/' + shell.id,
                                            mimeType: 'text/ansi; TERM=xterm-256color',
                                            size:0,
                                            timestamps:[new Date()],
                                            links:1
                                        }
                                    }
                                    shell.user      = user
                                    shell.at        = '@'
                                    shell.home      = 'home' //global?'global':'window'
                                    //prompt user@home>
                                    //add context objects to home 
                                    shell.context.global  = global
                                    shell.context.shell   = shell
                                    shell.context.network = network
                                }else if(shell.access.failures < 2){
                                    shell.access.failures ++
                                    authenticate( shell )
                                }else{
                                    shell.kill()
                                }
                            })
                        },true)    
                    }else if(shell.access.failures < 2){
                        shell.access.failures ++
                        authenticate( shell )
                    }else{
                        shell.kill()
                    }
                })
                
            },false) }
var kill            = function(){
    process.stdin.setRawMode( false )
    process.exit()
}
    shell.listen    = function(){
    network.listen( 8444, function(){ shell.print( this.address() ) } )
}
    shell.evil      = function(text){
            var result = shell.accessor.get(shell.context,text)
            if(text.indexOf('=') > -1){
                text = text.split('=')
                result = JSON.parse(text[1].trim())
                shell.accessor.set(shell.context, text[0].trim(), result )
            }
            
            switch(typeof result){
                case 'function':
                    try{
                        shell.print( result() ) 
                    }catch(e){
                        shell.print(e)
                    }
                    break;
                case 'undefined':
                    shell.loop()
                    break;
                default:
                    shell.print( result ) 
                
            }
            
        }
    shell.access    = { user:'', accept:false, failures:0 }
        
        
    network.sockets = {}
    network.use(__dirname + '/web/')
    network.on('error', shell.print )
    network.on('socket', function( socket, options ){
        network.sockets[socket.id] = socket
        socket.on('authentication',shell.print )
        socket.on('error',shell.print)
        shell.print(socket.handshake)
    })
    network.on('stream', function( stream, options, socket ){
        shell.print(options)
        stream.on('error', shell.print )
        switch(options.service){
                case 'repl':
                    var _repl = new repl()
                        _repl.access    = { user:'', accept:false, failures:0 }
                        _repl.id = stream.id
                        stream.pipe(_repl).pipe(stream)
                        authenticate(_repl)
                    break;
                case 'pub':
                    network.channels.push( options.channel )
                    stream.on("data",function(data){
                        network.pubsub.publish( options.channel ,data)
                    })
                    break;
                case 'sub':
                    var subscriber = network.pubsub.subscribe( options.channel, function(msg,data){ 
                            stream.write(data)
                    })
                    stream.on('end',function(){
                        network.pubsub.unsubscribe(subscriber)
                    })
                    break;
            }
    })
        
        
        
        

//  terminal emulator process    
    if(process.stdin.isTTY){
        process.stdin.setRawMode( true )
    }
//  connect terminal emulator to line discipline
    process.stdin.pipe( shell ).pipe( process.stdout )
//  listen for terminal resizeing
    process.stdout.on('resize', function() {
        shell.setSize( process.stdout )
    })
//  set columns and rows
    shell.setSize( process.stdout )  
//  sigkill
    shell.on('end',   kill) 
    shell.on('close', kill) 
//  authenticate 
    shell.id = process.pid
    authenticate(shell)