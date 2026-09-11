const express = require('express');
const cookieParser = require('cookie-parser');


const app = express();



/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")





/**
 * - Use Routes
 */

app.use(express.json())
app.use("/api/auth", authRouter) 
app.use(cookieParser())

module.exports = app