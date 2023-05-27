const admin = require("firebase-admin");
const fs = require("fs");
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
const tokenRef = db.ref("tokens");

valid_tokens = fs.readFileSync("./.secrets/VALID_TOKENS", "utf8").split("\n");

tokenRef.set(valid_tokens || []);
