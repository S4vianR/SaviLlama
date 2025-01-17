const $ = (el: string) => document.querySelector(el);

const form = $("form") as HTMLFormElement;
const messageTextArea = $("#messageTextArea") as HTMLTextAreaElement;
// const submitButton = $("#submitButton") as HTMLButtonElement;
const responseParagraph = $("#respondeParagraph") as HTMLParagraphElement;
const userResponseParagraph = $(
  "#userResponseParagraph"
) as HTMLParagraphElement;
const seletModel = $("#selectModel") as HTMLSelectElement;

// Variable to store the selected model
let selectedModel: string;

// Variable to store last selected model
let lastSelectedModel: string;

// Function to send a message to the ollama server
const sendMessage = async (message: string, selectedModel: string) => {
  if (message !== "") {
    userResponseParagraph.classList.remove("hidden");
    userResponseParagraph.textContent = "You -> " + message;
  } else {
    userResponseParagraph.classList.add("hidden");
    userResponseParagraph.textContent = "";
  }

  const url = "http://raspidyn.ddns.net:11434/api/chat";
  const data = JSON.stringify({
    model: selectedModel,
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });
  const options = { method: "POST", body: data };

  try {
    responseParagraph.style.fontWeight = "400";
    responseParagraph.textContent = `${selectedModel} -> Loading...`;

    const response = await fetch(url, options);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let resultString = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and split it into lines
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        // Process each line
        lines.forEach((line) => {
          try {
            const jsonResponse = JSON.parse(line);
            if (jsonResponse.message && jsonResponse.message.content) {
              // Clean up the content to remove unwanted spaces
              const cleanedContent = jsonResponse.message.content
                .replace(/\s+([.,!?;:])/g, "$1") // Remove space before punctuation
                .replace(/\s+/g, " ") // Replace multiple spaces with a single space
                .trim();
              resultString += cleanedContent + " ";
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        });
      }
    }
    responseParagraph.textContent = `${selectedModel} -> ` + resultString.trim();
  } catch (error: any) {
    console.error("Error fetching data:", error);
    responseParagraph.textContent =
      `${selectedModel} -> Error: ` + error.message;
  }
};

const fetchModels = async () => {
  // Fetch the models from the server -> http://raspidyn.ddns.net:11434/api/tags
  const url = "http://raspidyn.ddns.net:11434/api/tags";
  const response = await fetch(url);
  const jsonResponse = await response.json();

  // Populate the select element with the models using options using the name of the model
  jsonResponse.models.forEach((model: { name: string }) => {
    const option = document.createElement("option");
    option.value = model.name;
    option.textContent = model.name;
    option.selected = model.name === "llama3.2:latest";
    seletModel.appendChild(option);
  });
};

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
  lastSelectedModel = selectedModel;
  selectedModel = model;
  await sendMessage("", selectedModel);
  
  if (lastSelectedModel) {
    const url = "http://raspidyn.ddns.net:11434/api/chat";
    const data = JSON.stringify({
      model: lastSelectedModel,
      messages: [],
      keep_alive: false,
    });
    const options = { method: "POST", body: data };

    try {
      await fetch(url, options);
    } catch (error: any) {
      console.error("Error unloading model:", error.message);
    }
  }
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
window.addEventListener("load", async () => {
  // First check if the server is running
  const url = new URL("http://raspidyn.ddns.net:11434/");
  try {
    const response = await fetch(url);
    if (response.status !== 200) {
      responseParagraph.textContent = "Ollama -> Server is not running";
    } else {
      userResponseParagraph.classList.add("hidden");
      responseParagraph.style.fontWeight = "500";
      // responseParagraph.textContent = "Ollama -> Nothing here yet...";
      await fetchModels();
      selectedModel = seletModel.value;
      lastSelectedModel = selectedModel;
      await sendMessage("", selectedModel);
    }
  } catch (error: any) {
    responseParagraph.textContent = "Ollama -> Server is not running";
  }
});
