require("dotenv").config();

const express = require("express");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");


// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}
// connect db
connectDatabase();

// create server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// middlewares
app.use(express.json());
app.use(cookieParser());

// After other middleware
const fs = require('fs');
const certificateDir = path.join('/tmp', 'uploads', 'certificates');
if (!fs.existsSync(certificateDir)) {
  fs.mkdirSync(certificateDir, { recursive: true });
}
// Enable CORS for all routes

app.use(
  cors({
       // origin: "http://localhost:3000",
    origin: "https://tamkeen-frontend.vercel.app",
    credentials: true,
  })
);

// Add this line after your CORS configuration
//app.use('/uploads', express.static('/tmp/uploads'));
app.use("/", express.static(path.join(__dirname, "uploads")));


app.get("/test", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// why bodyparser?
// bodyparser is used to parse the data from the body of the request to the server (POST, PUT, DELETE, etc.)

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const message = require("./controller/message");
const conversation = require("./controller/conversation");

const serviceRoutes = require("./controller/services");
const bookings = require("./controller/booking");
const BulkOrder = require("./controller/bulkorder");
const wholesaleMarket = require("./controller/wholesaleMarket");
const Workshop = require("./controller/Workshop");
const forum = require("./controller/forum");
const maps = require("./controller/maps");
const salesAnalysis = require("./controller/salesAnalysis");


// end points
app.use("/api/v2/forum", forum);
app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/services", serviceRoutes);
app.use("/api/v2/book", bookings);
app.use("/api/v2/bulk-order", BulkOrder);
app.use("/api/v2/wholesaleMarket", wholesaleMarket);
app.use("/api/v2/workshop",Workshop);
app.use("/api/v2/map", maps);
app.use("/api/v2/sales-analysis", salesAnalysis);

// it'for errhendel
app.use(ErrorHandler);

// Handling Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling UNCAUGHT EXCEPTION! 💥`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
