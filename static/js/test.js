let startTime; // 记录开始时间
let timerInterval; // 计时器间隔
let testMode = ''; // 记录当前测试模式

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    testMode = urlParams.get('mode');

    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            const sortedData = sortChaptersAndSections(data);

            if (testMode === 'all') {
                generateForm(sortedData);
            } else if (testMode === 'custom') {
                generateCustomForm(sortedData);
            }

            startTimer();
        });

    document.getElementById('submit-btn').addEventListener('click', submitForm);
});

function sortChapters(data) {
    // 提取章节名称中的数字并进行排序
    const sortedChapters = Object.keys(data).sort((a, b) => {
        const numA = extractChapterNumber(a);
        const numB = extractChapterNumber(b);
        return numA - numB;
    });

    // 按排序后的顺序重组数据
    const sortedData = {};
    sortedChapters.forEach(chapter => {
        sortedData[chapter] = data[chapter];
    });

    return sortedData;
}

function sortChaptersAndSections(data) {
    const sortedData = {};
    const chapterKeys = Object.keys(data).sort((a, b) => extractChapterNumber(a) - extractChapterNumber(b));

    chapterKeys.forEach(chapter => {
        sortedData[chapter] = {};
        const sectionKeys = Object.keys(data[chapter]).sort((a, b) => extractSectionNumber(a) - extractSectionNumber(b));
        sectionKeys.forEach(section => {
            sortedData[chapter][section] = data[chapter][section];
        });
    });

    return sortedData;
}

function extractChapterNumber(chapterName) {
    // 使用正则表达式提取章节名中的数字部分
    const match = chapterName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function extractSectionNumber(sectionName) {
    const match = sectionName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function startTimer() {
    startTime = new Date(); // 记录当前时间为开始时间
    timerInterval = setInterval(updateTimerDisplay, 1000); // 每秒更新一次计时器显示
}

function updateTimerDisplay() {
    const now = new Date();
    const duration = Math.floor((now - startTime) / 1000); // 计算持续时间（秒）

    const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
    const seconds = String(duration % 60).padStart(2, '0');

    document.getElementById('timer').textContent = `${minutes}:${seconds}`; // 更新计时器显示
}

function calculateDuration() {
    clearInterval(timerInterval); // 停止计时器
    const endTime = new Date(); // 提交时记录结束时间
    const duration = Math.floor((endTime - startTime) / 1000); // 计算持续时间（秒）

    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return `${minutes}分${seconds}秒`; // 返回格式化的时间字符串
}

function generateForm(data) {
    const formContainer = document.getElementById('test-form');
    const inputElements = [];
    for (const [chapter, sections] of Object.entries(data)) {
        const chapterTitle = document.createElement('h2');
        chapterTitle.textContent = chapter;
        formContainer.appendChild(chapterTitle);

        for (const [section, words] of Object.entries(sections)) {
            const sectionTitle = document.createElement('h3');
            sectionTitle.textContent = section;
            formContainer.appendChild(sectionTitle);

            words.forEach((wordObj, index) => {
                const inputContainer = document.createElement('div');
                inputContainer.className = 'input-container';

                const input = document.createElement('input');
                input.type = 'text';
                input.name = `${chapter}-${section}-${index}`;
                input.placeholder = `请输入单词 ${index + 1}`;
                input.className = 'word-input';

                inputContainer.appendChild(input);
                formContainer.appendChild(inputContainer);
                inputElements.push(input);
            });
        }
    }

    inputElements.forEach((input, index) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const nextInput = inputElements[index + 1];
                if (nextInput) {
                    scrollToInput(nextInput);
                } else {
                    document.getElementById('submit-btn').focus();
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const prevInput = inputElements[index - 1];
                if (prevInput) {
                    scrollToInput(prevInput);
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                const nextInput = inputElements[index + 1];
                if (nextInput) {
                    scrollToInput(nextInput);
                }
            }
        });
    });
}

function generateCustomForm(data) {
    const formContainer = document.getElementById('test-form');
    formContainer.innerHTML = '';

    for (const [chapter, sections] of Object.entries(data)) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-section';

        const chapterTitle = document.createElement('h2');
        chapterTitle.textContent = chapter;
        chapterDiv.appendChild(chapterTitle);

        for (const [section, words] of Object.entries(sections)) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = `${chapter}-${section}`;
            checkbox.value = `${chapter}-${section}`;
            checkbox.className = 'section-checkbox'; // 为复选框添加类名
            const label = document.createElement('label');
            label.textContent = section;
            label.prepend(checkbox);
            chapterDiv.appendChild(label);

            // 点击后高亮选中的章节
            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        }

        formContainer.appendChild(chapterDiv);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = "开始自定义测试";
    nextButton.onclick = () => {
        const selectedSections = Array.from(formContainer.querySelectorAll('input:checked')).map(input => input.value);
        if (selectedSections.length === 0) {
            alert('请至少选择一个章节或小节进行测试！');
        } else {
            generateSelectedForm(data, selectedSections);
        }
    };

    formContainer.appendChild(nextButton);
}



function generateSelectedForm(data, selectedSections) {
    const formContainer = document.getElementById('test-form');
    formContainer.innerHTML = '';
    const inputElements = [];

    selectedSections.forEach(section => {
        const [chapter, sectionName] = section.split('-');
        const chapterTitle = document.createElement('h2');
        chapterTitle.textContent = chapter;
        formContainer.appendChild(chapterTitle);

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = sectionName;
        formContainer.appendChild(sectionTitle);

        data[chapter][sectionName].forEach((wordObj, index) => {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'input-container';

            const input = document.createElement('input');
            input.type = 'text';
            input.name = `${chapter}-${sectionName}-${index}`;
            input.placeholder = `请输入单词 ${index + 1}`;
            input.className = 'word-input';

            inputContainer.appendChild(input);
            formContainer.appendChild(inputContainer);
            inputElements.push(input);
        });
    });

    inputElements.forEach((input, index) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const nextInput = inputElements[index + 1];
                if (nextInput) {
                    scrollToInput(nextInput);
                } else {
                    document.getElementById('submit-btn').focus();
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const prevInput = inputElements[index - 1];
                if (prevInput) {
                    scrollToInput(prevInput);
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                const nextInput = inputElements[index + 1];
                if (nextInput) {
                    scrollToInput(nextInput);
                }
            }
        });
    });

    document.getElementById('submit-btn').style.display = 'inline-block';
}

function scrollToInput(inputElement) {
    const offset = window.innerHeight / 2 - inputElement.clientHeight / 2;
    window.scrollTo({
        top: inputElement.getBoundingClientRect().top + window.pageYOffset - offset,
        behavior: 'smooth'
    });
    inputElement.focus();
}


function submitForm() {
    const inputs = document.querySelectorAll('#test-form input[type=text]');
    const data = {};

    inputs.forEach(input => {
        const [chapter, section, index] = input.name.split('-');
        if (!data[chapter]) data[chapter] = {};
        if (!data[chapter][section]) data[chapter][section] = [];
        data[chapter][section][index] = input.value;
    });

    const duration = calculateDuration(); // 计算测试所花费的时间

    fetch('/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data, duration, test_mode: testMode }) // 将时长和测试模式发送到后端
    })
    .then(response => response.json())
    .then(results => showResultsModal(results));
}

function showResultsModal(results) {
    const modalContainer = document.createElement('div');
    modalContainer.classList.add('modal-container');

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    // 创建并添加模态框头部
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    modalHeader.innerHTML = `<h2>测试结果喵</h2>`;

    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');

    // 添加提示信息到模态框头部和测试结果之间
    const tipText = document.createElement('p');
    tipText.classList.add('modal-tip');
    tipText.textContent = '提示: 你可以随时安全的关闭此页面，后续可在历史记录中查看结果。';

    // 添加总准确率和用时
    modalBody.innerHTML += `<p>总准确率: ${results.total_accuracy.toFixed(2)}%</p>`;
    modalBody.innerHTML += `<p>用时: ${results.duration}</p>`;

    results.chapters.forEach(chapter => {
        const chapterTitle = document.createElement('h3');
        chapterTitle.textContent = `${chapter.chapter_name} - 准确率: ${chapter.chapter_accuracy.toFixed(2)}%`;
        modalBody.appendChild(chapterTitle);

        chapter.sections.forEach(section => {
            const sectionTitle = document.createElement('p');
            sectionTitle.textContent = `${section.section_name} - 准确率: ${section.section_accuracy.toFixed(2)}%`;
            modalBody.appendChild(sectionTitle);

            section.errors.forEach(error => {
                const errorText = document.createElement('p');
                errorText.innerHTML = `正确答案: <strong>${error.correct_word}</strong>, 你的答案: <span class="error">${error.user_answer}</span>`;
                modalBody.appendChild(errorText);
            });
        });
    });

    modalBody.insertBefore(tipText, modalBody.firstChild); // 将提示信息插入到模态框头部和测试结果之间

    const modalFooter = document.createElement('div');
    modalFooter.classList.add('modal-footer');

    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭并返回首页';
    closeButton.onclick = () => {
        window.location.href = '/'; // 关闭并返回首页
    };

    modalFooter.appendChild(closeButton);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalContainer.appendChild(modalContent);

    document.body.appendChild(modalContainer);
}
