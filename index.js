const express = require("express");
const body_parser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { sequelizedb } = require("./database/db");
const router = require("./routes/routes");

const app = express();

// Enable CORS before any route or body parsing
app.use(cors({
    origin: `${process.env.NEXT_FRONTENT_URL}`,
    credentials: true
}));

app.use(body_parser.json());
app.use(cookieParser());

sequelizedb.authenticate().then(() => {
    console.log("Connection has been established successfully");
}).catch((error) => {
    console.error("Unable to connect to the database:", error);
});

app.use("/", router);

// Define a route for the root URL
app.get('/', (req, res) => {
    res.send("Don't peek to backend");
});

// Handle 404 errors for undefined routes
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// Use a fallback port if env is not set
app.listen(process.env.PORT || 5000, () => {
    console.log("Server is running on http://localhost:5000");
});