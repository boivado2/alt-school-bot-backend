const express = require('express')
const {Server} = require("socket.io")
const http = require("http")
const app = express()
const server = http.createServer(app)
const io = new Server(server, {cors: { origin: "*"}})
const session = require("express-session")
const helmet = require("helmet")
const compression = require("compression")
require("dotenv").config()
const cors = require("cors")
app.use(compression())
app.use(helmet())
app.use(cors({allowedHeaders: '*'}))

const sessionMiddleware  = session({
  secret: process.env.SESSION_SECRETE_KEY,
  saveUninitialized: true,
  resave: false,
})

app.get('/', (req, res) => {
  res.send("hello")
})

app.use(sessionMiddleware)

// listen for two events
// - bot-message
// - user-message

let id = 1


io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next)
})
io.on("connection", socket => {

  const botMessage = (data, ...rest) => socket.emit('bot-message', data, ...rest)

  const state = {
    currentOrder: [],
    isOrdering: false,
    menuItems : [
      { id:2, msg: "Select 2 jollof Rice", name: "jollof rice"},
      {id:3, msg: "Select 3 Egusi Soup", name: "Egusi soup"},
      {id:4, msg:" Select 4 Chicken Burger", name: "Chicken Burger"},
      {id:5, msg: "Select 5 Beaf Stew", name: "Beaf stew"},
      {id: 6, msg: "Select 6 Fried Rice and Chicken", name: "Fried rice and chicken"},
      {id:0, msg: " Select 0 to cancel order"},
    ]
  }

  const defaultMsg = [
    {id:1, msg: "Select 1 to Place an order"},
    {id:99, msg: "Select 99 to checkout order"},
    {id:98, msg:"Select 98 to see order history"},
    {id:97, msg: "Select 97 to see current order"},
    {id:0, msg: " Select 0 to cancel order"},
  ]

  botMessage(defaultMsg)


  const userMessage = (data) => {
    const parseInput = parseInt(data)

    const selectedOption =  state.menuItems.find((item) => item.id === parseInput)

    if(parseInput === 1){
      state.isOrdering = true
      return botMessage(state.menuItems)

    }else if(state.isOrdering && ( selectedOption && selectedOption.id &&  selectedOption.id === parseInput)) {

      const {order} = socket.request.session
      if(order && order.currentOrder) {
         socket.request.session.order.currentOrder.push({msg: selectedOption.name, id: selectedOption.id})
      }else {
        socket.request.session.order = {
          currentOrder : [{msg: selectedOption.name, id: selectedOption.id}]
        }
      }
      state.currentOrder.push({msg: selectedOption.name, id: selectedOption.id})
     return  botMessage(`${selectedOption.name} selected. Do you want to add more items to your order? Type numbers. If not, type 99 to checkout or 97 to see current order.`,)

    }else if(parseInput === 97) {

     const {order} = socket.request.session
     if(!order?.currentOrder?.length) {
      botMessage('you have no order.')
      botMessage(defaultMsg)
      return
     }

     botMessage(`current order items.`)
     botMessage(order.currentOrder)
     return
    }else if(parseInput === 98) {
      const {order} = socket.request.session

      return console.log(order?.orderHistory)

    }else if(parseInput === 99) {
      const {order} = socket.request.session
      state.isOrdering = false

      if(order && order.orderHistory) {
        socket.request.session.order.orderHistory = {...order.orderHistory, [id++]: order.currentOrder}
     }else {
       socket.request.session.order = {
         orderHistory : { [id++] :  order.currentOrder }
       }
     }


      botMessage(`No order to check out.`)
      botMessage(defaultMsg)

    }else if(parseInput === 0) {
      const {order} = socket.request.session
      state.isOrdering = false
      if(!order?.currentOrder.length) {
        botMessage(`no order to cancel select from the options below.`)
       botMessage(defaultMsg)
       return
      }

      
      order.currentOrder = []
      botMessage(`order cancel successfully`)
      return
    }else {
        return botMessage("input is invalid")
    }

 
  }

  socket.on("client-msg", userMessage)

})





const PORT = 4000 || process.env.PORT
server.listen(PORT, () => console.log("listening on port:", PORT))