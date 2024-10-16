document.addEventListener('DOMContentLoaded', () => {
    loadChapters();

    document.getElementById('start-quiz').addEventListener('click', startQuiz);
    document.getElementById('next-question').addEventListener('click', handleNextQuestion);
    document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
    document.getElementById('return-home').addEventListener('click', () => window.location.href = '/');
});

let selectedSections = [];
let currentQuestionIndex = 0;
let questions = [];
let correctAnswers = 0;
let isReviewingAnswer = false;

function loadChapters() {
    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            const chapterList = document.getElementById('chapter-list');
            chapterList.innerHTML = '';

            Object.keys(data).forEach(chapter => {
                const chapterDiv = document.createElement('div');
                chapterDiv.className = 'chapter-item';
                chapterDiv.innerHTML = `<h3>${chapter}</h3>`;
                chapterList.appendChild(chapterDiv);

                const sectionList = document.createElement('div');
                sectionList.className = 'section-list';

                Object.keys(data[chapter]).forEach(section => {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'section-item';
                    sectionDiv.textContent = section;
                    sectionDiv.onclick = () => toggleSectionSelection(sectionDiv, chapter, section);
                    sectionList.appendChild(sectionDiv);
                });

                chapterDiv.appendChild(sectionList);
            });
        });
}

function toggleSectionSelection(element, chapter, section) {
    element.classList.toggle('selected');
    const sectionKey = `${chapter}-${section}`;
    if (selectedSections.includes(sectionKey)) {
        selectedSections = selectedSections.filter(s => s !== sectionKey);
    } else {
        selectedSections.push(sectionKey);
    }
    document.getElementById('start-quiz').disabled = selectedSections.length === 0;

    updateProgressBar();
}

function startQuiz() {
    if (selectedSections.length === 0) return;

    fetchQuizQuestions();
    document.getElementById('chapter-selection').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    updateProgressBar();  // 初始化进度条
}

function fetchQuizQuestions() {
    fetch(`/generate_quiz_questions?sections=${selectedSections.join(',')}`)
        .then(response => response.json())
        .then(data => {
            questions = data.map(question => ({
                ...question,
                sectionName: question.sectionName  // 包含小节名称
            }));
            currentQuestionIndex = 0;
            correctAnswers = 0;
            showQuestion();
            updateProgressBar();  // 初始化进度条
        });
}

function showQuestion() {
    if (questions.length === 0) {
        alert('没有生成题目，请检查选择的小节是否包含单词。');
        return;
    }

    const question = questions[currentQuestionIndex];
    const questionContainer = document.getElementById('question-container');
    const optionsContainer = document.getElementById('options-container');

    questionContainer.innerHTML = `<h2>第 ${currentQuestionIndex + 1} 题</h2>`;
    optionsContainer.innerHTML = '';

    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectOption(optionDiv, question.correctAnswer);
        optionsContainer.appendChild(optionDiv);
    });

    document.getElementById('next-question').disabled = true;
    isReviewingAnswer = false;  // 重置标志
    updateProgressBar();  // 更新进度条
}

function selectOption(optionDiv, correctAnswer) {
    if (isReviewingAnswer) return; // 如果正在查看答案，禁止再次选择

    const optionsContainer = document.getElementById('options-container');
    Array.from(optionsContainer.children).forEach(child => {
        child.classList.remove('selected');
    });

    optionDiv.classList.add('selected');
    document.getElementById('next-question').disabled = false;
}

function handleNextQuestion() {
    const selectedOption = document.querySelector('.option.selected');
    const correctAnswer = questions[currentQuestionIndex].correctAnswer;

    if (isReviewingAnswer) {
        // 正在查看答案时点击下一题，直接进入下一题
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            showResults();
        }
    } else if (selectedOption) {
        if (selectedOption.textContent === correctAnswer) {
            // 答对了，增加分数并直接进入下一题
            correctAnswers++;
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                showQuestion();
            } else {
                showResults();
            }
        } else {
            // 答错了，显示正确答案并锁定选项
            selectedOption.classList.add('incorrect');
            const correctOption = Array.from(document.getElementsByClassName('option')).find(option => option.textContent === correctAnswer);
            correctOption.classList.add('correct');
            isReviewingAnswer = true;
            document.getElementById('next-question').disabled = false;
        }
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (document.getElementById('quiz-container').style.display === 'block') {
        const currentSection = questions[currentQuestionIndex]?.sectionName || '未知';
        progressBar.textContent = `当前小节：${currentSection} - 题目 ${currentQuestionIndex + 1} / ${questions.length}`;
    } else {
        progressBar.textContent = `将按照此顺序惊喜测试：${selectedSections.join(', ')}`;
    }
}

function showResults() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('result-container').style.display = 'block';

    const accuracy = (correctAnswers / questions.length) * 100;

    const ctx = document.getElementById('result-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['正确', '错误'],
            datasets: [{
                data: [correctAnswers, questions.length - correctAnswers],
                backgroundColor: ['#4CAF50', '#FF6F61']
            }]
        },
        options: {
            responsive: true
        }
    });

    const resultSummary = document.getElementById('result-summary');
    resultSummary.innerHTML = `
        <p>注意喵，此听选数据并不保存</p>
        <p>正确率：${accuracy.toFixed(2)}%</p>
        <p>总共：${questions.length} 题</p>
        <p>答对：${correctAnswers} 题</p>
        <p>答错：${questions.length - correctAnswers} 题</p>
    `;
        // 收集错误单词及其中文意思
    let errorWordsHtml = '';
    questions.forEach((question, index) => {
        const selectedOption = document.querySelectorAll('.option')[index];
        if (selectedOption && selectedOption.textContent !== question.correctAnswer) {
            errorWordsHtml += `<p><strong>${question.word}:</strong> ${question.correctAnswer}</p>`;
        }
    });

}

function resetQuiz() {
    document.getElementById('result-container').style.display = 'none';
    document.getElementById('chapter-selection').style.display = 'block';
    selectedSections = [];
    document.getElementById('start-quiz').disabled = true;
    updateProgressBar();
}