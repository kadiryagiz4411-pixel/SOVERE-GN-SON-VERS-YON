const sendBtn = document.getElementById("sendBtn");
const promptInput = document.getElementById("prompt");
const typeSelect = document.getElementById("type");
const resultEl = document.getElementById("result");

sendBtn.addEventListener("click", async () => {
  const prompt = promptInput.value;
  const type = typeSelect.value;

  if (!prompt) {
    alert("Lütfen prompt yazın!");
    return;
  }

  try {
    const res = await fetch("https://pemhuqhvisejonyqhncq.supabase.co/functions/v1/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbWh1cWh2aXNlam9ueXFobmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzU5OTEsImV4cCI6MjA4ODk1MTk5MX0.knaiMBUPWgaktVpKRqOjk4FpV-nW8q6FlbV4OxNOA8E`
      },
      body: JSON.stringify({ type, prompt })
    });

    const data = await res.json();
    resultEl.textContent = data.result || data.error;
  } catch (err) {
    resultEl.textContent = "Fetch hatası: " + err.message;
  }
});