document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const testBody = document.querySelector('.test-body');
    const submitTestButton = document.getElementById('submit-test');
    const resultModal = document.querySelector('.test-result');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const currentQuestionLabel = document.getElementById('current-question');
    const totalQuestionsLabel = document.getElementById('total-questions');
    const questionScrollContainer = document.getElementById('question-scroll-container');
    const resultPieChart = document.getElementById('result-pie-chart').getContext('2d');
    const restartTestButton = document.getElementById('restart-test');
    const errorList = document.getElementById('error-list');
    const uploadInstructions = document.getElementById('upload-instructions');
    const uploadLabel = document.getElementById('upload-label');

    let testData = [];
    let userAnswers = {}; // 存储用户的答案
    let correctAnswers = 0;
    let totalQuestions = 0;
    let errors = [];
    let chartInstance;
    let currentQuestionIndex = 0;

    fileInput.addEventListener('change', handleFileUpload);
    submitTestButton.addEventListener('click', endTest);
    restartTestButton.addEventListener('click', restartTest);
    document.addEventListener('keydown', handleKeyPress);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result.split('\n').map(line => line.trim()).filter(line => line && !line.includes(' '));
                testData = content;
                if (testData.length > 0) {
                    fileName.textContent = file.name;
                    fileInfo.classList.remove('hidden');
                    startTest();
                    uploadInstructions.classList.add('hidden');
                    uploadLabel.classList.add('hidden');
                }
            };
            reader.readAsText(file);
        } else {
            alert('请选择有效的 .txt 文件。');
        }
    }

    function startTest() {
        // 初始化 currentQuestionIndex 和其他状态变量
        currentQuestionIndex = 0;
        correctAnswers = 0;
        errors = [];
        totalQuestions = testData.length;
        totalQuestionsLabel.textContent = totalQuestions;
        userAnswers = {}; // 初始化用户答案
        testBody.classList.remove('hidden');
        submitTestButton.classList.add('hidden');
        loadQuestions();
        showQuestion(currentQuestionIndex);  // 显示第一个问题
    }

    function loadQuestions() {
        questionScrollContainer.innerHTML = '';
        testData.forEach((word, index) => {
            const questionBox = document.createElement('div');
            questionBox.className = 'question-box';
            questionBox.innerHTML = `
                <h3>第 ${index + 1} 个单词</h3>
                <input type="text" id="answer-${index}" placeholder="请输入你听到的单词" />
            `;
            questionScrollContainer.appendChild(questionBox);

            const inputBox = document.getElementById(`answer-${index}`);
            inputBox.addEventListener('input', () => {
                // 存储用户输入的答案到 userAnswers 对象中
                userAnswers[index] = inputBox.value.trim().toLowerCase();
            });

            // 添加focus事件，用于鼠标点击输入框时更新当前题目和进度条
            inputBox.addEventListener('focus', () => {
                currentQuestionIndex = index;  // 更新当前题目索引
                updateProgressBar();
                updateCurrentQuestionLabel();
            });
        });
    }

    function handleKeyPress(event) {
        if (event.key === 'ArrowUp' && currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        } else if (event.key === 'ArrowDown' && currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        } else if (event.key === 'Enter') {
            handleEnterPress();
        }
    }

    // 处理回车键逻辑
    function handleEnterPress() {
        if (currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        } else {
            // 如果是最后一题，显示提交按钮
            submitTestButton.classList.remove('hidden');
        }
    }

    // 显示当前问题
    function showQuestion(index) {
        const currentInput = document.getElementById(`answer-${index}`);
        currentInput.focus(); // 让当前题目聚焦

        adjustScrollToCenter(currentInput);  // 调整滚动到视图中心
        updateProgressBar();  // 更新进度条
        updateCurrentQuestionLabel();  // 更新当前问题显示

        if (index === totalQuestions - 1) {
            submitTestButton.classList.remove('hidden');  // 最后一题时显示提交按钮
        }
    }

    // 调整滚动行为
    function adjustScrollToCenter(currentInput) {
        currentInput.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }

    function updateProgressBar() {
        const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        progressBarFill.style.width = `${progressPercent}%`;
    }

    function updateCurrentQuestionLabel() {
        currentQuestionLabel.textContent = currentQuestionIndex + 1;
    }

    // 最后提交时统一计算正确和错误的单词
    function endTest() {
        correctAnswers = 0;
        errors = [];

        // 遍历所有题目，检查用户的答案是否正确
        testData.forEach((word, index) => {
            const correctWord = word.toLowerCase();
            const userAnswer = userAnswers[index] || ""; // 如果没有输入则为空
            if (userAnswer === correctWord) {
                correctAnswers++;
            } else {
                errors.push({ word: correctWord, userAnswer: userAnswer });
            }
        });

        // 显示测试结果
        testBody.classList.add('hidden');
        resultModal.classList.remove('hidden');
        displayTestResults();
    }

    function displayTestResults() {
        const accuracyPercentage = ((correctAnswers / totalQuestions) * 100).toFixed(2);
        document.getElementById('accuracy-percentage').textContent = `${accuracyPercentage}%`;

        errorList.innerHTML = '';
        errors.forEach(error => {
            const listItem = document.createElement('li');
            listItem.textContent = `正确单词: ${error.word}, 你的答案: ${error.userAnswer}`;
            errorList.appendChild(listItem);
        });

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(resultPieChart, {
            type: 'pie',
            data: {
                labels: ['正确', '错误'],
                datasets: [{
                    data: [correctAnswers, totalQuestions - correctAnswers],
                    backgroundColor: ['#4CAF50', '#FF6F61']
                }]
            }
        });
    }

    function restartTest() {
        resultModal.classList.add('hidden');
        startTest();
        uploadInstructions.classList.remove('hidden');
        uploadLabel.classList.remove('hidden');
    }
});