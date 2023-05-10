express = require("express");
bodyParser = require("body-parser");
app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });

const openai = new OpenAIApi(configuration);

const GLOBAL_TOKEN_LIMIT = 5000;
const CONTEXT_LIMIT = 5;
let token_usage = 0;

app.get("/", function (req, res) {
  res.sendFile(`index.html`, { root: __dirname });
});

app.post("/api/ai", function (req, res) {
  if (token_usage >= GLOBAL_TOKEN_LIMIT) {
    res.status(500).send("Token limit exceeded.");
    return;
  }

  try {
    const context = req.body.context.slice(-CONTEXT_LIMIT);

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

app.get("/*", function (req, res) {
  res.status(404).sendFile("404.html", { root: __dirname });
});

app.listen(process.env.PORT || 3000, function () {
  console.log(
    `Server running at http://localhost:${process.env.PORT || 3000}/`
  );
});
