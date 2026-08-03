const url = 'https://dylqthgrpkshpurxrofk.supabase.co/functions/v1/ai-tutor';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bHF0aGdycGtzaHB1cnhyb2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTAxMTIsImV4cCI6MjA4ODUyNjExMn0.7ocoUmltV4MX7Rwonhpu32rTNfM2-pq1k3wOfW51vdQ';

async function testGrade() {
  console.log("=== Menguji grade_reflection ===");
  const body = {
    feature: 'grade_reflection',
    data: "[Konteks: Tingkat Kesulitan Terakhir: Susah]\n[Nama Siswa: Budi]\nSaya bingung kak, asam Arrhenius itu yang donor elektron kan ya? Terus bedanya sama Lewis apa dong? Saya pusing materinya banyak banget."
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();
    console.log("Response Grade:", json);
  } catch(e) {
    console.error("Grade Error:", e);
  }
}

async function testChat() {
  console.log("\n=== Menguji chat_reflection ===");
  const body = {
    feature: 'chat_reflection',
    data: {
      history: [
        { role: 'user', content: 'Saya bingung kak, asam Arrhenius itu yang donor elektron kan ya? Terus bedanya sama Lewis apa dong? Saya pusing materinya banyak banget.' },
        { role: 'assistant', content: 'Jangan menyerah dulu, Budi. Mari kita urai satu per satu ya. Asam Arrhenius sebenarnya berhubungan dengan ion dalam air. Menurutmu, ion apa yang dihasilkan oleh asam menurut teori Arrhenius?' },
        { role: 'user', content: 'Hmm, ion OH- bukan sih kak? Atau H+ ya? Saya nebak aja hehe.' }
      ],
      isFinalTurn: false,
      studentName: 'Budi'
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();
    console.log("Response Chat (Final Turn):", json);
  } catch (e) {
    console.error("Chat Error:", e);
  }
}

async function run() {
  await testGrade();
  await testChat();
}

run();
