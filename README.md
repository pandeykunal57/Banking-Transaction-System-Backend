# 🏦 Banking Backend System

A **real-world banking backend system** built with **Node.js, Express.js, and MongoDB**, designed to demonstrate how core banking operations can be implemented through a structured backend architecture.

The system handles **user authentication, bank account management, credit/debit transactions, ledger-based balance calculation, transaction validation, idempotency, email notifications, and logout management**.

---

## ✨ Features

### 🔐 Authentication & Security

* **User Registration & Login**
  Users can create an account and securely authenticate with their credentials.

* **Password Hashing**
  User passwords are securely hashed using **bcrypt** before being stored.

* **JWT Authentication**
  JSON Web Tokens are used to authenticate users and secure protected APIs.

* **Authentication Middleware**
  Protected routes verify the user's authentication before allowing access to account and transaction operations.

* **Blacklist & Logout**
  Implements a blacklist mechanism to invalidate authentication tokens when a user logs out.

---

### 🏦 Account Management

* **Bank Account Creation**
  Authenticated users can create and manage their banking accounts.

* **Account Status Validation**
  The system verifies the account status before allowing transactions to be processed.

* **Balance Retrieval**
  Provides an API to retrieve the current account balance.

---

### 💸 Transaction Processing

* **Credit & Debit Operations**
  Supports financial transactions involving credit and debit operations between accounts.

* **Transaction Validation**
  Validates the sender, receiver, account status, and available balance before processing a transaction.

* **Pending Transaction State**
  Transactions are initially created with a pending state as part of the transaction-processing workflow.

* **Transaction Records**
  Dedicated transaction records are maintained to track financial operations and their processing state.

---

### 📒 Ledger System

* **Ledger-Based Accounting**
  Maintains ledger entries representing account-level financial activity.

* **Balance Derived from Ledger**
  The current account balance is calculated from ledger entries rather than relying solely on a stored balance value.

* **MongoDB Aggregation**
  Uses MongoDB's **aggregation pipeline** to calculate the account balance from the ledger records.

This provides a traceable representation of the account's credit and debit activity.

---

### 🔁 Idempotent Transactions

The system implements **idempotency validation** for transaction requests.

This prevents the same transaction request from being processed multiple times when a request is accidentally retried.

```text
Transaction Request
        │
        ▼
Idempotency Check
        │
   ┌────┴────┐
   │         │
New Request  Duplicate
   │         │
   ▼         ▼
Process    Prevent
           Reprocessing
```

---

### 📧 Email Notifications

* Uses **Nodemailer** for sending emails.
* Sends an email when a user registers.
* Sends transaction-related email notifications.

---

## 🔄 Banking Transaction Flow

A typical transaction follows this flow:

```text
User Request
     ↓
JWT Authentication
     ↓
Idempotency Validation
     ↓
Account Status Check
     ↓
Sender & Receiver Validation
     ↓
Balance Verification
     ↓
Create Pending Transaction
     ↓
Process Credit / Debit
     ↓
Create Ledger Entries
     ↓
Transaction Processing
     ↓
Email Notification
```

The flow ensures that banking operations go through the required authentication and validation steps before being processed.

---

## 🧩 Core Modules

```text
Authentication
     │
     ├── Registration
     ├── Login
     └── Logout

Accounts
     │
     ├── Account Creation
     ├── Account Validation
     └── Balance Retrieval

Transactions
     │
     ├── Credit / Debit
     ├── Validation
     ├── Idempotency
     └── Transaction State

Ledger
     │
     ├── Credit Entries
     ├── Debit Entries
     └── Balance Calculation

Notifications
     │
     └── Email Notifications
```

---

## 🎯 Project Highlights

The project focuses on understanding and implementing important backend concepts used in financial systems:

* 🔐 Secure authentication with JWT and bcrypt
* 🏦 Account management
* 💸 Credit and debit transaction processing
* 📒 Ledger-based financial tracking
* 📊 MongoDB aggregation for balance calculation
* 🔁 Idempotency for transaction requests
* 📧 Automated email notifications
* 🚪 Token invalidation through blacklist-based logout
* 🔄 Structured transaction-processing workflow

---

> **Note:** This project is built for learning and demonstrates the backend design and transaction-processing concepts involved in a banking system. It is not intended for handling real financial transactions.
