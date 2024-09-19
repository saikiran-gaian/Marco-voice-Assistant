




const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios'); // Using axios for API calls
dotenv.config();

const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Your OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY 

// Your Serper API Key
const SERPER_API_KEY = process.env.SERPER_API_KEY

// In-memory storage for threads
let threads = {};

// Serper API Web Search Function
async function searchWeb(query) {
  try {
    const response = await axios.post(
      'https://google.serper.dev/search',  // Serper API endpoint
      { q: query },                        // Search query from the user
      {
        headers: {
          'X-API-KEY': SERPER_API_KEY,     // Your Serper API key
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data; // Return search results
  } catch (error) {
    console.error('Error performing web search:', error);
    return null; // Return null on error
  }
}

// Function to process user intent with LLM
async function processWithLLM(prompt) {
  try {
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that helps understand if the user is asking for real-time data such as weather, news, or other time-sensitive information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return openAIResponse.data.choices[0].message.content;

  } catch (error) {
    console.error('Error processing with LLM:', error.response ? error.response.data : error.message);
    return "Sorry, I couldn't process your request.";
  }
}

// Function to summarize web search results with LLM
async function summarizeWithOpenAI(searchResults, userQuery) {
  try {
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes web search results based on user intent.',
          },
          {
            role: 'user',
            content: `The user asked: "${userQuery}". Based on that, summarize these web search results: ${JSON.stringify(searchResults)}`,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return openAIResponse.data.choices[0].message.content;

  } catch (error) {
    console.error('Error summarizing with OpenAI:', error.response ? error.response.data : error.message);
    return "Sorry, I couldn't summarize the information.";
  }
}

// Endpoint to process speech text using GPT-4 and maintain conversation with threadId
app.post('/api/process-speech', async (req, res) => {
  const { speechText, threadIdbyUser } = req.body;

  try {
    let threadId = threadIdbyUser || ""; // Use provided threadId or create new one
    let conversationHistory = [];

    // If no threadId, create a new thread (i.e., initialize conversation history)
    if (!threadId) {
      threadId = `thread_${Date.now()}`; // Generate a simple unique thread ID
      threads[threadId] = []; // Initialize empty message history for the thread
      console.log("New thread created with ID:", threadId);
    } else {
      // Retrieve conversation history if the thread already exists
      if (threads[threadId]) {
        conversationHistory = threads[threadId];
      } else {
        return res.status(400).json({ error: "Invalid thread ID." });
      }
    }

    // Add the user's message to the conversation history
    conversationHistory.push({
      role: 'user',
      content: speechText,
    });

    let assistantResponse;

    // Step 1: Send user query to LLM to understand the intent
    const intentResponse = await processWithLLM(speechText);

    // Check if the LLM confirms the user is asking for real-time data (like weather)
    if (intentResponse.toLowerCase().includes("real-time data") || intentResponse.toLowerCase().includes("current") || intentResponse.toLowerCase().includes("weather") || intentResponse.toLowerCase().includes("forecast")) {
      // Step 2: Perform the web search using Serper API
      const searchResults = await searchWeb(speechText);

      if (searchResults) {
        // Step 3: Summarize the search results using OpenAI based on user intent
        assistantResponse = await summarizeWithOpenAI(searchResults, speechText);
      } else {
        assistantResponse = "Sorry, I couldn't find any relevant information from the web.";
      }
    } else {
      // If no real-time data is needed, use the LLM's general response
      assistantResponse = intentResponse;
    }

    // Add the assistant's response to the conversation history
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse,
    });

    // Save the updated conversation history back to the thread
    threads[threadId] = conversationHistory;

    // Send the response back to the frontend
    res.json({
      threadId: threadId,
      response: assistantResponse,
    });
  } catch (error) {
    console.error('Error processing speech:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: "An error occurred during speech processing." });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
