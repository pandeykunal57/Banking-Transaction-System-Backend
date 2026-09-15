const nodemailer = require('nodemailer');


// Create a reusable Nodemailer transporter responsible for connecting to Gmail's email server.
const transporter = nodemailer.createTransport({
    service: 'gmail',

    // OAuth2 is used instead of storing the Gmail account password directly in the application.
    auth: {
        type: 'OAuth2',

        // Gmail account that will be used as the sender.
        user: process.env.EMAIL_USER,

        // OAuth2 application credentials used to authenticate the application with Google.
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,

        // Refresh token allows the application to obtain access without repeatedly asking the user to log in.
        refreshToken: process.env.REFRESH_TOKEN,
    },
});


// Verify the connection configuration when the application starts.
// This checks whether Nodemailer can successfully connect using the provided configuration.
transporter.verify((error, success) => {
    if (error) {
        // Log the connection error so configuration/authentication problems can be diagnosed.
        console.error('Error connecting to email server:', error);
    } else {
        // This confirms that the transporter is ready to send emails.
        console.log('Email server is ready to send messages');
    }
});



// Reusable function responsible for actually sending an email.
const sendEmail = async (to, subject, text, html) => {
    try {

        // sendMail() sends the email using the transporter configured above.
        // The function accepts both plain-text and HTML versions of the same email.
        const info = await transporter.sendMail({
            from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // Sender name and email address.
            to, // Recipient email address.
            subject, // Subject displayed by the email client.
            text, // Plain-text version of the email body.
            html, // HTML version used by email clients that support HTML.
        });


        // messageId is the unique identifier generated for the sent email.
        console.log('Message sent: %s', info.messageId);

        // Nodemailer can provide a preview URL when using a test transport such as Ethereal.
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {

        // Catch and log email-sending errors instead of crashing the application.
        console.error('Error sending email:', error);
    }
};



// Sends a welcome email after a new user successfully registers.
async function sendRegistrationEmail(userEmail, name) {

    // Define the subject shown in the user's inbox.
    const subject = 'Welcome to Backend Ledger!';

    // Plain-text version used by email clients that do not render HTML.
    const text = `Hello ${name},\n\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;

    // HTML version provides formatted paragraphs and a line break in the email.
    const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;


    // Pass the prepared email data to the common sendEmail() function.
    await sendEmail(userEmail, subject, text, html);
}


// Sends a confirmation email after a transaction is successfully completed.
async function sendTransactionEmail(userEmail, name, amount, toAccount) {

    // Define the subject for the successful transaction notification.
    const subject = 'Transaction Successful!';

    // Create the plain-text transaction confirmation using the supplied transaction details.
    const text = `Hello ${name},\n\nYour transaction of $${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Backend Ledger Team`;

    // Create the HTML version of the same transaction confirmation.
    const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} to account ${toAccount} was successful.</p><p>Best regards,<br>The Backend Ledger Team</p>`;


    // Reuse the common email function instead of duplicating Nodemailer logic.
    await sendEmail(userEmail, subject, text, html);
}


// Sends a notification when a transaction fails.
async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {

    // Define the subject shown for a failed transaction notification.
    const subject = 'Transaction Failed';

    // Create the plain-text failure notification with the relevant transaction details.
    const text = `Hello ${name},\n\nWe regret to inform you that your transaction of $${amount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Backend Ledger Team`;

    // Create the HTML version of the failure notification.
    const html = `<p>Hello ${name},</p><p>We regret to inform you that your transaction of $${amount} to account ${toAccount} has failed. Please try again later.</p><p>Best regards,<br>The Backend Ledger Team</p>`;


    // Send the prepared failure notification through the reusable email function.
    await sendEmail(userEmail, subject, text, html);
}


module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail
};