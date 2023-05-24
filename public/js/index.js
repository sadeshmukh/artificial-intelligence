const chatSubmitButton = $("#chatSubmit");
const chatInput = $("#chatInput");
const outputDiv = $("#outputDiv");
const settingsModal = new bootstrap.Modal($("#settingsModal"));
const exportText = $("#exportText");
const exportModal = new bootstrap.Modal($("#exportModal"));
const personalityInput = $("#personalityInput");
const tokenUsageSpan = $("#tokenUsageSpan");
const contextSlider = $("#contextSlider");
const loadingSpinner = $("#loadingSpinner");
const goText = $("#goText");

const noTextHTML = "<div class='h2 m-5'>Have fun!</div>";

const encryptionKey = "12345";

const userInput = $("#userInput");
const output = $("#output");

const DEFAULT_SYSTEM_MESSAGE = "You are an affable, friendly chatbot.";

let globalContext = JSON.parse(localStorage.getItem("globalContext"));
if (!globalContext) {
  localStorage.setItem("globalContext", JSON.stringify([]));
  globalContext = [];
}

let tokenusage = parseInt(localStorage.getItem("tokenusage"));
if (!tokenusage) {
  tokenusage = 0;
  localStorage.setItem("tokenusage", tokenusage);
}
tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${
  Math.round(tokenusage / 50) / 100
} cents)`;

// It's better to give the website it's time rather than run the function first thing
window.onload = renderOutput

function resetSettings(event = null) {
  if (event) {
    event.preventDefault();
  }
  globalContext = [];
  localStorage.setItem("globalContext", JSON.stringify(globalContext));
  
  globalSystemMessage = DEFAULT_SYSTEM_MESSAGE;
  localStorage.setItem("globalSystemMessage", globalSystemMessage);

  tokenusage = 0;
  localStorage.setItem("tokenusage", tokenusage);

  contextLength = 3;

  if (!contextLength) {
    contextLength = 3;
  }
  localStorage.setItem("contextLength", contextLength);
  contextSlider.val(contextLength)

  personalityInput.val("")
  tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${Math.round(
    tokenusage / 5000,
    2
  )} cents)`;

  renderOutput();
  settingsModal.hide();
};

const resetContext = (event) => {
  event.preventDefault();
  globalContext = [];
  localStorage.setItem("globalContext", JSON.stringify(globalContext));
  tokenusage = 0;
  localStorage.setItem("tokenusage", tokenusage);
  renderOutput();
};

const addGlobalContext = (context) => {
  context.content = context.content.trim();
  if (context.length === 0) {
    return;
  }
  context.content = context.content.replace(/(?:\r\n|\r|\n)/g, "<br>");
  globalContext.push(context);
  if (globalContext[globalContext.length - 1].role === "assistant") {
    localStorage.setItem("globalContext", JSON.stringify(globalContext));
  }
  renderOutput();
};

let contextLength = parseInt(localStorage.getItem("contextLength"));
if (!contextLength && contextLength !== 0) {
  contextLength = 3;
  localStorage.setItem("contextLength", contextLength);
}
contextSlider.val(contextLength)

let globalSystemMessage = localStorage.getItem("globalSystemMessage");
if (!globalSystemMessage) {
  globalSystemMessage = DEFAULT_SYSTEM_MESSAGE;
  localStorage.setItem("globalSystemMessage", globalSystemMessage);
}

if (globalSystemMessage !== DEFAULT_SYSTEM_MESSAGE) {
  personalityInput.val(globalSystemMessage)
}

function updateSystemMessage(event) {
  event.preventDefault();
  personalityInput.val((_, value)=>{return value.trim()})
  globalSystemMessage =
    personalityInput.val().length > 0
      ? personalityInput.val()
      : DEFAULT_SYSTEM_MESSAGE;

  newValue = globalSystemMessage === DEFAULT_SYSTEM_MESSAGE ? "" : globalSystemMessage
  personalityInput.val(newValue)
  localStorage.setItem("globalSystemMessage", globalSystemMessage);
  settingsModal.hide();
};

function updateContextLength(length) {
  contextLength = length;
  localStorage.setItem("contextLength", contextLength);
};

function openExportModal(event) {
  event.preventDefault();
  exportSettings();
  exportModal.show();
};

function exportSettings() {
  const encryptedContext = CryptoJS.AES.encrypt(
    JSON.stringify({
      context: globalContext,
      system: globalSystemMessage,
      tokenusage: tokenusage,
      contextLength: contextLength,
    }),
    encryptionKey
  ).toString();
  if (
    settingsAreValid({
      context: globalContext,
      system: globalSystemMessage,
      tokenusage: tokenusage,
      contextLength: contextLength,
    })
  ) {
    exportText.val(encryptedContext)
    console.log(encryptedContext);
  }
};

function importSettings() {
  const encryptedContext = exportText.val();
  try {
    const decryptedContext = CryptoJS.AES.decrypt(
      encryptedContext,
      encryptionKey
    ).toString(CryptoJS.enc.Utf8);
    const parsedContext = JSON.parse(decryptedContext);
    if (!settingsAreValid(parsedContext)) {
      alert("Invalid context");
      throw new Error("Invalid context");
    }
    globalContext = parsedContext.context;
    localStorage.setItem("globalContext", JSON.stringify(globalContext));
    globalSystemMessage = parsedContext.system;
    localStorage.setItem("globalSystemMessage", globalSystemMessage);
    tokenusage = parseInt(parsedContext.tokenusage);
    localStorage.setItem("tokenusage", tokenusage);
    contextLength = parsedContext.contextLength;
    localStorage.setItem("contextLength", contextLength);
    contextSlider.val(contextLength)
    personalityInput.val(
      globalSystemMessage === DEFAULT_SYSTEM_MESSAGE ? "" : globalSystemMessage)
    renderOutput();
    exportModal.hide();
  } catch (error) {
    alert("Invalid context");
  }
};

// TODO: Rename function
function settingsAreValid(settings) {
  try {
    // Check if the assistant spoke last
    if (
      settings.context.length !== 0 &&
      settings.context[settings.context.length - 1].role !== "assistant"
    ) {
      console.log("last role not assistant");
      return false;
    }
    return true;
  } catch (error) {
    // I don't even know how this is going to be triggered.
    console.log(error);
    return false;
  }
};

async function get_ai_api(context, system) {
  if (contextLength === 0) {
    // .slice(0) returns a copy of the array
    // Goal is to at least have user's context
    // NOTE: Get last user data if they don't want anything else
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
    .then(response => response.json())
    .then(response => {
      if (response.error) {throw response.error}
      console.log(tokenusage);
      tokenusage += response.tokens ? response.tokens : 0;
      console.log(tokenusage);
      tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${
        Math.round(tokenusage / 50) / 100
      } cents)`;
      localStorage.setItem("tokenusage", tokenusage);
      return response.output;
    })
    .catch()
};

function onChatSubmit (event) {
  event.preventDefault();
  chatInput.val((_, value) => {return value.trim()})
  if (chatInput.val().length === 0) {
    chatSubmitButton.disabled = false;
    return;
  }
  loadingSpinner.hidden = false;
  goText.hidden = true;
  chatSubmitButton.disabled = true;

  addGlobalContext({ role: "user", content: chatInput.val() });
  chatInput.val("")
  get_ai_api(globalContext, globalSystemMessage).then((response) => {
    console.log(response.replace(/(?:\r\n|\r|\n)/g, "<br>"));
    addGlobalContext({
      role: "assistant",
      content: response.replace(/(?:\r\n|\r|\n)/g, "<br>"),
    });

    chatInput.val("")
    chatSubmitButton.button("enabled")
    loadingSpinner.hide();
    goText.show()
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
    outputDiv.append(messageDiv);
  });
}
