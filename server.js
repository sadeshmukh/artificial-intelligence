express = require("express");
bodyParser = require("body-parser");
cookieParser = require("cookie-parser");
app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(cookieParser());

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const valid_tokens = process.env.VALID_TOKENS.split(",");

const openai = new OpenAIApi(configuration);

const GLOBAL_TOKEN_LIMIT = 5000;
const CONTEXT_LIMIT = 5;
let token_usage = 0;

const shortpolls = {};

async function getCompletion(history) {
  let completion = null;
  let completionAttempts = 0;
  while (!completion) {
    completionAttempts++;
    if (completionAttempts > 3) {
      throw "Completion failed";
    }
    completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: history,
    });
    if (
      !["length", "stop"].includes(completion.data.choices[0].finish_reason)
    ) {
      console.log("Restarting completion", completion.data);
      completion = null;
    }
  }

  return completion;
}

app.get("/", function (req, res) {
  res.sendFile(`index.html`, { root: __dirname });
});

app.get("/image", function (req, res) {
  res.sendFile(`image.html`, { root: __dirname });
});

app.post("/setToken", function (req, res) {
  console.log(req.body);
  console.log(valid_tokens);
  if (!valid_tokens.includes(req.body.token)) {
    res.status(401).send("Invalid token.");
    return;
  }
  res.cookie("token", req.body.token, {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
  });
  res.send("Token set.");
});

app.post("/api/image", async function (req, res) {
  console.log(req.body);
  if (!req.cookies.token) {
    res.status(401).send("No token set.");
    return;
  }
  if (!valid_tokens.includes(req.cookies.token)) {
    res.status(401).send("Invalid token.");
    return;
  }
  shortpoll_id = Math.random().toString(36).substring(7);
  while (shortpolls[shortpoll_id]) {
    shortpoll_id = Math.random().toString(36).substring(7);
  }
  shortpolls[shortpoll_id] = {
    completion: "incomplete",
  };
  res.send({ shortpoll: shortpoll_id });
  try {
    let response = await openai.createImage({
      prompt: req.body.prompt,
      n: 1,
      size: "256x256",
    });
    console.log(response.data);
    image_url = response.data.data[0].url;
    shortpolls[shortpoll_id] = {
      image_url: image_url,
      completion: "full",
    };
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/chat", function (req, res) {
  if (!req.cookies.token) {
    res.status(401).send("No token set.");
    return;
  }
  if (!valid_tokens.includes(req.cookies.token)) {
    res.status(401).send("Invalid token.");
    return;
  }
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  }

  try {
    const context = req.body.context.slice(-(CONTEXT_LIMIT + 1) * 2);

    const completion = getCompletion(context);
    shortpoll_id = Math.random().toString(36).substring(7);
    while (shortpolls[shortpoll_id]) {
      shortpoll_id = Math.random().toString(36).substring(7);
    }
    shortpolls[shortpoll_id] = {
      completion: "incomplete",
    };
    completion.then((response) => {
      shortpolls[shortpoll_id] = {
        output: response.data.choices[0].message.content,
        tokens: response.data.usage.total_tokens,
        completion: "full",
      };
      token_usage += response.data.usage.total_tokens;
      console.log(`Token usage: ${token_usage}`);
    });

    res.status(202).send({ shortpoll: shortpoll_id });
  } catch {
    res.status(500).send("There was an error.");
  }
});

app.post("/api/shortpoll", function (req, res) {
  if (!req.cookies.token) {
    res.status(401).send("No token set.");
    return;
  }
  if (!valid_tokens.includes(req.cookies.token)) {
    res.status(401).send("Invalid token.");
    return;
  }
  console.log(shortpolls);
  console.log(req.body);
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  } else if (!req.body.shortpoll_id) {
    res.status(400).send("No shortpoll ID provided.");
    return;
  } else if (shortpolls[req.body.shortpoll_id].completion === "incomplete") {
    res.status(202).send("Incomplete shortpoll");
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

app.get("/api/upper", function (req, res) {
  console.log(req.body);
  try {
    res.send({ response: req.body.text.toUpperCase() });
  } catch {
    res.send({ response: "Error" });
  }
});

app.get("/*", function (req, res) {
  res.status(404).sendFile("404.html", { root: __dirname });
});

app.listen(process.env.PORT || 3000, function () {
  console.log(
    `Server running at http://localhost:${process.env.PORT || 3000}/`
  );
});
