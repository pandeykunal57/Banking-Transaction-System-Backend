const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")


/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */


async function createTransaction(req, res) {

    // req.body contains the transaction details sent by the frontend/client.
    // fromAccount is the sender, toAccount is the receiver, amount is the transfer value,
    // and idempotencyKey uniquely identifies this transaction request.
    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body


    // Validate that all required transaction fields were provided before querying the database.
    // return stops the controller immediately so no further transaction logic executes.
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }


    // Find the sender's account using the account ID received from the request.
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })


    // Find the receiver's account using the account ID received from the request.
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })


    // A transfer cannot continue unless both the sender and receiver accounts exist.
    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }


    /**
     * 2. Validate idempotency key
     */

    // Check whether this idempotency key has already been used by another transaction.
    // This prevents duplicate transfers when the same request is accidentally retried.
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })


    // If a transaction with this key already exists, return a response based on its current state.
    if (isTransactionAlreadyExists) {

        // COMPLETED means the original request already transferred the money successfully.
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })


        }

        // PENDING means the transaction exists but has not yet reached its completed state.
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        // FAILED means the previous attempt could not complete successfully.
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        // REVERSED means the previous transaction was rolled back/reversed and should be retried.
        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }


    /**
     * 3. Check account status
     */

    // Only ACTIVE accounts are allowed to participate in a transfer.
    // This protects transactions from being created against blocked/inactive accounts.
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }


    /**
     * 4. Derive sender balance from ledger
     */

    // getBalance() calculates the sender's current balance from its ledger entries.
    // The controller does not directly maintain a balance value here.
    const balance = await fromUserAccount.getBalance()


    // Prevent the sender from transferring more money than their current available balance.
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }


    // transaction will hold the MongoDB transaction document after it is created.
    let transaction;
    try {


        /**
         * 5. Create transaction (PENDING)
         */

        // Start a MongoDB session so multiple database operations can be executed as one transaction.
        const session = await mongoose.startSession()

        // Start the database transaction; changes using this session can later be committed together.
        session.startTransaction()


        // create() receives an array here because the Mongoose operation is being executed with a session.
        // The newly created transaction starts as PENDING until both ledger entries are successfully created.
        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]


        // Create the DEBIT ledger entry for the sender.
        // A debit represents money leaving the sender's account.
        const debitLedgerEntry = await ledgerModel.create([ {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })


        // Pause execution for 15 seconds to simulate a slow/long-running transaction process.
        // Because this happens before the commit, the MongoDB transaction remains open during this period.
        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()


        // Create the CREDIT ledger entry for the receiver.
        // A credit represents money entering the receiver's account.
        const creditLedgerEntry = await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })


        // Change the transaction status from PENDING to COMPLETED within the same MongoDB session.
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )



        // Commit makes all database operations in this session permanent together.
        // If the transaction fails before this point, the intended behavior is that the changes are not committed.
        await session.commitTransaction()

        // End the MongoDB session after the transaction has been committed.
        session.endSession()
    } catch (error) {

        // If an error occurs during processing, return without sending a success response.
        // The current implementation reports the transaction as pending to the client.
        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime",
        })


    }

    /**
     * 10. Send email notification
     */

    // After the database transaction is successfully committed, notify the authenticated user by email.
    // req.user was populated earlier by authentication middleware and contains the logged-in user's details.
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)


    // Return HTTP 201 (Created) with the completed transaction document.
    // The frontend can use this response to confirm that the transfer was successful.
    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })


}


async function createInitialFundsTransaction(req, res) {

    // Extract the receiver account, initial funding amount, and idempotency key from the request body.
    const { toAccount, amount, idempotencyKey } = req.body


    // Ensure all required values are present before creating the initial-funds transaction.
    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }


    // Find the account that will receive the initial funds.
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })


    // Reject the request if the destination account does not exist.
    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }


    // Find the system user's account that acts as the source of the initial funds.
    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })


    // Initial funds cannot be created if the system/source account cannot be found.
    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }



    // Start a MongoDB session so the transaction and both ledger entries are committed atomically.
    const session = await mongoose.startSession()

    // Begin the MongoDB transaction using the newly created session.
    session.startTransaction()


    // Create the transaction document in memory first instead of immediately saving it.
    // Its generated _id is then used by both ledger entries to link them to this transaction.
    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })


    // Create a DEBIT ledger entry against the system/source account.
    // This records that the initial funds are leaving the source account.
    const debitLedgerEntry = await ledgerModel.create([ {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    } ], { session })


    // Create a CREDIT ledger entry against the destination account.
    // This records that the initial funds are being added to the user's account.
    const creditLedgerEntry = await ledgerModel.create([ {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    } ], { session })


    // Once both ledger entries have been created successfully, mark the transaction as completed.
    transaction.status = "COMPLETED"

    // Save the completed transaction using the same MongoDB session.
    await transaction.save({ session })


    // Commit the transaction so the transaction document and both ledger entries become permanent together.
    await session.commitTransaction()

    // End the MongoDB session after the commit is complete.
    session.endSession()


    // Return the successfully completed initial-funds transaction to the client.
    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })



}



module.exports = {
    createTransaction,
    createInitialFundsTransaction
}