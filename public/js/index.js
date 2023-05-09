const userInput = document.getElementById("userInput");
const output = document.getElementById("output");

const globalContext = [];
let globalSystemMessage = "You are an affable, friendly chatbot";

// async function get_api() {
//   return fetch("/api/upper", {
//     method: "POST",
//     headers: {
//       Accept: "application/json",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ text: "sometext" }),
//   })
//     .then((response) => response.json())
//     .then((response) => response.response);
// }
// get_api().then((response) => alert(response));

async function get_ai_api(context, system) {
  return fetch("/api/ai", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context: [{ role: "system", content: system }].concat(context),
    }),
  })
    .then((response) => response.json())
    .then((response) => response.output);
}

function onClick(event) {
  event.target.disabled = true;
  globalContext.push({ role: "user", content: userInput.value });
  get_ai_api(globalContext, globalSystemMessage).then((response) => {
    console.log(response);
    globalContext.push({ role: "assistant", content: response });
    output.innerHTML = response.replace("\n", "<br>");
    event.target.disabled = false;
  });
}
