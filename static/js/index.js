const buttonColors = {
    delete: '#ff4d4d', // 红色
    details: '#4CAF50', // 绿色
    newPage: '#4a90e2'  // 蓝色
};

function deleteResult(timestamp) {
    if (confirm("确定要删除这条测试记录吗？")) {
        fetch('/delete_result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({timestamp: timestamp})
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("测试记录已删除！");
                    renderResults(data.results);
                }
            });
    }
}

function renderResults(results) {
    const resultsContainer = document.querySelector('.results');
    resultsContainer.innerHTML = '';  // 清空现有结果

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>还没有测试记录。</p>';
    } else {
        // 按时间降序排序
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        results.forEach((result, index) => {
            const testType = result.test_mode === 'all' ? '全测试' : '自定义测试';
            const resultEntry = document.createElement('div');
            resultEntry.className = 'result-entry';

            // 确保对章节和小节进行自然排序
            result.chapters.sort(naturalSortByChapterName);

            resultEntry.innerHTML = `
                <p><strong>测试时间：</strong> ${result.timestamp}</p>
                <p><strong>测试类型：</strong> ${testType}</p>
                <p><strong>用时：</strong> ${result.duration}</p>
                <p><strong>总准确率：</strong> ${result.total_accuracy.toFixed(2)}%</p>
                <ul>
                    ${result.chapters.map(chapter => `
                        <li>
                            <strong>${chapter.chapter_name}</strong> - 准确率: ${chapter.chapter_accuracy.toFixed(2)}%
                            <ul>
                                ${chapter.sections.sort(naturalSortBySectionName).map(section => `
                                    <li>${section.section_name} - 准确率: ${section.section_accuracy.toFixed(2)}%</li>
                                `).join('')}
                            </ul>
                        </li>
                    `).join('')}
                </ul>
                <button style="background-color: ${buttonColors.delete};" onclick="deleteResult('${result.timestamp}')">删除此记录</button>
                <button style="background-color: ${buttonColors.details};" onclick="showDetails('${result.timestamp}')">查看详细</button>
            `;
            resultsContainer.appendChild(resultEntry);
        });
    }
}

function showDetails(timestamp) {
    const detailsContainer = document.getElementById('details-container');
    const detailsContent = document.getElementById('details-content');
    const loadingSpinner = document.getElementById('loading-spinner');

    // 显示加载动画
    loadingSpinner.style.display = 'block';
    detailsContent.style.display = 'none';

    const result = getResultByTimestamp(timestamp);

    // 清空旧内容
    detailsContent.innerHTML = '';

    setTimeout(() => {
        const fragment = document.createDocumentFragment();

        result.chapters.forEach(chapter => {
            chapter.sections.forEach(section => {
                if (section.errors.length > 0) {
                    const chapterTitle = document.createElement('h4');
                    chapterTitle.textContent = `${chapter.chapter_name} - ${section.section_name}`;
                    fragment.appendChild(chapterTitle);

                    const wordGrid = document.createElement('div');
                    wordGrid.classList.add('word-grid');

                    section.errors.forEach(error => {
                        const wordItem = document.createElement('div');
                        wordItem.classList.add('word-item');
                        wordItem.onclick = () => toggleMeaning(wordItem);

                        wordItem.innerHTML = `
                            <strong>${error.correct_word}</strong><br>
                            <span class="word-meaning">${error.meaning}</span>
                        `;
                        wordGrid.appendChild(wordItem);
                    });

                    fragment.appendChild(wordGrid);
                }
            });
        });

        // 显示错误数量
        const totalErrors = result.chapters.reduce((acc, chapter) => {
            return acc + chapter.sections.reduce((acc, section) => acc + section.errors.length, 0);
        }, 0);

        const errorCount = document.createElement('p');
        errorCount.textContent = `错误数量: ${totalErrors}`;
        fragment.appendChild(errorCount);

        // 添加构建好的内容
        detailsContent.appendChild(fragment);

        // 隐藏加载动画并显示内容
        loadingSpinner.style.display = 'none';
        detailsContent.style.display = 'block';

        // 绑定新页面查看的按钮事件
        const openPageButton = document.getElementById('openPageBtn');
        openPageButton.onclick = () => openDetailsPage(timestamp);
    }, 500); // 模拟500毫秒的加载时间

    detailsContainer.style.display = 'block'; // 显示浮动窗口
}


function openDetailsPage(timestamp) {
    const result = getResultByTimestamp(timestamp);
    let showErrors = false; // 默认不显示错误回答

    const newWindow = window.open('', '_blank');
    newWindow.document.write('<html><head><title>测试详情</title><style>');

    // 添加样式
    newWindow.document.write(`
        body { font-family: 'Arial', sans-serif; background-color: #f5f7fa; color: #333; margin: 0; padding: 0; display: flex; animation: fadeIn 0.6s ease-in-out; }
        .container { display: flex; width: 100%; height: 100vh; }
        .sidebar { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 20px; width: 250px; border-right: 1px solid #ddd; overflow-y: auto; position: relative; display: flex; flex-direction: column; }
        .content { flex-grow: 1; padding: 20px; overflow-y: auto; }
        h1 { color: #4a90e2; margin: 0 0 20px; }
        h2, h4 { color: #4a90e2; margin-bottom: 10px; }
        .word-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .word-item { cursor: pointer; padding: 15px; background-color: #ffffff; border-radius: 10px; transition: transform 0.3s ease, box-shadow 0.3s ease; text-align: center; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); min-height: 120px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
        .word-item strong { font-size: 18px; color: #4682b4; display: block; margin-bottom: 5px; }
        .word-item:hover { transform: translateY(-5px); box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2); }
        .word-meaning { opacity: 0; max-height: 0; overflow: hidden; transition: max-height 0.5s ease, opacity 0.5s ease; margin-top: 10px; color: #333; font-size: 15px; }
        .word-item.show-meaning .word-meaning { opacity: 1; max-height: 200px; }
        .word-error { opacity: 0; max-height: 0; transition: opacity 0.5s ease, max-height 0.5s ease; background: rgba(255, 102, 102, 0.1); border-radius: 5px; padding: 5px; font-size: 14px; color: #FF6F61; text-align: center; margin-top: 10px; }
        .word-item.show-error .word-error { opacity: 1; max-height: 50px; }
        .section-link { display: block; padding: 10px; margin-bottom: 5px; color: #333; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease; }
        .section-link.active { background-color: #4a90e2; color: #fff; }
        .sidebar h2 { margin-top: 20px; }
        .sidebar .test-info { margin-top: 20px; }
        .sidebar .test-info-toggle { cursor: pointer; margin-top: 20px; text-align: center; background-color: #357ABD; color: #fff; padding: 10px; border-radius: 5px; }
        .sidebar .error-toggle { cursor: pointer; margin-top: 20px; text-align: center; background-color: #aaa; color: #fff; padding: 10px; border-radius: 5px; transition: background-color 0.3s ease; }
        .sidebar .error-toggle.on { background-color: #FF6F61; }
        .test-info-content {max-height: 0; overflow: hidden; transition: max-height 0.5s ease, opacity 0.5s ease; opacity: 0;}
        .test-info-content.show {max-height: 500px; opacity: 1; }
        .sidebar { scrollbar-width: thin; scrollbar-color: #4a90e2 rgba(255, 255, 255, 0.5); }
        .sidebar::-webkit-scrollbar { width: 8px; }
        .sidebar::-webkit-scrollbar-thumb { background-color: #4a90e2; border-radius: 10px; }
        button { background-color: #4a90e2; color: white; border: none; padding: 15px; border-radius: 25px; cursor: pointer; margin-top: 20px; width: 100%; }
        button:hover { background-color: #357ABD; }
        .close-button { position: relative; margin-top: 20px; }
        .search-container {position: fixed;top: 20px;right: 20px;width: calc(100% - 40px);max-width: 300px;background: rgba(255, 255, 255, 0.2);backdrop-filter: blur(2px);border-radius: 10px;padding: 10px;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);z-index: 1000;}
        .search-container input {width: 100%;padding: 10px;border: none;border-radius: 5px;box-sizing: border-box;background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); font-size: 16px;}
        .word-item.highlight{transform: translateY(-5px);box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);}
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `);

    newWindow.document.write('</style></head><body>');
    newWindow.document.write('<div class="container">');

    // 创建侧边栏（章节与小节导航）
    newWindow.document.write('<div class="sidebar"><h2>章节导航</h2><ul>');
    result.chapters.sort(naturalSortByChapterName).forEach((chapter, chapterIndex) => {
        newWindow.document.write(`<li><a class="section-link" href="#chapter-${chapterIndex}">${chapter.chapter_name} (正确率: ${chapter.chapter_accuracy.toFixed(2)}%)</a></li>`);
        chapter.sections.sort(naturalSortBySectionName).forEach((section, sectionIndex) => {
            newWindow.document.write(`<a class="section-link" href="#section-${chapterIndex}-${sectionIndex}"> - ${section.section_name} ${section.section_accuracy.toFixed(2)}%</a>`);
        });
    });

    // 添加测试信息折叠部分
    newWindow.document.write(`
        <div class="test-info-toggle">测试信息</div>
        <div class="test-info-content">
            <p>测试时间: ${result.timestamp}</p>
            <p>测试类型: ${result.test_mode === 'all' ? '全测试' : '自定义测试'}</p>
            <p>用时: ${result.duration}</p>
            <p>总准确率: ${result.total_accuracy.toFixed(2)}%</p>
        </div>
    `);

    // 添加错误显示切换按钮
    newWindow.document.write(`
        <div class="error-toggle" id="errorToggle">显示错误回答</div>
    `);

    // 添加关闭按钮
    newWindow.document.write(`
        <button class="close-button" onclick="window.close()">关闭</button>
    `);

    newWindow.document.write('</ul></div>');  // 结束侧边栏

    // 创建内容区域
    newWindow.document.write('<div class="content">');
    newWindow.document.write('<div class="search-container"><input type="text" id="searchInput" placeholder="搜索单词..." /></div>')
    newWindow.document.write('<h1>词汇总结</h1>');

    result.chapters.forEach((chapter, chapterIndex) => {
        newWindow.document.write(`<h2 id="chapter-${chapterIndex}">${chapter.chapter_name}</h2>`);
        chapter.sections.forEach((section, sectionIndex) => {
            newWindow.document.write(`<h4 id="section-${chapterIndex}-${sectionIndex}">${section.section_name}</h4>`);
            newWindow.document.write('<div class="word-grid">');
            section.errors.forEach(error => {
                newWindow.document.write(`
                    <div class="word-item" onclick="toggleMeaning(this)">
                        <strong>${error.correct_word}</strong>
                        <div class="word-meaning">${error.meaning}</div>
                        <div class="word-error">${error.user_answer}</div>
                    </div>
                `);
            });
            newWindow.document.write('</div>');
        });
    });

    newWindow.document.write('</div></div>');  // 结束内容区域和容器

    // 添加 JavaScript 脚本
newWindow.document.write(`
    <script>
        let showErrors = ${showErrors}; // 使用最新的showErrors状态
        const maxDistance = 3; // 可以调整以设置相似度阈值
        const searchInput = document.getElementById('searchInput');
        const wordItems = document.querySelectorAll('.word-item');
    
        function toggleMeaning(element) {
            element.classList.toggle('show-meaning');
        }
    
        function showError(element) {
            if (showErrors) {
                element.classList.add('show-error');
            }
        }
        
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
    
        document.getElementById('errorToggle').addEventListener('click', function() {
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
    
        document.querySelectorAll('.section-link').forEach(anchor => {
            anchor.addEventListener('click', function(event) {
                event.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
            });
        });
    
        document.querySelector('.test-info-toggle').addEventListener('click', function() {
            const infoContent = document.querySelector('.test-info-content');
            infoContent.classList.toggle('show'); // 切换show类，控制展开和收起
        });
    
        const sectionLinks = document.querySelectorAll('.section-link');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    sectionLinks.forEach(link => link.classList.remove('active'));
                    document.querySelector(\`a[href="#\${entry.target.id}"]\`).classList.add('active');
                }
            });
        }, { threshold: 0.6 });
        
        document.querySelectorAll('h4[id^="section-"]').forEach(section => observer.observe(section));
        </script>
    `);
    newWindow.document.write('</body></html>');
    newWindow.document.close();
}



function hideDetails() {
    document.getElementById('details-container').style.display = 'none';
}

function getResultByTimestamp(timestamp) {
    const results = JSON.parse(document.querySelector('.results').dataset.results);
    return results.find(result => result.timestamp === timestamp);
}

function toggleMeaning(element) {
    const meaningElement = element.querySelector('.word-meaning');
    if (meaningElement) {
        element.classList.toggle('show-meaning');
    }
}

function naturalSortByChapterName(a, b) {
    return naturalSort(a.chapter_name, b.chapter_name);
}

function naturalSortBySectionName(a, b) {
    return naturalSort(a.section_name, b.section_name);
}

function naturalSort(a, b) {
    const aParts = a.match(/(\d+|\D+)/g);
    const bParts = b.match(/(\d+|\D+)/g);

    while (aParts.length && bParts.length) {
        const aPart = aParts.shift();
        const bPart = bParts.shift();

        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);

        if (isNaN(aNum) || isNaN(bNum)) {
            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        } else {
            if (aNum > bNum) return 1;
            if (aNum < bNum) return -1;
        }
    }

    return aParts.length - bParts.length;
}

//document.addEventListener('DOMContentLoaded', () => {
//    const initialResults = JSON.parse(document.querySelector('.results').dataset.results);
//    renderResults(initialResults);
//});


document.addEventListener('DOMContentLoaded', function () {
    // 初始化渲染测试结果
    const initialResults = JSON.parse(document.querySelector('.results').dataset.results);
    renderResults(initialResults);
    // 初始化倒计时
    updateCountdown();
    // 从服务器端获取倒计时信息
    fetch('/get_countdown_data')
        .then(response => response.json())
        .then(data => {
            if (data.date && data.event) {
                localStorage.setItem('countdownDate', data.date);
                localStorage.setItem('countdownEvent', data.event);
                updateCountdown();
            }
        });
});

function updateCountdown() {
    const countdownDate = localStorage.getItem('countdownDate');
    const countdownEvent = localStorage.getItem('countdownEvent');
    const countdownMessage = document.getElementById('countdown-message');
    const countdownNumber = document.getElementById('countdown-number');

    if (countdownDate && countdownEvent) {
        const eventDate = new Date(countdownDate);
        const today = new Date();
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            countdownMessage.textContent = `距离${countdownEvent}还有`;
            countdownNumber.textContent = `${diffDays}`;
        }
        else {
            countdownMessage.textContent = `${countdownEvent}已经开始了喵`;
            countdownNumber.textContent = "";
        }
    } else {
        countdownMessage.textContent = "还没有设置倒计时哦~ 点击这里设置！";
        countdownNumber.textContent = "";
    }
}

function showCountdownModal() {
    document.getElementById('countdown-modal').style.display = 'block';
}

function hideCountdownModal() {
    document.getElementById('countdown-modal').style.display = 'none';
}

function saveCountdown() {
    const countdownDate = document.getElementById('countdown-date-input').value;
    const countdownEvent = document.getElementById('countdown-event-input').value;

    if (countdownDate && countdownEvent) {
        localStorage.setItem('countdownDate', countdownDate);
        localStorage.setItem('countdownEvent', countdownEvent);
        hideCountdownModal();
        updateCountdown();

        // 将日期和事件发送到服务器以保存到本地文件
        fetch('/save_countdown_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: countdownDate, event: countdownEvent }),
        });
    } else {
        alert('请设置完整的活动名称和日期喵~');
    }
}