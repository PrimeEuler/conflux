

var events      = require('events');
var s           = require('stream');
function conflux(){
    var self            = new events.EventEmitter()
        self.pubsub     = require('pubsub-js');
        self.io         //browser socket.io
        self.ss         //browser socket.io-stream
        self.channels   = []
    self.createStream   = function(options,socket){4
        var stream 
            if(socket){
                stream = self.ss.createStream(options);
                sbind(stream,socket)
                options.id = stream.id
                self.ss(socket).emit('stream', stream, options )
            }else{
                stream = new s.Duplex({
                    objectMode: options.objectMode,
                    read:function(size){ },
                    write:function(chunk, encoding, callback){
                        callback();
                        stream.io.push(chunk)
                    }
                } )
                stream.io = new s.Duplex({
                    objectMode: options.objectMode,
                    read:function(size){ },
                    write:function(chunk, encoding, callback){
                        callback();
                        stream.push(chunk)
                    }
                } )
            }
        return stream
    }
    self.connect        = function(io,url,ss){
        var socket  = io(url)
            self.io = io
            self.ss = ss
            function rtt(){
                socket.emit('rtt',Date.now(),function(ts){
                    socket.rtt  = Date.now() - ts
                    socket.connected?setTimeout(rtt,100):null;
                });
                self.emit('rtt',socket.rtt)
            }
            function sstream(stream, options){
                on_stream(stream, options, socket)
            }
            socket.on('connect', function(){
                rtt()
                self.ss(socket).on('stream',sstream)
                self.ss(socket).on('error', error)
                socket.on('disconnect', function(){ 
                        ss(socket).removeListener('stream',sstream)
                });
                socket.io.on("connect_error", error)
                self.emit('socket', socket )
            } )
    }
    function on_stream(stream, options, socket ){
            sbind( stream, socket )
            self.emit('stream', stream, options, socket)
            switch(options.service){
                case 'pub':
                    stream.on("data",function(data){
                        self.pubsub.publish( options.channel ,data)
                    })
                    break;
                case 'sub':
                    var subscriber = self.pubsub.subscribe( options.channel, function(msg,data){ 
                            stream.write(data)
                    })
                    stream.on('end',function(){
                        self.pubsub.unsubscribe(subscriber)
                    })
                    break;
            }
            
        }
    function sbind(stream,socket){
            function emit(e){
                stream.emit(e.event,e.data);
            }
            function absorb(){
                stream.emit('socket.io', { event:'end' } )
                self.ss(socket).removeListener(stream.id,emit)
            }
            self.ss(socket).on( stream.id, emit ) ;
            stream.on('end', absorb )
            stream.on('close', absorb )
            stream.on('socket.io', function(e){
                self.ss(socket).emit( stream.id, e )
            })
        }
    function error(e){
        self.emit('error',e)
    }
    return self
}
module.exports = conflux