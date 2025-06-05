const swaggerAutogen = require("swagger-autogen")();
require("dotenv").config();
const doc = {
  info: {
    title: "My API",
    description: "Description",
  },
  host: "localhost:3000",
  basePath: "/",
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  // Use environment variable or default to localhost
};

const outputFile = "./swagger-output.json";
const routes = ["./index.js"]; // Adjust this path to your main server file

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc).then(() => {
  require("./index"); // Your project's root file
});
