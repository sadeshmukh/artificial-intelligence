express = require("express");
bodyParser = require("body-parser");
app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });

const openai = new OpenAIApi(configuration);

app.get("/", function (req, res) {
  res.sendFile(`${__dirname}/index.html`);
});

app.post("/api/ai", function (req, res) {
  const completion = openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: req.body.content }],
  });

  completion.then((response) => {
    res.send({
      output: response.data.choices[0].message.content,
      tokens: response.data.usage.total_tokens,
    });
  });
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
  res.status(404).send("404 - Page not found");
});

app.listen(process.env.PORT || 3000, function () {
  console.log(
    `Server running at http://localhost:${process.env.PORT || 3000}/`
  );
});
