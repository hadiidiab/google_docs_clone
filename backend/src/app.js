require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const logger = require("./config/logger");
const connectDB = require("./config/connectMongo");
const passport = require("passport");
const {
  createStrategy,
  serializeUser,
  deserializeUser,
} = require("./config/passport");
const { authenticated } = require("./middlewares/auth.middlware");

const app = express();
const PORT = process.env.PORT || 3000;

const options = {
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "X-Access-Token",
  ],
  credentials: true,
  methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
  origin: process.env.CLIENT_URL,
  preflightContinue: true,
};
app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

const { joinRoom, leaveRoom, sendChanges } =
  require("./subscriptions/document.listener")(io);

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: false
      // httpOnly: true,
    },
    store: sessionStore,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(createStrategy);
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/users", require("./routes/user.route"));
app.use("/api/documents", authenticated, require("./routes/document.route"));

app.use(require("./middlewares/error.middleware"));

io.on("connection", (socket) => {
  logger.info("a user connected");

  socket.on("room:join", joinRoom);

  socket.on("room:leave", leaveRoom);

  socket.on("changes:send", sendChanges);

  socket.on("disconnect", () => {
    logger.info("user disconnected");
  });
});

server.listen(PORT, async () => {
  await connectDB();
  logger.info(`Server is running on port ${PORT}`);
});
