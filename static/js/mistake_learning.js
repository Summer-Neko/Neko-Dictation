document.addEventListener('DOMContentLoaded', () => {
    loadMistakeChapters();

    document.getElementById('select-all').addEventListener('click', toggleSelectAllSections);
    document.getElementById('start-quiz').addEventListener('click', startQuiz);
    document.getElementById('next-question').addEventListener('click', handleNextQuestion);
    document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
    document.getElementById('return-home').addEventListener('click', () => window.location.href = '/');
});

let selectedSections = [];
let currentQuestionIndex = 0;
let questions = [];
let correctAnswers = 0;
let isAnswered = false;
let incorrectWords = [];  // 新增，用于保存错误回答的单词

function loadMistakeChapters() {
    fetch('/get_mistake_words')
        .then(response => response.json())
        .then(data => {
            const chapterList = document.getElementById('chapter-list');
            chapterList.innerHTML = '';

            if (Object.keys(data).length === 0) {
                chapterList.innerHTML = '<p>先去完成一次测试吧</p>';
                return;
            }

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
    updateSelectAllState();
    document.getElementById('start-quiz').disabled = selectedSections.length === 0;
}

function toggleSelectAllSections() {
    const allSections = document.querySelectorAll('.section-item');
    const selectAllButton = document.getElementById('select-all');

    if (selectedSections.length === allSections.length) {
        selectedSections = [];
        allSections.forEach(section => section.classList.remove('selected'));
        selectAllButton.textContent = '一键全选';
    } else {
        selectedSections = [];
        allSections.forEach(section => {
            section.classList.add('selected');
            const chapter = section.closest('.chapter-item').querySelector('h3').textContent;
            const sectionName = section.textContent;
            selectedSections.push(`${chapter}-${sectionName}`);
        });
        selectAllButton.textContent = '取消全选';
    }
    document.getElementById('start-quiz').disabled = selectedSections.length === 0;
}

function updateSelectAllState() {
    const allSections = document.querySelectorAll('.section-item');
    const selectAllButton = document.getElementById('select-all');

    if (selectedSections.length === allSections.length) {
        selectAllButton.textContent = '取消全选';
    } else {
        selectAllButton.textContent = '一键全选';
    }
}

function startQuiz() {
    if (selectedSections.length === 0) return;

    fetchQuizQuestions();
    document.getElementById('chapter-selection').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
}

function fetchQuizQuestions() {
    fetch(`/generate_mistake_quiz_questions?sections=${selectedSections.join(',')}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }

            questions = data.sort(() => 0.5 - Math.random());  // 随机打乱题目顺序
            currentQuestionIndex = 0;
            correctAnswers = 0;
            isAnswered = false;
            showQuestion();
            updateProgressBar();
        });
}

function showQuestion() {
    if (questions.length === 0) {
        alert('没有生成题目，请检查选择的小节是否包含错误单词。');
        return;
    }

    const question = questions[currentQuestionIndex];
    const questionContainer = document.getElementById('question-container');
    const optionsContainer = document.getElementById('options-container');

    questionContainer.innerHTML = `<h2>${question.word}</h2>`;
    optionsContainer.innerHTML = '';

    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectOption(optionDiv, question.correctAnswer);
        optionsContainer.appendChild(optionDiv);
    });

    document.getElementById('next-question').disabled = true;
}

function selectOption(optionDiv, correctAnswer) {
    if (isAnswered) return; // 如果已经回答则不允许更改

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

    if (!selectedOption) {
        alert("请选择一个选项后再继续。");
        return;
    }

    if (isAnswered) {
        // 如果已经处理过了，直接跳到下一题
        nextQuestion();
        return;
    }

    if (selectedOption.textContent === correctAnswer) {
        // 用户回答正确，直接跳到下一题
        correctAnswers++;
        isAnswered = true;  // 标记已经回答
        nextQuestion(); // 直接跳转到下一题
    } else {
        // 用户回答错误，显示正确答案并锁定选项
        selectedOption.classList.add('incorrect');
        const correctOption = Array.from(document.querySelectorAll('.option')).find(
            option => option.textContent === correctAnswer
        );
        correctOption.classList.add('correct');

        incorrectWords.push({
            word: questions[currentQuestionIndex].word,
            correctAnswer: correctAnswer
        }); // 将错误的单词记录到数组中

        // 锁定所有选项，防止更改答案
        Array.from(document.querySelectorAll('.option')).forEach(option => {
            option.onclick = null;
        });

        // 启用“下一题”按钮，等待用户点击跳转
        isAnswered = true;
        document.getElementById('next-question').disabled = false;
    }
}

function nextQuestion() {
    if (!isAnswered) return; // 确保用户已经处理了当前题目

    currentQuestionIndex++;
    isAnswered = false; // 重置回答状态

    if (currentQuestionIndex < questions.length) {
        showQuestion();
        updateProgressBar();
    } else {
        showResults();
    }
}

function resetOptions() {
    // 清除选项状态和事件绑定
    Array.from(document.querySelectorAll('.option')).forEach(option => {
        option.classList.remove('selected', 'correct', 'incorrect');
        option.onclick = () => selectOption(option, questions[currentQuestionIndex].correctAnswer);
    });

    // 禁用“下一题”按钮，直到用户做出选择
    document.getElementById('next-question').disabled = true;
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `题目进度：${currentQuestionIndex + 1} / ${questions.length}`;
}

function showResults() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('result-container').style.display = 'block';

    const accuracy = (correctAnswers / questions.length) * 100;

    // 创建饼图展示正确和错误的答案比例
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

    // 显示测试的总结信息
    const resultSummary = document.getElementById('result-summary');
    resultSummary.innerHTML = `
        <p>注意喵，虽然此数据已保存，但目前无法后期查询。</p>
        <p>正确率：${accuracy.toFixed(2)}%</p>
        <p>总共：${questions.length} 题</p>
        <p>答对：${correctAnswers} 题</p>
        <p>答错：${questions.length - correctAnswers} 题</p>
    `;

    // 生成错误单词的 HTML 内容
    let errorWordsHtml = '';
    incorrectWords.forEach(({ word, correctAnswer }) => {
        errorWordsHtml += `<p><strong>${word}:</strong> ${correctAnswer}</p>`;
    });

    // 添加错误单词的折叠显示容器和按钮
    resultSummary.innerHTML += `
        <button id="toggle-error-words">查看错误单词</button>
        <div id="error-words-container" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-top: 10px;">
            ${errorWordsHtml || '<p>没有错误的单词！</p>'}
        </div>
    `;

    // 添加事件监听器以切换错误单词容器的显示
    document.getElementById('toggle-error-words').addEventListener('click', () => {
        const errorWordsContainer = document.getElementById('error-words-container');
        const isVisible = errorWordsContainer.style.display === 'block';
        errorWordsContainer.style.display = isVisible ? 'none' : 'block';
    });

    // 准备要保存的测试数据
    const testData = {
        timestamp: new Date().toLocaleString(),
        accuracy: accuracy,
        totalQuestions: questions.length,
        correctAnswers: correctAnswers,
        incorrectAnswers: questions.length - correctAnswers,
        errorWords: incorrectWords  // 保存错误的单词列表
    };

    // 将测试数据发送到后端进行保存
    fetch('/save_test_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
    }).then(response => response.json())
      .then(data => {
          if (data.success) {
              console.log('测试数据保存成功');
          } else {
              console.error('测试数据保存失败');
          }
      });
}

function resetQuiz() {
    document.getElementById('result-container').style.display = 'none';
    document.getElementById('chapter-selection').style.display = 'block';
    selectedSections = [];
    document.getElementById('start-quiz').disabled = true;
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').textContent = '';
}