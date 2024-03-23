const express = require("express");
var cors = require("cors");
const axios = require("axios");
const http = require("http");
const socketIo = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyC93XxpL8z7dz4UjNBvECFYaobAOQre0Bk");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://gemini-frontend-smoky.vercel.app", "https://gemini-frontend-smoky.vercel.app/chat"]
  },
});

const router = express.Router();

const PORT = 8001;

app.use(express.json());

const corsOptions ={
  origin: ["http://localhost:3000", "https://gemini-frontend-smoky.vercel.app", "https://gemini-frontend-smoky.vercel.app/chat"], 
    credentials:true,           
    optionSuccessStatus:200
}
app.use(cors(corsOptions));

io.on("connection", (socket) => {
  console.log("client connected: ", socket.id);

  socket.join("chat-room");

  socket.on("disconnect", (reason) => {
    console.log(reason);
  });

  socket.on("message", async (data) => {
    console.log("Received message from client:", data);

    let history = [];
    data.array?.map((item) => {
      history.push(
        { role: "user", parts: [{ text: item?.question }] },
        { role: "model", parts: [{ text: item?.answer }] }
      );
    });

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessageStream(data.text);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
      const response = `${chunkText}`;
      io.to("chat-room").emit("response", response);
    }

    // const response = await result.response;
    // const text = response.text();

    // console.log(text);
    // res.send({gen_response: text})

  });
});

setInterval(() => {
  io.to("clock-room").emit("time", new Date());
}, 1000);

server.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log("Server running on Port ", PORT);
});
