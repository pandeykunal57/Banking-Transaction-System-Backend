const accountModel = require("../models/account.model");


// Creates a new bank account for the currently authenticated user.
async function createAccountController(req, res) {

    // req.user is populated by the authentication middleware after JWT verification.
    const user = req.user;

    // Create the account and associate it with the authenticated user's ID.
    const account = await accountModel.create({
        user: user._id
    })

    // Return the newly created account with HTTP 201 (Created).
    res.status(201).json({
        account
    })

}


// Fetches all bank accounts belonging to the currently authenticated user.
async function getUserAccountsController(req, res) {

    // Find only accounts whose user field matches the authenticated user's ID.
    const accounts = await accountModel.find({ user: req.user._id });

    // Return the user's accounts to the client.
    res.status(200).json({
        accounts
    })
}


// Fetches the balance of a specific account belonging to the authenticated user.
async function getAccountBalanceController(req, res) {

    // Extract the account ID from the dynamic route parameter.
    const { accountId } = req.params;


    // Match both account ID and user ID to ensure the account belongs to this user.
    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })


    // Return 404 if the account doesn't exist or doesn't belong to the user.
    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }


    // getBalance() is a custom method defined on the account model/schema
    // that calculates the current balance for this particular account.
    const balance = await account.getBalance();


    // Return the account ID along with its calculated balance.
    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}



module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}