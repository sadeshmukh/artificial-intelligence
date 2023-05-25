const chatSubmitButton = document.getElementById("chatSubmit");
const chatInput = document.getElementById("chatInput");
const outputDiv = document.getElementById("outputDiv");
const settingsModal = new bootstrap.Modal(
  document.getElementById("settingsModal")
);
const exportText = document.getElementById("exportText");
const exportModal = new bootstrap.Modal(document.getElementById("exportModal"));
const personalityInput = document.getElementById("personalityInput");
const tokenUsageSpan = document.getElementById("tokenUsageSpan");
const contextSlider = document.getElementById("contextSlider");
const loadingSpinner = document.getElementById("loadingSpinner");
const goText = document.getElementById("goText");

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

let tokenusage = parseInt(localStorage.getItem("tokenusage"));
if (!tokenusage) {
  tokenusage = 0;
  localStorage.setItem("tokenusage", tokenusage);
}
tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${
  Math.round(tokenusage / 50) / 100
} cents)`;

const resetSettings = (event = null) => {
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
  contextSlider.value = contextLength;

  personalityInput.value = "";
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
contextSlider.value = contextLength;

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
  localStorage.setItem("contextLength", contextLength);
};

const openExportModal = (event) => {
  event.preventDefault();
  exportSettings();
  exportModal.show();
};

const exportSettings = () => {
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
    exportText.value = encryptedContext;
    console.log(encryptedContext);
  }
};

const importSettings = () => {
  const encryptedContext = exportText.value;
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
    contextSlider.value = contextLength;
    personalityInput.value =
      globalSystemMessage === DEFAULT_SYSTEM_MESSAGE ? "" : globalSystemMessage;
    renderOutput();
    exportModal.hide();
  } catch (error) {
    alert("Invalid context");
  }
};

const settingsAreValid = (settings) => {
  try {
    if (
      settings.context.length !== 0 &&
      settings.context[settings.context.length - 1].role !== "assistant"
    ) {
      console.log("last role not assistant");
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
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
  shortpoll_id = null;
  let output = null;
  let isError = false;
  fetch("/api/chat", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context: [{ role: "system", content: system }].concat(context),
    }),
  })
    .then((response) => {
      if (response.status !== 200) {
        alert("There was an error. Please try again.");
        isError = true;
        return;
      }
      return response.json();
    })
    .then((response) => {
      if (!response) {
        return;
      }
      shortpoll_id = response.shortpoll;
      let shortpollInterval = setInterval(() => {
        fetch("/api/shortpoll", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shortpoll_id: shortpoll_id,
          }),
        })
          .then((response) => {
            try {
              return response.json();
            } catch (error) {
              console.log("polling...");
              return;
            }
          })

          .then((response) => {
            if (response.completion !== "full") {
              console.log("polling...");
              return;
            } else {
              clearInterval(shortpollInterval);
              return response;
            }
          })
          .then((response) => {
            if (!response) {
              return;
            }
            console.log(tokenusage);
            tokenusage += response.tokens ? response.tokens : 0;
            console.log(tokenusage);
            tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${
              Math.round(tokenusage / 50) / 100
            } cents)`;
            localStorage.setItem("tokenusage", tokenusage);

            output = response.output;
          });
      }, 5000);
    });
  while (!output) {
    if (isError) {
      return "There was an error. Please try again.";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return output;

  // return fetch("/api/ai", {
  //   method: "POST",
  //   headers: {
  //     Accept: "application/json",
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     context: [{ role: "system", content: system }].concat(context),
  //   }),
  // })
  //   .then((response) => response.json())
  //   .then((response) => {
  //     console.log(tokenusage);
  //     tokenusage += response.tokens ? response.tokens : 0;
  //     console.log(tokenusage);
  //     tokenUsageSpan.innerHTML = `Token usage: ${tokenusage} (approximately ${
  //       Math.round(tokenusage / 50) / 100
  //     } cents)`;
  //     localStorage.setItem("tokenusage", tokenusage);
  //     return response.output;
  //   });
};

const onChatSubmit = function (event) {
  event.preventDefault();
  chatInput.innerText = chatInput.innerText.trim();
  if (chatInput.innerText.length === 0) {
    chatSubmitButton.disabled = false;
    return;
  }
  loadingSpinner.hidden = false;
  goText.hidden = true;
  chatSubmitButton.disabled = true;
  // chatInput.style.height = "2rem";

  addGlobalContext({ role: "user", content: chatInput.innerText });
  chatInput.innerText = "";
  get_ai_api(globalContext, globalSystemMessage).then((response) => {
    console.log(response.replace(/(?:\r\n|\r|\n)/g, "<br>"));
    addGlobalContext({
      role: "assistant",
      content: response.replace(/(?:\r\n|\r|\n)/g, "<br>"),
    });

    chatSubmitButton.disabled = false;
    loadingSpinner.hidden = true;
    goText.hidden = false;
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

const updateToken = (e) => {
  e.preventDefault();
  const tokenInput = document.getElementById("tokenInput");
  let serverToken = tokenInput.value;

  fetch("/setToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: serverToken,
    }),
  });
};
