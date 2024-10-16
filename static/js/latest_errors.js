document.addEventListener('DOMContentLoaded', function () {
    // 现有代码...
    let showErrors = false;
    let showMeaning = true;
    const meaningToggle = document.getElementById('meaningToggle');
    const errorToggle = document.getElementById('errorToggle');

    const sectionLinks = document.querySelectorAll('.section-link');
    const sectionContents = document.querySelectorAll('.section-content');
    const maxDistance = 2; // 最大允许的 Levenshtein 距离

    // 搜索框相关
    const searchInput = document.getElementById('searchInput');
    const wordItems = document.querySelectorAll('.word-item');

    // 导出单词功能
    const exportWordsBtn = document.getElementById('exportWordsBtn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const exportForm = document.getElementById('exportForm');

    // 打开导出浮窗
    exportWordsBtn.addEventListener('click', function () {
        exportModal.style.display = 'block';
    });

    // 关闭导出浮窗
    closeExportModal.addEventListener('click', function () {
        exportModal.style.display = 'none';
    });

    // 当用户点击窗外时，关闭浮窗
    window.addEventListener('click', function (event) {
        if (event.target === exportModal) {
            exportModal.style.display = 'none';
        }
    });

   // 导出单词功能逻辑
    exportForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const selectedChapters = Array.from(document.querySelectorAll('input[name="chapters"]:checked')).map(checkbox => checkbox.value);
        if (selectedChapters.length === 0) {
            alert('请选择至少一个章节进行导出！');
            return;
        }

        let wordsToExport = [];

        selectedChapters.forEach(chapterIndex => {
            const chapterSections = document.querySelectorAll(`.section-content[data-chapter="${chapterIndex}"]`);
            chapterSections.forEach(section => {
                const wordItems = section.querySelectorAll('.word-item strong');
                wordItems.forEach(wordElement => {
                    let word = wordElement.textContent.trim();

                    // 如果单词不包含标点符号 且 不是短语，则添加到 wordsToExport
                    if (!/[.,\/#!$%\^&\*;:{}=\-_`~()]/g.test(word) && !/\s/.test(word)) {
                        wordsToExport.push(word);
                    }
                });
            });
        });

        if (wordsToExport.length === 0) {
            alert('所选章节中没有可导出的单词。');
            return;
        }

        const uniqueWords = Array.from(new Set(wordsToExport));  // 移除重复单词
        const wordText = uniqueWords.join('\n');

        // 创建txt文件并导出
        const blob = new Blob([wordText], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'exported_words.txt';
        link.click();

        exportModal.style.display = 'none';
    });


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



    // 错误显示切换
    errorToggle.addEventListener('click', function () {
        showErrors = !showErrors;
        this.classList.toggle('on');
        this.textContent = showErrors ? '隐藏错误回答' : '显示错误回答';
        document.querySelectorAll('.word-item').forEach(item => {
            if (showErrors) {
                item.classList.add('show-error');
            } else {
                item.classList.remove('show-error');
            }
        });
    });

    // 中文释义切换
    meaningToggle.addEventListener('click', function () {
        showMeaning = !showMeaning;
        this.classList.toggle('on');
        this.textContent = showMeaning ?   '隐藏中文释义' : '显示中文释义';
        document.querySelectorAll('.word-item').forEach(item => {
            if (showMeaning) {
                item.classList.add('show-meaning');
            } else {
                item.classList.remove('show-meaning');
            }
        });
    });

    // 小节链接点击事件
    sectionLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 章节展开折叠
    document.querySelectorAll('.chapter-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionList = this.nextElementSibling;
            sectionList.classList.toggle('expanded');
            if (sectionList.classList.contains('expanded')) {
                sectionList.style.maxHeight = sectionList.scrollHeight + 'px';
            } else {
                sectionList.style.maxHeight = '0';
            }
        });
    });

    // IntersectionObserver 配置
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 移除所有小节链接的高亮
                sectionLinks.forEach(link => link.classList.remove('active'));

                // 高亮当前可见小节的链接
                const activeLink = document.querySelector(`a[href="#${entry.target.id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');

                    // 确保展开章节
                    const chapterList = activeLink.closest('.section-list');
                    if (chapterList && !chapterList.classList.contains('expanded')) {
                        chapterList.classList.add('expanded');
                        chapterList.style.maxHeight = chapterList.scrollHeight + 'px';
                    }
                }
            }
        });
    }, {
        threshold: [0.00001], // 触发高亮的阈值，0.1 表示只要有 10% 的元素可见就会触发
        rootMargin: '0px 0px -80% 0px' // 使用负 rootMargin 提前触发
    });

    // 观察每个小节
    sectionContents.forEach(section => observer.observe(section));

    // 单词卡片点击显示中文释义
    document.querySelectorAll('.word-item').forEach(item => {
        item.addEventListener('click', function () {
            this.classList.toggle('show-meaning');
        });
    });

    // 测试信息折叠
    document.querySelector('.test-info-toggle').addEventListener('click', function () {
        const infoContent = document.querySelector('.test-info-content');
        infoContent.classList.toggle('show');
    });
});