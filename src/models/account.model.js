const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")



// Schema defines the structure and validation rules for an account document.
const accountSchema = new mongoose.Schema({
    user: {
        // Store the MongoDB ID of the user who owns this account.
        type: mongoose.Schema.Types.ObjectId,

        // Creates a reference to the user model for relationships/population.
        ref: "user",

        // Every account must be associated with a user.
        required: [ true, "Account must be associated with a user" ],

        // Index improves queries that search accounts by user.
        index: true
    },
    status: {
        // Account status controls whether the account can be used.
        type: String,

        // Only these three status values are allowed.
        enum: {
            values: [ "ACTIVE", "FROZEN", "CLOSED" ],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },

        // New accounts are active by default.
        default: "ACTIVE"
    },
    currency: {
        // Stores the currency used by the account.
        type: String,

        // Currency must be provided when creating an account.
        required: [ true, "Currency is required for creating an account" ],

        // INR is used when no currency is explicitly provided.
        default: "INR"
    }
}, {
    // Automatically adds createdAt and updatedAt fields to documents.
    timestamps: true
})


// Compound index improves queries that filter accounts by both user and status.
accountSchema.index({ user: 1, status: 1 })


// Custom instance method used to calculate the account's current balance.
accountSchema.methods.getBalance = async function () {


    // Aggregate all ledger entries belonging to this specific account.
    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            // Calculate total debit and credit amounts separately.
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        // Add amount only when the ledger entry is a DEBIT.
                        $cond: [
                            { $eq: [ "$type", "DEBIT" ] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        // Add amount only when the ledger entry is a CREDIT.
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            // Calculate balance as total credits minus total debits.
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ])


    // Return zero when the account has no ledger entries yet.
    if (balanceData.length === 0) {
        return 0
    }


    // Return the calculated balance from the aggregation result.
    return balanceData[ 0 ].balance


}





// Create the Mongoose model using the account schema.
const accountModel = mongoose.model("account", accountSchema)



// Export the model so controllers and other services can interact with accounts.
module.exports = accountModel