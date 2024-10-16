document.addEventListener('DOMContentLoaded', () => {
    loadChapters();

    document.getElementById('add-chapter-btn').addEventListener('click', addChapter);
    document.getElementById('add-section-btn').addEventListener('click', addSection);
    document.getElementById('add-word-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addWord();
        }
    });
});

function loadChapters() {
    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            const chapterList = document.getElementById('chapter-list');
            chapterList.innerHTML = '';

            for (const chapter in data) {
                const li = document.createElement('li');
                li.textContent = chapter;
                li.dataset.chapter = chapter;
                li.classList.add('draggable');
                li.onclick = () => loadSections(chapter);
                chapterList.appendChild(li);
            }

            new Sortable(chapterList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: saveChapterOrder
            });

            if (chapterList.firstChild) {
                chapterList.firstChild.click();
            }
        });
}

function loadSections(chapter) {
    const sectionList = document.getElementById('section-list');
    sectionList.innerHTML = '';

    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            if (data[chapter]) {
                for (const section in data[chapter]) {
                    const li = document.createElement('li');
                    li.textContent = section;
                    li.dataset.section = section;
                    li.classList.add('draggable');
                    li.onclick = () => loadWords(chapter, section);
                    sectionList.appendChild(li);
                }

                new Sortable(sectionList, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: saveSectionOrder
                });

                if (sectionList.firstChild) {
                    sectionList.firstChild.click();
                }
            }
        });
}

function loadWords(chapter, section) {
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';

    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            if (data[chapter] && data[chapter][section]) {
                data[chapter][section].forEach((wordObj, index) => {
                    const li = document.createElement('li');
                    li.textContent = wordObj.word;
                    li.classList.add('draggable');
                    li.ondblclick = function() {
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = '删除';
                        deleteButton.onclick = () => li.remove();
                        li.appendChild(deleteButton);
                    };
                    wordList.appendChild(li);
                });

                new Sortable(wordList, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: saveWordOrder
                });
            }
        });
}

function addChapter() {
    const chapterName = prompt('输入新章节名称：');
    if (chapterName) {
        const chapterList = document.getElementById('chapter-list');
        const li = document.createElement('li');
        li.textContent = chapterName;
        li.dataset.chapter = chapterName;
        li.classList.add('draggable');
        li.onclick = () => loadSections(chapterName);
        chapterList.appendChild(li);
        saveChapterOrder();
    }
}

function addSection() {
    const sectionName = prompt('输入新小节名称：');
    if (sectionName) {
        const sectionList = document.getElementById('section-list');
        const li = document.createElement('li');
        li.textContent = sectionName;
        li.dataset.section = sectionName;
        li.classList.add('draggable');
        li.onclick = () => loadWords(document.querySelector(`[data-chapter="${document.querySelector('.chapters .selected').dataset.chapter}"]`).dataset.chapter, sectionName);
        sectionList.appendChild(li);
        saveSectionOrder();
    }
}

function addWord() {
    const wordInput = document.getElementById('add-word-input');
    const word = wordInput.value.trim();
    if (word) {
        const wordList = document.getElementById('word-list');
        const li = document.createElement('li');
        li.textContent = word;
        li.classList.add('draggable');
        li.ondblclick = function() {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.onclick = () => li.remove();
            li.appendChild(deleteButton);
        };
        wordList.appendChild(li);
        wordInput.value = '';
        saveWordOrder();  // 立即保存单词顺序
    }
}

function saveChapterOrder() {
    // 保存章节顺序到后端
}

function saveSectionOrder() {
    // 保存小节顺序到后端
}

function saveWordOrder() {
    const chapter = document.querySelector('.chapters .selected')?.dataset.chapter;
    const section = document.querySelector('.sections .selected')?.dataset.section;
    const words = [];

    document.querySelectorAll('#word-list li').forEach(li => {
        const text = li.textContent.replace('删除', '').trim();
        if (text) words.push({ word: text, error_count: 0 });
    });

    if (chapter && section) {
        fetch('/save_words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chapter, section, words })
        });
    }
}

function saveChanges() {
    saveChapterOrder();
    saveSectionOrder();
    saveWordOrder();
    alert('所有更改已保存！');
}