const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage } = require('./utils/messages')
const { generateLocationMessage } = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server) 


const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => { //socket is an obj that contains ifno abut the new connection
    console.log('New webSocket connection! ')
    
    socket.on('join', ({username, room}, callback) => {
        const {error, user } = addUser({ id: socket.id , username, room})

        if(error){
            return callback(error)
        }

        socket.join(user.room)
        //io.to.emit -> allow us to sent a message to everyone in a room without sendig to people on other chat rooms
        //socket.broadcast.to.emit -> sending an event to everyone except for the specific client, but its limiting it to a specific chat room
        
        socket.emit('message', generateMessage('Admin', 'welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has join to the chat! `)) // socket.broadcast.emit is used to send a message to all other users that someone new has joined.
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)){
            return callback('Profanity is nat allowed! :( ')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message)) // use io.emit to emit event the every single connection that's avilable (socket.emit -> emit event to single connection)
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`)) //the link will get the coardinates of my location and show it at googlemaps
        callback()
    })
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin' ,`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

        
    })
})

server.listen(port, () => {
    console.log(`server is up om port ${port} !!`)
})