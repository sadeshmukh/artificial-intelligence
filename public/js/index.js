const chatSubmitButton = document.getElementById("chatSubmit");
const chatInput = document.getElementById("chatInput");
const outputDiv = document.getElementById("outputDiv");
const settingsModal = new bootstrap.Modal(
  document.getElementById("settingsModal")
);
const exportText = document.getElementById("exportText");
const exportModal = new bootstrap.Modal(document.getElementById("exportModal"));
const personalityInput = document.getElementById("personalityInput");

const noTextHTML = "<div class='h2 m-5'>Have fun!</div>";

const encryptionKey = "12345";

const userInput = document.getElementById("userInput");
const output = document.getElementById("output");

let globalContext = JSON.parse(localStorage.getItem("globalContext"));
if (!globalContext) {
  localStorage.setItem("globalContext", JSON.stringify([]));
  globalContext = [];
}
renderOutput();

const resetGlobalContext = (event = null) => {
  if (!event) {
    globalContext = [];
    localStorage.setItem("globalContext", JSON.stringify(globalContext));
    return;
  }
  event.preventDefault();
  globalContext = [];
  localStorage.setItem("globalContext", JSON.stringify(globalContext));
  renderOutput();
  console.log(Object.keys(settingsModal));
  settingsModal.hide();
};

const addGlobalContext = (context) => {
  globalContext.push(context);
  localStorage.setItem("globalContext", JSON.stringify(globalContext));
  renderOutput();
};

let contextLength = 3;
const DEFAULT_SYSTEM_MESSAGE = "You are an affable, friendly chatbot.";
let globalSystemMessage = localStorage.getItem("globalSystemMessage");
if (!globalSystemMessage) {
  globalSystemMessage = DEFAULT_SYSTEM_MESSAGE;
  localStorage.setItem("globalSystemMessage", globalSystemMessage);
}

if (globalSystemMessage !== DEFAULT_SYSTEM_MESSAGE) {
  personalityInput.value = globalSystemMessage;
}

const updateSystemMessage = (event) => {
  event.preventDefault();
  personalityInput.value = personalityInput.value.trim();
  globalSystemMessage =
    personalityInput.value.length > 0
      ? personalityInput.value
      : DEFAULT_SYSTEM_MESSAGE;

  personalityInput.value =
    globalSystemMessage === DEFAULT_SYSTEM_MESSAGE ? "" : globalSystemMessage;
  localStorage.setItem("globalSystemMessage", globalSystemMessage);
  settingsModal.hide();
};

const updateContextLength = (length) => {
  contextLength = length;
};

const openExportModal = (event) => {
  event.preventDefault();
  exportContext();
  exportModal.show();
};

const exportContext = () => {
  const encryptedContext = CryptoJS.AES.encrypt(
    JSON.stringify(globalContext),
    encryptionKey
  ).toString();
  if (contextIsValid(globalContext)) {
    exportText.value = encryptedContext;
  }
};

const importContext = () => {
  const encryptedContext = exportText.value;
  try {
    const decryptedContext = CryptoJS.AES.decrypt(
      encryptedContext,
      encryptionKey
    ).toString(CryptoJS.enc.Utf8);
    const parsedContext = JSON.parse(decryptedContext);
    if (!contextIsValid(parsedContext)) {
      alert("Invalid context");
      throw new Error("Invalid context");
    }
    globalContext = parsedContext;
    localStorage.setItem("globalContext", JSON.stringify(globalContext));
    renderOutput();
    exportModal.hide();
  } catch (error) {
    alert("Invalid context");
  }
};

const contextIsValid = (context) => {
  try {
    if (context.length === 0) {
      return false;
    }
    if (context[context.length - 1].role !== "assistant") {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

const get_ai_api = async function (context, system) {
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
};

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

const onChatSubmit = function (event) {
  event.preventDefault();
  chatSubmitButton.disabled = true;
  chatInput.disabled = true;
  chatInput.value = chatInput.value.trim();
  addGlobalContext({ role: "user", content: chatInput.value });
  chatInput.value = "Loading...";
  get_ai_api(globalContext, globalSystemMessage).then((response) => {
    console.log(response);
    addGlobalContext({ role: "assistant", content: response });
    chatInput.value = "";
    chatSubmitButton.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  });
};

// renders the output with alternating colors
function renderOutput() {
  if (globalContext.length === 0) {
    outputDiv.innerHTML = noTextHTML;
    return;
  }
  outputDiv.innerHTML = "";
  globalContext.forEach((message) => {
    const messageDiv = document.createElement("div");
    let newClasses = ["message", message.role, "py-3", "px-5"];
    newClasses.forEach((newClass) => {
      messageDiv.classList.add(newClass);
    });
    if (message.role === "user") {
      messageDiv.classList.add("bg-secondary");
    }
    messageDiv.innerHTML = message.content;
    outputDiv.appendChild(messageDiv);
  });
}
