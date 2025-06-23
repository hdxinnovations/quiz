let questions = [];
let currentQuestionIndex = 0;
let timerInterval;
let startTime = 0;
let questionStartTime = 0;
let questionTimes = [];

async function handleUpload() {
  const name = document.getElementById('userName').value.trim();
  const file = document.getElementById('pdfFile').files[0];
  if (!name || !file) return alert("Please enter your name and upload a PDF");

  document.getElementById('displayName').textContent = name;
  document.getElementById('setupSection').style.display = 'none';
  document.getElementById('quizSection').style.display = 'block';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join('\n') + '\n';
  }

  text = text.replace(/\n\s*\n/g, '\n').trim();
  questions = extractQuestions(text);
  if (questions.length === 0) return alert("No valid questions found.");

  startTimer();
  renderQuestion();
}

function extractQuestions(text) {
  const pattern = /(\d+)\.\s*(.*?)\nA\.\s*(.*?)\nB\.\s*(.*?)\nC\.\s*(.*?)\nD\.\s*(.*?)\nAnswer:\s*([A-D])/gs;
  return [...text.matchAll(pattern)].map(match => ({
    question: match[2].trim(),
    options: [match[3], match[4], match[5], match[6]].map(o => o.trim()),
    answer: match[7].trim(),
    selected: null
  }));
}

function renderQuestion() {
  const now = Date.now();
  if (currentQuestionIndex !== 0) {
    questionTimes[currentQuestionIndex - 1] = Math.floor((now - questionStartTime) / 1000);
  }
  questionStartTime = now;

  const q = questions[currentQuestionIndex];
  const container = document.getElementById('quizContainer');
  container.innerHTML = `
    <div class="question-block fade-slide">
      <p><strong>Q${currentQuestionIndex + 1}:</strong> ${q.question}</p>
      ${q.options.map((opt, i) => `
        <label>
          <input type="radio" name="option" value="${String.fromCharCode(65+i)}"
            ${q.selected === String.fromCharCode(65+i) ? "checked" : ""} />
          ${String.fromCharCode(65+i)}. ${opt}
        </label>`).join('')}
    </div>
  `;
  document.querySelectorAll('input[name="option"]').forEach(input => {
    input.addEventListener('change', e => {
      questions[currentQuestionIndex].selected = e.target.value;
    });
  });
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function startTimer() {
  startTime = 0;
  updateTimerDisplay(startTime);
  timerInterval = setInterval(() => {
    startTime++;
    updateTimerDisplay(startTime);
  }, 1000);
}

function updateTimerDisplay(time) {
  const mins = String(Math.floor(time / 60)).padStart(2, '0');
  const secs = String(time % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${mins}:${secs}`;
}

function getScoreForTime(seconds) {
  const reduction = Math.floor(seconds / 2);
  return Math.max(1, 10 - reduction);
}

function finishQuiz() {
  clearInterval(timerInterval);
  const now = Date.now();
  questionTimes[currentQuestionIndex] = Math.floor((now - questionStartTime) / 1000);

  const correct = questions.filter(q => q.selected === q.answer).length;
  const wrong = questions.length - correct;
  const totalTime = questionTimes.reduce((a, b) => a + b, 0);
  const avgTime = (totalTime / questions.length).toFixed(2);

  let finalScore = 0;
  questions.forEach((q, i) => {
    if (q.selected === q.answer) {
      finalScore += getScoreForTime(questionTimes[i]);
    }
  });

  document.getElementById('quizSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'block';

  document.getElementById('finalScore').innerHTML = `
    ✅ Correct: ${correct} / ${questions.length}<br>
    ⏱ Total Time: ${totalTime} s<br>
    ⚖ Avg Time/Question: ${avgTime} s<br>
    🧮 Final Score: <strong>${finalScore}</strong>
  `;

  triggerConfetti();
  renderPieChart(correct, wrong);
  renderSummary();
}

function renderPieChart(correct, wrong) {
  new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: ['Correct', 'Wrong'],
      datasets: [{
        data: [correct, wrong],
        backgroundColor: ['#00cc99', '#ff6666']
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  });
}

function renderSummary() {
  const summary = document.getElementById('summaryContainer');
  summary.innerHTML = '<h3>Question Summary</h3>' + questions.map((q, i) => `
    <div style="margin-bottom: 15px;">
      <strong>Q${i + 1}:</strong> ${q.question}<br/>
      <strong>Correct Answer:</strong> ${q.answer}
    </div>
  `).join('');
}

function triggerConfetti() {
  const end = Date.now() + 2 * 1000;
  (function frame() {
    confetti({
      particleCount: 5,
      spread: 70,
      origin: { x: Math.random(), y: Math.random() - 0.2 }
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
