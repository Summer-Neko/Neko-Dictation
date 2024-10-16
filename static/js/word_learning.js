document.addEventListener('DOMContentLoaded', () => {
    // 确保在 DOM 加载完成后初始化
    loadChapters();
    const searchInput = document.getElementById('searchInput');
    const wordItems = document.querySelectorAll('.word-item');
    const maxDistance = 3; // 最大允许的 Levenshtein 距离

    function levenshtein(a, b) {
        const alen = a.length;
        const blen = b.length;
        const dp = Array.from({ length: alen + 1 }, () => Array(blen + 1).fill(0));

        for (let i = 0; i <= alen; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= blen; j++) {
            dp[0][j] = j;
        }

        for (let i = 1; i <= alen; i++) {
            for (let j = 1; j <= blen; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // 删除
                    dp[i][j - 1] + 1, // 插入
                    dp[i - 1][j - 1] + cost // 替换
                );
            }
        }

        return dp[alen][blen];
    }

    searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // 阻止默认回车行为
            const originalValue = this.value; // 保存用户原始输入
            const query = this.value.trim().toLowerCase();
            let foundMatch = false;
            let similarWordFound = false;

            wordItems.forEach(item => {
                if (foundMatch) return; // 如果已经找到匹配，则退出循环

                const word = item.querySelector('strong').textContent.trim().toLowerCase();
                const distance = levenshtein(query, word);

                if (distance <= maxDistance) {
                    foundMatch = true;
                    item.style.display = 'flex'; // 确保匹配的单词可见
                    item.classList.add('highlight');
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // 移除高亮
                    setTimeout(() => {
                        item.classList.remove('highlight');
                    }, 1000); // 高亮显示1秒

                    if (distance > 0) {
                        similarWordFound = true; // 找到相似的单词
                    }
                }
            });

            // 显示提示框
            if (similarWordFound) {
                searchInput.value = ''; // 清空输入框
                searchInput.placeholder = '找到相似单词。'; // 显示提示信息
                setTimeout(() => {
                    searchInput.placeholder = '搜索单词...'; // 恢复提示信息
                    searchInput.value = originalValue; // 恢复用户原始输入
                }, 1500); // 提示信息显示2秒
            } else if (!foundMatch && query) {
                searchInput.value = ''; // 清空输入框
                searchInput.placeholder = '没有找到匹配的单词，试试其他词。'; // 显示提示信息
                setTimeout(() => {
                    searchInput.placeholder = '搜索单词...'; // 恢复提示信息
                    searchInput.value = originalValue; // 恢复用户原始输入
                }, 1500); // 提示信息显示2秒
            }
        }
    });
});


function loadChapters() {
    fetch('/get_words')
        .then(response => response.json())
        .then(data => {
            const chapterList = document.getElementById('chapter-list');
            chapterList.innerHTML = '';

            const sortedChapters = Object.keys(data).sort(naturalSort);

            sortedChapters.forEach(chapter => {
                const listItem = document.createElement('li');
                listItem.textContent = chapter;
                listItem.onclick = () => {
                    // 更新选中状态
                    document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('selected'));
                    listItem.classList.add('selected');

                    showChapterWords(chapter, data[chapter]);
                    document.querySelector('.content').scrollTop = 0; // 自动滚动到顶部
                };
                chapterList.appendChild(listItem);
            });

            showChapterWords(sortedChapters[0], data[sortedChapters[0]]);
        });
}

function naturalSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function showChapterWords(chapterName, words) {
    const wordGrid = document.getElementById('word-grid');
    wordGrid.innerHTML = '';

    const sectionNav = document.createElement('div');
    sectionNav.className = 'section-nav';

    const observerOptions = {
        root: document.querySelector('.content'),
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const sectionNavItem = document.querySelector(`.section-nav a[href="#${entry.target.id}"]`);
            if (entry.isIntersecting) {
                document.querySelectorAll('.section-nav a').forEach(a => a.classList.remove('active'));
                sectionNavItem.classList.add('active');
            }
        });
    }, observerOptions);

    Object.keys(words).sort(naturalSort).forEach((section, index) => {
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section;
        sectionTitle.id = `section-${index}`;
        wordGrid.appendChild(sectionTitle);

        const sectionNavItem = document.createElement('a');
        sectionNavItem.textContent = section;
        sectionNavItem.href = `#section-${index}`;
        sectionNav.appendChild(sectionNavItem);

        const sectionGrid = document.createElement('div');
        sectionGrid.className = 'section-grid';

        words[section].forEach(word => {
            const wordDiv = document.createElement('div');
            wordDiv.className = 'word-item';
            wordDiv.innerHTML = `<strong>${word.word}</strong><div class="word-meaning">${word.meaning}</div>`;
            wordDiv.onclick = () => toggleMeaning(wordDiv);
            sectionGrid.appendChild(wordDiv);
        });

        wordGrid.appendChild(sectionGrid);
        observer.observe(sectionTitle); // 观察每个sectionTitle
    });

    wordGrid.prepend(sectionNav);
}

function toggleMeaning(element) {
    const meaningDiv = element.querySelector('.word-meaning');
    if (meaningDiv.style.display === 'block') {
        meaningDiv.style.opacity = 0;
        setTimeout(() => meaningDiv.style.display = 'none', 300);
    } else {
        meaningDiv.style.display = 'block';
        setTimeout(() => meaningDiv.style.opacity = 1, 0);
    }
}