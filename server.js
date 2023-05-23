require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session")
const {ensureLoggedIn, ensureLoggedOut, usernameToLowerCase, init} = require("./utils")

const {OPENAI_API_KEY, PORT, USERNAME, PASSWORD, SESSION_SECRET} = process.env

app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true, limit: "1kb"}))
app.use(express.static(__dirname + "/public"));
app.use(session({
  secret: SESSION_SECRET,
  name: "not_admin",
  resave: false,
  saveUninitialized: false,
}))
app.use(init)
app.use(usernameToLowerCase)

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });

const openai = new OpenAIApi(configuration);

const GLOBAL_TOKEN_LIMIT = 5000;
const CONTEXT_LIMIT = 5;
let token_usage = 0;

app.get("/", function (req, res) {
  res.sendFile(`index.html`, { root: __dirname });
});

app.post("/api/ai", (req, res, next) => {
  if(req.isAuthenticated()) {next()} else {
    res.send({
      error: "No access"
    })
  }
}, function (req, res) {
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  }

  try {
    const context = req.body.context.slice(-(CONTEXT_LIMIT + 1) * 2);

    const completion = openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: context,
    });

    completion.then((response) => {
      res.send({
        output: response.data.choices[0].message.content,
        tokens: response.data.usage.total_tokens,
      });
      token_usage += response.data.usage.total_tokens;
      console.log(`Token usage: ${token_usage}`);
    });
  } catch {
    res.status(500).send("There was an error.");
  }
});

app.route("/admin.txt")
  .get((req, res) => {
    res.sendFile("admin.html", { root: __dirname })
  })
  .post((req, res) => {
    const {username, password} = req.body
    // I'm going to use basic security. If you think of a good reason to not, I'll do something more complicated(Argon2id or others). I can make everything more secure
    if (username == USERNAME && password == PASSWORD) {
      req.session.loggedIn = true
      // IDK how to send a status message on whtether it was successfull or not. I used ejs along with session before, but I can't with just html.
      res.redirect("/")
    } else {
      res.redirect("/")
    }
  })

/*
// No disrespect, but this is stupid.
app.get("/api/upper", function (req, res) {
  console.log(req.body);
  try {
    res.send({ response: req.body.text.toUpperCase() });
  } catch {
    res.send({ response: "Error" });
  }
});

app.post("/api/upper", function (req, res) {
  console.log(req.body);
  try {
    res.send({ response: req.body.text.toUpperCase() });
  } catch {
    res.send({ response: "Error" });
  }
});
*/

app.get("/*", function (req, res) {
  res.status(404).sendFile("404.html", { root: __dirname });
});

app.listen(PORT || 3000, function () {
  console.log(
    `Server running at http://localhost:${PORT || 3000}/`
  );
});
