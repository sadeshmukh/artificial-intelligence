require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session")
const {ensureLoggedIn, ensureLoggedOut, usernameToLowerCase, init, getCompletion} = require("./utils")

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
const shortpolls = {};

app.get("/", function (req, res) {
  res.sendFile(`index.html`, { root: __dirname });
});

// You can make a shortpoll request, but never retrieve data.
app.post("/api/ai", function (req, res) {
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  }

  try {
    const context = req.body.context.slice(-(CONTEXT_LIMIT + 1) * 2);

    // I moved the code around, to make everything work, while not wasting credits.
    shortpoll_id = Math.random().toString(36).substring(7)
    while (shortpolls[shortpoll_id]) {
      shortpoll_id = Math.random().toString(36).substring(7)
    }

    shortpolls[shortpoll_id] = { completion:"incomplete" }
    // This is one costs the credits. So it requires authentication. 
    // I set the error the be visible during shortpolling. It'll take a second, but it's slow if you do anything else.
    if (req.isAuthenticated()) {
      const completion = getCompletion(context, openai)
      completion.then((response) => {
        shortpolls[shortpoll_id] = {
          output: response.data.choices[0].message.content,
          tokens: response.data.usage.total_tokens,
          completion: "full"
        };
        token_usage += response.data.usage.total_tokens;
        console.log(`Token usage: ${token_usage}`);
      });
    }
    res.status(202).send({ shortpoll: shortpoll_id } )
  } catch {
    res.status(500).send("There was an error.");
  }
});

app.post("/api/shortpoll", (req, res, next) => {
  if(req.isAuthenticated()) {next()} else {
    delete shortpolls[req.body.shortpoll_id];
    res.send({
      error: "No access",
      completion: "full"
    })
  }
}, function (req, res) {
  console.log(shortpolls);
  console.log(req.body);
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  } else if (!req.body.shortpoll_id) {
    res.status(400).send("No shortpoll ID provided.");
    return;
  } else {
    if (shortpolls[req.body.shortpoll_id].completion === "full") {
      res.status(200).send(shortpolls[req.body.shortpoll_id]);
      delete shortpolls[req.body.shortpoll_id];
      console.log("Shortpoll retrieved");
    } else {
      res.status(202).send(shortpolls[req.body.shortpoll_id]);
    }
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
