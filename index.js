
var fs          = require('fs');
var crypto      = require('crypto');
var events      = require('events');
var express     = require('express');
var io          = require('socket.io');
var ss          = require('socket.io-stream');
var ssh2        = require('ssh2');
var utils       = ssh2.utils;

function conflux(){
    var self    = new events.EventEmitter()
    var pki     = {
        privateKey: fs.readFileSync(__dirname + '/crypto/host.key'),
        key:        fs.readFileSync(__dirname + '/crypto/host.key'),
        cert:       fs.readFileSync(__dirname + '/crypto/host.crt'),
        passphrase: 'password'
    }
    var api     = express();
        /**
             TODO: add support for ssh2 server 
         */
    var ssh2server = new ssh2.Server({ hostKeys: [pki] },  on_connection );

            
    var server  = require('https').createServer(pki , api);
        self.pubsub         = require('pubsub-js');
        self.use            = function( path ){
            api.use(express.static(path));
            api.get('/', function (req, res) {
                res.sendFile(path + '/index.html');
            });
        }
        self.createStream   = function(options,socket){
            var stream = ss.createStream(options);
                sbind(stream,socket)
                ss(socket).emit('stream', stream, options )
            return stream
        }
        self.listen         = function(port,cb){
            server.listen(port,cb)
        }
        self.channels       = []
        self.inodes         = {}
        io(server).on('connection', on_connection ) ;
        function sbind(stream,socket){
            function emit(e){
                stream.emit(e.event,e.data);
            }
            function absorb(){
                ss(socket).removeListener(stream.id,emit)
            }
            ss(socket).on( stream.id, emit ) ;
            stream.on('end', absorb )
            stream.on('close', absorb )
            stream.on('socket.io', function(e){
                ss(socket).emit( stream.id, e )
            })
        }
        /**
         * Listens for rtt socket events from endpoint. 
         * Returns endpoint timestamp.
         * Listens for channels request. 
         * Returns channel list.
         * Listens for stream events from endpoint.
         * Calls on_stream handler
         * @public
         * @param {Object} socket The socket connection to the endpoint.
         * @param {Object} options The options set from the endpoint.	
         * 
         */
        function on_connection(socket, options){
            socket.on('authentication', function(ctx) {
                console.log(ctx.username)
              if (ctx.username) {
                return ctx.accept();
              }
              if (ctx.method !== 'keyboard-interactive')
                  return ctx.reject(['keyboard-interactive']);
            })
            socket.on('ready', function(){
               
            })
            socket.on('end', function(){
                
            })
            socket.on('error', function(){
                
            })
            socket.on('rtt', function(ts, cb){ cb(ts) })
            socket.on('channels', function(cb){ cb( self.channels ) })
            
            self.emit('socket', socket, options)
            ss(socket).on('stream', function(stream, options){
                on_stream(stream, options, socket)
            })
        } 
        /**
         * Binds stream events to socket endpoint. ioctrl
         * Emits stream, options, socket
         * Attaches stream to a channel if pub/sub service option is set
         * @public
         * @param {Object} stream The stream emited form the socket.
         * @param {Object} options The password to use for authentication.	
         * @param {Object} socket The socket connection to the endpoint.
         */
        function on_stream(stream, options, socket ){
            sbind( stream, socket )
            self.emit('stream', stream, options, socket)
        }
        
        return self

}
module.exports = conflux
