export function requireAdmin(req, res, next) {
  const configuredToken = process.env.ADMIN_TOKEN || "bni-admin";
  const requestToken = req.header("x-admin-token");

  if (!requestToken || requestToken !== configuredToken) {
    return res.status(401).json({ message: "Admin access required" });
  }

  next();
}
