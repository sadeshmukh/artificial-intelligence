userInput = document.getElementById("userInput");
output = document.getElementById("output");

// fetch("/api/upper", {
//   method: "POST",
//   headers: {
//     Accept: "application/json",
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify({ text: "sometext" }),
// })
//   .then((response) => response.json())
//   .then((response) => alert(response.response));

async function get_api() {
  return fetch("/api/upper", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: "sometext" }),
  })
    .then((response) => response.json())
    .then((response) => response.response);
}

// get_api().then((response) => alert(response));

async function get_ai_api() {
  return fetch("/api/ai", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: userInput.value }),
  })
    .then((response) => response.json())
    .then((response) => response.output);
}

function onClick(event) {
  event.target.disabled = true;
  get_ai_api().then((response) => {
    console.log(response);
    output.innerHTML = response.replace("\n", "<br>");
    event.target.disabled = false;
  });
}
