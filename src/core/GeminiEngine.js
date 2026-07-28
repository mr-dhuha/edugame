import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function evaluateReflectionWithGemini(studentText, episodeData) {
  if (!genAI) {
    console.warn("VITE_GEMINI_API_KEY tidak ditemukan. Jatuh kembali ke evaluasi fallback (lokal).");
    return fallbackEvaluation(studentText, episodeData);
  }

  try {
    // Definisi Schema untuk memaksa Gemini merespons dalam JSON yang terstruktur (One-Shot)
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        score: {
          type: SchemaType.INTEGER,
          description: "Skor penguasaan konsep dari 0 hingga 3. 0: tidak relevan/salah konsep fatal. 1: pemahaman sangat mendasar. 2: pemahaman cukup baik. 3: pemahaman sangat mendalam dan akurat."
        },
        feedback: {
          type: SchemaType.STRING,
          description: "Feedback singkat dan konstruktif untuk siswa (maksimal 2 kalimat) sebagai seorang guru kimia."
        },
        matchedKeywords: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Kata-kata kunci kimia relevan yang berhasil diidentifikasi dari teks siswa."
        }
      },
      required: ["score", "feedback", "matchedKeywords"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Rendah agar penilaian objektif dan konsisten
      }
    });

    const prompt = `Anda adalah evaluator guru kimia yang objektif.
Topik Episode: ${episodeData.title}
Konsep Utama: ${episodeData.concepts.join(", ")}

Teks Refleksi Siswa:
"${studentText}"

Evaluasi pemahaman siswa berdasarkan teks di atas. Jika teks terlalu pendek atau ngawur, berikan skor 0. Jika ada miskonsepsi, berikan skor rendah.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResult = response.text();
    
    return JSON.parse(textResult);

  } catch (error) {
    console.error("Gagal memanggil Gemini API:", error);
    return fallbackEvaluation(studentText, episodeData);
  }
}

function fallbackEvaluation(text, episodeData) {
  const words = text.toLowerCase().split(/\s+/);
  const matched = [];
  episodeData.concepts.forEach(concept => {
    const conceptWords = concept.toLowerCase().split(/\s+/);
    conceptWords.forEach(cw => {
      if (cw.length > 3 && words.includes(cw)) {
        if (!matched.includes(cw)) matched.push(cw);
      }
    });
  });

  let score = 0;
  if (matched.length >= 2) score = 3;
  else if (matched.length === 1) score = 2;
  else if (words.length > 5) score = 1;

  return {
    score,
    feedback: "Feedback otomatis (Lokal): Terus tingkatkan pemahamanmu tentang " + episodeData.concepts.join(", "),
    matchedKeywords: matched
  };
}
