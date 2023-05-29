const chatInput = document.getElementById("chatInput");
const outputDiv = document.getElementById("outputDiv");
const chatSubmitButton = document.getElementById("chatSubmit");
const loadingSpinner = document.getElementById("loadingSpinner");
renderHistory = () => {
  outputDiv.innerHTML = "";
  history.forEach((item) => {
    const promptDiv = document.createElement("div");
    promptDiv.innerText = item.prompt;
    promptDiv.classList.add("prompt");
    promptDiv.classList.add("bg-secondary");
    promptDiv.classList.add("py-4");
    outputDiv.appendChild(promptDiv);
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response");
    responseDiv.classList.add("py-4");
    const responseImg = document.createElement("img");
    responseImg.src = item.response;
    responseDiv.appendChild(responseImg);
    outputDiv.appendChild(responseDiv);
  });
};
let history = []; // Format: [{prompt: "prompt", response: "url"}, ...}]
if (localStorage.getItem("history")) {
  history = JSON.parse(localStorage.getItem("history"));
  renderHistory();
}

var ce = document.querySelector("[contenteditable]");
ce.addEventListener("paste", function (e) {
  e.preventDefault();
  var text = e.clipboardData.getData("text/plain");
  let caretPosition = getCaretPosition(e.target);
  e.target.innerText =
    e.target.innerText.substring(0, caretPosition) +
    text +
    e.target.innerText.substring(caretPosition);
  // TODO: Fix caret position
});

async function getAIImage(prompt) {
  url = null;
  isError = false;
  fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt }),
  })
    .then((response) => {
      if (response === "Incomplete shortpoll") {
        return;
      }
      if (response.status !== 200) {
        if (response.status === 401) {
          alert("Unauthorized. Please check your token.");
        } else {
          alert("There was an error with the AI API. Please try again later.");
        }
        isError = true;
        return;
      }
      return response.json();
    })
    .then(async (data) => {
      if (!data) {
        return;
      }
      if (data.shortpoll) {
        const shortpoll_id = data.shortpoll;
        const interval = setInterval(() => {
          fetch("/api/shortpoll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shortpoll_id: shortpoll_id }),
          })
            .then((response) => {
              return response.json();
            })
            .then((data) => {
              url = data.image_url;
              clearInterval(interval);
              console.log("interval cleared");
            });
        }, 5000);
      }
    });
  while (!url) {
    await new Promise((r) => setTimeout(r, 500));
    if (isError) {
      return "There was an error. Please try again.";
    }
  }
  console.log("url: " + url);
  return url;
}

function onChatSubmit(event) {
  event.preventDefault();
  chatInput.innerText = chatInput.innerText.trim();
  if (chatInput.innerText.length === 0) {
    chatSubmitButton.disabled = false;
    return;
  }
  loadingSpinner.hidden = false;
  chatSubmitButton.disabled = true;
  const prompt = chatInput.innerText;
  chatInput.innerText = "";
  getAIImage(prompt).then((url) => {
    if (url === "There was an error. Please try again.") {
      loadingSpinner.hidden = true;
      chatSubmitButton.disabled = false;
      return;
    }
    console.log("url: " + url);
    history.push({ prompt: prompt, response: url });
    localStorage.setItem("history", JSON.stringify(history));
    renderHistory();
    loadingSpinner.hidden = true;
    chatSubmitButton.disabled = false;
  });
}

function getCaretPosition(editableDiv) {
  var caretPos = 0,
    sel,
    range;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.rangeCount) {
      range = sel.getRangeAt(0);
      if (range.commonAncestorContainer.parentNode == editableDiv) {
        caretPos = range.endOffset;
      }
    }
  } else if (document.selection && document.selection.createRange) {
    range = document.selection.createRange();
    if (range.parentElement() == editableDiv) {
      var tempEl = document.createElement("span");
      editableDiv.insertBefore(tempEl, editableDiv.firstChild);
      var tempRange = range.duplicate();
      tempRange.moveToElementText(tempEl);
      tempRange.setEndPoint("EndToEnd", range);
      caretPos = tempRange.text.length;
    }
  }
  return caretPos;
}
