const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blacklist.model")



// Middleware that verifies the user's JWT and attaches the authenticated user to req.user.
async function authMiddleware(req, res, next) {

    // Try to get the JWT from the browser cookie first.
    // If the cookie is unavailable, fall back to the Authorization header: "Bearer <token>".
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]


    // Stop the request if the client did not provide any authentication token.
    // 401 means the request is unauthenticated and the protected resource cannot be accessed.
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }


    // Check whether this token was explicitly invalidated during logout.
    // Blacklisting is useful because a JWT normally remains valid until its expiration time.
    const isBlacklisted = await tokenBlackListModel.findOne({ token })


    // Reject the request if the token exists in the blacklist.
    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }


    try {

        // Verify the JWT signature and expiration using the same secret used when the token was created.
        // If the token is expired, modified, or signed with a different secret, jwt.verify() throws an error.
        const decoded = jwt.verify(token, process.env.JWT_SECRET)


        // The decoded token contains userId because the login/register controller stored it in the JWT payload.
        // Use that ID to fetch the complete user document from MongoDB.
        const user = await userModel.findById(decoded.userId)


        // Attach the authenticated user to req so controllers can access the user through req.user.
        // This avoids repeatedly extracting and verifying the token inside every protected controller.
        req.user = user


        // Pass control to the next middleware or controller in the Express request pipeline.
        // return ensures this middleware does not continue executing after handing over the request.
        return next()


    } catch (err) {

        // Any JWT verification/database error reaches this block and results in an unauthorized response.
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
}


// Middleware that authenticates the user and additionally verifies that the user is a system user.
async function authSystemUserMiddleware(req, res, next) {


    // Read the JWT from the cookie or, if absent, from the Bearer token in the Authorization header.
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]


    // Reject the request when no authentication token is available.
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }


    // Check the blacklist before trusting the token, so a logged-out token cannot be reused.
    const isBlacklisted = await tokenBlackListModel.findOne({ token })


    // Reject any token that has previously been blacklisted.
    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }


    try {

        // Verify the JWT and extract its payload, including the userId.
        const decoded = jwt.verify(token, process.env.JWT_SECRET)


        // Fetch the user and explicitly include systemUser because this field is likely hidden by the schema.
        // "+systemUser" overrides a schema-level select:false configuration for this query.
        const user = await userModel.findById(decoded.userId).select("+systemUser")


        // Check the user's systemUser flag after retrieving the explicitly selected field.
        // 403 means authentication succeeded, but the authenticated user lacks the required permission.
        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden access, not a system user"
            })
        }


        // Store the verified system user on req so the next controller can use req.user.
        req.user = user


        // Allow the request to continue to the next middleware/controller.
        return next()

    }
    catch (err) {

        // Handle invalid, expired, or otherwise unusable JWT/authentication errors.
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }


}


module.exports = {
    authMiddleware,
    authSystemUserMiddleware
}