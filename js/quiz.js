const urlParams = new URLSearchParams(window.location.search);
const param = urlParams.get('u');
if (param) {
    document.getElementById('video-url').value = 'https://youtu.be/' + param;
    document.getElementById('generate-quiz').dispatchEvent(new Event('submit'));
}
function extractJsonString(rawText) {
    const firstIndex = rawText.indexOf('{');
    const lastIndex = rawText.lastIndexOf('}');
        if (firstIndex === -1 || lastIndex === -1 || firstIndex >= lastIndex) {
            throw new Error("Invalid JSON format in AI response.");
        }
    return rawText.substring(firstIndex, lastIndex + 1);
}
function aiQuiz(title, videoUrl) {
    const prompt = `
        You're an AI quiz generator for YouTube STEM content. A video titled "${title}" was just watched.
        Generate a short multiple-choice quiz with 8 questions to test the viewer's understanding. Each question must include:
        - A clear and concise question
        - Four answer choices labeled A, B, C, and D
        - One correct answer specified as a letter ("A", "B", "C", or "D")
        Keep the language beginner-friendly and base the questions on the content from this video: ${videoUrl}
        Return the entire quiz as a **strictly valid JSON object** with the following structure (and no extra explanation or text):
        {
          "quiz": [
            {
              "question": "What is ...?",
              "choices": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "answer": "B"
            },
            ...
          ]
        }
    `.trim();
    return fetch("https://ai.hackclub.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    })
    .then(response => response.json())
    .then(data => {
        return extractJsonString(data.choices?.[0]?.message?.content) || "No quiz generated.";
    })
    .catch(error => {
        console.error("Error generating quiz:", error);
        return "An error occurred while generating the quiz. Please try again later.";
    });
}
function extractYouTubeID(url) {
    const regex = /(?:youtube\.com\/(?:.*v=|v\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
function cutAfterFirstSymbol(title) {
    for (let i = 0; i < title.length; i++) {
        const char = title[i];
        if (!/[a-zA-Z0-9\s]/.test(char)) {
            return title.slice(0, i).trim();
        }
    }
    return title.trim();
}
function getTitle(videoUrl) {
    const apiKey = 'AIzaSyBmP157wx7RmjRmFhkhaKfBnoVU6D67Spo';
    const videoId = extractYouTubeID(videoUrl);
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
    fetch(apiUrl).then(response => response.json()).then(data => {
        if (data.items && data.items.length > 0) {
            const title = data.items[0].snippet.title;
            aiQuiz(title, videoUrl).then(quiz => {
                generateDOMQuiz(quiz, title, videoUrl);
            });
        } else {
            alert('Video not found. Please check the URL and try again later.');
        }
    }).catch(error => {
        console.error('Error fetching video details:', error);
        alert('An error occurred while fetching video details. Please try again later.');
    });
}
function selectOption(id) {
    const button = document.getElementById(id);
    const parent = button.parentElement;
    const buttons = parent.getElementsByClassName('quizOption');
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i] !== button) {
            buttons[i].classList.remove('selected');
        }
    }
    button.classList.add('selected');
}
function submitQuiz() {
    document.getElementById('genQuizzes').style.display = 'none';
    let correct = 0;
    let graded = [];
    for (let i = 0; i < document.getElementsByClassName('quiz').length; i++) {
        let quiz = document.getElementsByClassName('quiz')[i].getElementsByClassName('quizOptions')[0];
        let selected = "";
        for (let j = 0; j < quiz.children.length; j++) {
            const button = quiz.children[j];
            if (button.classList.contains('selected') && button.classList.contains('correct')) {
                correct++;
                graded.push('correct');
                selected = j;
            } else if (button.classList.contains('selected')) {
                selected = j;
            }
        }
        if (graded[i] !== 'correct') {
            graded.push('incorrect');
        }
        graded[i] += selected;
    }
    for (let i = 0; i < graded.length; i++) {
        const grade = graded[i];
        if (grade.startsWith('correct')) {
            document.getElementById(`message${i}`).innerHTML = '✅ You were right!';
        } else if (/\d/.test(grade)) {
            const digit = grade.match(/\d/)[0];
            const letter = String.fromCharCode(65 + parseInt(digit));
            document.getElementById(`answer${letter}${i}`).classList.add('wrongColor');
            document.getElementById(`message${i}`).innerHTML = `❌ You were wrong. You selected ${letter}.`;
        } else {
            document.getElementById(`message${i}`).innerHTML = '⏩ You did not select an answer.';
        }
    }
    document.getElementById('quizText').innerHTML = `You got <b>${correct}</b> out of <b>${graded.length}</b> right!`;
    document.getElementById('answers').style.display = 'block';
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState(null, '', cleanUrl);
    window.scrollTo({top: 0, behavior: 'smooth'});
}
function generateDOMQuiz(quiz, title, videoUrl) {
    let quizData;
    try {
        quizData = JSON.parse(quiz);
    } catch (error) {
        alert('An error occurred while parsing the quiz data. Please try again later.');
        return;
    }
    if (!quizData.quiz || !Array.isArray(quizData.quiz)) {
        alert('Invalid quiz data received. Please try again later.');
        return;
    }
    document.getElementById('quizText').innerHTML = `Quiz on <a href="${videoUrl}" target="_blank"><b>${cutAfterFirstSymbol(title)}</b></a>`;
    let quizHtml = '<div class="quizzes" id="genQuizzes">';
    quizData.quiz.forEach((q, index) => {
        quizHtml += `<div class="quiz" id="quiz${index}"><b>${index + 1}. ${q.question}</b><br/><div class="quizOptions">`;
        let values = ["A", "B", "C", "D"];
        for (const [key, value] of Object.entries(q.choices)) {
            const randomIndex = Math.floor(Math.random() * values.length);
            if (q.answer === key) {
                quizHtml += `<button onclick="selectOption('option${key}${index}')" class="correct quizOption color${values[randomIndex]}" id="option${key}${index}">${key}: ${value}</button>`;
            } else {
                quizHtml += `<button onclick="selectOption('option${key}${index}')" class="quizOption color${values[randomIndex]}" id="option${key}${index}">${key}: ${value}</button>`;
            }
            values.splice(randomIndex, 1);
        }
        quizHtml += `</div></div>`;
    });
    quizHtml += '<button class="submit" onclick="submitQuiz()">Submit!</button></div>';
    document.getElementById('preQuiz').innerHTML = quizHtml;
    let quizAnswersHtml = '<ol id="answers" style="display: none">';
    quizData.quiz.forEach((q, index) => {
        quizAnswersHtml += `<li>${q.question}<br/>`;
        quizAnswersHtml += `<ul>`;
        for (const [key, value] of Object.entries(q.choices)) {
            if (q.answer === key) {
                quizAnswersHtml += `<li id="answer${key}${index}" class="correctColor"><b>${key}:</b> ${value}</li>`;
            } else {
                quizAnswersHtml += `<li id="answer${key}${index}">${key}: ${value}</li>`;
            }
        }
        quizAnswersHtml += `</ul>`;
        quizAnswersHtml += `<p class="liAnswer"><b id="message${index}"></b> <i>The correct answer is ${q.answer}</i></p></li>`;
    });
    quizAnswersHtml += '<p style="margin-left: -40px; margin-bottom: -15px">Want to try another <a href="#" onclick="window.location.reload()">quiz</a>?</p></ol>';
    document.getElementById('preQuiz').innerHTML += quizAnswersHtml;
}
function generateQuiz(event) {
    event.preventDefault();
    document.getElementById('footer').style.display = 'none';
    const videoUrl = document.getElementById('video-url').value;
    const isValidYoutubeUrl = typeof videoUrl === 'string' && /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(videoUrl);
    if (!isValidYoutubeUrl) {
        alert('Please enter a valid YouTube video URL.');
        return;
    }
    document.getElementById('preQuiz').innerHTML = `<p><b>Generating Quiz...</b></p><p>Please wait while we create your quiz. This may take a few seconds...</p>`;
    getTitle(videoUrl);
}