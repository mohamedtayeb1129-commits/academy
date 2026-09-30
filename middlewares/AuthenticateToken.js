const jwt = require("jsonwebtoken");

module.exports = async (req,res,next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        return next();
      } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
      }
}