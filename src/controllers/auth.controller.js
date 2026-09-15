const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken") 
const emailService = require("../services/email.service") 
const tokenBlackListModel = require("../models/blacklist.model")






/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {

    // req.body contains the data sent by the frontend in the registration request.
    const { email, password, name } = req.body


    // Check MongoDB to see whether a user already exists with the provided email.
    const isExists = await userModel.findOne({
        email: email
    })


    // Stop execution and return 422 if the email is already registered.
    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }


    // Create a new user document; the model handles saving the user to MongoDB.
    const user = await userModel.create({
        email, password, name
    })


    // Create a JWT containing the user's ID so future requests can identify the user.
    // JWT_SECRET is kept in environment variables so the signing key is not exposed in source code.
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })


    // Store the JWT inside a browser cookie named "token" for authenticated requests.
    res.cookie("token", token)


    // Send the successful registration response back to the frontend.
    // Only selected user fields are returned instead of exposing the complete user document.
    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })


    // Send a registration email after the user has been successfully registered.
    await emailService.sendRegistrationEmail(user.email, user.name)
}




/**
 * - User Login Controller
 * - POST /api/auth/login
 */


async function userLoginController(req, res) {

    // Extract the email and password submitted by the user from the request body.
    const { email, password } = req.body


    // Find the user by email and explicitly include the password field for authentication.
    // "+password" is used when the schema normally hides the password with select:false.
    const user = await userModel.findOne({ email }).select("+password")


    // If no account exists with this email, return 401 Unauthorized.
    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }


    // Compare the plain-text password from req.body against the hashed password stored in MongoDB.
    // comparePassword() is a custom model method that performs the password comparison.
    const isValidPassword = await user.comparePassword(password)


    // Reject the login if the submitted password does not match the stored password.
    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }


    // Generate a new JWT after successful authentication and store the user's ID inside its payload.
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })


    // Store the JWT in the browser cookie so the authenticated session can be maintained.
    res.cookie("token", token)


    // Send the authenticated user's public information and token to the frontend.
    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })


}
/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {

    // First try to get the token from the authentication cookie.
    // If no cookie exists, fall back to the Authorization header using the "Bearer <token>" format.
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]


    // If there is no token, the user is already effectively logged out, so return success.
    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }




    // Store the token in the blacklist so it can be rejected even before its natural 3-day expiry.
    // The authentication middleware can check this blacklist on future requests.
    await tokenBlackListModel.create({
        token: token
    })


    // Remove the authentication cookie from the browser.
    res.clearCookie("token")


    // Confirm successful logout to the frontend.
    res.status(200).json({
        message: "User logged out successfully"
    })


}





module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}