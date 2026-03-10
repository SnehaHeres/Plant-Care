import { useEffect, useRef, useState } from "react";
import { QuestionAnswer } from "../components/ai_components/QuestionAnswer.jsx";
import { RecentSearch } from "../components/ai_components/RecentSearch.jsx";
import { SuggestionButton } from "../components/ai_components/SuggestionButton.jsx";

const HISTORY_KEY = `plant_ai_history_v2`;

// ✅ NAYA FUNCTION: YEH AAPKE BACKEND KO CALL KAREGA
async function askPlantBot(prompt, token) {
  try {
    const response = await fetch('http://localhost:5000/api/plants/ask-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Token bhejna zaroori hai, taaki backend aapko pehchaan sake
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      // API key galat hone par server se yeh message aayega
      if (errorData.message.includes("API key not valid")) {
          throw new Error("API key not valid. Please pass a valid API key.");
      }
      throw new Error(errorData.message || 'Something went wrong on the server');
    }

    const data = await response.json();
    return data.reply; // Backend se mila jawaab return karein

  } catch (error) {
    console.error("Error asking bot:", error);
    // User ko ek saaf error message dikhayein
    throw new Error(`AI Request Failed: ${error.message}`);
  }
}


function App() {
  const [questionInput, setQuestionInput] = useState("");
  const [result, setResult] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState("");
  const [loader, setLoader] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const scrollToAns = useRef();

  // IMPORTANT: Aapko user info (jismein token hota hai) ko state se lena hoga
  // Yeh aapke project ke structure par depend karta hai. Example:
  // const { userInfo } = useSelector((state) => state.auth);

  const fixedPrefix = "Can you share some plant information about ";

  const getHistory = () => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
      console.error("Error loading history:", e);
      return [];
    }
  };

  const updateHistory = (prompt) => {
    const historyEntry = prompt.startsWith(fixedPrefix)
      ? prompt.substring(fixedPrefix.length).trim()
      : prompt;

    const newEntry = {
      query: historyEntry.charAt(0).toUpperCase() + historyEntry.slice(1).trim(),
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setRecentHistory((prevHistory) => {
      const updatedHistory = [newEntry, ...prevHistory.slice(0, 19)];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const handleClearHistory = () => {
    setRecentHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const handleDeleteHistoryItem = (id) => {
    setRecentHistory((prevHistory) => {
      const updatedHistory = prevHistory.filter((item) => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  useEffect(() => {
    setRecentHistory(getHistory());
  }, []);

  const generateSuggestions = (prompt) => {
    const topic = prompt.toLowerCase().includes("monstera") ? "monstera" : "general";
    if (topic === "monstera") {
      return ["How often should I water my Monstera?"];
    }
    return ["What are the best low-light houseplants?"];
  };

  const askQuestion = async (prompt) => {
    setSelectedHistory("");
    setCurrentSuggestions([]);

    if (prompt) {
      updateHistory(prompt);
    }

    setResult((prev) => [...prev, { type: "q", text: [prompt] }]);
    setLoader(true);
    setQuestionInput("");

    try {
        // ⚠️ ZAROORI BADLAAV: Yahan user ka token pass karna hoga
        // Aapko apne project se user ka token nikalna hoga jo login ke baad milta hai.
        // Yeh Redux state (userInfo.token) ya localStorage se aa sakta hai.
        // Neeche ek example hai, aapko ise apne project ke hisaab se badalna hoga.
        
        const tokenFromLocalStorage = JSON.parse(localStorage.getItem('userInfo'))?.token;

        if (!tokenFromLocalStorage) {
            throw new Error("You are not logged in. Please log in to use the Plant Bot.");
        }

        let responseText = await askPlantBot(prompt, tokenFromLocalStorage);

        let dataString = responseText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

        setResult((prev) => [
            ...prev.slice(0, -1),
            { type: "q", text: [prompt] },
            { type: "a", text: dataString.length > 0 ? dataString : ["Got an empty response."] },
        ]);
        setCurrentSuggestions(generateSuggestions(prompt));

    } catch (err) {
      console.error("Fatal API request failed:", err);
      setResult((prev) => [
        ...prev.slice(0, -1),
        { type: "q", text: [prompt] },
        { type: "a", text: [`🚨 ${err.message}`] },
      ]);
      setCurrentSuggestions([]);
    } finally {
      setLoader(false);
      setTimeout(() => {
        if (scrollToAns.current) {
          scrollToAns.current.scrollTop = scrollToAns.current.scrollHeight;
        }
      }, 100);
    }
  };

  useEffect(() => {
    if (selectedHistory) {
      askQuestion(selectedHistory);
    }
  }, [selectedHistory]);

  const handleChange = (e) => {
    setQuestionInput(e.target.value);
  };

  const handleAsk = () => {
    if (questionInput.trim()) {
      const fullQuestion = fixedPrefix + questionInput.trim();
      askQuestion(fullQuestion);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuestionInput(suggestion);
    askQuestion(suggestion);
  };

  return (
    // ... aapka JSX code yahan se shuru hoga ...
    // ... maine sirf upar ka logic change kiya hai, JSX (return part) same rahega ...
    // ... isliye aap apna purana return() वाला hissa yahan paste kar sakte hain ...
    <div className="grid grid-cols-1 md:grid-cols-5 min-h-screen bg-gray-50 font-sans">
      <RecentSearch
        recentHistory={recentHistory}
        setSelectedHistory={setSelectedHistory}
        handleClearHistory={handleClearHistory}
        handleDeleteHistoryItem={handleDeleteHistoryItem}
      />
      <div className="col-span-4 flex flex-col h-screen">
        <div className="sticky top-0 z-20 bg-gray-50 pt-7 pb-3 border-b border-green-100">
          <div className="space-y-1 text-center">
            <h2 className="text-center text-xl text-gray-700">
              <span className="font-extrabold text-green-700 text-3xl md:text-4xl tracking-wide font-inter">
                Plant
              </span>
              <span className="font-semibold text-gray-800 text-3xl md:text-4xl tracking-wide ml-2">
                Bot
              </span>
              <span className="inline-block ml-3 text-2xl md:text-3xl animate-bounce">
                🌿
              </span>
            </h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 md:px-12 py-8 space-y-8">
          <div
            ref={scrollToAns}
            className="rounded-2xl bg-white shadow-2xl shadow-green-100/50 p-6 border-2 border-green-200/50 min-h-[500px]"
          >
            <ul className="space-y-8">
              {result.length === 0 && (
                <li className="flex flex-col items-start">
                  <div className="p-4 max-w-lg rounded-xl text-sm md:text-base bg-white text-gray-700 shadow-xl border border-gray-200">
                    <strong className="font-semibold text-green-700 text-lg">
                      👋 Welcome to Plant Bot!
                    </strong>
                    <p className="mt-2 text-gray-600">
                      I'm here to help you with your gardening questions. Try
                      asking about the care of a specific plant, like "monstera"
                      or "how often to water succulents."
                    </p>
                  </div>
                </li>
              )}
              {result.map((item, index) => (
                <QuestionAnswer key={index} item={item} />
              ))}
            </ul>
          </div>
          {currentSuggestions.length > 0 && !loader && (
            <div className="w-full max-w-2xl mx-auto flex flex-wrap gap-2 justify-center p-3 mt-4 border-t border-gray-100 pt-4">
              <span className="text-gray-600 text-sm font-semibold pr-1 pt-1 hidden sm:inline">
                Quick Questions:
              </span>
              {currentSuggestions.map((suggestion, index) => (
                <SuggestionButton
                  key={index}
                  text={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </div>
          )}
          {loader && (
            <div
              role="status"
              className="flex justify-center items-center mt-6"
            >
              <div
                className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"
                aria-label="Loading response"
              ></div>
              <span className="sr-only">Loading...</span>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 z-20 bg-gray-50 pt-4 pb-6 border-t border-green-100">
          <div className="w-full max-w-2xl mx-auto flex items-center gap-3 bg-white border border-green-200 rounded-full shadow-2xl shadow-green-100/50 px-6 py-4">
            <span className="text-gray-700 whitespace-nowrap text-base md:text-lg hidden sm:inline">
              {fixedPrefix}
            </span>
            <span className="text-gray-700 whitespace-nowrap text-base md:text-lg sm:hidden">
              {fixedPrefix.split(" ")[0]}...
            </span>
            <input
              value={questionInput}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
              className="flex-1 text-black text-base md:text-lg bg-transparent focus:outline-none"
              type="text"
              placeholder="Enter about your plants........"
              disabled={loader}
            />
            <button
              onClick={handleAsk}
              className={`text-white bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 transition px-5 py-2 rounded-full text-base font-semibold shadow-lg shadow-green-400/50 ${
                loader ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loader}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;