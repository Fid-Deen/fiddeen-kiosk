import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// quick check
const run = async () => {
  try {
    const models = await openai.models.list();
    console.log("✅ Key works! Models returned:", models.data.length);
  } catch (err) {
    console.error("❌ Key test failed:", err.message);
  }
};

run();
