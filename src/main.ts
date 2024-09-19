const $ = (el: string) => document.querySelector(el);
const $$ = (el: string) => document.querySelectorAll(el);

const form = $("form") as HTMLFormElement;
const messageTextArea = $("#messageTextArea") as HTMLTextAreaElement;
// const submitButton = $("#submitButton") as HTMLButtonElement;
const responseParagraph = $("#respondeParagraph") as HTMLParagraphElement;
const userResponseParagraph = $("#userResponseParagraph") as HTMLParagraphElement;
const seletModel = $("#selectModel") as HTMLSelectElement;

// Variable to store the selected model
let selectedModel: string;

// Function to send a message to the ollama server
const sendMessage = async (message: string, selectedModel: string) => {
  userResponseParagraph.classList.remove("hidden");
  userResponseParagraph.textContent = "You ->" + message;

  responseParagraph.style.fontWeight = "400";
  responseParagraph.textContent = "Ollama -> Loading...";

  const url = "http://localhost:11434/api/chat";
  const data = JSON.stringify({
    model: selectedModel,
    messages: [{ role: "user", content: message }],
    stream: false,
  });
  const options = { method: "POST", body: data };

  try {
    const response = await fetch(url, options);
    const jsonResponse = await response.json();

    // console.log("API Response:", jsonResponse); // Add this line to log the response

    if (jsonResponse.message && jsonResponse.message.content) {
      responseParagraph.textContent = "Ollama -> " + jsonResponse.message.content;
    } else {
      responseParagraph.textContent = "Ollama -> No response";
    }
  } catch (error: any) {
    responseParagraph.textContent = "Ollama -> Error", error.message;
  }
};

const fetchModels = async () => {
  // Fetch the models from the server -> http://localhost:11434/api/tags
  const url = "http://localhost:11434/api/tags";
  const response = await fetch(url);
  const jsonResponse = await response.json();

  // Populate the select element with the models using options using the name of the model
  jsonResponse.models.forEach((model: { name: string }) => {
    const option = document.createElement("option");
    option.value = model.name;
    option.textContent = model.name;
    option.selected = model.name === "llama3.1:latest";
    seletModel.appendChild(option);
  });
}

// Event listener for form submit
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = messageTextArea.value;
  await sendMessage(message, selectedModel);
  messageTextArea.value = "";
});

// Select model event listener
seletModel?.addEventListener("change", async (e) => {
  const model = (e.target as HTMLSelectElement).value;
  console.log(model);
  selectedModel = model;
});

// Textarea auto resize
messageTextArea.addEventListener("input", () => {
  messageTextArea.style.height = "auto";
  messageTextArea.style.height = messageTextArea.scrollHeight + "px";
});

// Add event listener to the textarea for the enter key
messageTextArea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form?.dispatchEvent(new Event("submit"));
    messageTextArea.value = "";
  }

  // If the user presses SHIFT + ENTER, add a new line
  if (e.key === "Enter" && e.shiftKey) {
    messageTextArea.value += "\n";
  }
});

// OnLoad
window.addEventListener('load',async ()=>{
  // First check if the server is running
  const url = new URL("http://localhost:11434/");
  try {
    const response = await fetch(url);
    if (response.status !== 200) {
      responseParagraph.textContent = "Ollama -> Server is not running";
    } else {
      userResponseParagraph.classList.add("hidden");
      responseParagraph.style.fontWeight = "500";
      responseParagraph.textContent = "Ollama -> Nothing here yet...";
      await fetchModels();
      selectedModel = seletModel.value;
    }
  } catch (error: any) {
    responseParagraph.textContent = "Ollama -> Server is not running";
  }

});