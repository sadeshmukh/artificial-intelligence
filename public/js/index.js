const chatSubmitButton = document.getElementById("chatSubmit");
const chatInput = document.getElementById("chatInput");
const outputDiv = document.getElementById("outputDiv");

const userInput = document.getElementById("userInput");
const output = document.getElementById("output");

const globalContext = [];
let contextLength = 3;
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
  if (contextLength === 0) {
    // .slice(0) returns a copy of the array
    // Goal is to at least have user's context
    context = [context[context.length - 1]];
  } else {
    context = context.slice(-contextLength * 2);
  }
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

// function onClick(event) {
//   event.target.disabled = true;
//   globalContext.push({ role: "user", content: userInput.value });
//   get_ai_api(globalContext, globalSystemMessage).then((response) => {
//     console.log(response);
//     globalContext.push({ role: "assistant", content: response });
//     output.innerHTML = response.replace("\n", "<br>");
//     event.target.disabled = false;
//   });
// }

function onChatSubmit(event) {
  event.preventDefault();
  chatSubmitButton.disabled = true;
  chatInput.disabled = true;
  chatInput.value = chatInput.value.trim();
  globalContext.push({ role: "user", content: chatInput.value });
  chatInput.value = "Loading...";
  get_ai_api(globalContext, globalSystemMessage).then((response) => {
    console.log(response);
    globalContext.push({ role: "assistant", content: response });
    renderOutput();
    chatInput.value = "";
    chatSubmitButton.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  });
}

// should render the output with alternating colors
function renderOutput() {
  outputDiv.innerHTML = "";
  globalContext.forEach((message) => {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.classList.add(message.role);
    messageDiv.classList.add("p-3");
    if (message.role === "user") {
      messageDiv.classList.add("bg-secondary");
    }
    messageDiv.innerHTML = message.content;
    outputDiv.appendChild(messageDiv);
  });
}
