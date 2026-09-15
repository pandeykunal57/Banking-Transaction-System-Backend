const express = require('express');
const cookieParser = require('cookie-parser');


const app = express();



/**
 * - Routes required
 */

app.get("/", (req, res) => {
    res.send("Ledger Service is up and running")
})

const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRouter = require("./routes/transaction.routes")





/**
 * - Use Routes
 */

app.use(express.json())
app.use(cookieParser())
app.use("/api/auth", authRouter) 
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRouter)


module.exports = app