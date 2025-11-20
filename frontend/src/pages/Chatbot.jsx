import { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import AreaComparison from "./AreaComparison";
import PriceGrowth from "./PriceGrowth";


export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [showPriceGrowth, setShowPriceGrowth] = useState(false);
const [selectedAreas, setSelectedAreas] = useState([]);
const [selectedAreaForGrowth, setSelectedAreaForGrowth] = useState("");

  // Known areas list (extend from your Excel or load dynamically later)
  const knownAreas = [
    "wakad",
    "aundh",
    "akurdi",
    "baner",
    "hinjewadi",
    "kothrud",
    "pimple saudagar",
    "ambegoan budruk",
    "hadapsar",
    "pimple nilakh",
    "ravet",
  ];

  // small helper to add bot message (with typing delay)
  const botReply = (textOrComponent) => {
    setLoading(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        typeof textOrComponent === "string"
          ? { sender: "bot", text: textOrComponent }
          : { sender: "bot", component: textOrComponent },
      ]);
      setLoading(false);
    }, 900);
  };

  // extract areas present in a sentence (returns array of matched area strings)
  const extractAreas = (text) => {
    const lower = (text || "").toLowerCase();
    // match whole known areas present in text
    const found = knownAreas.filter((a) => lower.includes(a.toLowerCase()));
    // also try splitting on commas / and / vs
    return Array.from(new Set(found));
  };

 useEffect(() => {
  try {
    const saved = localStorage.getItem("chat_history");
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      startConversation();
    }
  } catch {
    startConversation();
  }
}, []);

useEffect(() => {
  try { localStorage.setItem("chat_history", JSON.stringify(messages)); } catch {}
}, [messages]);



  // autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // first time greeting (typing then messages)
  const hasStarted = useRef(false);
  const startConversation = () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    setLoading(true);
    setTimeout(() => {
      setMessages([{ sender: "bot", text: "Typing..." }]); // temporary typing placeholder — replaced below
      // replace with proper messages:
      setTimeout(() => {
        setMessages([{ sender: "bot", text: "Hi 👋" }]);
        setLoading(false);
        // show second prompt after short typing
        setTimeout(() => {
          setLoading(true);
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: "How can I help you today?" },
            ]);
            setLoading(false);
          }, 900);
        }, 400);
      }, 900);
    }, 600);
  };

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      startConversation();
    }
  }, []);

 
const analyzeArea = async (areaText) => {
  setLoading(true);
  try {
    const res = await fetch("http://127.0.0.1:8000/api/query/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: areaText }),
    });
    const data = await res.json();

    // define summary here
    const summary =
      (data && data.basic && data.basic.summary) ||
      data.summary ||
      data.response ||
      `Here is a short analysis for ${areaText}`;

    setTimeout(() => {
      setMessages((prev) => [
  ...prev,
  { sender: "bot", text: summary }, // <- if summary is undefined here, you'll get this error
  {
    sender: "bot",
    component: (
      <button
        className="btn btn-success btn-sm mt-2"
        onClick={() => setShowFullReport(true)}
      >
        View Full Comparison
      </button>
    ),
  },
]);

      setLoading(false);
    }, 700);
  } catch (err) {
    setLoading(false);
    botReply("❌ Failed to analyze the area. Please try again.");
  }
};


  // compare areas: calls backend compare API and shows short summary + View Full Comparison button
  const compareAreas = (areas) => {
  const summary = `I have analyzed ${areas.join(" and ")}.`;

  setMessages((prev) => [
    ...prev,
    { sender: "bot", text: summary },
    {
  sender: "bot",
  component: (
    <button
      className="btn btn-success btn-sm mt-2"
      onClick={() => setShowComparison(true)}
    >
      View Full Comparison
    </button>
  ),
},
  ]);
};


  // main send handler (user pressing Send or Enter)
  const sendQuery = async () => {
    if (!query.trim()) return;

    const raw = query.trim();
    const userText = raw.toLowerCase();

    // append user message immediately
setMessages((prev) => {
    const next = [...prev, { sender: "user", text: raw }];
    try { localStorage.setItem("chat_history", JSON.stringify(next)); } catch {}
    return next;
  });
  setQuery("");
  setLoading(true);

    // quick intents
    if (userText.includes("thank")) {
      botReply("You're welcome 😊");
      return;
    }
    if (userText === "ok" || userText === "okay" || userText === "k" || userText.includes("okk")) {
      botReply("Alright 👍 Let me know what you’d like to know next.");
      return;
    }
    if (
      userText.includes("i want information") ||
      userText.includes("i want to know about") ||
      userText.includes("i want info") ||
      userText.includes("information of area") ||
      userText.includes("information about area") ||
      userText.includes("i want to know information") ||
      userText.includes("know about area")
    ) {
      botReply("Great! Tell me the name of the area?");
      return;
    }

    // detect areas in sentence
    const detected = extractAreas(userText);

    // If sentence explicitly asks to compare and no detected areas or <2, ask for names
    // If exactly one detected → analyze that area
if (detected.length === 1) {
  const area = detected[0];

  // Check for price growth request
  if (
    userText.includes("price growth") ||
    userText.includes("price growth for") ||
    userText.includes("show price growth")
  ) {
    // Reply with bot message + button instead of navigating
   setMessages((prev) => [
  ...prev,
  { sender: "bot", text: summary },
  {
    sender: "bot",
    component: (
      <button
        className="btn btn-success btn-sm mt-2"
        onClick={() => {
          setSelectedAreas([areaText]); // <-- add this line
          setShowComparison(true);
        }}
      >
        View Full Comparison
      </button>
    ),
  },
]);


    setLoading(false);
    return;
  }

  // Otherwise, do normal area analysis
  await analyzeArea(area);
  return;
}


    // If two or more detected → do compare
    if (detected.length >= 2) {
  setSelectedAreas(detected); // store selected areas
  compareAreas(detected);     // only send bot message + button
  return;
}
    // If exactly one detected → analyze that area
    if (detected.length === 1) {
       if (userText.includes("price growth") || userText.includes("price growth for") || userText.includes("show price growth")) {
      // open price growth page
      
      setLoading(false);
      return;
    }
      await analyzeArea(detected[0]);
      return;
    }

    // If no area detected, send to backend general query (fallback)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/query/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText }),
      });
      const data = await res.json();
      const reply = data.response || "Sorry, I couldn't understand. Please mention the area name.";
      botReply(reply);
    } catch (err) {
      botReply("❌ Unable to connect to backend server.");
    }
  };

  return (
    <div className="chat-bg d-flex justify-content-center align-items-center">
      <div className="chat-container shadow-lg">
        <div className="chat-header text-center">🏡 Real Estate Chatbot</div>

        <div className="chat-body">
          {messages.map((msg, i) => (
            <div key={i} className={`msg-bubble ${msg.sender}`}>
              {msg.text || msg.component}
            </div>
          ))}

          {loading && <div className="typing">Typing...</div>}
          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-input-area">
          <input
            className="form-control"
            placeholder="Ask about property, price, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendQuery()}
          />
          <button className="btn btn-primary ms-2" onClick={sendQuery}>
            Send
          </button>

        </div>
{showComparison && selectedAreas.length > 0 && (
  <div className="overlay">
    <div className="overlay-content">
      <AreaComparison 
         areas={selectedAreas} 
         onClose={() => setShowComparison(false)}
      />
    </div>
  </div>
)}

{showPriceGrowth && selectedAreaForGrowth && (
  <div className="overlay">
    <div className="overlay-content">
      <PriceGrowth 
        area={selectedAreaForGrowth} 
        onClose={() => setShowPriceGrowth(false)}
      />
    </div>
  </div>
)}




      </div>
    </div>
  );
}
